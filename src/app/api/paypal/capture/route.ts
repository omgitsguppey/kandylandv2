import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { trackServerEvent } from "@/lib/server/analytics";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";
import { deriveGumdropEconomics, getBundlePresentation } from "@/lib/gumdrop-economics";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";

const bodySchema = z.object({
  orderId: z.string().min(1),
  expectedDrops: z.number().int().positive(),
});

const VALID_PACKAGES: Record<string, number> = {
  "1.00": 100,
  "5.00": 550,
  "10.00": 1100,
  "20.00": 2500,
};

const PAYPAL_BASE_URL = "https://api-m.paypal.com";

function getPayPalCredentials() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET_LIVE;
  return { clientId, clientSecret };
}

async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured. Please add NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE and PAYPAL_CLIENT_SECRET_LIVE to your environment variables.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new Error("Failed to obtain PayPal access token");
  const data = await response.json();
  return z.object({ access_token: z.string().min(1) }).parse(data).access_token;
}

async function capturePayPalOrder(orderId: string): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `capture_${orderId}`
    },
  });
  if (!response.ok) throw new Error(`PayPal capture failed: ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

async function logFailedTransaction(userId: string, orderId: string, expectedDrops: number, reason: string) {
  if (!adminDb) return;
  try {
    await adminDb.collection("transactions").add({
      userId,
      type: "purchase_currency",
      amount: expectedDrops,
      paymentId: orderId,
      status: "failed",
      timestamp: FieldValue.serverTimestamp(),
      description: `Failed purchase attempt: ${reason}`,
    });
  } catch (err) {
    console.error("Failed to log failed transaction:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkRateLimit(request, "paypal/capture", STRICT);
    const caller = await verifyAuth(request);
    const userId = caller.uid;
    const { orderId, expectedDrops } = bodySchema.parse(await request.json());

    const captureData = await capturePayPalOrder(orderId);
    const captureSchema = z.object({
      status: z.string(),
      purchase_units: z.array(
        z.object({
          custom_id: z.string().optional(),
          payments: z.object({
            captures: z.array(
              z.object({
                id: z.string().optional(),
                custom_id: z.string().optional(),
                amount: z.object({ currency_code: z.string(), value: z.string() }),
                seller_receivable_breakdown: z.object({
                  paypal_fee: z.object({ currency_code: z.string(), value: z.string() }).optional(),
                  net_amount: z.object({ currency_code: z.string(), value: z.string() }).optional(),
                }).optional(),
              })
            ),
          }),
        })
      ),
    });

    const parsed = captureSchema.parse(captureData);
    if (parsed.status !== "COMPLETED") {
      logFailedTransaction(userId, orderId, expectedDrops, "Payment was not completed initially in PayPal");
      return NextResponse.json({ error: "Payment was not completed" }, { status: 400 });
    }

    const capture = parsed.purchase_units[0]?.payments.captures[0];
    if (!capture || capture.amount.currency_code !== "USD") {
      logFailedTransaction(userId, orderId, expectedDrops, "Invalid currency or missing capture data");
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const paidAmountStr = Number.parseFloat(capture.amount.value).toFixed(2);

    // Strict backend secondary verification
    let expectedPrice: string | null = null;
    let dropsToCredit: number | null = null;

    if (expectedDrops >= 5000 && expectedDrops <= 100000 && expectedDrops % 1000 === 0) {
      expectedPrice = ((expectedDrops / 1000) * 5).toFixed(2);
    } else {
      const packageEntry = Object.entries(VALID_PACKAGES).find(([_, drops]) => drops === expectedDrops);
      if (packageEntry) expectedPrice = packageEntry[0];
    }

    // Ensures the package exists / mathematical logic is met, AND that the exact price matches PayPal
    if (!expectedPrice || paidAmountStr !== expectedPrice) {
      logFailedTransaction(userId, orderId, expectedDrops, `Package mismatch: paid ${paidAmountStr} for expected ${expectedDrops} drops`);
      return NextResponse.json({ error: "Payment package mismatch" }, { status: 400 });
    }

    dropsToCredit = expectedDrops;
    const paidUsd = Number.parseFloat(paidAmountStr);
    const paypalFeeUsd = (() => {
      const rawFee = capture.seller_receivable_breakdown?.paypal_fee;
      if (!rawFee || rawFee.currency_code !== "USD") {
        return undefined;
      }

      return Number.parseFloat(rawFee.value);
    })();
    const netRevenueUsd = (() => {
      const rawNet = capture.seller_receivable_breakdown?.net_amount;
      if (!rawNet || rawNet.currency_code !== "USD") {
        return undefined;
      }

      return Number.parseFloat(rawNet.value);
    })();
    const economics = deriveGumdropEconomics(dropsToCredit, paidUsd, {
      paypalFeeUsd,
      netRevenueUsd,
    });
    const bundlePresentation = getBundlePresentation(dropsToCredit);

    const customId = capture.custom_id || parsed.purchase_units[0]?.custom_id;
    if (customId) {
      const [capturedUserId] = customId.split(":");
      if (capturedUserId !== userId) {
        logFailedTransaction(userId, orderId, expectedDrops, "User identity mismatch in capture payload");
        return NextResponse.json({ error: "User verification failed" }, { status: 403 });
      }
    }

    if (!adminDb) return NextResponse.json({ error: "Database not available" }, { status: 500 });

    const paymentLockRef = adminDb.collection("paymentLocks").doc(orderId);
    const userRef = adminDb.collection("users").doc(userId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const existingLock = await transaction.get(paymentLockRef);
      if (existingLock.exists) {
        return { duplicate: true };
      }

      const userSnapshot = await transaction.get(userRef);
      const userData = userSnapshot.data() ?? {};
      const username = typeof userData.username === "string" && userData.username.trim().length > 0
        ? userData.username.trim()
        : typeof userData.displayName === "string" && userData.displayName.trim().length > 0
          ? userData.displayName.trim()
          : caller.email || userId;

      transaction.update(userRef, { gumDropsBalance: FieldValue.increment(dropsToCredit) });
      transaction.set(adminDb.collection("transactions").doc(), {
        userId,
        type: "purchase_currency",
        amount: dropsToCredit,
        cost: paidUsd,
        grossRevenueUsd: economics.grossRevenueUsd,
        grossRevenueCents: economics.grossRevenueCents,
        paypalFeeUsd: economics.paypalFeeUsd,
        paypalFeeCents: economics.paypalFeeCents,
        netRevenueUsd: economics.netRevenueUsd,
        netRevenueCents: economics.netRevenueCents,
        deliveredGumDrops: economics.deliveredGumDrops,
        paidGumDrops: economics.paidGumDrops,
        bonusGumDrops: economics.bonusGumDrops,
        retailValueUsd: economics.retailValueUsd,
        retailValueCents: economics.retailValueCents,
        bonusValueUsd: economics.bonusValueUsd,
        bonusValueCents: economics.bonusValueCents,
        adjustedProfitUsd: economics.adjustedProfitUsd,
        adjustedProfitCents: economics.adjustedProfitCents,
        discountUsd: economics.discountUsd,
        discountCents: economics.discountCents,
        effectiveUsdPer100Gd: economics.effectiveUsdPer100Gd,
        effectiveCentsPer100Gd: economics.effectiveCentsPer100Gd,
        effectiveYieldRatio: economics.effectiveYieldRatio,
        bundleLabel: bundlePresentation.bundleLabel,
        bundleKey: bundlePresentation.bundleKey,
        bundleTier: bundlePresentation.bundleTier,
        description: `Purchased ${dropsToCredit} Gum Drops`,
        currency: "USD",
        paymentId: orderId,
        paypalCaptureId: capture.id,
        status: "completed",
        timestamp: FieldValue.serverTimestamp(),
        verifiedServerSide: true,
      });

      transaction.set(paymentLockRef, {
        orderId,
        userId,
        drops: dropsToCredit,
        captureId: capture.id ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Track server-side event for analytics
      trackServerEvent("purchase_verified", {
        transaction_id: orderId,
        value: paidUsd,
        currency: "USD",
        items_count: dropsToCredit,
        paypal_fee_usd: economics.paypalFeeUsd,
        net_revenue_usd: economics.netRevenueUsd,
        paid_gumdrops: economics.paidGumDrops,
        bonus_gumdrops: economics.bonusGumDrops,
        adjusted_profit_usd: economics.adjustedProfitUsd,
        bundle_key: bundlePresentation.bundleKey,
      }, userId).catch(err => console.error("Server-side tracking failed:", err));

      return { duplicate: false, username };
    });

    if (result.duplicate) {
      return NextResponse.json({ success: true, drops: dropsToCredit, duplicate: true }, { status: 200 });
    }

    await recordCanonicalTaskEvent(userId, result.username ?? caller.email ?? userId, "gumdrops_purchase_completed", {
      package_drops: dropsToCredit,
      purchase_value: paidUsd,
      bundle_key: bundlePresentation.bundleKey,
      bundle_tier: bundlePresentation.bundleTier,
      bonus_gumdrops: economics.bonusGumDrops,
      order_id: orderId,
    });

    return NextResponse.json({ success: true, drops: dropsToCredit });
  } catch (error) {
    // We cannot easily determine orderId and expectedDrops cleanly here if parsing fails,
    // but the global handleApiError will still capture the throw.
    return handleApiError(error, "PayPal.Capture");
  }
}

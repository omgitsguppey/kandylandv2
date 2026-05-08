import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { trackServerEvent } from "@/lib/server/analytics";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { deriveGumdropEconomics, getBundlePresentation } from "@/lib/gumdrop-economics";
import { buildPaidPurchaseBalanceCredit, buildSourceAwareBalancePatch, computeNextGumdropBalance, creditSourceAwareGumdrops, normalizeGumdropBalance, readSourceAwareBalance } from "@/lib/gumdrop-ledger";
import { buildChatPaidGdLowBalanceReminderAfterPaidRefill, normalizeChatPaidGdLowBalanceReminderState } from "@/lib/chat";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { recordCanonicalTaskEvent } from "@/lib/server/daily-tasks";
import { guardApiRequest } from "@/lib/server/request-guard";
import { resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";
import { buildPurchaseSourceOfFundsBreakdown } from "@/lib/platform-economy";
import type { UserProfile } from "@/types/db";
import { touchUserRuntime } from "@/lib/server/user-runtime";
import { capturePayPalOrder } from "@/lib/server/paypal";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

const bodySchema = z.object({
  orderId: z.string().min(1),
  expectedDrops: z.number().int().positive(),
});

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
    recordRouteWarning("paypal/capture", "Failed to log failed transaction", err, {
      channel: "commerce",
      detail: {
        userId,
        orderId,
        expectedDrops,
        reason,
      },
    });
  }
}

async function POST_handler(request: NextRequest) {
  try {
    const caller = await guardApiRequest(request, {
      routeName: "paypal/capture",
      rateLimit: SENSITIVE_WRITE,
      requireTrustedOrigin: true,
      auth: "user",
      scopeToCaller: true,
    });
    const userId = caller?.uid ?? "";
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
      recordRouteWarning("paypal/capture", "PayPal capture returned a non-completed status", undefined, {
        channel: "commerce",
        detail: {
          userId,
          orderId,
          expectedDrops,
          paypalStatus: parsed.status,
        },
      });
      void logFailedTransaction(userId, orderId, expectedDrops, "Payment was not completed initially in PayPal");
      return NextResponse.json({ error: "Payment was not completed" }, { status: 400 });
    }

    const capture = parsed.purchase_units[0]?.payments.captures[0];
    if (!capture || capture.amount.currency_code !== "USD") {
      recordRouteWarning("paypal/capture", "PayPal capture returned invalid currency or missing capture data", undefined, {
        channel: "commerce",
        detail: {
          userId,
          orderId,
          expectedDrops,
          currencyCode: capture?.amount.currency_code,
        },
      });
      void logFailedTransaction(userId, orderId, expectedDrops, "Invalid currency or missing capture data");
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const paidAmountStr = Number.parseFloat(capture.amount.value).toFixed(2);

    // Strict backend secondary verification
    const expectedPrice = resolveExpectedGumdropPrice(expectedDrops);
    let dropsToCredit: number | null = null;

    // Ensures the package exists / mathematical logic is met, AND that the exact price matches PayPal
    if (!expectedPrice || paidAmountStr !== expectedPrice) {
      recordRouteWarning("paypal/capture", "PayPal package verification failed", undefined, {
        channel: "commerce",
        detail: {
          userId,
          orderId,
          expectedDrops,
          expectedPrice: expectedPrice ?? "missing",
          paidAmount: paidAmountStr,
        },
      });
      void logFailedTransaction(userId, orderId, expectedDrops, `Package mismatch: paid ${paidAmountStr} for expected ${expectedDrops} drops`);
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
    const [capturedUserId, capturedDropsRaw] = typeof customId === "string" ? customId.split(":") : [];
    const capturedExpectedDrops = /^\d+$/u.test(capturedDropsRaw ?? "")
      ? Number.parseInt(capturedDropsRaw ?? "", 10)
      : Number.NaN;
    if (!customId || !capturedUserId || !Number.isInteger(capturedExpectedDrops)) {
      recordRouteWarning("paypal/capture", "PayPal capture was missing its server-created identity binding", undefined, {
        channel: "commerce",
        detail: {
          userId,
          orderId,
          expectedDrops,
          customIdPresent: Boolean(customId),
        },
      });
      void logFailedTransaction(userId, orderId, expectedDrops, "Missing user identity in capture payload");
      return NextResponse.json({ error: "User verification failed" }, { status: 403 });
    }

    if (capturedUserId !== userId || capturedExpectedDrops !== expectedDrops) {
      recordRouteWarning("paypal/capture", "PayPal user or package verification failed", undefined, {
        channel: "commerce",
        detail: {
          userId,
          orderId,
          expectedDrops,
          capturedUserId,
          capturedExpectedDrops,
        },
      });
      void logFailedTransaction(userId, orderId, expectedDrops, "User identity or package mismatch in capture payload");
      return NextResponse.json({ error: "User verification failed" }, { status: 403 });
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
      const sourceAwareBalance = readSourceAwareBalance(userData);
      const currentBalance = normalizeGumdropBalance(sourceAwareBalance.total);
      const purchaseCredit = buildPaidPurchaseBalanceCredit({
        deliveredGumDrops: economics.deliveredGumDrops,
        paidGumDrops: economics.paidGumDrops,
        bonusGumDrops: economics.bonusGumDrops,
      });
      const nextBalance = computeNextGumdropBalance(currentBalance, purchaseCredit.purchasedCreditGumDrops);
      const nextSourceAwareBalance = creditSourceAwareGumdrops(
        sourceAwareBalance,
        purchaseCredit.purchasedCreditGumDrops,
        "purchased",
      );
      const username = typeof userData.username === "string" && userData.username.trim().length > 0
        ? userData.username.trim()
        : typeof userData.displayName === "string" && userData.displayName.trim().length > 0
          ? userData.displayName.trim()
          : caller?.email || userId;

      const purchaseTransactionRef = adminDb.collection("transactions").doc();
      const sourceOfFundsBreakdown = buildPurchaseSourceOfFundsBreakdown({
        paidBaseGd: economics.paidGumDrops,
        paidBonusGd: economics.bonusGumDrops,
        rewardPromoGd: 0,
      });

      const chatPaidGdReminderState = normalizeChatPaidGdLowBalanceReminderState(userData.chatPaidGdLowBalanceReminder);
      const shouldResetChatPaidGdReminder = sourceAwareBalance.purchased < 100 && nextSourceAwareBalance.purchased >= 100;
      const nextChatPaidGdReminderState = shouldResetChatPaidGdReminder
        ? buildChatPaidGdLowBalanceReminderAfterPaidRefill({
            current: chatPaidGdReminderState,
            previousPaidBalanceGd: sourceAwareBalance.purchased,
            nextPaidBalanceGd: nextSourceAwareBalance.purchased,
            reminderCycleId: `paid_refill:${orderId}`,
          })
        : chatPaidGdReminderState;

      transaction.update(userRef, {
        ...buildSourceAwareBalancePatch(nextSourceAwareBalance),
        ...(shouldResetChatPaidGdReminder ? {
          chatPaidGdLowBalanceReminder: nextChatPaidGdReminderState,
        } : {}),
      });
      transaction.set(purchaseTransactionRef, buildCompletedGumdropTransaction({
        userId,
        type: "purchase_currency",
        amount: dropsToCredit,
        description: `Purchased ${dropsToCredit} Gum Drops`,
        balanceBefore: currentBalance,
        balanceAfter: nextBalance,
        extra: {
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
          purchaseBonusGumDrops: purchaseCredit.purchaseBonusGumDrops,
          purchasedBalanceCreditGumDrops: purchaseCredit.purchasedCreditGumDrops,
          rewardBalanceCreditGumDrops: purchaseCredit.rewardCreditGumDrops,
          purchaseSourceClassification: purchaseCredit.sourceClassification,
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
          packageId: bundlePresentation.bundleKey,
          promoId: null,
          offerId: null,
          priceUsdBeforeDiscount: economics.retailValueUsd,
          priceUsdPaid: economics.grossRevenueUsd,
          rewardPromoGd: 0,
          sourceOfFundsBreakdown,
          idempotencyKey: orderId,
          orderId,
          currency: "USD",
          paymentId: orderId,
          paypalCaptureId: capture.id,
          transactionId: purchaseTransactionRef.id,
          sourceTruth: "server_purchase_transaction",
        },
      }));

      transaction.set(paymentLockRef, {
        orderId,
        userId,
        drops: dropsToCredit,
        captureId: capture.id ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        duplicate: false,
        username,
        transactionId: purchaseTransactionRef.id,
        chatPaidGdReminderReset: shouldResetChatPaidGdReminder,
        nextPaidBalanceGd: nextSourceAwareBalance.purchased,
      };
    });

    if (result.duplicate) {
      return NextResponse.json({ success: true, drops: dropsToCredit, duplicate: true }, { status: 200 });
    }

    const [analyticsResult, taskEventResult, chatReminderResetResult] = await Promise.allSettled([
      trackServerEvent("server_purchase_verified", {
        order_id: orderId,
        transaction_id: result.transactionId ?? orderId,
        purchase_id: result.transactionId ?? orderId,
        paypal_capture_id: capture.id,
        value: paidUsd,
        value_usd: paidUsd,
        amount_usd: paidUsd,
        currency: "USD",
        purchase_source: "paypal_capture",
        sourceTruth: "canonical",
        route: "/api/paypal/capture",
        source_component: "paypal_capture_route",
        items_count: dropsToCredit,
        paypal_fee_usd: economics.paypalFeeUsd,
        net_revenue_usd: economics.netRevenueUsd,
        paid_gumdrops: economics.paidGumDrops,
        delivered_gumdrops: economics.deliveredGumDrops,
        bonus_gumdrops: economics.bonusGumDrops,
        adjusted_profit_usd: economics.adjustedProfitUsd,
        bundle_key: bundlePresentation.bundleKey,
        package_id: bundlePresentation.bundleKey,
      }, userId),
      recordCanonicalTaskEvent(userId, result.username ?? caller?.email ?? userId, "gumdrops_purchase_completed", {
        package_drops: dropsToCredit,
        purchase_value: paidUsd,
        bundle_key: bundlePresentation.bundleKey,
        bundle_tier: bundlePresentation.bundleTier,
        bonus_gumdrops: economics.bonusGumDrops,
        order_id: orderId,
        transaction_id: result.transactionId ?? orderId,
      }),
      result.chatPaidGdReminderReset
        ? trackServerEvent("chat_low_paid_gd_reminder_reset", {
            source_component: "paypal_capture_route",
            route: "/api/paypal/capture",
            paid_balance_gd: result.nextPaidBalanceGd,
            required_min_paid_gd: 1,
            subscriber_free_chat_applies: false,
            transaction_id: result.transactionId ?? orderId,
          }, userId)
        : Promise.resolve(null),
    ]);

    if (analyticsResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Purchase verified analytics sync failed", analyticsResult.reason, {
        channel: "analytics",
        detail: {
          userId,
          orderId,
          expectedDrops: dropsToCredit,
        },
      });
    }
    if (taskEventResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Purchase completed but daily task progress sync failed", taskEventResult.reason, {
        channel: "analytics",
        detail: {
          userId,
          orderId,
          expectedDrops: dropsToCredit,
        },
      });
    }
    if (chatReminderResetResult.status === "rejected") {
      recordRouteWarning("paypal/capture", "Chat paid GumDrops reminder reset tracking failed", chatReminderResetResult.reason, {
        channel: "analytics",
        detail: {
          userId,
          orderId,
          expectedDrops: dropsToCredit,
        },
      });
    }

    const updatedUserSnapshot = await userRef.get();
    const updatedUserData = (updatedUserSnapshot.data() ?? {}) as Partial<UserProfile>;
    await touchUserRuntime(userId, {
      activity: true,
      profile: true,
    });

    return NextResponse.json({
      success: true,
      drops: dropsToCredit,
      transactionId: result.transactionId ?? orderId,
      gumDropsBalance: Number.isFinite(updatedUserData.gumDropsBalance)
        ? Number(updatedUserData.gumDropsBalance)
        : null,
      dailyTasksState: (updatedUserData.dailyTasksState ?? null) as DailyTasksState | null,
    });
  } catch (error) {
    // We cannot easily determine orderId and expectedDrops cleanly here if parsing fails,
    // but the global handleApiError will still capture the throw.
    return handleApiError(error, "PayPal.Capture");
  }
}

export let POST = withRouteRuntimeHealth("paypal/capture:POST", POST_handler);

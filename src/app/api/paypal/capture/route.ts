import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAuth, AuthError, handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";

// PayPal API base URLs
const PAYPAL_BASE_URL =
    process.env.NEXT_PUBLIC_PAYPAL_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

// Get the correct client ID + secret based on environment
function getPayPalCredentials() {
    const isProduction = process.env.NEXT_PUBLIC_PAYPAL_ENV === "production";
    const clientId = isProduction
        ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
        : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX;
    const clientSecret = isProduction
        ? process.env.PAYPAL_CLIENT_SECRET_LIVE
        : process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
    return { clientId, clientSecret };
}

// Get an OAuth2 access token from PayPal
async function getPayPalAccessToken(): Promise<string> {
    const { clientId, clientSecret } = getPayPalCredentials();
    if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("PayPal OAuth Error:", errorText);
        throw new Error("Failed to obtain PayPal access token");
    }

    const data = await response.json();
    return data.access_token;
}

// Capture an approved PayPal order (server-side)
async function capturePayPalOrder(orderId: string): Promise<any> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
        `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("PayPal Capture Error:", errorText);
        throw new Error(`PayPal capture failed: ${response.status}`);
    }

    return response.json();
}

// Valid packages — must match client-side PACKAGES exactly
const VALID_PACKAGES: Record<string, number> = {
    "1.00": 100,
    "5.00": 550,
    "10.00": 1100,
    "20.00": 2500,
};

export async function POST(request: NextRequest) {
    try {
        const caller = await verifyAuth(request);

        const body = await request.json();
        const { orderId, expectedDrops } = body;

        // Use verified UID from token
        const userId = caller.uid;

        // Validate inputs
        if (!orderId || !expectedDrops) {
            return NextResponse.json(
                { error: "Missing required fields: orderId, expectedDrops" },
                { status: 400 }
            );
        }

        // 1. CAPTURE the order server-side (this is where PayPal confirms the payment)
        const captureData = await capturePayPalOrder(orderId);

        // 2. VERIFY the capture was successful
        if (captureData.status !== "COMPLETED") {
            console.error("PayPal order not completed:", captureData.status);
            return NextResponse.json(
                { error: "Payment was not completed" },
                { status: 400 }
            );
        }

        // 3. VERIFY the payment amount matches an expected package
        const capturedAmount =
            captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount;

        if (!capturedAmount) {
            console.error("No capture amount found in PayPal response");
            return NextResponse.json(
                { error: "Invalid payment data" },
                { status: 400 }
            );
        }

        const paidAmountStr = parseFloat(capturedAmount.value).toFixed(2);
        const paidCurrency = capturedAmount.currency_code;

        if (paidCurrency !== "USD") {
            console.error("Unexpected currency:", paidCurrency);
            return NextResponse.json(
                { error: "Invalid currency" },
                { status: 400 }
            );
        }

        // 4. MAP the paid amount to the correct drop count (server-side truth)
        const dropsToCredit = VALID_PACKAGES[paidAmountStr];
        if (!dropsToCredit) {
            console.error("Paid amount doesn't match any package:", paidAmountStr);
            return NextResponse.json(
                { error: "Invalid payment amount" },
                { status: 400 }
            );
        }

        // 5. VERIFY the custom_id contains the correct userId (anti-spoofing)
        const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
            || captureData.purchase_units?.[0]?.custom_id;
        if (customId) {
            const [capturedUserId] = customId.split(":");
            if (capturedUserId !== userId) {
                console.error("User ID mismatch:", capturedUserId, "vs", userId);
                return NextResponse.json(
                    { error: "User verification failed" },
                    { status: 403 }
                );
            }
        }

        // 6. CHECK for duplicate processing (idempotency)
        if (!adminDb) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 500 }
            );
        }

        const existingTx = await adminDb
            .collection("transactions")
            .where("paymentId", "==", orderId)
            .where("status", "==", "completed")
            .limit(1)
            .get();

        if (!existingTx.empty) {
            console.warn("Duplicate payment detected:", orderId);
            return NextResponse.json(
                { success: true, drops: dropsToCredit, duplicate: true },
                { status: 200 }
            );
        }

        // 7. CREDIT the user (atomic batch: update balance + record transaction)
        const batch = adminDb.batch();

        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, {
            gumDropsBalance: FieldValue.increment(dropsToCredit),
        });

        const transactionRef = adminDb.collection("transactions").doc();
        batch.set(transactionRef, {
            userId,
            type: "purchase",
            amount: dropsToCredit,
            cost: parseFloat(paidAmountStr),
            currency: "USD",
            paymentId: orderId,
            paypalCaptureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            status: "completed",
            timestamp: FieldValue.serverTimestamp(),
            verifiedServerSide: true,
        });

        await batch.commit();

        console.log(
            `✅ Payment verified & credited: ${dropsToCredit} drops to user ${userId} (Order: ${orderId})`
        );

        return NextResponse.json({
            success: true,
            drops: dropsToCredit,
        });
    } catch (error) {
        return handleApiError(error, "PayPal.Capture");
    }
}

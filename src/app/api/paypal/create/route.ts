import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, STRICT } from "@/lib/server/rate-limit";

const bodySchema = z.object({
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

export async function POST(request: NextRequest) {
    try {
        checkRateLimit(request, "paypal/create", STRICT);
        const caller = await verifyAuth(request);
        const userId = caller.uid;
        const { expectedDrops } = bodySchema.parse(await request.json());

        // 1. Validate the requested amount securely
        let validPrice: string | null = null;

        // Mathematical dynamic VIP tier between 5,000 and 100,000 in 1k increments
        if (expectedDrops >= 5000 && expectedDrops <= 100000 && expectedDrops % 1000 === 0) {
            validPrice = ((expectedDrops / 1000) * 5).toFixed(2);
        }
        // Fallback to strict predefined packages constraints
        else {
            const packageEntry = Object.entries(VALID_PACKAGES).find(([_, drops]) => drops === expectedDrops);
            if (packageEntry) validPrice = packageEntry[0];
        }

        if (!validPrice) {
            return NextResponse.json({ error: "Invalid drop package requested" }, { status: 400 });
        }

        const price = validPrice;

        // 2. Obtain PayPal Access Token
        const accessToken = await getPayPalAccessToken();

        // 3. Create the order securely on the backend
        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                application_context: {
                    shipping_preference: "NO_SHIPPING",
                },
                purchase_units: [
                    {
                        description: `${expectedDrops} Gum Drops - Virtual Currency`,
                        amount: {
                            currency_code: "USD",
                            value: price,
                        },
                        custom_id: `${userId}:${expectedDrops}`, // Include user ID and Drops for capture validation
                    },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create PayPal order: ${response.statusText}`);
        }

        const orderData = await response.json();

        if (!orderData.id) {
            throw new Error("PayPal returned an invalid order payload.");
        }

        // 4. Send the secured order ID back to the client
        return NextResponse.json({ id: orderData.id });

    } catch (error) {
        return handleApiError(error, "PayPal.CreateOrder");
    }
}

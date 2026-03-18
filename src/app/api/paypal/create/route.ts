import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/server/auth";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";

const bodySchema = z.object({
    expectedDrops: z.number().int().positive(),
});

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
        const caller = await guardApiRequest(request, {
            routeName: "paypal/create",
            rateLimit: SENSITIVE_WRITE,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        const userId = caller?.uid ?? "";
        const { expectedDrops } = bodySchema.parse(await request.json());

        const price = resolveExpectedGumdropPrice(expectedDrops);
        if (!price) {
            return NextResponse.json({ error: "Invalid drop package requested" }, { status: 400 });
        }

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

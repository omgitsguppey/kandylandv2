import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/server/auth";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";
import { createPayPalOrder, getPayPalAccessToken } from "@/lib/server/paypal";
import { paypalOrderIdSchema, persistPendingPayPalOrder } from "@/lib/server/paypal-order-state";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const PAYPAL_CREATE_BODY_LIMIT_BYTES = 32_768;

const bodySchema = z.object({
    expectedDrops: z.number().int().positive(),
});

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "paypal/create",
            rateLimit: SENSITIVE_WRITE,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        const userId = caller?.uid ?? "";
        const rawBody = await readBoundedJsonBody<unknown>(request, {
            maxBytes: PAYPAL_CREATE_BODY_LIMIT_BYTES,
            routeName: "paypal/create",
        });
        const { expectedDrops } = bodySchema.parse(rawBody);

        const price = resolveExpectedGumdropPrice(expectedDrops);
        if (!price) {
            recordRouteWarning("paypal/create", "Rejected invalid gumdrop package", undefined, {
                channel: "commerce",
                detail: {
                    userId,
                    expectedDrops,
                },
            });
            return NextResponse.json({
                error: "Invalid drop package requested",
                code: "invalid_payment_request",
                retryable: false,
            }, { status: 400 });
        }

        let orderData: Record<string, unknown>;
        try {
            const accessToken = await getPayPalAccessToken();
            orderData = await createPayPalOrder({
                accessToken,
                userId,
                expectedDrops,
                price,
            });
        } catch (providerError) {
            recordRouteWarning("paypal/create", "PayPal order creation failed", providerError, {
                channel: "commerce",
                detail: { userId, expectedDrops },
            });
            return NextResponse.json({
                error: "Payment order is temporarily unavailable",
                code: "payment_failed",
                retryable: true,
            }, { status: 502 });
        }
        const parsedOrder = z.object({ id: paypalOrderIdSchema }).safeParse(orderData);
        if (!parsedOrder.success) {
            recordRouteWarning("paypal/create", "PayPal returned an invalid order payload", undefined, {
                channel: "commerce",
                detail: { userId, expectedDrops },
            });
            return NextResponse.json({
                error: "Payment order could not be verified",
                code: "payment_failed",
                retryable: false,
            }, { status: 502 });
        }

        await persistPendingPayPalOrder({
            orderId: parsedOrder.data.id,
            userId,
            expectedDrops,
            expectedPrice: price,
        });

        return NextResponse.json({
            id: parsedOrder.data.id,
            transactionId: parsedOrder.data.id,
        });

    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({
                error: error.message,
                code: error.code,
                retryable: false,
            }, { status: error.status });
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: "Choose a valid GumDrop package.",
                code: "invalid_payment_request",
                retryable: false,
                details: error.issues.map((issue) => issue.message).slice(0, 8),
            }, { status: 400 });
        }
        return handleApiError(error, "PayPal.CreateOrder");
    }
}

export let POST = withRouteRuntimeHealth("paypal/create:POST", POST_handler);

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/server/auth";
import { SENSITIVE_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { resolveExpectedGumdropPrice } from "@/lib/gumdrops-packages";
import { createPayPalOrder, getPayPalAccessToken } from "@/lib/server/paypal";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const bodySchema = z.object({
    expectedDrops: z.number().int().positive(),
});

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
            recordRouteWarning("paypal/create", "Rejected invalid gumdrop package", undefined, {
                channel: "commerce",
                detail: {
                    userId,
                    expectedDrops,
                },
            });
            return NextResponse.json({ error: "Invalid drop package requested" }, { status: 400 });
        }

        const accessToken = await getPayPalAccessToken();
        const orderData = await createPayPalOrder({
            accessToken,
            userId,
            expectedDrops,
            price,
        });
        const parsedOrder = z.object({ id: z.string().min(1) }).safeParse(orderData);
        if (!parsedOrder.success) {
            throw new Error("PayPal returned an invalid order payload.");
        }

        return NextResponse.json({ id: parsedOrder.data.id });

    } catch (error) {
        return handleApiError(error, "PayPal.CreateOrder");
    }
}

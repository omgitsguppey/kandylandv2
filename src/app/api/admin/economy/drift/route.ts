import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildPlatformEconomyDriftReport } from "@/lib/server/platform-economy";

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/economy/drift",
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const drift = await buildPlatformEconomyDriftReport();
        return NextResponse.json({
            success: true,
            generatedAtUtc: new Date().toISOString(),
            sourceTruth: "platform_economy",
            freshnessState: drift.length > 0 ? "review" : "live",
            drift,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        });
    } catch (error) {
        return handleApiError(error, "admin/economy/drift");
    }
}

export const GET = GET_handler;

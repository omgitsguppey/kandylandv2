import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { readPlatformEconomyRedemptions } from "@/lib/server/platform-economy";

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/economy/redemptions",
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const url = new URL(request.url);
        const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
        const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "20", 10);
        const redemptions = await readPlatformEconomyRedemptions({ page, pageSize });

        return NextResponse.json({
            success: true,
            generatedAtUtc: new Date().toISOString(),
            sourceTruth: "platform_economy",
            freshnessState: "live",
            redemptions,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        });
    } catch (error) {
        return handleApiError(error, "admin/economy/redemptions");
    }
}

export const GET = GET_handler;

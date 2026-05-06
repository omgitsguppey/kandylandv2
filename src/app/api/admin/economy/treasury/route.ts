import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildPlatformEconomyTreasurySummary } from "@/lib/server/platform-economy";

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/economy/treasury",
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const url = new URL(request.url);
        const walletPage = Number.parseInt(url.searchParams.get("walletPage") || "1", 10);
        const walletPageSize = Number.parseInt(url.searchParams.get("walletPageSize") || "20", 10);
        const treasury = await buildPlatformEconomyTreasurySummary({ walletPage, walletPageSize });

        return NextResponse.json({
            success: true,
            sourceTruth: "platform_economy",
            treasury,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        });
    } catch (error) {
        return handleApiError(error, "admin/economy/treasury");
    }
}

export const GET = GET_handler;

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { savePlatformEconomyPromo, PlatformEconomyMutationError } from "@/lib/server/platform-economy-mutations";
import { readPlatformEconomyPromos } from "@/lib/server/platform-economy";

function handleMutationError(error: unknown) {
    if (error instanceof PlatformEconomyMutationError) {
        return NextResponse.json({ error: error.message, errorCode: error.code }, { status: error.status });
    }
    return null;
}

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/economy/promos",
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const promos = await readPlatformEconomyPromos();
        return NextResponse.json({
            success: true,
            generatedAtUtc: new Date().toISOString(),
            sourceTruth: "platform_economy",
            freshnessState: "live",
            promos,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        });
    } catch (error) {
        return handleApiError(error, "admin/economy/promos");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/economy/promos",
            rateLimit: ADMIN,
            auth: "admin",
            requireTrustedOrigin: true,
            scopeToCaller: true,
        });

        const body = await request.json() as Record<string, unknown>;
        const record = await savePlatformEconomyPromo({
            body,
            actorUid: caller?.uid ?? "",
            mode: "create",
        });

        return NextResponse.json({ success: true, promo: record }, { status: 201 });
    } catch (error) {
        return handleMutationError(error) ?? handleApiError(error, "admin/economy/promos:POST");
    }
}

async function PATCH_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/economy/promos",
            rateLimit: ADMIN,
            auth: "admin",
            requireTrustedOrigin: true,
            scopeToCaller: true,
        });

        const body = await request.json() as Record<string, unknown>;
        const record = await savePlatformEconomyPromo({
            promoId: typeof body.promoId === "string" ? body.promoId : undefined,
            body,
            actorUid: caller?.uid ?? "",
            mode: "update",
        });

        return NextResponse.json({ success: true, promo: record });
    } catch (error) {
        return handleMutationError(error) ?? handleApiError(error, "admin/economy/promos:PATCH");
    }
}

export const GET = GET_handler;
export const POST = POST_handler;
export const PATCH = PATCH_handler;

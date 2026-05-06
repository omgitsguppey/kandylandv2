import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { savePlatformEconomyPackage, PlatformEconomyMutationError } from "@/lib/server/platform-economy-mutations";
import { readPlatformEconomyPackages } from "@/lib/server/platform-economy";

function handleMutationError(error: unknown) {
    if (error instanceof PlatformEconomyMutationError) {
        return NextResponse.json({ error: error.message, errorCode: error.code }, { status: error.status });
    }
    return null;
}

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/economy/packages",
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const packages = await readPlatformEconomyPackages();
        return NextResponse.json({
            success: true,
            generatedAtUtc: new Date().toISOString(),
            sourceTruth: "platform_economy",
            freshnessState: "live",
            packages,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        });
    } catch (error) {
        return handleApiError(error, "admin/economy/packages");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/economy/packages",
            rateLimit: ADMIN,
            auth: "admin",
            requireTrustedOrigin: true,
            scopeToCaller: true,
        });

        const body = await request.json() as Record<string, unknown>;
        const record = await savePlatformEconomyPackage({
            body,
            actorUid: caller?.uid ?? "",
            mode: "create",
        });

        return NextResponse.json({ success: true, package: record }, { status: 201 });
    } catch (error) {
        return handleMutationError(error) ?? handleApiError(error, "admin/economy/packages:POST");
    }
}

async function PATCH_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/economy/packages",
            rateLimit: ADMIN,
            auth: "admin",
            requireTrustedOrigin: true,
            scopeToCaller: true,
        });

        const body = await request.json() as Record<string, unknown>;
        const record = await savePlatformEconomyPackage({
            packageId: typeof body.packageId === "string" ? body.packageId : undefined,
            body,
            actorUid: caller?.uid ?? "",
            mode: "update",
        });

        return NextResponse.json({ success: true, package: record });
    } catch (error) {
        return handleMutationError(error) ?? handleApiError(error, "admin/economy/packages:PATCH");
    }
}

export const GET = GET_handler;
export const POST = POST_handler;
export const PATCH = PATCH_handler;

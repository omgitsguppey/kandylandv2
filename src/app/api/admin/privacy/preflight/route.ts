import { NextRequest, NextResponse } from "next/server";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { buildAdminPrivacyConsoleState } from "@/lib/server/admin-privacy-console";
import { ADMIN, HEAVY_READ, RateLimitError } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function GET_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/privacy/preflight",
            preAuthRouteName: "admin/privacy/preflight/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const range = request.nextUrl.searchParams.get("range");
        const state = await buildAdminPrivacyConsoleState(range);
        const response = NextResponse.json(state, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
        return response;
    } catch (error) {
        if (error instanceof AuthError || error instanceof RateLimitError) {
            return handleApiError(error, "Admin.PrivacyPreflight.GET");
        }
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Admin privacy preflight failed.",
        }, { status: 503 });
    }
}

export const GET = withRouteRuntimeHealth("admin/privacy/preflight:GET", GET_handler);

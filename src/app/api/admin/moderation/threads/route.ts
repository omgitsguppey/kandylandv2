import { NextRequest, NextResponse } from "next/server";

import {
    type AdminModerationRouteErrorResponse,
    type AdminModerationThreadsResponse,
} from "@/lib/admin-moderation";
import { listAdminModerationThreads } from "@/lib/server/admin-moderation";
import { AuthError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildThreadsRouteError(error: unknown): { body: AdminModerationRouteErrorResponse; status: number } {
    if (error instanceof AuthError) {
        return {
            status: error.status,
            body: {
                success: false,
                error: error.status === 403 ? "Admin permission required." : error.message,
                errorCode: error.status === 403 ? "forbidden" : "unauthorized",
                adminModerationRoute: true,
                adminOnly: true,
                moderationThreadsGuarded: true,
            },
        };
    }

    return {
        status: 503,
        body: {
            success: false,
            error: "Moderation threads are unavailable right now.",
            errorCode: "moderation_threads_unavailable",
            adminModerationRoute: true,
            adminOnly: true,
            moderationThreadsGuarded: true,
        },
    };
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/moderation/threads:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/moderation/threads",
            preAuthRouteName: "admin/moderation/threads/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const generatedAtMs = Date.now();
        const body: AdminModerationThreadsResponse = {
            success: true,
            generatedAtMs,
            freshnessMs: generatedAtMs,
            threads: await listAdminModerationThreads(),
        };

        return finalize(NextResponse.json(body, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const routeError = buildThreadsRouteError(error);
        return finalize(NextResponse.json(routeError.body, { status: routeError.status }), error);
    }
}

import { NextRequest, NextResponse } from "next/server";

import {
    type AdminModerationRouteErrorResponse,
    type AdminModerationThreadDetailResponse,
} from "@/lib/admin-moderation";
import { getAdminModerationThreadDetail } from "@/lib/server/admin-moderation";
import { AuthError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
    params: Promise<{
        threadId: string;
    }>;
};

function buildThreadDetailRouteError(error: unknown): { body: AdminModerationRouteErrorResponse; status: number } {
    if (error instanceof AuthError) {
        return {
            status: error.status,
            body: {
                success: false,
                error: error.status === 403 ? "Admin permission required." : error.message,
                errorCode: error.status === 403 ? "forbidden" : "unauthorized",
                adminModerationRoute: true,
                adminOnly: true,
                moderationThreadDetailGuarded: true,
            },
        };
    }

    return {
        status: 503,
        body: {
            success: false,
            error: "Moderation thread detail is unavailable right now.",
            errorCode: "moderation_thread_detail_unavailable",
            adminModerationRoute: true,
            adminOnly: true,
            moderationThreadDetailGuarded: true,
        },
    };
}

export async function GET(request: NextRequest, context: RouteContext) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/moderation/threads/[threadId]:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/moderation/thread",
            preAuthRouteName: "admin/moderation/thread/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const { threadId } = await context.params;
        const generatedAtMs = Date.now();
        const detail = await getAdminModerationThreadDetail(threadId);
        const body: AdminModerationThreadDetailResponse = {
            success: true,
            generatedAtMs,
            freshnessMs: generatedAtMs,
            thread: detail.thread,
            messages: detail.messages,
        };

        return finalize(NextResponse.json(body, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const routeError = buildThreadDetailRouteError(error);
        return finalize(NextResponse.json(routeError.body, { status: routeError.status }), error);
    }
}

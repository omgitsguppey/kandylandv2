import { NextRequest, NextResponse } from "next/server";

import { type AdminModerationThreadDetailResponse } from "@/lib/admin-moderation";
import { getAdminModerationThreadDetail } from "@/lib/server/admin-moderation";
import { handleApiError } from "@/lib/server/auth";
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
        return finalize(handleApiError(error, "admin/moderation/thread"), error);
    }
}

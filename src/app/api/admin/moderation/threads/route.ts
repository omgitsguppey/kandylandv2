import { NextRequest, NextResponse } from "next/server";

import { type AdminModerationThreadsResponse } from "@/lib/admin-moderation";
import { listAdminModerationThreads } from "@/lib/server/admin-moderation";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        return finalize(handleApiError(error, "admin/moderation/threads"), error);
    }
}

import { NextRequest, NextResponse } from "next/server";

import { AuthError, handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { listSupportThreadsForAdmin } from "@/lib/server/support-threads";
import { normalizeSupportThreadStatus } from "@/lib/support-readiness";

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/support/threads:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/support/threads",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        if (!caller) {
            throw new AuthError("Unauthorized", 401);
        }

        const statusParam = request.nextUrl.searchParams.get("status");
        const userIdParam = request.nextUrl.searchParams.get("userId")?.trim() || null;
        const threads = await listSupportThreadsForAdmin({
            status: statusParam && statusParam !== "all" ? normalizeSupportThreadStatus(statusParam) : "all",
            userId: userIdParam,
            limit: 200,
        });

        const openCount = threads.filter((thread) => thread.status === "open" || thread.status === "pending" || thread.status === "waiting_on_support").length;
        const waitingOnUserCount = threads.filter((thread) => thread.status === "waiting_on_user").length;
        const resolvedCount = threads.filter((thread) => thread.status === "resolved" || thread.status === "closed").length;

        return finalize(NextResponse.json({
            success: true,
            threads,
            summary: {
                total: threads.length,
                openCount,
                waitingOnUserCount,
                resolvedCount,
            },
            verification: buildServerAdminModuleVerification({
                module: "admin_support_threads",
                canonicalSource: "support_threads",
                fallbackSource: null,
                freshnessTimestamp: Date.now(),
                countComposition: {
                    total: threads.length,
                    openCount,
                    waitingOnUserCount,
                    resolvedCount,
                },
            }),
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/support/threads"), error);
    }
}

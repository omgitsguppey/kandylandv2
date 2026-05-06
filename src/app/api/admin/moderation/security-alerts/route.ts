import { NextRequest, NextResponse } from "next/server";

import {
    type AdminModerationRouteErrorResponse,
    type AdminModerationSecurityAlertsResponse,
} from "@/lib/admin-moderation";
import { listAdminModerationSecurityAlerts } from "@/lib/server/admin-moderation";
import { AuthError } from "@/lib/server/auth";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildSecurityAlertsRouteError(error: unknown): { body: AdminModerationRouteErrorResponse; status: number } {
    if (error instanceof AuthError) {
        return {
            status: error.status,
            body: {
                success: false,
                error: error.status === 403 ? "Admin permission required." : error.message,
                errorCode: error.status === 403 ? "forbidden" : "unauthorized",
                adminModerationRoute: true,
                adminOnly: true,
                moderationAlertsGuarded: true,
            },
        };
    }

    return {
        status: 503,
        body: {
            success: false,
            error: "Moderation alerts are unavailable right now.",
            errorCode: "moderation_alerts_unavailable",
            adminModerationRoute: true,
            adminOnly: true,
            moderationAlertsGuarded: true,
        },
    };
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/moderation/security-alerts:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/moderation/security-alerts",
            preAuthRouteName: "admin/moderation/security-alerts/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const generatedAtMs = Date.now();
        const body: AdminModerationSecurityAlertsResponse = {
            success: true,
            generatedAtMs,
            freshnessMs: generatedAtMs,
            alerts: await listAdminModerationSecurityAlerts(),
            verification: buildServerAdminModuleVerification({
                module: "admin_moderation_security_alerts",
                canonicalSource: "security_log",
                fallbackSource: "route_runtime_health",
                freshnessTimestamp: generatedAtMs,
            }),
        };

        return finalize(NextResponse.json(body, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const routeError = buildSecurityAlertsRouteError(error);
        return finalize(NextResponse.json(routeError.body, { status: routeError.status }), error);
    }
}

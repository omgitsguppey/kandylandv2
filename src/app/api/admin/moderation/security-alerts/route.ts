import { NextRequest, NextResponse } from "next/server";

import { type AdminModerationSecurityAlertsResponse } from "@/lib/admin-moderation";
import { listAdminModerationSecurityAlerts } from "@/lib/server/admin-moderation";
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
        };

        return finalize(NextResponse.json(body, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, "admin/moderation/security-alerts"), error);
    }
}

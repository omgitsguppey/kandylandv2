import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import {
    ADMIN_UI_TEST_SESSION_COOKIE_KEY,
    isAdminUiTestSessionRuntimeEnabled,
    normalizeAdminUiTestSessionCookieValue,
    resolveAdminUiTestSession,
} from "@/lib/admin/admin-ui-test-session";
import { buildAdminDebugControlTowerModel } from "@/lib/admin-debug-control-tower";
import { loadAdminDebugControlTower } from "@/lib/server/admin-debug-control-tower-loader";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

function isLocalAdminUiTestSessionRequest(request: NextRequest) {
    if (!isAdminUiTestSessionRuntimeEnabled()) {
        return false;
    }

    const rawSession = normalizeAdminUiTestSessionCookieValue(
        request.cookies.get(ADMIN_UI_TEST_SESSION_COOKIE_KEY)?.value,
    );
    const resolved = resolveAdminUiTestSession({ rawValue: rawSession });
    return resolved.status === "ready" && resolved.userProfile?.role === "admin";
}

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/debug/control-tower:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        if (isLocalAdminUiTestSessionRequest(request)) {
            const model = buildAdminDebugControlTowerModel({
                debugEvidenceSource: "generated",
            });

            return finalize(NextResponse.json(model, {
                headers: {
                    "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
                    "X-Admin-Ui-Test-Session": "source-reports-only",
                },
            }));
        }

        await guardApiRequest(request, {
            routeName: "admin/debug/control-tower",
            preAuthRouteName: "admin/debug/control-tower/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const model = await loadAdminDebugControlTower({ evidenceLimit: 60 });

        return finalize(NextResponse.json(model, {
            headers: {
                "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
            },
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Admin.Debug.ControlTower.GET"), error);
    }
}

export const GET = withRouteRuntimeHealth("admin/debug/control-tower:GET", GET_handler);

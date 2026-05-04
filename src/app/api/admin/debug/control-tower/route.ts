import { NextRequest, NextResponse } from "next/server";

import { buildAdminDebugControlTowerModel } from "@/lib/admin-debug-control-tower";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { listRecentDebugEvidence } from "@/lib/server/debug-evidence-store";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

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
        await guardApiRequest(request, {
            routeName: "admin/debug/control-tower",
            preAuthRouteName: "admin/debug/control-tower/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const debugEvidence = await listRecentDebugEvidence({ limit: 60 });
        const model = buildAdminDebugControlTowerModel({
            debugEvidence,
            debugEvidenceSource: debugEvidence.length > 0 ? "firestore" : "generated",
        });

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

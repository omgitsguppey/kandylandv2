export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import type { AdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { handleApiError } from "@/lib/server/auth";
import { listAdminUiChartHealth, saveAdminUiChartHealth } from "@/lib/server/admin-ui-chart-health";
import { ADMIN, HEAVY_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

function isAdminUiChartHealthItem(value: unknown): value is AdminUiChartHealthItem {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const item = value as Record<string, unknown>;
    return typeof item.key === "string"
        && typeof item.title === "string"
        && typeof item.page === "string"
        && typeof item.category === "string"
        && typeof item.source === "string"
        && typeof item.status === "string"
        && typeof item.hydrationState === "string"
        && typeof item.hasData === "boolean"
        && typeof item.summary === "string"
        && typeof item.action === "string"
        && typeof item.issueCount === "number"
        && Array.isArray(item.issueMessages)
        && typeof item.updatedAtMs === "number";
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/ui-chart-health:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        await guardApiRequest(request, {
            routeName: "admin/ui-chart-health",
            preAuthRouteName: "admin/ui-chart-health/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            auth: "admin",
            scopeToCaller: true,
        });

        const items = await listAdminUiChartHealth();

        return finalize(NextResponse.json({
            success: true,
            items,
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Admin.UiChartHealth.GET"), error);
    }
}

export async function PUT(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/ui-chart-health:PUT",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const authResult = await guardApiRequest(request, {
            routeName: "admin/ui-chart-health",
            preAuthRouteName: "admin/ui-chart-health/preauth",
            preAuthRateLimit: HEAVY_READ,
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });
        if (!authResult) {
            return finalize(NextResponse.json({ error: "Admin authentication is required." }, { status: 401 }));
        }

        const body = await request.json().catch(() => ({}));
        const rawItems = Array.isArray(body?.items) ? body.items : [];
        const items = rawItems.filter(isAdminUiChartHealthItem);

        if (items.length === 0) {
            return finalize(NextResponse.json({
                error: "No valid chart health items were provided.",
            }, { status: 400 }));
        }

        await saveAdminUiChartHealth({
            items,
            actorUid: authResult.uid,
            actorEmail: authResult.email ?? null,
        });

        return finalize(NextResponse.json({
            success: true,
            itemCount: items.length,
        }));
    } catch (error) {
        return finalize(handleApiError(error, "Admin.UiChartHealth.PUT"), error);
    }
}

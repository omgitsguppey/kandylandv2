import { NextRequest, NextResponse } from "next/server";

import { isAdminAiDropCoverSelectableModel } from "@/lib/ai-drop-covers";
import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import { buildAdminAiDropCoverDashboard, saveAdminAiDropCoverSettings } from "@/lib/server/ai-drop-covers";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { ADMIN_AI_CONTROL, ADMIN_AI_DASHBOARD_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function finalize(startedAt: number, key: RouteRuntimeHealthKey, response: NextResponse, error?: unknown) {
    void recordRouteRuntimeSample({
        key,
        durationMs: Date.now() - startedAt,
        statusCode: response.status,
        errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
}

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers",
            preAuthRouteName: "admin/ai/drop-covers/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const dashboard = await buildAdminAiDropCoverDashboard();

        return finalize(startedAt, "admin/ai/drop-covers:GET", NextResponse.json({
            ...dashboard,
            verification: buildServerAdminModuleVerification({
                module: "admin_ai_drop_covers",
                canonicalSource: "admin_ai_drop_cover_summary+admin_ai_drop_cover_jobs",
                fallbackSource: "route_runtime_health",
                freshnessTimestamp: Number(dashboard.refreshedAtMs) || Date.now(),
                degradedReason: dashboard.runtime?.status && dashboard.runtime.status !== "ready"
                    ? `runtime_${dashboard.runtime.status}`
                    : null,
                status: dashboard.runtime?.status === "ready"
                    ? "live"
                    : dashboard.runtime?.status === "disabled"
                        ? "fallback"
                        : dashboard.runtime?.status === "error"
                            ? "failed"
                            : "degraded",
                countComposition: {
                    generationCount: Number(dashboard.aggregate?.generationCount) || 0,
                    successfulGenerationCount: Number(dashboard.aggregate?.successfulGenerationCount) || 0,
                    failedGenerationCount: Number(dashboard.aggregate?.failedGenerationCount) || 0,
                },
            }),
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ai/drop-covers:GET", handleApiError(error, "admin/ai/drop-covers"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            enabled?: unknown;
            model?: unknown;
            optimizerEnabled?: unknown;
            useTemplateReference?: unknown;
            useRecentDropCoverReferences?: unknown;
        };
        const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
        if (requestedModel && !isAdminAiDropCoverSelectableModel(requestedModel)) {
            return finalize(startedAt, "admin/ai/drop-covers:PUT", NextResponse.json({ error: "Unsupported default AI image model" }, { status: 400 }));
        }
        if (
            typeof body.enabled !== "boolean"
            && typeof body.optimizerEnabled !== "boolean"
            && !requestedModel
            && typeof body.useTemplateReference !== "boolean"
            && typeof body.useRecentDropCoverReferences !== "boolean"
        ) {
            return finalize(startedAt, "admin/ai/drop-covers:PUT", NextResponse.json({ error: "Missing AI settings update fields" }, { status: 400 }));
        }

        const settings = await saveAdminAiDropCoverSettings({
            enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
            model: requestedModel && isAdminAiDropCoverSelectableModel(requestedModel) ? requestedModel : undefined,
            optimizerEnabled: typeof body.optimizerEnabled === "boolean" ? body.optimizerEnabled : undefined,
            useTemplateReference: typeof body.useTemplateReference === "boolean" ? body.useTemplateReference : undefined,
            useRecentDropCoverReferences: typeof body.useRecentDropCoverReferences === "boolean" ? body.useRecentDropCoverReferences : undefined,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-covers:PUT", NextResponse.json({
            success: true,
            settings,
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ai/drop-covers:PUT", handleApiError(error, "admin/ai/drop-covers"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ai/drop-covers:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/ai/drop-covers:PUT", PUT_handler);

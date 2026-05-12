import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import {
    buildAdminAiDropDescriptionDashboard,
    saveAdminAiDropDescriptionSettings,
} from "@/lib/server/ai-drop-descriptions";
import { ADMIN_AI_CONTROL, ADMIN_AI_DASHBOARD_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const MAX_ADMIN_AI_JSON_BODY_BYTES = 128_000;

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
            routeName: "admin/ai/drop-descriptions",
            preAuthRouteName: "admin/ai/drop-descriptions/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
            maxBodyBytes: MAX_ADMIN_AI_JSON_BODY_BYTES,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions:GET", NextResponse.json(await buildAdminAiDropDescriptionDashboard(), {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ai/drop-descriptions:GET", handleApiError(error, "admin/ai/drop-descriptions"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-descriptions",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            enabled?: unknown;
            model?: unknown;
            optimizerEnabled?: unknown;
        };

        if (
            typeof body.enabled !== "boolean"
            && typeof body.model !== "string"
            && typeof body.optimizerEnabled !== "boolean"
        ) {
            return finalize(startedAt, "admin/ai/drop-descriptions:PUT", NextResponse.json({ error: "Missing AI description settings update fields" }, { status: 400 }));
        }

        const settings = await saveAdminAiDropDescriptionSettings({
            enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
            model: typeof body.model === "string" ? body.model.trim() : undefined,
            optimizerEnabled: typeof body.optimizerEnabled === "boolean" ? body.optimizerEnabled : undefined,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions:PUT", NextResponse.json({
            success: true,
            settings,
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ai/drop-descriptions:PUT", handleApiError(error, "admin/ai/drop-descriptions"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ai/drop-descriptions:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/ai/drop-descriptions:PUT", PUT_handler);

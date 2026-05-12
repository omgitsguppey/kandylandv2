import { NextRequest, NextResponse } from "next/server";

import {
    toAdminAiDropCoverClientError,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
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
            routeName: "admin/ai/drop-covers/prompt-policy",
            preAuthRouteName: "admin/ai/drop-covers/prompt-policy/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:GET", NextResponse.json({
            success: false,
            code: "cover_prompt_refinement_blocked",
            message: "LLM prompt refinement is deprecated. Deterministic cover prompt compiler is canonical.",
            deterministic: true,
            dataCoverPromptSource: "deterministic-compiler",
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        },));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:GET", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:GET", handleApiError(error, "admin/ai/drop-covers/prompt-policy"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/prompt-policy",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
            maxBodyBytes: MAX_ADMIN_AI_JSON_BODY_BYTES,
        });
        return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:PUT", NextResponse.json({
            success: false,
            code: "cover_prompt_refinement_blocked",
            message: "Prompt-policy writes are blocked. Use deterministic compiler weights only.",
        }, { status: 409 }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:PUT", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/prompt-policy:PUT", handleApiError(error, "admin/ai/drop-covers/prompt-policy"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ai/drop-covers/prompt-policy:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/ai/drop-covers/prompt-policy:PUT", PUT_handler);

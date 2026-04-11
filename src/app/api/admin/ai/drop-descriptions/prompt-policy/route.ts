import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import { saveAdminAiDropDescriptionPromptPolicy } from "@/lib/server/ai-drop-descriptions";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

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

export async function PUT(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-descriptions/prompt-policy",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            baseInstructionPrompt?: unknown;
            lockedClauses?: unknown;
            mutableClauses?: unknown;
            currentMutablePrompt?: unknown;
            autoOptimize?: unknown;
        };

        const policy = await saveAdminAiDropDescriptionPromptPolicy({
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
            baseInstructionPrompt: typeof body.baseInstructionPrompt === "string" ? body.baseInstructionPrompt : undefined,
            lockedClauses: Array.isArray(body.lockedClauses) ? body.lockedClauses.filter((entry): entry is string => typeof entry === "string") : undefined,
            mutableClauses: Array.isArray(body.mutableClauses) ? body.mutableClauses.filter((entry): entry is string => typeof entry === "string") : undefined,
            currentMutablePrompt: typeof body.currentMutablePrompt === "string" ? body.currentMutablePrompt : undefined,
            autoOptimize: typeof body.autoOptimize === "boolean" ? body.autoOptimize : undefined,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions/prompt-policy:PUT", NextResponse.json({
            success: true,
            promptPolicy: policy,
        }));
    } catch (error) {
        return finalize(startedAt, "admin/ai/drop-descriptions/prompt-policy:PUT", handleApiError(error, "admin/ai/drop-descriptions/prompt-policy"), error);
    }
}

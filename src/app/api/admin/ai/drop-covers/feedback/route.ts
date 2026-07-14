import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import { updateAdminAiDropCoverFeedback } from "@/lib/server/ai-drop-covers";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

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

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/feedback",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
            maxBodyBytes: MAX_ADMIN_AI_JSON_BODY_BYTES,
        });

        const body = await readBoundedJsonBody<{
            jobId?: unknown;
            action?: unknown;
            dropId?: unknown;
        }>(request, {
            maxBytes: MAX_ADMIN_AI_JSON_BODY_BYTES,
            routeName: "admin/ai/drop-covers/feedback:POST",
            allowEmpty: false,
        });

        if (typeof body.jobId !== "string" || body.jobId.trim().length === 0) {
            return finalize(startedAt, "admin/ai/drop-covers/feedback:POST", NextResponse.json({ error: "Missing generation job id" }, { status: 400 }));
        }

        const action = typeof body.action === "string" ? body.action : "";
        if (!["like", "dislike", "accept", "link_drop"].includes(action)) {
            return finalize(startedAt, "admin/ai/drop-covers/feedback:POST", NextResponse.json({ error: "Unsupported feedback action" }, { status: 400 }));
        }

        const job = await updateAdminAiDropCoverFeedback({
            jobId: body.jobId,
            action: action as "like" | "dislike" | "accept" | "link_drop",
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-covers/feedback:POST", NextResponse.json({
            success: true,
            job,
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(startedAt, "admin/ai/drop-covers/feedback:POST", NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                message: error.message,
                retryable: false,
            }, { status: error.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/feedback:POST", handleApiError(error, "admin/ai/drop-covers/feedback"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/ai/drop-covers/feedback:POST", POST_handler);

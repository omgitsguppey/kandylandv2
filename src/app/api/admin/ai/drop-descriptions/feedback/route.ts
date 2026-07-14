import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import {
    toAdminAiDropDescriptionClientError,
    updateAdminAiDropDescriptionFeedback,
} from "@/lib/server/ai-drop-descriptions";
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
            routeName: "admin/ai/drop-descriptions/feedback",
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
            routeName: "admin/ai/drop-descriptions/feedback:POST",
            allowEmpty: false,
        });

        if (!caller?.uid) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
                error: "Admin identity is required.",
                errorCode: "unauthorized",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 401 }));
        }

        if (typeof body.jobId !== "string" || body.jobId.trim().length === 0) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
                error: "Missing generation job id",
                errorCode: "validation_failed",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 400 }));
        }

        const action = typeof body.action === "string" ? body.action : "";
        if (!["like", "dislike", "accept", "link_drop"].includes(action)) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
                error: "Unsupported feedback action",
                errorCode: "validation_failed",
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: 400 }));
        }

        const job = await updateAdminAiDropDescriptionFeedback({
            jobId: body.jobId,
            action: action as "like" | "dislike" | "accept" | "link_drop",
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            actorUid: caller.uid,
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
            success: true,
            job,
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
                success: false,
                code: error.code,
                errorCode: error.code,
                error: error.message,
                message: error.message,
                routeStatus: "expected_typed_client_error",
                retryable: false,
            }, { status: error.status }), error);
        }
        const clientError = toAdminAiDropDescriptionClientError(error);
        if (clientError) {
            return finalize(
                startedAt,
                "admin/ai/drop-descriptions/feedback:POST",
                NextResponse.json(clientError.body, { status: clientError.status }),
                error,
            );
        }
        return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", handleApiError(error, "admin/ai/drop-descriptions/feedback"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/ai/drop-descriptions/feedback:POST", POST_handler);

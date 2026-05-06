import { NextRequest, NextResponse } from "next/server";

import { isAdminAiDropCoverSelectableModel } from "@/lib/ai-drop-covers";
import {
    generateAdminAiDropCover,
    getAdminAiDropCoverSettings,
    toAdminAiDropCoverClientError,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN_AI_GENERATE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "admin/ai/drop-covers/generate:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/generate",
            rateLimit: ADMIN_AI_GENERATE,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const settings = await getAdminAiDropCoverSettings();
        if (!settings.enabled) {
            return finalize(NextResponse.json({
                error: "AI cover generation is turned off.",
                errorCode: "feature_disabled",
            }, { status: 409 }));
        }

        const body = await request.json() as {
            title?: unknown;
            creatorName?: unknown;
            creatorId?: unknown;
            dropId?: unknown;
            draftSessionId?: unknown;
            dropType?: unknown;
            tags?: unknown;
            previousJobId?: unknown;
            clientRequestId?: unknown;
            requestedModel?: unknown;
        };
        const title = typeof body.title === "string" ? body.title.trim() : "";
        if (title.length < 3) {
            return finalize(NextResponse.json({
                error: "Drop title must be at least 3 characters before generating a cover.",
                errorCode: "validation_failed",
            }, { status: 400 }));
        }

        const dropId = typeof body.dropId === "string" ? body.dropId : null;
        const draftSessionId = typeof body.draftSessionId === "string" ? body.draftSessionId.trim() : "";
        const requestedModel = typeof body.requestedModel === "string" ? body.requestedModel.trim() : "";
        if (!dropId && draftSessionId.length < 8) {
            return finalize(NextResponse.json({
                error: "Unsaved drop cover generation requires a valid draft session. Close and reopen Create Drop, then try again.",
                errorCode: "draft_session_required",
            }, { status: 400 }));
        }

        if (requestedModel && !isAdminAiDropCoverSelectableModel(requestedModel)) {
            return finalize(NextResponse.json({
                error: "The requested AI image model is not supported in the create-drop switch.",
                errorCode: "validation_failed",
            }, { status: 400 }));
        }
        const boundedRequestedModel = isAdminAiDropCoverSelectableModel(requestedModel)
            ? requestedModel
            : null;

        const job = await generateAdminAiDropCover({
            title,
            creatorName: typeof body.creatorName === "string" ? body.creatorName : null,
            creatorId: typeof body.creatorId === "string" ? body.creatorId : null,
            dropId,
            draftSessionId: draftSessionId || null,
            dropType: typeof body.dropType === "string" ? body.dropType : null,
            tags: Array.isArray(body.tags) ? body.tags.filter((value): value is string => typeof value === "string") : [],
            previousJobId: typeof body.previousJobId === "string" ? body.previousJobId : null,
            clientRequestId: typeof body.clientRequestId === "string" ? body.clientRequestId.slice(0, 80) : null,
            requestedModel: boundedRequestedModel,
            requestedByUid: caller?.uid || "",
            requestedByEmail: caller?.email,
        });

        return finalize(NextResponse.json({
            success: true,
            job,
            referenceLimitApplied: job.referenceLimitApplied === true,
            requestedReferenceCount: job.referenceRequestCount || 0,
            usedReferenceCount: job.usedReferenceCount ?? job.referenceImageCount ?? 0,
            maxReferenceCount: job.maxReferenceCount ?? 0,
            droppedReferenceCount: job.droppedReferenceCount ?? 0,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(handleApiError(error, "admin/ai/drop-covers/generate"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/ai/drop-covers/generate:POST", POST_handler);

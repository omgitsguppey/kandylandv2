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

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-descriptions/feedback",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            jobId?: unknown;
            action?: unknown;
            dropId?: unknown;
        };

        if (typeof body.jobId !== "string" || body.jobId.trim().length === 0) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({ error: "Missing generation job id" }, { status: 400 }));
        }

        const action = typeof body.action === "string" ? body.action : "";
        if (!["like", "dislike", "accept", "link_drop"].includes(action)) {
            return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({ error: "Unsupported feedback action" }, { status: 400 }));
        }

        const job = await updateAdminAiDropDescriptionFeedback({
            jobId: body.jobId,
            action: action as "like" | "dislike" | "accept" | "link_drop",
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions/feedback:POST", NextResponse.json({
            success: true,
            job,
        }));
    } catch (error) {
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

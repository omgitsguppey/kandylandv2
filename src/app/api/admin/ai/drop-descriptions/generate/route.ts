import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import {
    generateAdminAiDropDescription,
    toAdminAiDropDescriptionClientError,
} from "@/lib/server/ai-drop-descriptions";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
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

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-descriptions/generate",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            title?: unknown;
            creatorId?: unknown;
            creatorName?: unknown;
            dropId?: unknown;
            draftSessionId?: unknown;
            previousJobId?: unknown;
        };

        if (typeof body.title !== "string" || body.title.trim().length === 0) {
            return finalize(startedAt, "admin/ai/drop-descriptions/generate:POST", NextResponse.json({ error: "Missing drop title" }, { status: 400 }));
        }

        const job = await generateAdminAiDropDescription({
            title: body.title,
            creatorId: typeof body.creatorId === "string" ? body.creatorId : null,
            creatorName: typeof body.creatorName === "string" ? body.creatorName : null,
            dropId: typeof body.dropId === "string" ? body.dropId : null,
            draftSessionId: typeof body.draftSessionId === "string" ? body.draftSessionId : null,
            previousJobId: typeof body.previousJobId === "string" ? body.previousJobId : null,
            requestedByUid: caller?.uid || "",
            requestedByEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions/generate:POST", NextResponse.json({
            success: true,
            job,
        }));
    } catch (error) {
        const clientError = toAdminAiDropDescriptionClientError(error);
        if (clientError) {
            return finalize(
                startedAt,
                "admin/ai/drop-descriptions/generate:POST",
                NextResponse.json(clientError.body, { status: clientError.status }),
                error,
            );
        }
        return finalize(startedAt, "admin/ai/drop-descriptions/generate:POST", handleApiError(error, "admin/ai/drop-descriptions/generate"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/ai/drop-descriptions/generate:POST", POST_handler);

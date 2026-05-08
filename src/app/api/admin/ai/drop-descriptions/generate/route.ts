import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { handleApiError } from "@/lib/server/auth";
import {
    generateAdminAiDropDescription,
    toAdminAiDropDescriptionClientError,
} from "@/lib/server/ai-drop-descriptions";
import { compileDropDescriptionOptions } from "@/lib/drop-descriptions/drop-description-compiler";
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
    let parsedBody: {
        title?: unknown;
        creatorId?: unknown;
        creatorName?: unknown;
        dropId?: unknown;
        draftSessionId?: unknown;
        previousJobId?: unknown;
    } = {};
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-descriptions/generate",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        parsedBody = await request.json() as typeof parsedBody;

        if (typeof parsedBody.title !== "string" || parsedBody.title.trim().length === 0) {
            return finalize(startedAt, "admin/ai/drop-descriptions/generate:POST", NextResponse.json({ error: "Missing drop title" }, { status: 400 }));
        }

        const job = await generateAdminAiDropDescription({
            title: parsedBody.title,
            creatorId: typeof parsedBody.creatorId === "string" ? parsedBody.creatorId : null,
            creatorName: typeof parsedBody.creatorName === "string" ? parsedBody.creatorName : null,
            dropId: typeof parsedBody.dropId === "string" ? parsedBody.dropId : null,
            draftSessionId: typeof parsedBody.draftSessionId === "string" ? parsedBody.draftSessionId : null,
            previousJobId: typeof parsedBody.previousJobId === "string" ? parsedBody.previousJobId : null,
            requestedByUid: caller?.uid || "",
            requestedByEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-descriptions/generate:POST", NextResponse.json({
            success: true,
            job,
            dataDescriptionSource: "deterministic-patterns",
            dataDescriptionAiPolish: "optional",
        }));
    } catch (error) {
        if (typeof parsedBody.title === "string" && parsedBody.title.trim().length >= 3) {
            const compiled = compileDropDescriptionOptions({
                title: parsedBody.title,
                creatorSelectedName: typeof parsedBody.creatorName === "string" ? parsedBody.creatorName : null,
                creatorDisplayName: typeof parsedBody.creatorName === "string" ? parsedBody.creatorName : null,
            });
            const now = Date.now();
            return finalize(
                startedAt,
                "admin/ai/drop-descriptions/generate:POST",
                NextResponse.json({
                    success: true,
                    deterministicFallback: true,
                    dataDescriptionSource: "deterministic-patterns",
                    dataDescriptionAiPolish: "optional",
                    descriptionOptions: compiled.options,
                    job: {
                        id: `deterministic-${now}`,
                        title: parsedBody.title.trim(),
                        creatorId: typeof parsedBody.creatorId === "string" ? parsedBody.creatorId : null,
                        creatorName: typeof parsedBody.creatorName === "string" ? parsedBody.creatorName : null,
                        status: "succeeded",
                        descriptionText: compiled.options[0],
                        model: "deterministic-first",
                        requestedAtMs: now,
                        estimatedCostUsd: 0,
                        feedback: "neutral",
                        accepted: false,
                        promptVersion: "description-deterministic-v1",
                    },
                }),
                error,
            );
        }
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

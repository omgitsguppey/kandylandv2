import { NextRequest, NextResponse } from "next/server";

import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import {
    removeAdminAiDropCoverTemplate,
    toAdminAiDropCoverClientError,
    uploadAdminAiDropCoverTemplate,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import {
    isBoundedJsonBodyError,
    isRequestBodyTooLargeError,
    readBoundedFormDataBody,
} from "@/lib/server/bounded-json-body";
import { ADMIN_AI_CONTROL } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_TEMPLATE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TEMPLATE_MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const MAX_TEMPLATE_BODY_BYTES = MAX_TEMPLATE_SIZE_BYTES + MAX_TEMPLATE_MULTIPART_OVERHEAD_BYTES;

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
            routeName: "admin/ai/drop-covers/template",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
            maxBodyBytes: MAX_TEMPLATE_BODY_BYTES,
        });

        const formData = await readBoundedFormDataBody(request, {
            maxBytes: MAX_TEMPLATE_BODY_BYTES,
            routeName: "admin/ai/drop-covers/template",
        });
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({ error: "Missing template file" }, { status: 400 }));
        }

        if (!file.type.startsWith("image/")) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({ error: "Template file must be an image" }, { status: 400 }));
        }

        if (file.size > MAX_TEMPLATE_SIZE_BYTES) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({ error: "Template file must be 10 MB or smaller" }, { status: 400 }));
        }

        const result = await uploadAdminAiDropCoverTemplate({
            fileName: file.name,
            mimeType: file.type,
            bytes: Buffer.from(await file.arrayBuffer()),
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({
            success: true,
            settings: result.settings,
            template: result.template,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        if (isRequestBodyTooLargeError(error)) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({
                error: "Template upload is too large",
                errorCode: "payload_too_large",
                retryable: false,
            }, { status: 413 }), error);
        }
        if (isBoundedJsonBodyError(error)) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json({
                error: error.message,
                errorCode: error.code,
                retryable: false,
            }, { status: error.status }), error);
        }
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/template:POST", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/template:POST", handleApiError(error, "admin/ai/drop-covers/template"), error);
    }
}

async function DELETE_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/template",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
            maxBodyBytes: MAX_TEMPLATE_SIZE_BYTES,
        });

        const settings = await removeAdminAiDropCoverTemplate({
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });

        return finalize(startedAt, "admin/ai/drop-covers/template:DELETE", NextResponse.json({
            success: true,
            settings,
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/template:DELETE", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/template:DELETE", handleApiError(error, "admin/ai/drop-covers/template"), error);
    }
}

export let POST = withRouteRuntimeHealth("admin/ai/drop-covers/template:POST", POST_handler);
export let DELETE = withRouteRuntimeHealth("admin/ai/drop-covers/template:DELETE", DELETE_handler);

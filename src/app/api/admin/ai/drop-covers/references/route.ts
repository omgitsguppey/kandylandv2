import { NextRequest, NextResponse } from "next/server";

import {
    listAdminAiDropCoverLibraryAssets,
    removeAdminAiDropCoverReferenceAsset,
    toAdminAiDropCoverClientError,
    updateAdminAiDropCoverReferenceAsset,
    uploadAdminAiDropCoverReferenceAsset,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { ADMIN_AI_CONTROL, ADMIN_AI_DASHBOARD_READ } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample , withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_REFERENCE_SIZE_BYTES = 10 * 1024 * 1024;

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
            routeName: "admin/ai/drop-covers/references",
            preAuthRouteName: "admin/ai/drop-covers/references/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        return finalize(startedAt, "admin/ai/drop-covers/references:GET", NextResponse.json({
            success: true,
            assets: await listAdminAiDropCoverLibraryAssets(),
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/references:GET", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/references:GET", handleApiError(error, "admin/ai/drop-covers/references"), error);
    }
}

async function POST_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/references",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return finalize(startedAt, "admin/ai/drop-covers/references:POST", NextResponse.json({ error: "Missing reference file" }, { status: 400 }));
        }
        if (!file.type.startsWith("image/")) {
            return finalize(startedAt, "admin/ai/drop-covers/references:POST", NextResponse.json({ error: "Reference file must be an image" }, { status: 400 }));
        }
        if (file.size > MAX_REFERENCE_SIZE_BYTES) {
            return finalize(startedAt, "admin/ai/drop-covers/references:POST", NextResponse.json({ error: "Reference file must be 10 MB or smaller" }, { status: 400 }));
        }

        const asset = await uploadAdminAiDropCoverReferenceAsset({
            fileName: file.name,
            mimeType: file.type,
            bytes: Buffer.from(await file.arrayBuffer()),
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
            primary: formData.get("primary") === "true",
            pinned: formData.get("pinned") === "true",
        });

        return finalize(startedAt, "admin/ai/drop-covers/references:POST", NextResponse.json({
            success: true,
            asset,
        }, {
            status: 201,
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/references:POST", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/references:POST", handleApiError(error, "admin/ai/drop-covers/references"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/references",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            id?: unknown;
            primary?: unknown;
            pinned?: unknown;
            active?: unknown;
        };
        const id = typeof body.id === "string" ? body.id.trim() : "";
        if (!id) {
            return finalize(startedAt, "admin/ai/drop-covers/references:PUT", NextResponse.json({ error: "Missing reference id" }, { status: 400 }));
        }

        const asset = await updateAdminAiDropCoverReferenceAsset({
            id,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
            primary: typeof body.primary === "boolean" ? body.primary : undefined,
            pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
            active: typeof body.active === "boolean" ? body.active : undefined,
        });
        if (!asset) {
            return finalize(startedAt, "admin/ai/drop-covers/references:PUT", NextResponse.json({ error: "Reference not found" }, { status: 404 }));
        }

        return finalize(startedAt, "admin/ai/drop-covers/references:PUT", NextResponse.json({
            success: true,
            asset,
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/references:PUT", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/references:PUT", handleApiError(error, "admin/ai/drop-covers/references"), error);
    }
}

async function DELETE_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/references",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json().catch(() => ({})) as {
            id?: unknown;
        };
        const id = typeof body.id === "string" ? body.id.trim() : "";
        if (!id) {
            return finalize(startedAt, "admin/ai/drop-covers/references:DELETE", NextResponse.json({ error: "Missing reference id" }, { status: 400 }));
        }

        const removed = await removeAdminAiDropCoverReferenceAsset({
            id,
            actorUid: caller?.uid || "",
            actorEmail: caller?.email,
        });
        if (!removed) {
            return finalize(startedAt, "admin/ai/drop-covers/references:DELETE", NextResponse.json({ error: "Reference not found" }, { status: 404 }));
        }

        return finalize(startedAt, "admin/ai/drop-covers/references:DELETE", NextResponse.json({ success: true }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/references:DELETE", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/references:DELETE", handleApiError(error, "admin/ai/drop-covers/references"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ai/drop-covers/references:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/ai/drop-covers/references:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("admin/ai/drop-covers/references:PUT", PUT_handler);
export let DELETE = withRouteRuntimeHealth("admin/ai/drop-covers/references:DELETE", DELETE_handler);

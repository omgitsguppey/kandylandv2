import { NextRequest, NextResponse } from "next/server";

import {
    listAdminAiDropCoverReviewGallery,
    toAdminAiDropCoverClientError,
    updateAdminAiDropCoverReviewGalleryItem,
} from "@/lib/server/ai-drop-covers";
import { handleApiError } from "@/lib/server/auth";
import type { RouteRuntimeHealthKey } from "@/lib/route-runtime-health";
import { ADMIN_AI_CONTROL, ADMIN_AI_DASHBOARD_READ } from "@/lib/server/rate-limit";
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

async function GET_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/review-gallery",
            preAuthRouteName: "admin/ai/drop-covers/review-gallery/preauth",
            preAuthRateLimit: ADMIN_AI_DASHBOARD_READ,
            rateLimit: ADMIN_AI_DASHBOARD_READ,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        return finalize(startedAt, "admin/ai/drop-covers/review-gallery:GET", NextResponse.json({
            success: true,
            items: await listAdminAiDropCoverReviewGallery(),
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/review-gallery:GET", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/review-gallery:GET", handleApiError(error, "admin/ai/drop-covers/review-gallery"), error);
    }
}

async function PUT_handler(request: NextRequest) {
    const startedAt = Date.now();
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/ai/drop-covers/review-gallery",
            rateLimit: ADMIN_AI_CONTROL,
            requireTrustedOrigin: true,
            auth: "admin",
            scopeToCaller: true,
        });

        const body = await request.json() as {
            jobId?: unknown;
            reusable?: unknown;
        };
        const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
        if (!jobId) {
            return finalize(startedAt, "admin/ai/drop-covers/review-gallery:PUT", NextResponse.json({ error: "Missing generation job id" }, { status: 400 }));
        }
        if (typeof body.reusable !== "boolean") {
            return finalize(startedAt, "admin/ai/drop-covers/review-gallery:PUT", NextResponse.json({ error: "Missing reusable flag" }, { status: 400 }));
        }

        return finalize(startedAt, "admin/ai/drop-covers/review-gallery:PUT", NextResponse.json({
            success: true,
            item: await updateAdminAiDropCoverReviewGalleryItem({
                jobId,
                reusable: body.reusable,
                actorUid: caller?.uid || "",
                actorEmail: caller?.email,
            }),
        }));
    } catch (error) {
        const aiError = toAdminAiDropCoverClientError(error);
        if (aiError) {
            return finalize(startedAt, "admin/ai/drop-covers/review-gallery:PUT", NextResponse.json(aiError.body, { status: aiError.status }), error);
        }
        return finalize(startedAt, "admin/ai/drop-covers/review-gallery:PUT", handleApiError(error, "admin/ai/drop-covers/review-gallery"), error);
    }
}

export let GET = withRouteRuntimeHealth("admin/ai/drop-covers/review-gallery:GET", GET_handler);
export let PUT = withRouteRuntimeHealth("admin/ai/drop-covers/review-gallery:PUT", PUT_handler);

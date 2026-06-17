import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { buildCreatorDrop4xxPayload } from "@/lib/creator/drops/creator-drop-4xx-policy";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { sanitizeAdminDropPayload } from "@/lib/drops/drop-submission-contract";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    ADMIN_DROP_REVALIDATION_PATHS,
    invalidateDropSurfaces,
    resolveCreatedDropTiming,
    resolveUpdatedDropTiming,
    shouldValidateDropPublishPayload,
    validateDropPublishState,
} from "@/lib/server/drop-mutations";
import { sendGlobalDropNotification } from "@/lib/server/push-notifications";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN } from "@/lib/server/rate-limit";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

async function POST_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const body = await request.json();
        const { dropData } = body;

        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const publishValidation = validateDropPublishState(dropData);
        if (!publishValidation.ok) {
            return NextResponse.json({
                error: "Invalid drop publish state",
                details: publishValidation.errors,
            }, { status: 400 });
        }

        const sanitized = sanitizeAdminDropPayload(dropData, "admin_route");
        const now = Date.now();
        const resolvedInitial = resolveCreatedDropTiming(dropData, now);
        sanitized.status = resolvedInitial.status;
        if (sanitized.approvalStatus === undefined) {
            sanitized.approvalStatus = "approved";
        }

        const docRef = await adminDb.collection("drops").add({
            ...sanitized,
            totalUnlocks: 0,
            totalViews: 0,
            totalClicks: 0,
            createdAt: FieldValue.serverTimestamp(),
        });
        await invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS, now);

        if (resolvedInitial.status === "active") {
            try {
                await sendGlobalDropNotification(
                    sanitized.title as string,
                    docRef.id,
                    sanitized.imageUrl as string,
                    `drop-activation:${docRef.id}:${resolvedInitial.validFrom}`,
                );
            } catch (notifError) {
                recordRouteWarning("admin/drops", "Failed to generate global notification for new drop", notifError, {
                    channel: "notifications",
                    detail: {
                        dropId: docRef.id,
                        title: sanitized.title as string,
                    },
                });
            }
        }

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.POST");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { dropId, dropData } = await request.json();

        if (!dropId || !dropData) {
            return NextResponse.json({ error: "Missing dropId or data" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const sanitized = sanitizeAdminDropPayload(dropData, "admin_route");
        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        // bounded document read: admin drop edit validates one explicit drop id.
        const existingDropSnap = await dropRef.get();
        if (!existingDropSnap.exists) {
            return buildNotFoundResponse("drop", "Drop not found");
        }

        const existingDrop = normalizeDropRecord(existingDropSnap.data(), dropId);
        if (dropData.approvalStatus === "approved") {
            const nextApprovedDrop = {
                ...existingDrop,
                ...dropData,
                approvalStatus: "approved",
                reviewStatus: "approved",
                publicDiscovery: true,
                rotationEligibility: true,
            };
            const publishValidation = validateDropPublishState(nextApprovedDrop, { existingDrop });
            if (!publishValidation.ok) {
                return NextResponse.json(
                    buildCreatorDrop4xxPayload("media_required", {
                        details: publishValidation.errors,
                        overrideCopy: "Creator drop needs required fields and media before approval.",
                    }),
                    { status: 422 },
                );
            }
        } else if (shouldValidateDropPublishPayload(dropData)) {
            const publishValidation = validateDropPublishState(dropData, { existingDrop });
            if (!publishValidation.ok) {
                return NextResponse.json({
                    error: "Invalid drop publish state",
                    details: publishValidation.errors,
                }, { status: 400 });
            }
        }

        const now = Date.now();
        const nextTiming = resolveUpdatedDropTiming(dropData, existingDrop, now);
        const currentLiveStatus = resolveDropStatusFromTiming(existingDrop, now);
        const nextLiveStatus = nextTiming.status;
        const shouldNotifyActivation = currentLiveStatus !== "active" && nextLiveStatus === "active";
        sanitized.status = nextLiveStatus;
        if (sanitized.approvalStatus === undefined && existingDrop.approvalStatus) {
            sanitized.approvalStatus = existingDrop.approvalStatus;
        }
        if (dropData.approvalStatus === "approved") {
            sanitized.reviewStatus = "approved";
            sanitized.reviewedByAdminId = caller?.uid || "admin";
            sanitized.reviewedAt = now;
            sanitized.publicDiscovery = true;
            sanitized.rotationEligibility = true;
        } else if (dropData.approvalStatus === "rejected") {
            sanitized.reviewStatus = "rejected";
            sanitized.reviewedByAdminId = caller?.uid || "admin";
            sanitized.reviewedAt = now;
            sanitized.publicDiscovery = false;
            sanitized.rotationEligibility = false;
        } else if (dropData.reviewStatus === "needs_changes") {
            sanitized.reviewStatus = "needs_changes";
            sanitized.reviewedByAdminId = caller?.uid || "admin";
            sanitized.reviewedAt = now;
            sanitized.publicDiscovery = false;
            sanitized.rotationEligibility = false;
        }

        await dropRef.update(sanitized);
        await invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS, now);
        if (
            dropData.approvalStatus === "approved"
            || dropData.approvalStatus === "rejected"
            || dropData.reviewStatus === "needs_changes"
        ) {
            const specificReviewEvent = dropData.approvalStatus === "approved"
                ? "admin_creator_drop_approved"
                : dropData.approvalStatus === "rejected"
                    ? "admin_creator_drop_rejected"
                    : "admin_creator_drop_needs_changes";
            const reviewPayload = {
                actorType: "admin",
                actor_type: "admin",
                actorAdminId: caller?.uid || "admin",
                actor_admin_id: caller?.uid || "admin",
                creatorId: existingDrop.creatorId || existingDrop.submittedByCreatorId || "",
                creator_id: existingDrop.creatorId || existingDrop.submittedByCreatorId || "",
                targetCreatorId: existingDrop.creatorId || existingDrop.submittedByCreatorId || "",
                target_creator_id: existingDrop.creatorId || existingDrop.submittedByCreatorId || "",
                dropId,
                drop_id: dropId,
                reviewStatus: String(sanitized.reviewStatus || sanitized.approvalStatus || ""),
                review_status: String(sanitized.reviewStatus || sanitized.approvalStatus || ""),
                sourceTruth: "admin_drop_review",
                source_truth: "admin_drop_review",
                pagePath: "/admin/drops",
                page_path: "/admin/drops",
            };
            await trackServerEvent(specificReviewEvent, reviewPayload, caller?.uid);
            await trackServerEvent("admin_creator_drop_reviewed", {
                ...reviewPayload,
            }, caller?.uid);
        }

        if (shouldNotifyActivation) {
            try {
                await sendGlobalDropNotification(
                    typeof sanitized.title === "string" ? sanitized.title : existingDrop.title,
                    dropId,
                    typeof sanitized.imageUrl === "string" ? sanitized.imageUrl : existingDrop.imageUrl,
                    `drop-activation:${dropId}:${nextTiming.validFrom}`,
                );
            } catch (notifError) {
                recordRouteWarning("admin/drops", "Failed to generate activation notification for updated drop", notifError, {
                    channel: "notifications",
                    detail: {
                        dropId,
                        title: typeof sanitized.title === "string" ? sanitized.title : existingDrop.title,
                    },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.PUT");
    }
}

async function DELETE_handler(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "admin/drops",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        const { dropId } = await request.json();

        if (!dropId) {
            return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        // bounded document read: admin drop delete validates one explicit drop id.
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return buildNotFoundResponse("drop", "Drop not found");
        }

        await dropRef.delete();
        await invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.DELETE");
    }
}

export let POST = withRouteRuntimeHealth("admin/drops:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("admin/drops:PUT", PUT_handler);
export let DELETE = withRouteRuntimeHealth("admin/drops:DELETE", DELETE_handler);

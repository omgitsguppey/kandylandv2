import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { isCreatorRole } from "@/lib/creator-experiences";
import { buildCreatorPendingDropPayload, sanitizeCreatorDropSubmission } from "@/lib/drops/drop-submission-contract";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    CREATOR_DROP_REVALIDATION_PATHS,
    invalidateDropSurfaces,
    resolveUpdatedDropTiming,
    validateDropPublishState,
} from "@/lib/server/drop-mutations";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const CREATOR_DROP_LIST_LIMIT = 100;
const MAX_CREATOR_DROP_BODY_BYTES = 80_000;

function assertBoundedBody(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_CREATOR_DROP_BODY_BYTES) {
        throw new Error("Drop submission is too large.");
    }
}

function readPositiveLimit(request: NextRequest) {
    const raw = Number(request.nextUrl.searchParams.get("limit") || CREATOR_DROP_LIST_LIMIT);
    if (!Number.isFinite(raw) || raw <= 0) {
        return CREATOR_DROP_LIST_LIMIT;
    }
    return Math.min(CREATOR_DROP_LIST_LIMIT, Math.floor(raw));
}

function serializeCreatorDrop(id: string, data: Record<string, unknown>) {
    return {
        id,
        title: typeof data.title === "string" ? data.title : "Untitled Drop",
        description: typeof data.description === "string" ? data.description : "",
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
        status: typeof data.status === "string" ? data.status : "scheduled",
        approvalStatus: typeof data.approvalStatus === "string" ? data.approvalStatus : "pending_review",
        reviewStatus: typeof data.reviewStatus === "string" ? data.reviewStatus : "pending_admin_approval",
        creatorId: typeof data.creatorId === "string" ? data.creatorId : "",
        submittedByCreatorId: typeof data.submittedByCreatorId === "string" ? data.submittedByCreatorId : "",
        submittedByUserId: typeof data.submittedByUserId === "string" ? data.submittedByUserId : "",
        publicDiscovery: data.publicDiscovery === true,
        rotationEligibility: data.rotationEligibility === true,
        sourceTruth: typeof data.sourceTruth === "string" ? data.sourceTruth : "",
    };
}

async function trackCreatorDropEvent(eventName: "creator_drop_submitted" | "creator_drop_updated", input: {
    creatorId: string;
    dropId: string;
    reviewStatus: string;
}) {
    await trackServerEvent(eventName, {
        actorType: "creator",
        actor_type: "creator",
        actorCreatorId: input.creatorId,
        actor_creator_id: input.creatorId,
        creatorId: input.creatorId,
        creator_id: input.creatorId,
        targetCreatorId: input.creatorId,
        target_creator_id: input.creatorId,
        dropId: input.dropId,
        drop_id: input.dropId,
        reviewStatus: input.reviewStatus,
        review_status: input.reviewStatus,
        sourceTruth: "creator_submission_pending_admin_approval",
        source_truth: "creator_submission_pending_admin_approval",
        pagePath: "/dashboard/creator/drops",
        page_path: "/dashboard/creator/drops",
    }, input.creatorId);
}

async function requireCreator(uid: string) {
    if (!adminDb) {
        throw new Error("Database not available");
    }

    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        throw new Error("Creator not found");
    }

    const data = userSnap.data() as Record<string, unknown>;
    if (!isCreatorRole(data.role)) {
        throw new Error("Creator access required");
    }

    const creatorRestrictions = data.creatorRestrictions && typeof data.creatorRestrictions === "object"
        ? data.creatorRestrictions as Record<string, unknown>
        : {};
    if (creatorRestrictions.dropSubmissionsRestricted === true) {
        throw new Error("Drop submissions are restricted for this creator.");
    }

    return data;
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/drops",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await requireCreator(caller.uid);
        const limit = readPositiveLimit(request);
        const dropsById = new Map<string, Record<string, unknown>>();
        const submittedSnap = await adminDb.collection("drops")
            .where("submittedByCreatorId", "==", caller.uid)
            .limit(limit)
            .get();
        const ownedSnap = await adminDb.collection("drops")
            .where("creatorId", "==", caller.uid)
            .limit(limit)
            .get();
        const assignedSnap = await adminDb.collection("drops")
            .where("assignedCreatorIds", "array-contains", caller.uid)
            .limit(limit)
            .get()
            .catch(() => null);

        for (const snap of [submittedSnap, ownedSnap, assignedSnap]) {
            if (!snap) {
                continue;
            }
            snap.docs.forEach((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const submittedByCreatorId = typeof data.submittedByCreatorId === "string" ? data.submittedByCreatorId : "";
                const creatorId = typeof data.creatorId === "string" ? data.creatorId : "";
                const assignedCreatorIds = Array.isArray(data.assignedCreatorIds) ? data.assignedCreatorIds : [];
                if (
                    submittedByCreatorId === caller.uid
                    || creatorId === caller.uid
                    || assignedCreatorIds.includes(caller.uid)
                ) {
                    dropsById.set(doc.id, serializeCreatorDrop(doc.id, data));
                }
            });
        }

        return NextResponse.json({
            success: true,
            drops: Array.from(dropsById.values()).slice(0, limit),
            sourceTruth: "creator_owned_or_assigned_only",
        });
    } catch (error) {
        return handleApiError(error, "Creator.Drops.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/drops",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        assertBoundedBody(request);
        const creatorData = await requireCreator(caller.uid);
        const body = await request.json() as { dropData?: Record<string, unknown> };
        const dropData = body.dropData;
        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }

        let pendingPayload: Record<string, unknown>;
        try {
            pendingPayload = buildCreatorPendingDropPayload(dropData, caller.uid, caller.uid);
        } catch (validationError) {
            return NextResponse.json({
                error: validationError instanceof Error ? validationError.message : "Creator drop submission contains unsafe fields.",
            }, { status: 400 });
        }
        const publishValidation = validateDropPublishState(pendingPayload, {
            creatorIdOverride: caller.uid,
            requireCreator: true,
        });
        if (!publishValidation.ok) {
            return NextResponse.json({
                error: "Invalid drop publish state",
                details: publishValidation.errors,
            }, { status: 400 });
        }

        const now = Date.now();

        const docRef = await adminDb.collection("drops").add({
            ...pendingPayload,
            totalUnlocks: 0,
            totalViews: 0,
            totalClicks: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            creatorDisplayName: typeof creatorData.displayName === "string" ? creatorData.displayName : "Creator",
        });

        await invalidateDropSurfaces(CREATOR_DROP_REVALIDATION_PATHS, now);
        await trackCreatorDropEvent("creator_drop_submitted", {
            creatorId: caller.uid,
            dropId: docRef.id,
            reviewStatus: "pending_admin_approval",
        });

        return NextResponse.json({
            success: true,
            id: docRef.id,
            approvalStatus: "pending_review",
            reviewStatus: "pending_admin_approval",
            adminApprovalRequired: true,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Drops.POST");
    }
}

async function PUT_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/drops",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        assertBoundedBody(request);
        await requireCreator(caller.uid);
        const { dropId, dropData } = await request.json() as { dropId?: string; dropData?: Record<string, unknown> };
        if (!dropId || !dropData) {
            return NextResponse.json({ error: "Missing dropId or drop data" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return buildNotFoundResponse("drop", "Drop not found");
        }

        const existingDrop = normalizeDropRecord(dropSnap.data(), dropId);
        if (existingDrop.submittedByCreatorId !== caller.uid && existingDrop.creatorId !== caller.uid) {
            return NextResponse.json({ error: "You can only edit your own submitted drops." }, { status: 403 });
        }

        const existingReviewStatus = typeof (dropSnap.data() as Record<string, unknown>).reviewStatus === "string"
            ? (dropSnap.data() as Record<string, unknown>).reviewStatus
            : "";
        if (existingDrop.approvalStatus === "approved" || existingReviewStatus === "approved") {
            return NextResponse.json({ error: "Approved drops require admin review before creator edits can go live." }, { status: 409 });
        }

        let sanitized: Record<string, unknown>;
        try {
            sanitized = sanitizeCreatorDropSubmission(dropData, caller.uid, caller.uid);
        } catch (validationError) {
            return NextResponse.json({
                error: validationError instanceof Error ? validationError.message : "Creator drop submission contains unsafe fields.",
            }, { status: 400 });
        }
        const publishValidation = validateDropPublishState(sanitized, {
            existingDrop,
            creatorIdOverride: caller.uid,
            requireCreator: true,
        });
        if (!publishValidation.ok) {
            return NextResponse.json({
                error: "Invalid drop publish state",
                details: publishValidation.errors,
            }, { status: 400 });
        }

        const now = Date.now();
        const { status } = resolveUpdatedDropTiming(dropData, existingDrop, now);

        await dropRef.update({
            ...sanitized,
            status: "pending_review",
            approvalStatus: "pending_review",
            approvalReviewedAt: null,
            approvalReviewedBy: null,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await invalidateDropSurfaces(CREATOR_DROP_REVALIDATION_PATHS, now);
        await trackCreatorDropEvent("creator_drop_updated", {
            creatorId: caller.uid,
            dropId,
            reviewStatus: "pending_admin_approval",
        });

        return NextResponse.json({
            success: true,
            approvalStatus: "pending_review",
            reviewStatus: "pending_admin_approval",
            adminApprovalRequired: true,
            lifecycleStatus: status,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Drops.PUT");
    }
}

export let GET = GET_handler;
export let POST = withRouteRuntimeHealth("creator/drops:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/drops:PUT", PUT_handler);

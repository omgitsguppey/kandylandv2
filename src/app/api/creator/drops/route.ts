import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
    buildCreatorDrop4xxPayload,
    getCreatorDrop4xxPolicy,
    type CreatorDrop4xxClass,
} from "@/lib/creator-drops/creator-drop-4xx-policy";
import { isCreatorRole } from "@/lib/creator-experiences";
import { resolveCreatorDropMetrics } from "@/lib/drops/drop-metrics-resolver";
import { buildCreatorPendingDropPayload, sanitizeCreatorDropSubmission } from "@/lib/drops/drop-submission-contract";
import { resolveDropStatus } from "@/lib/drops/drop-status-resolver";
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

const CREATOR_DROP_LIST_LIMIT = 100;
const MAX_CREATOR_DROP_BODY_BYTES = 80_000;
const CREATOR_DROP_422 = { status: 422 } as const;

class CreatorDropRouteError extends Error {
    errorClass: CreatorDrop4xxClass;
    details: string[];

    constructor(errorClass: CreatorDrop4xxClass, message?: string, details: string[] = []) {
        super(message || getCreatorDrop4xxPolicy(errorClass).safeCreatorCopy);
        this.name = "CreatorDropRouteError";
        this.errorClass = errorClass;
        this.details = details;
    }
}

function isCreatorDropRouteError(error: unknown): error is CreatorDropRouteError {
    return error instanceof CreatorDropRouteError;
}

function creatorDrop4xxResponse(
    errorClass: CreatorDrop4xxClass,
    options: { details?: string[]; overrideCopy?: string; statusCode?: number } = {},
) {
    const policy = getCreatorDrop4xxPolicy(errorClass);
    return NextResponse.json(
        buildCreatorDrop4xxPayload(errorClass, {
            details: options.details,
            overrideCopy: options.overrideCopy,
        }),
        { status: options.statusCode ?? policy.statusCode },
    );
}

function classifyCreatorPublishValidation(errors: string[]): CreatorDrop4xxClass {
    const combined = errors.join(" ").toLowerCase();
    if (combined.includes("cover") || combined.includes("content asset") || combined.includes("media")) {
        return "media_required";
    }
    if (combined.includes("expiration") || combined.includes("start time")) {
        return "invalid_creator_drop_payload";
    }
    return "invalid_creator_drop_payload";
}

function assertBoundedBody(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_CREATOR_DROP_BODY_BYTES) {
        throw new CreatorDropRouteError("invalid_creator_drop_payload", "Drop submission is too large.");
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
    const status = resolveDropStatus(data);
    const metrics = resolveCreatorDropMetrics(data);
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
        createdByRole: typeof data.createdByRole === "string" ? data.createdByRole : "",
        assignedCreatorIds: Array.isArray(data.assignedCreatorIds) ? data.assignedCreatorIds.filter((entry) => typeof entry === "string") : [],
        publicDiscovery: data.publicDiscovery === true,
        rotationEligibility: data.rotationEligibility === true,
        validUntil: typeof data.validUntil === "number" ? data.validUntil : null,
        expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null,
        totalViews: typeof data.totalViews === "number" ? data.totalViews : null,
        totalClicks: typeof data.totalClicks === "number" ? data.totalClicks : null,
        totalUnlocks: typeof data.totalUnlocks === "number" ? data.totalUnlocks : null,
        metrics: metrics.serialized,
        statusResolution: status,
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
        throw new CreatorDropRouteError("creator_not_configured");
    }

    const data = userSnap.data() as Record<string, unknown>;
    if (!isCreatorRole(data.role)) {
        throw new CreatorDropRouteError("creator_not_configured");
    }

    const creatorRestrictions = data.creatorRestrictions && typeof data.creatorRestrictions === "object"
        ? data.creatorRestrictions as Record<string, unknown>
        : {};
    if (creatorRestrictions.dropSubmissionsRestricted === true) {
        throw new CreatorDropRouteError("creator_permission_denied", "Drop submissions are restricted for this creator.");
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
        if (isCreatorDropRouteError(error)) {
            return creatorDrop4xxResponse(error.errorClass, {
                details: error.details,
                overrideCopy: error.message,
            });
        }
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
            return NextResponse.json(buildCreatorDrop4xxPayload("invalid_creator_drop_payload"), CREATOR_DROP_422);
        }

        let pendingPayload: Record<string, unknown>;
        try {
            pendingPayload = buildCreatorPendingDropPayload(dropData, caller.uid, caller.uid);
        } catch (validationError) {
            return NextResponse.json(
                buildCreatorDrop4xxPayload("invalid_creator_drop_payload", {
                    overrideCopy: validationError instanceof Error ? validationError.message : undefined,
                }),
                CREATOR_DROP_422,
            );
        }
        const publishValidation = validateDropPublishState(pendingPayload, {
            creatorIdOverride: caller.uid,
            requireCreator: true,
        });
        if (!publishValidation.ok) {
            const errorClass = classifyCreatorPublishValidation(publishValidation.errors);
            return NextResponse.json(
                buildCreatorDrop4xxPayload(errorClass, {
                    details: publishValidation.errors,
                    overrideCopy: "Some required drop details are missing or invalid.",
                }),
                CREATOR_DROP_422,
            );
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
        if (isCreatorDropRouteError(error)) {
            return creatorDrop4xxResponse(error.errorClass, {
                details: error.details,
                overrideCopy: error.message,
            });
        }
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
        if (!dropId) {
            return NextResponse.json(buildCreatorDrop4xxPayload("missing_creator_drop_id"), CREATOR_DROP_422);
        }
        if (!dropData) {
            return NextResponse.json(buildCreatorDrop4xxPayload("invalid_creator_drop_payload"), CREATOR_DROP_422);
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return creatorDrop4xxResponse("stale_creator_draft");
        }

        const existingDrop = normalizeDropRecord(dropSnap.data(), dropId);
        if (existingDrop.submittedByCreatorId !== caller.uid && existingDrop.creatorId !== caller.uid) {
            return creatorDrop4xxResponse("creator_permission_denied", {
                overrideCopy: "You can only edit your own submitted drops.",
            });
        }

        const existingReviewStatus = typeof (dropSnap.data() as Record<string, unknown>).reviewStatus === "string"
            ? (dropSnap.data() as Record<string, unknown>).reviewStatus
            : "";
        if (existingDrop.approvalStatus === "approved" || existingReviewStatus === "approved") {
            return creatorDrop4xxResponse("approval_required", {
                overrideCopy: "Approved drops require admin review before creator edits can go live.",
            });
        }

        let sanitized: Record<string, unknown>;
        try {
            sanitized = sanitizeCreatorDropSubmission(dropData, caller.uid, caller.uid);
        } catch (validationError) {
            return NextResponse.json(
                buildCreatorDrop4xxPayload("invalid_creator_drop_payload", {
                    overrideCopy: validationError instanceof Error ? validationError.message : undefined,
                }),
                CREATOR_DROP_422,
            );
        }
        const publishValidation = validateDropPublishState(sanitized, {
            existingDrop,
            creatorIdOverride: caller.uid,
            requireCreator: true,
        });
        if (!publishValidation.ok) {
            const errorClass = classifyCreatorPublishValidation(publishValidation.errors);
            return NextResponse.json(
                buildCreatorDrop4xxPayload(errorClass, {
                    details: publishValidation.errors,
                    overrideCopy: "Some required drop details are missing or invalid.",
                }),
                CREATOR_DROP_422,
            );
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
        if (isCreatorDropRouteError(error)) {
            return creatorDrop4xxResponse(error.errorClass, {
                details: error.details,
                overrideCopy: error.message,
            });
        }
        return handleApiError(error, "Creator.Drops.PUT");
    }
}

export let GET = GET_handler;
export let POST = withRouteRuntimeHealth("creator/drops:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/drops:PUT", PUT_handler);

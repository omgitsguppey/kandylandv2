import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { isCreatorRole } from "@/lib/creator-experiences";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    CREATOR_DROP_REVALIDATION_PATHS,
    invalidateDropSurfaces,
    resolveCreatedDropTiming,
    resolveUpdatedDropTiming,
    sanitizeDropData,
} from "@/lib/server/drop-mutations";
import { guardApiRequest } from "@/lib/server/request-guard";
import { STANDARD } from "@/lib/server/rate-limit";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const ALLOWED_DROP_FIELDS = [
    "title", "description", "imageUrl", "contentUrl", "contentUrls", "unlockCost",
    "validFrom", "validUntil", "autoQueueOnExpire", "status", "type", "tags",
    "ctaText", "actionUrl", "accentColor", "fileMetadata", "mediaCounts",
    "coverFileName", "contentFileNames", "requiresActiveSubscription",
] as const;

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

        const creatorData = await requireCreator(caller.uid);
        const body = await request.json() as { dropData?: Record<string, unknown> };
        const dropData = body.dropData;
        if (!dropData) {
            return NextResponse.json({ error: "Missing drop data" }, { status: 400 });
        }

        const sanitized = sanitizeDropData(dropData, ALLOWED_DROP_FIELDS);
        const now = Date.now();
        const { status } = resolveCreatedDropTiming(dropData, now);

        const docRef = await adminDb.collection("drops").add({
            ...sanitized,
            creatorId: caller.uid,
            submittedByCreatorId: caller.uid,
            approvalStatus: "pending_review",
            approvalReviewedAt: null,
            approvalReviewedBy: null,
            approvalNote: null,
            totalUnlocks: 0,
            totalViews: 0,
            totalClicks: 0,
            status,
            createdAt: FieldValue.serverTimestamp(),
            creatorDisplayName: typeof creatorData.displayName === "string" ? creatorData.displayName : "Creator",
        });

        await invalidateDropSurfaces(CREATOR_DROP_REVALIDATION_PATHS, now);

        return NextResponse.json({ success: true, id: docRef.id, approvalStatus: "pending_review" });
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

        const sanitized = sanitizeDropData(dropData, ALLOWED_DROP_FIELDS);
        const now = Date.now();
        const { status } = resolveUpdatedDropTiming(dropData, existingDrop, now);

        await dropRef.update({
            ...sanitized,
            status,
            approvalStatus: "pending_review",
            approvalReviewedAt: null,
            approvalReviewedBy: null,
        });

        await invalidateDropSurfaces(CREATOR_DROP_REVALIDATION_PATHS, now);

        return NextResponse.json({ success: true, approvalStatus: "pending_review" });
    } catch (error) {
        return handleApiError(error, "Creator.Drops.PUT");
    }
}

export let POST = withRouteRuntimeHealth("creator/drops:POST", POST_handler);
export let PUT = withRouteRuntimeHealth("creator/drops:PUT", PUT_handler);

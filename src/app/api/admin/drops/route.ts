import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    ADMIN_DROP_REVALIDATION_PATHS,
    invalidateDropSurfaces,
    resolveCreatedDropTiming,
    resolveUpdatedDropTiming,
    sanitizeDropData,
} from "@/lib/server/drop-mutations";
import { sendGlobalDropNotification } from "@/lib/server/push-notifications";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN } from "@/lib/server/rate-limit";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const ALLOWED_DROP_FIELDS = [
    "title", "description", "imageUrl", "contentUrl", "contentUrls", "unlockCost",
    "validFrom", "validUntil", "autoQueueOnExpire", "status", "type", "tags",
    "ctaText", "actionUrl", "accentColor", "fileMetadata", "mediaCounts",
    "creatorId", "coverFileName", "contentFileNames", "approvalStatus",
    "approvalReviewedAt", "approvalReviewedBy", "approvalNote", "submittedByCreatorId",
    "requiresActiveSubscription",
] as const;

export async function POST(request: NextRequest) {
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

        const sanitized = sanitizeDropData(dropData, ALLOWED_DROP_FIELDS);
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

export async function PUT(request: NextRequest) {
    try {
        await guardApiRequest(request, {
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

        const sanitized = sanitizeDropData(dropData, ALLOWED_DROP_FIELDS);
        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const dropRef = adminDb.collection("drops").doc(dropId);
        const existingDropSnap = await dropRef.get();
        if (!existingDropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const existingDrop = normalizeDropRecord(existingDropSnap.data(), dropId);
        const now = Date.now();
        const nextTiming = resolveUpdatedDropTiming(dropData, existingDrop, now);
        const currentLiveStatus = resolveDropStatusFromTiming(existingDrop, now);
        const nextLiveStatus = nextTiming.status;
        const shouldNotifyActivation = currentLiveStatus !== "active" && nextLiveStatus === "active";
        sanitized.status = nextLiveStatus;
        if (sanitized.approvalStatus === undefined && existingDrop.approvalStatus) {
            sanitized.approvalStatus = existingDrop.approvalStatus;
        }

        await dropRef.update(sanitized);
        await invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS, now);

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

export async function DELETE(request: NextRequest) {
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
        const dropSnap = await dropRef.get();
        if (!dropSnap.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        await dropRef.delete();
        await invalidateDropSurfaces(ADMIN_DROP_REVALIDATION_PATHS);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Admin.Drops.DELETE");
    }
}

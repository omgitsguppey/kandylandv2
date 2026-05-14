import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { buildNotificationQualityMetadata } from "@/lib/notifications/notification-quality-score";
import { buildNotificationRecord } from "@/lib/notification-contracts";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";

const CREATOR_BROADCASTS_READ_LIMIT = 100;
const CREATOR_BROADCAST_RECIPIENT_LIMIT = 1_000;
const CREATOR_BROADCAST_BODY_LIMIT_BYTES = 32_768;

const createBroadcastSchema = z.object({
    title: z.string().trim().min(2).max(80).optional(),
    message: z.string().trim().min(4).max(280),
    target: z.enum(["all_followers"]).optional(),
});

type CreatorBroadcastRecord = Record<string, unknown> & {
    id: string;
    creatorId?: unknown;
    createdAtMs?: unknown;
};

async function canViewCreatorBroadcasts(callerUid: string, callerRole: unknown, creatorId: string) {
    if (!adminDb) {
        return false;
    }

    if (callerUid === creatorId || callerRole === "admin") {
        return true;
    }

    const [relationshipSnap, subscriptionSnap] = await Promise.all([
        adminDb.collection(CREATOR_COLLECTIONS.relationships).doc(`${callerUid}__${creatorId}`).get(),
        adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(`${callerUid}__${creatorId}`).get(),
    ]);

    const relationshipData = relationshipSnap.exists ? relationshipSnap.data() as Record<string, unknown> : {};
    const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() as Record<string, unknown> : {};
    return relationshipData.following === true || subscriptionData.status === "active";
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/broadcasts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        const creatorId = projection?.targetCreatorId || request.nextUrl.searchParams.get("creatorId")?.trim() || caller.uid;
        const creatorSnap = await adminDb.collection("users").doc(creatorId).get();
        if (!creatorSnap.exists) {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        const creatorData = creatorSnap.data() as Record<string, unknown>;
        if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        const allowed = await canViewCreatorBroadcasts(caller.uid, callerData?.role, creatorId);
        if (!allowed) {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        // cost-bound: broadcast history query is capped by CREATOR_BROADCASTS_READ_LIMIT.
        const broadcastsSnap = await adminDb.collection(CREATOR_COLLECTIONS.broadcasts)
            .where("creatorId", "==", creatorId)
            .limit(CREATOR_BROADCASTS_READ_LIMIT)
            .get();

        const broadcasts = broadcastsSnap.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as CreatorBroadcastRecord)
            .filter((entry) => entry.removedAt === undefined)
            .sort((left, right) => {
                const leftAt = typeof left.createdAtMs === "number" ? left.createdAtMs : 0;
                const rightAt = typeof right.createdAtMs === "number" ? right.createdAtMs : 0;
                return rightAt - leftAt;
            });

        return NextResponse.json({ success: true, broadcasts });
    } catch (error) {
        return handleApiError(error, "Creator.Broadcasts.GET");
    }
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/broadcasts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const callerRecord = callerData ?? {};
        const projection = readAdminCreatorProjectionContext(request, caller.uid, typeof callerData?.role === "string" ? callerData.role : null);
        if (projection) {
            return buildAdminCreatorProjectionReadOnlyResponse();
        }

        if (!callerSnap.exists) {
            return buildNotFoundResponse("creator", "Creator not found");
        }

        if (!isCreatorRole(callerRecord.role)) {
            return NextResponse.json({ error: "Creator access required" }, { status: 403 });
        }

        const creatorSettings = callerRecord.creatorSettings && typeof callerRecord.creatorSettings === "object"
            ? callerRecord.creatorSettings as Record<string, unknown>
            : {};
        const creatorRestrictions = callerRecord.creatorRestrictions && typeof callerRecord.creatorRestrictions === "object"
            ? callerRecord.creatorRestrictions as Record<string, unknown>
            : {};
        if (creatorSettings.broadcastsEnabled === false || creatorRestrictions.broadcastsRestricted === true) {
            return NextResponse.json({ error: "Broadcasts are unavailable for this creator." }, { status: 403 });
        }

        const body = await readBoundedJsonBody<z.infer<typeof createBroadcastSchema>>(request, {
            maxBytes: CREATOR_BROADCAST_BODY_LIMIT_BYTES,
            routeName: "creator/broadcasts",
            allowEmpty: false,
        });
        const { title, message } = createBroadcastSchema.parse(body);
        // cost-bound: follower broadcast recipient query is capped by CREATOR_BROADCAST_RECIPIENT_LIMIT.
        const relationshipsSnap = await adminDb.collection(CREATOR_COLLECTIONS.relationships)
            .where("creatorId", "==", caller.uid)
            .limit(CREATOR_BROADCAST_RECIPIENT_LIMIT)
            .get();

        const followerIds: string[] = [];
        const notificationUserIds: string[] = [];
        relationshipsSnap.docs.forEach((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const userId = typeof data.userId === "string" ? data.userId : "";
            if (!userId || data.following !== true) {
                return;
            }

            followerIds.push(userId);
            if (data.notificationsEnabled === true) {
                notificationUserIds.push(userId);
            }
        });

        const creatorDisplayName = typeof callerRecord.displayName === "string" && callerRecord.displayName.trim().length > 0
            ? callerRecord.displayName.trim()
            : "Creator";
        const creatorUsername = typeof callerRecord.username === "string" ? callerRecord.username : "";
        const now = Date.now();
        const target = "all_followers";
        const broadcastRef = adminDb.collection(CREATOR_COLLECTIONS.broadcasts).doc();
        const batch = adminDb.batch();
        batch.set(broadcastRef, {
            creatorId: caller.uid,
            creatorDisplayName,
            creatorUsername,
            title: title?.trim() || `New update from ${creatorDisplayName}`,
            message,
            target,
            status: "sent",
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs: now,
            sentAtMs: now,
            deliveryCount: notificationUserIds.length,
            openCount: null,
            failureReason: null,
            audienceFollowerCount: followerIds.length,
            audienceNotificationCount: notificationUserIds.length,
        });

        if (notificationUserIds.length > 0) {
            const notificationRef = adminDb.collection("notifications").doc();
            const qualityMetadata = buildNotificationQualityMetadata({
                notificationType: "creator_broadcast",
                nowMs: now,
                creatorAffinity: 0.55,
                dropUrgency: 0.35,
            });
            batch.set(notificationRef, {
                ...buildNotificationRecord({
                    title: title?.trim() || `${creatorDisplayName} posted an update`,
                    message,
                    type: "info",
                    target: {
                        global: false,
                        userIds: notificationUserIds,
                    },
                    link: buildCreatorPublicHref({
                        uid: caller.uid,
                        creatorId: caller.uid,
                        username: creatorUsername,
                        creatorUsername,
                    }) ?? "/dashboard/profile",
                    createdAtMs: now,
                    readBy: [],
                    actorType: "creator",
                    actorUserId: caller.uid,
                    actorCreatorId: caller.uid,
                    sourceComponent: "creator_broadcasts_route",
                    sourceEntityType: "creator_broadcast",
                    sourceEntityId: broadcastRef.id,
                    surface: "background",
                    lifecycleEvent: "creator_broadcast",
                    metadata: qualityMetadata,
                }),
                createdAt: FieldValue.serverTimestamp(),
            });
            markNotificationsRuntimeChanged(batch, now);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            broadcast: {
                id: broadcastRef.id,
                creatorId: caller.uid,
                creatorDisplayName,
                creatorUsername,
                title: title?.trim() || `New update from ${creatorDisplayName}`,
                message,
                target,
                status: "sent",
                createdAtMs: now,
                sentAtMs: now,
                deliveryCount: notificationUserIds.length,
                openCount: null,
                failureReason: null,
                audienceFollowerCount: followerIds.length,
                audienceNotificationCount: notificationUserIds.length,
            },
        });
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
        }
        return handleApiError(error, "Creator.Broadcasts.POST");
    }
}

async function DELETE_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/broadcasts",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const broadcastId = request.nextUrl.searchParams.get("broadcastId")?.trim() || "";
        if (!broadcastId) {
            return NextResponse.json({ error: "Missing broadcastId" }, { status: 400 });
        }

        const [callerSnap, broadcastSnap] = await Promise.all([
            adminDb.collection("users").doc(caller.uid).get(),
            adminDb.collection(CREATOR_COLLECTIONS.broadcasts).doc(broadcastId).get(),
        ]);
        if (!broadcastSnap.exists) {
            return buildNotFoundResponse("broadcast", "Broadcast not found");
        }

        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const broadcastData = broadcastSnap.data() as Record<string, unknown>;
        const creatorId = typeof broadcastData.creatorId === "string" ? broadcastData.creatorId : "";
        if (caller.uid !== creatorId && callerData?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await broadcastSnap.ref.set({
            removedAt: Date.now(),
            removedBy: caller.uid,
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "Creator.Broadcasts.DELETE");
    }
}

export let GET = withRouteRuntimeHealth("creator/broadcasts:GET", GET_handler);
export let POST = withRouteRuntimeHealth("creator/broadcasts:POST", POST_handler);
export let DELETE = withRouteRuntimeHealth("creator/broadcasts:DELETE", DELETE_handler);

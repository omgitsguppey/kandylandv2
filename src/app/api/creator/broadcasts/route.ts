import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";

const createBroadcastSchema = z.object({
    title: z.string().trim().min(2).max(80).optional(),
    message: z.string().trim().min(4).max(280),
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

export async function GET(request: NextRequest) {
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

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || caller.uid;
        const creatorSnap = await adminDb.collection("users").doc(creatorId).get();
        if (!creatorSnap.exists) {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        const creatorData = creatorSnap.data() as Record<string, unknown>;
        if (!isCreatorRole(creatorData.role) || creatorData.status === "suspended" || creatorData.status === "banned") {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        const callerSnap = await adminDb.collection("users").doc(caller.uid).get();
        const callerData = callerSnap.data() as Record<string, unknown> | undefined;
        const allowed = await canViewCreatorBroadcasts(caller.uid, callerData?.role, creatorId);
        if (!allowed) {
            return NextResponse.json({ success: true, broadcasts: [] });
        }

        const broadcastsSnap = await adminDb.collection(CREATOR_COLLECTIONS.broadcasts)
            .where("creatorId", "==", creatorId)
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

export async function POST(request: NextRequest) {
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
        if (!callerSnap.exists) {
            return NextResponse.json({ error: "Creator not found" }, { status: 404 });
        }

        const callerData = callerSnap.data() as Record<string, unknown>;
        if (!isCreatorRole(callerData.role)) {
            return NextResponse.json({ error: "Creator access required" }, { status: 403 });
        }

        const creatorSettings = callerData.creatorSettings && typeof callerData.creatorSettings === "object"
            ? callerData.creatorSettings as Record<string, unknown>
            : {};
        const creatorRestrictions = callerData.creatorRestrictions && typeof callerData.creatorRestrictions === "object"
            ? callerData.creatorRestrictions as Record<string, unknown>
            : {};
        if (creatorSettings.broadcastsEnabled === false || creatorRestrictions.broadcastsRestricted === true) {
            return NextResponse.json({ error: "Broadcasts are unavailable for this creator." }, { status: 403 });
        }

        const { title, message } = createBroadcastSchema.parse(await request.json());
        const relationshipsSnap = await adminDb.collection(CREATOR_COLLECTIONS.relationships)
            .where("creatorId", "==", caller.uid)
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

        const creatorDisplayName = typeof callerData.displayName === "string" && callerData.displayName.trim().length > 0
            ? callerData.displayName.trim()
            : "Creator";
        const creatorUsername = typeof callerData.username === "string" ? callerData.username : "";
        const now = Date.now();
        const broadcastRef = adminDb.collection(CREATOR_COLLECTIONS.broadcasts).doc();
        const batch = adminDb.batch();
        batch.set(broadcastRef, {
            creatorId: caller.uid,
            creatorDisplayName,
            creatorUsername,
            title: title?.trim() || `New update from ${creatorDisplayName}`,
            message,
            audienceFollowerCount: followerIds.length,
            audienceNotificationCount: notificationUserIds.length,
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs: now,
        });

        if (notificationUserIds.length > 0) {
            const notificationRef = adminDb.collection("notifications").doc();
            batch.set(notificationRef, {
                title: title?.trim() || `${creatorDisplayName} posted an update`,
                message,
                type: "info",
                target: {
                    global: false,
                    userIds: notificationUserIds,
                },
                link: creatorUsername ? `/creators/${creatorUsername}` : "/dashboard/profile",
                createdAt: FieldValue.serverTimestamp(),
                readBy: [],
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
                audienceFollowerCount: followerIds.length,
                audienceNotificationCount: notificationUserIds.length,
                createdAtMs: now,
            },
        });
    } catch (error) {
        return handleApiError(error, "Creator.Broadcasts.POST");
    }
}

export async function DELETE(request: NextRequest) {
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
            return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
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

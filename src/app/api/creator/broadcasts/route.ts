import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import { resolveCreatorMonetizationSettings } from "@/lib/creator-monetization/creator-monetization-resolver";
import { buildAdminCreatorProjectionReadOnlyResponse, readAdminCreatorProjectionContext } from "@/lib/server/admin-creator-projection";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { trackServerEvent } from "@/lib/server/analytics";
import {
    buildCreatorBroadcastSourceRecord,
    resolveCreatorBroadcastAudience,
} from "@/lib/creator-broadcasts/broadcast-contract";
import {
    CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
    enqueueCreatorBroadcastNotifications,
} from "@/lib/notifications/creator-broadcast-notifications";

const CREATOR_BROADCASTS_READ_LIMIT = 100;
const CREATOR_BROADCAST_BODY_LIMIT_BYTES = 32_768;

const createBroadcastSchema = z.object({
    title: z.string().trim().min(2).max(80).optional(),
    message: z.string().trim().min(4).max(280),
    audience: z.enum(["followers", "fan_pass_subscribers", "followers_and_subscribers", "all_fans", "selected_segment"]).optional(),
    target: z.enum(["followers", "all_fans", "all_followers"]).optional(),
    notifyFollowers: z.boolean().optional(),
});

type CreatorBroadcastRecord = Record<string, unknown> & {
    id: string;
    creatorId?: unknown;
    createdAtMs?: unknown;
};

function buildUnsupportedBroadcastAudienceResponse(audience: string) {
    return NextResponse.json({
        success: false,
        code: "unsupported_broadcast_audience",
        error: "This broadcast audience is not available yet.",
        message: "Choose followers or Fan Pass subscribers and try again.",
        requestedAudience: audience,
        supportedAudiences: ["followers", "fan_pass_subscribers", "followers_and_subscribers"],
    }, { status: 400 });
}

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
        const monetizationSettings = resolveCreatorMonetizationSettings({
            creatorId: caller.uid,
            rawSettings: creatorSettings,
            rawRestrictions: creatorRestrictions,
            settingsConfigured: Boolean(callerRecord.creatorSettings && typeof callerRecord.creatorSettings === "object"),
        });
        if (!monetizationSettings.broadcastsEnabled) {
            return NextResponse.json({ error: "Broadcasts are unavailable for this creator." }, { status: 403 });
        }

        const body = await readBoundedJsonBody<z.infer<typeof createBroadcastSchema>>(request, {
            maxBytes: CREATOR_BROADCAST_BODY_LIMIT_BYTES,
            routeName: "creator/broadcasts",
            allowEmpty: false,
        });
        const parsed = createBroadcastSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                code: "invalid_broadcast_request",
                error: "Check the broadcast details and try again.",
                message: "Check the broadcast details and try again.",
                supportedAudiences: ["followers", "fan_pass_subscribers", "followers_and_subscribers"],
            }, { status: 400 });
        }
        const { title, message } = parsed.data;
        if (parsed.data.audience === "selected_segment") {
            return buildUnsupportedBroadcastAudienceResponse(parsed.data.audience);
        }
        const audienceResolution = resolveCreatorBroadcastAudience({
            requestedAudience: parsed.data.audience,
            target: parsed.data.target,
            creatorSettings,
        });
        const audience = audienceResolution.audience;
        const notifyFollowers = parsed.data.notifyFollowers !== false;

        const creatorDisplayName = typeof callerRecord.displayName === "string" && callerRecord.displayName.trim().length > 0
            ? callerRecord.displayName.trim()
            : "Creator";
        const creatorUsername = typeof callerRecord.username === "string" ? callerRecord.username : "";
        const now = Date.now();
        const broadcastRef = adminDb.collection(CREATOR_COLLECTIONS.broadcasts).doc();
        const sourceRecord = buildCreatorBroadcastSourceRecord({
            broadcastId: broadcastRef.id,
            creatorId: caller.uid,
            creatorDisplayName,
            creatorUsername,
            title,
            body: message,
            audience,
            notifyFollowers,
            createdAtMs: now,
        });
        const batch = adminDb.batch();
        batch.set(broadcastRef, {
            ...sourceRecord,
            creatorId: caller.uid,
            createdAt: FieldValue.serverTimestamp(),
            sentAtMs: now,
            deliveryCount: 0,
            openCount: null,
            failureReason: null,
            audienceSource: audienceResolution.source,
            audienceDefault: audienceResolution.defaultAudience,
            audienceFanCount: null,
            audienceNotificationCount: null,
            boundedFanoutLimit: CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
        });

        const fanout = await enqueueCreatorBroadcastNotifications({
            db: adminDb,
            batch,
            creatorId: caller.uid,
            creatorDisplayName,
            creatorUsername,
            broadcastId: broadcastRef.id,
            title: sourceRecord.title,
            body: sourceRecord.body,
            audience,
            notifyFollowers,
            nowMs: now,
        });
        batch.set(broadcastRef, {
            deliveryCount: fanout.enqueuedCount,
            audienceFanCount: fanout.recipients.filter((recipient) => recipient.source === "followers" || recipient.source === "followers_and_subscribers").length,
            audienceNotificationCount: fanout.enqueuedCount,
            notificationFanoutSourceTruth: fanout.sourceTruth,
            notificationFanoutTruncated: fanout.truncated,
        }, { merge: true });

        if (fanout.enqueuedCount > 0) {
            markNotificationsRuntimeChanged(batch, now);
        }

        await batch.commit();
        await trackServerEvent("creator_broadcast_created", {
            actor_type: "creator",
            actor_user_id: caller.uid,
            actor_creator_id: caller.uid,
            creator_id: caller.uid,
            target_creator_id: caller.uid,
            creator_username: creatorUsername,
            broadcast_id: broadcastRef.id,
            audience,
            notification_enqueue_count: fanout.enqueuedCount,
            notification_fanout_truncated: fanout.truncated,
            notify_followers: notifyFollowers,
            source_truth: "creator_broadcast_source_record",
            page_path: "/dashboard/creator",
            source_component: "creator_broadcasts_route",
        }, caller.uid).catch(() => null);

        return NextResponse.json({
            success: true,
            broadcast: {
                id: broadcastRef.id,
                ...sourceRecord,
                sentAtMs: now,
                deliveryCount: fanout.enqueuedCount,
                openCount: null,
                failureReason: null,
                audienceFanCount: fanout.recipients.filter((recipient) => recipient.source === "followers" || recipient.source === "followers_and_subscribers").length,
                audienceNotificationCount: fanout.enqueuedCount,
                notificationFanoutTruncated: fanout.truncated,
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

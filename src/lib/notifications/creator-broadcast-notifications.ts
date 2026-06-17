import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { CreatorBroadcastAudience } from "@/lib/creator/broadcasts/broadcast-contract";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { buildNotificationRecord } from "@/lib/notification-contracts";
import { buildNotificationDocumentId } from "@/lib/notification-identity";
import { buildNotificationQualityMetadata } from "@/lib/notifications/notification-quality-score";

export const CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT = 250;

export type CreatorBroadcastRecipient = {
    userId: string;
    source: CreatorBroadcastAudience;
};

export type CreatorBroadcastNotificationIdentity = {
    idempotencyKey: string;
    dedupeKey: string;
    documentId: string;
};

export type CreatorBroadcastNotificationFanout = {
    recipients: CreatorBroadcastRecipient[];
    enqueuedCount: number;
    skippedCount: number;
    truncated: boolean;
    sourceTruth: "creator_relationships_and_subscriptions";
};

function cleanId(value: string) {
    return value.trim().replace(/[^a-zA-Z0-9:_-]+/g, "_");
}

export function buildCreatorBroadcastNotificationIdentity(input: {
    creatorId: string;
    broadcastId: string;
    recipientUserId: string;
}): CreatorBroadcastNotificationIdentity {
    const idempotencyKey = [
        "creator_broadcast",
        "published",
        cleanId(input.creatorId),
        cleanId(input.broadcastId),
        cleanId(input.recipientUserId),
    ].join(":");

    return {
        idempotencyKey,
        dedupeKey: idempotencyKey,
        documentId: buildNotificationDocumentId(idempotencyKey),
    };
}

export function mergeCreatorBroadcastRecipients(recipients: CreatorBroadcastRecipient[]) {
    const byUserId = new Map<string, CreatorBroadcastRecipient>();
    for (const recipient of recipients) {
        if (!recipient.userId.trim()) {
            continue;
        }

        const existing = byUserId.get(recipient.userId);
        if (!existing) {
            byUserId.set(recipient.userId, recipient);
            continue;
        }

        if (existing.source !== recipient.source) {
            byUserId.set(recipient.userId, {
                userId: recipient.userId,
                source: "followers_and_subscribers",
            });
        }
    }

    return Array.from(byUserId.values());
}

export async function resolveCreatorBroadcastNotificationRecipients(input: {
    db: FirebaseFirestore.Firestore;
    creatorId: string;
    audience: CreatorBroadcastAudience;
    limit?: number;
}): Promise<CreatorBroadcastRecipient[]> {
    const limit = Math.min(
        Math.max(1, input.limit ?? CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT),
        CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
    );
    const pending: CreatorBroadcastRecipient[] = [];

    if (input.audience === "followers" || input.audience === "followers_and_subscribers") {
        const followersSnap = await input.db.collection(CREATOR_COLLECTIONS.relationships)
            .where("creatorId", "==", input.creatorId)
            .where("following", "==", true)
            .where("notificationsEnabled", "==", true)
            .limit(limit)
            .get();
        followersSnap.docs.forEach((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const userId = typeof data.userId === "string" ? data.userId.trim() : "";
            if (userId) {
                pending.push({ userId, source: "followers" });
            }
        });
    }

    if (input.audience === "fan_pass_subscribers" || input.audience === "followers_and_subscribers") {
        const remaining = limit - pending.length;
        if (remaining > 0) {
            const subscribersSnap = await input.db.collection(CREATOR_COLLECTIONS.subscriptions)
                .where("creatorId", "==", input.creatorId)
                .where("status", "==", "active")
                .limit(remaining)
                .get();
            subscribersSnap.docs.forEach((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const userId = typeof data.userId === "string" ? data.userId.trim() : "";
                if (userId) {
                    pending.push({ userId, source: "fan_pass_subscribers" });
                }
            });
        }
    }

    return mergeCreatorBroadcastRecipients(pending).slice(0, limit);
}

export async function enqueueCreatorBroadcastNotifications(input: {
    db: FirebaseFirestore.Firestore;
    batch: FirebaseFirestore.WriteBatch;
    creatorId: string;
    creatorDisplayName: string;
    creatorUsername: string;
    broadcastId: string;
    title: string;
    body: string;
    audience: CreatorBroadcastAudience;
    notifyFollowers: boolean;
    nowMs: number;
}): Promise<CreatorBroadcastNotificationFanout> {
    if (!input.notifyFollowers) {
        return {
            recipients: [],
            enqueuedCount: 0,
            skippedCount: 0,
            truncated: false,
            sourceTruth: "creator_relationships_and_subscriptions",
        };
    }

    const recipients = await resolveCreatorBroadcastNotificationRecipients({
        db: input.db,
        creatorId: input.creatorId,
        audience: input.audience,
        limit: CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
    });
    const qualityMetadata = buildNotificationQualityMetadata({
        notificationType: "creator_broadcast",
        nowMs: input.nowMs,
        creatorAffinity: 0.55,
        dropUrgency: 0.35,
    });
    const link = buildCreatorPublicHref({
        uid: input.creatorId,
        creatorId: input.creatorId,
        username: input.creatorUsername,
        creatorUsername: input.creatorUsername,
    }) ?? "/dashboard/profile";

    recipients.forEach((recipient) => {
        const identity = buildCreatorBroadcastNotificationIdentity({
            creatorId: input.creatorId,
            broadcastId: input.broadcastId,
            recipientUserId: recipient.userId,
        });
        const notificationRef = input.db.collection("notifications").doc(identity.documentId);
        input.batch.set(notificationRef, {
            ...buildNotificationRecord({
                title: input.title.trim() || `${input.creatorDisplayName} posted an update`,
                message: input.body,
                type: "info",
                target: { global: false, userIds: [recipient.userId] },
                link,
                createdAtMs: input.nowMs,
                readBy: [],
                targetUserId: recipient.userId,
                recipientUserId: recipient.userId,
                actorUserId: input.creatorId,
                actorCreatorId: input.creatorId,
                actorType: "creator",
                sourceComponent: "creator_broadcasts_route",
                sourceEntityType: "creator_broadcast",
                sourceEntityId: input.broadcastId,
                surface: "background",
                lifecycleEvent: "creator_broadcast_published",
                metadata: {
                    ...qualityMetadata,
                    idempotencyKey: identity.idempotencyKey,
                    dedupeKey: identity.dedupeKey,
                    recipientSource: recipient.source,
                    audience: input.audience,
                    boundedFanoutLimit: CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
                },
            }),
            createdAt: FieldValue.serverTimestamp(),
        });
    });

    return {
        recipients,
        enqueuedCount: recipients.length,
        skippedCount: 0,
        truncated: recipients.length >= CREATOR_BROADCAST_NOTIFICATION_BATCH_LIMIT,
        sourceTruth: "creator_relationships_and_subscriptions",
    };
}

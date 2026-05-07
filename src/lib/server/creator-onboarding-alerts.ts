import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import type { NotificationType } from "@/lib/notification-contracts";
import { adminDb } from "@/lib/server/firebase-admin";
import { markNotificationsRuntimeChanged } from "@/lib/server/notification-runtime";
import { buildNotificationRecord } from "@/lib/notification-contracts";

const CREATOR_ONBOARDING_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000;
const CREATOR_ONBOARDING_ADMIN_NOTIFY_LIMIT = 100;

function buildDispatchFingerprint(input: {
    eventKey: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    userIds: string[];
}) {
    return createHash("sha1").update(JSON.stringify({
        eventKey: input.eventKey,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link ?? "",
        userIds: [...input.userIds].sort(),
    })).digest("hex");
}

export async function sendCreatorOnboardingAdminNotification(input: {
    eventKey: string;
    title: string;
    message: string;
    link: string;
    type?: NotificationType;
    nowMs?: number;
}) {
    if (!adminDb) {
        return {
            delivered: false,
            duplicate: false,
            adminCount: 0,
        };
    }

    const adminsSnapshot = await adminDb.collection("users")
        .where("role", "==", "admin")
        .limit(CREATOR_ONBOARDING_ADMIN_NOTIFY_LIMIT)
        .get();
    const adminIds = adminsSnapshot.docs.map((doc) => doc.id).filter(Boolean);
    if (adminIds.length === 0) {
        return {
            delivered: false,
            duplicate: false,
            adminCount: 0,
        };
    }

    const type = input.type ?? "info";
    const nowMs = input.nowMs ?? Date.now();
    const dispatchFingerprint = buildDispatchFingerprint({
        eventKey: input.eventKey,
        title: input.title,
        message: input.message,
        type,
        link: input.link,
        userIds: adminIds,
    });
    const dispatchRef = adminDb.collection("notificationDispatchLocks").doc(`creator-onboarding:${dispatchFingerprint}`);
    const notificationRef = adminDb.collection("notifications").doc();

    const result = await adminDb.runTransaction(async (transaction) => {
        const existingDispatch = await transaction.get(dispatchRef);
        const lastDispatchedAtMs = Number(existingDispatch.data()?.dispatchedAtMs ?? 0);
        const isRecentDuplicate = existingDispatch.exists
            && Number.isFinite(lastDispatchedAtMs)
            && nowMs - lastDispatchedAtMs < CREATOR_ONBOARDING_NOTIFICATION_WINDOW_MS;

        if (isRecentDuplicate) {
            return {
                delivered: false,
                duplicate: true,
                adminCount: adminIds.length,
                notificationId: null,
            };
        }

        transaction.set(notificationRef, {
            ...buildNotificationRecord({
                title: input.title,
                message: input.message,
                type,
                target: {
                    global: false,
                    userIds: adminIds,
                },
                link: input.link,
                createdAtMs: nowMs,
                readBy: [],
                actorType: "system",
                sourceComponent: "creator_onboarding_alerts",
                sourceEntityType: "creator_onboarding_event",
                sourceEntityId: input.eventKey,
                surface: "background",
                metadata: {
                    creatorOnboardingEventKey: input.eventKey,
                },
            }),
            createdAt: FieldValue.serverTimestamp(),
        });
        transaction.set(dispatchRef, {
            dispatchedAtMs: nowMs,
            notificationId: notificationRef.id,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        markNotificationsRuntimeChanged(transaction, nowMs);

        return {
            delivered: true,
            duplicate: false,
            adminCount: adminIds.length,
            notificationId: notificationRef.id,
        };
    });

    return result;
}

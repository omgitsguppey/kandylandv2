import "server-only";

import * as admin from "firebase-admin";

import { adminDb } from "./firebase-admin";
import { broadcastFCM } from "./fcm-utils";
import { touchNotificationsRuntime } from "./notification-runtime";
import { recordNotificationDispatchOutcome } from "./runtime-warning-store";
import type { NotificationDispatchOutcomeStatus } from "../../../shared/runtime/runtime-warning-contract";

const DROP_COLLECTION_LINK = "/drops";

type DropNotificationDispatchResult = {
    activationKey: string | null;
    dropId: string;
    status: NotificationDispatchOutcomeStatus;
    errorCode: string | null;
    detail: Record<string, unknown>;
};

async function reserveDropActivationNotification(dropId: string, activationKey?: string) {
    if (!adminDb || !activationKey) {
        return true;
    }

    const dropRef = adminDb.collection("drops").doc(dropId);
    let reserved = false;

    await adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(dropRef);
        if (!snapshot.exists) {
            return;
        }

        const data = snapshot.data() ?? {};
        const currentKey = typeof data.lastActivationNotificationKey === "string"
            ? data.lastActivationNotificationKey
            : null;
        if (currentKey === activationKey) {
            return;
        }

        transaction.set(dropRef, {
            lastActivationNotificationKey: activationKey,
            lastActivationNotificationAt: Date.now(),
        }, { merge: true });
        reserved = true;
    });

    return reserved;
}

async function queueDropNotificationDoc(
    dropTitle: string,
    dropId: string,
    imageUrl: string | undefined,
    title: string,
    message: string,
    excludedUserIds: string[] = [],
) {
    if (!adminDb) {
        return;
    }

    const nowMs = Date.now();
    await adminDb.collection("notifications").add({
        title,
        message,
        type: "success",
        target: { global: true, excludedUserIds, userIds: [] },
        link: DROP_COLLECTION_LINK,
        dropContext: imageUrl ? {
            dropId,
            dropTitle,
            previewImageUrl: imageUrl,
        } : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
        readBy: [],
    });

    await touchNotificationsRuntime(nowMs);
}

async function finalizeDispatchResult(input: DropNotificationDispatchResult) {
    if (input.activationKey) {
        await recordNotificationDispatchOutcome({
            activationKey: input.activationKey,
            dropId: input.dropId,
            status: input.status,
            errorCode: input.errorCode,
            detail: input.detail,
        });
    }

    return input;
}

function buildBaseDispatchDetail(input: {
    dropTitle: string;
    imageUrl?: string;
    isReturn?: boolean;
    excludedUserIds?: string[];
}) {
    return {
        dropTitle: input.dropTitle,
        imageUrlPresent: Boolean(input.imageUrl),
        isReturn: input.isReturn === true,
        excludedUserIdsCount: input.excludedUserIds?.length ?? 0,
    };
}

export async function sendGlobalDropNotification(
    dropTitle: string,
    dropId: string,
    imageUrl?: string,
    activationKey?: string,
) {
    if (!adminDb) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_database_unavailable",
            detail: buildBaseDispatchDetail({ dropTitle, imageUrl }),
        });
    }

    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: buildBaseDispatchDetail({ dropTitle, imageUrl }),
        });
    }

    let inAppQueued = false;
    try {
        await queueDropNotificationDoc(
            dropTitle,
            dropId,
            imageUrl,
            "New Drop Live 🔥",
            `${dropTitle} is now available in the drops collection!`,
        );
        inAppQueued = true;
    } catch (err) {
        console.error("In-app notification failed", err);
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_in_app_queue_failed",
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl }),
                inAppQueued,
                errorMessage: err instanceof Error ? err.message : String(err),
            },
        });
    }

    const fcmDelivered = await broadcastFCM(
        "Kandy Drops",
        `${dropTitle} just went live! Don't miss out!`,
        DROP_COLLECTION_LINK,
        "new_drop",
    );

    return finalizeDispatchResult({
        activationKey: activationKey ?? null,
        dropId,
        status: fcmDelivered ? "sent" : "failed",
        errorCode: fcmDelivered ? null : "notification_fcm_dispatch_failed",
        detail: {
            ...buildBaseDispatchDetail({ dropTitle, imageUrl }),
            inAppQueued,
            fcmDelivered,
        },
    });
}

export async function sendTargetedDropNotification(
    dropTitle: string,
    dropId: string,
    imageUrl: string | undefined,
    isReturn = false,
    excludedUserIds: string[] = [],
    activationKey?: string,
) {
    if (!adminDb) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_database_unavailable",
            detail: buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds }),
        });
    }

    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds }),
        });
    }

    const title = isReturn ? "Drop Returned 🔥" : "New Drop Live 🔥";
    const message = isReturn
        ? `Oh, snap! ${dropTitle} is back! Don't miss out this time!`
        : `${dropTitle} is now available in the drops collection!`;

    let inAppQueued = false;
    try {
        await queueDropNotificationDoc(dropTitle, dropId, imageUrl, title, message, excludedUserIds);
        inAppQueued = true;
    } catch (err) {
        console.error("In-app targeted notification failed", err);
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_in_app_queue_failed",
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds }),
                inAppQueued,
                errorMessage: err instanceof Error ? err.message : String(err),
            },
        });
    }

    const fcmDelivered = await broadcastFCM(
        "Kandy Drops",
        message,
        DROP_COLLECTION_LINK,
        "new_drop",
    );

    return finalizeDispatchResult({
        activationKey: activationKey ?? null,
        dropId,
        status: fcmDelivered ? "sent" : "failed",
        errorCode: fcmDelivered ? null : "notification_fcm_dispatch_failed",
        detail: {
            ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds }),
            inAppQueued,
            fcmDelivered,
        },
    });
}

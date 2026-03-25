import "server-only";

import * as admin from "firebase-admin";

import { adminDb } from "./firebase-admin";
import { broadcastFCM } from "./fcm-utils";
import { touchNotificationsRuntime } from "./notification-runtime";

const DROP_COLLECTION_LINK = "/drops";

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
        readBy: [],
    });

    await touchNotificationsRuntime();
}

export async function sendGlobalDropNotification(
    dropTitle: string,
    dropId: string,
    imageUrl?: string,
    activationKey?: string,
) {
    if (!adminDb) {
        return;
    }

    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return;
    }

    try {
        await queueDropNotificationDoc(
            dropTitle,
            dropId,
            imageUrl,
            "New Drop Live 🔥",
            `${dropTitle} is now available in the drops collection!`,
        );
    } catch (err) {
        console.error("In-app notification failed", err);
    }

    await broadcastFCM(
        "Kandy Drops",
        `${dropTitle} just went live! Don't miss out!`,
        DROP_COLLECTION_LINK,
    );
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
        return;
    }

    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return;
    }

    const title = isReturn ? "Drop Returned 🔥" : "New Drop Live 🔥";
    const message = isReturn
        ? `Oh, snap! ${dropTitle} is back! Don't miss out this time!`
        : `${dropTitle} is now available in the drops collection!`;

    try {
        await queueDropNotificationDoc(dropTitle, dropId, imageUrl, title, message, excludedUserIds);
    } catch (err) {
        console.error("In-app targeted notification failed", err);
    }

    await broadcastFCM(
        "Kandy Drops",
        message,
        DROP_COLLECTION_LINK,
    );
}

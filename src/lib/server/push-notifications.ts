import "server-only";
import { adminDb } from "./firebase-admin";
import * as admin from "firebase-admin";
import { broadcastFCM } from "./fcm-utils";

const DROP_COLLECTION_LINK = "/drops";

export async function sendGlobalDropNotification(dropTitle: string, dropId: string, imageUrl?: string) {
    if (!adminDb) return;

    // Create an in-app notification first
    try {
        await adminDb.collection("notifications").add({
            title: "New Drop Live 🔥",
            message: `${dropTitle} is now available in the drops collection!`,
            type: "success",
            target: { global: true, userIds: [] },
            link: DROP_COLLECTION_LINK,
            dropContext: imageUrl ? {
                dropId,
                dropTitle,
                previewImageUrl: imageUrl
            } : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
        });
    } catch (err) {
        console.error("In-app notification failed", err);
    }

    // Dispatch Web Push reliably
    await broadcastFCM(
        "Kandy Drops",
        `${dropTitle} just went live! Don't miss out!`,
        DROP_COLLECTION_LINK
    );
}

export async function sendTargetedDropNotification(
    dropTitle: string,
    dropId: string,
    imageUrl: string | undefined,
    isReturn: boolean = false,
    excludedUserIds: string[] = []
) {
    if (!adminDb) return;

    const title = isReturn ? `Drop Returned 🔥` : `New Drop Live 🔥`;
    const message = isReturn
        ? `Oh, snap! ${dropTitle} is back! Don't miss out this time!`
        : `${dropTitle} is now available in the drops collection!`;

    try {
        await adminDb.collection("notifications").add({
            title,
            message,
            type: "success",
            target: { global: true, excludedUserIds: excludedUserIds, userIds: [] },
            link: DROP_COLLECTION_LINK,
            dropContext: imageUrl ? {
                dropId,
                dropTitle,
                previewImageUrl: imageUrl
            } : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
        });
    } catch (err) {
        console.error("In-app targeted notification failed", err);
    }

    // Web push - ideally we'd filter web pushes by exclusions, but FCM topics are global.
    // Future enhancement: Send targeted FCM pushes only to eligible tokens
    await broadcastFCM(
        "Kandy Drops",
        message,
        DROP_COLLECTION_LINK
    );
}

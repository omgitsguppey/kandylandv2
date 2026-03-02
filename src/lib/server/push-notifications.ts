import "server-only";
import { adminDb } from "./firebase-admin";
import * as admin from "firebase-admin";
import { broadcastFCM } from "./fcm-utils";

export async function sendGlobalDropNotification(dropTitle: string, dropId: string, imageUrl?: string) {
    if (!adminDb) return;

    // Create an in-app notification first
    try {
        await adminDb.collection("notifications").add({
            title: "New Drop Live 🔥",
            message: `${dropTitle} is now available in the drops collection!`,
            type: "success",
            target: { global: true, userIds: [] },
            link: "/dashboard",
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
        "/dashboard"
    );
}

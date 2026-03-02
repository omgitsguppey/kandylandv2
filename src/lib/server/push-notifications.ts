import "server-only";
import { adminDb } from "./firebase-admin";
import * as admin from "firebase-admin";

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

    // Fetch all users with FCM tokens
    try {
        const usersSnap = await adminDb.collection("users").get();
        const tokens: string[] = [];

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            }
        }

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "Kandy Drops",
                    body: `${dropTitle} just went live! Don't miss out!`,
                },
                data: {
                    url: `/dashboard`
                },
                tokens: tokens
            };

            // Dispatch Web Push reliably
            await admin.messaging().sendEachForMulticast(message);
            console.log(`Dispatched drop activation push to ${tokens.length} devices.`);
        }
    } catch (err) {
        // We log silently so background workers don't completely abort the client's operation
        console.error("FCM broadcast failed", err);
    }
}

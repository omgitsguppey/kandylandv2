import "server-only";
import { adminDb } from "./firebase-admin";
import * as admin from "firebase-admin";

/**
 * Universally queries Firestore for all available user FCM tokens
 * and securely dispatches a Web Push multicast via Firebase Cloud Messaging.
 * Fails silently so backend server pipelines are not forcefully aborted.
 *
 * @param title The physical notification header title
 * @param body The physical notification message body 
 * @param url The router click-through target when clicked
 * @returns boolean indicating whether the broadcast was fully successful
 */
export async function broadcastFCM(title: string, body: string, url: string = "/drops"): Promise<boolean> {
    if (!adminDb) return false;

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
                    title,
                    body,
                },
                data: {
                    url,
                },
                tokens: tokens
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            if (response.failureCount > 0) {
                console.error(`FCM Multicast Dispatch Partial Failure. Success: ${response.successCount}, Failed: ${response.failureCount}`);
                return false;
            }

            console.log(`FCM Multicast Dispatch Complete. Success: ${response.successCount}, Failed: ${response.failureCount}`);
            return true;
        }

        return true; // No tokens to send to, but no failure occurred
    } catch (err) {
        console.error("FCM broadcast multicasting failed:", err);
        return false;
    }
}

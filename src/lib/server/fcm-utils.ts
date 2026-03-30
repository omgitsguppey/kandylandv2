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
        const tokens: string[] = [];

        await new Promise<void>((resolve, reject) => {
            adminDb.collection("users")
                .select("fcmTokens")
                .stream()
                .on("data", (doc) => {
                    const data = doc.data();
                    if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                        tokens.push(...data.fcmTokens);
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });

        if (tokens.length > 0) {
            const BATCH_SIZE = 500;
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
                const chunk = tokens.slice(i, i + BATCH_SIZE);
                const message = {
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        url,
                    },
                    tokens: chunk
                };

                const response = await admin.messaging().sendEachForMulticast(message);
                successCount += response.successCount;
                failureCount += response.failureCount;
            }

            if (failureCount > 0) {
                console.error(`FCM Multicast Dispatch Partial Failure. Success: ${successCount}, Failed: ${failureCount}`);
                return false;
            }

            console.log(`FCM Multicast Dispatch Complete. Success: ${successCount}, Failed: ${failureCount}`);
            return true;
        }

        return true; // No tokens to send to, but no failure occurred
    } catch (err) {
        console.error("FCM broadcast multicasting failed:", err);
        return false;
    }
}

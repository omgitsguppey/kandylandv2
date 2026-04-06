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
        const BATCH_SIZE = 500;
        let tokensChunk: string[] = [];
        let successCount = 0;
        let failureCount = 0;
        let tokensSent = false;

        const stream = adminDb.collection("users")
            .select("fcmTokens", "notificationSettings")
            .stream();

        const dispatchBatch = async (tokens: string[]) => {
            if (tokens.length === 0) return;
            tokensSent = true;
            const message = {
                notification: { title, body },
                data: { url },
                tokens
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;
        };

        for await (const doc of stream) {
            const documentSnapshot = doc as unknown as FirebaseFirestore.DocumentSnapshot;
            const data = documentSnapshot.data();

            if (data?.notificationSettings?.browserPushEnabled !== true) {
                continue;
            }

            if (data?.notificationSettings?.newDropAlerts === false) {
                continue;
            }

            if (data && data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokensChunk.push(...data.fcmTokens);

                while (tokensChunk.length >= BATCH_SIZE) {
                    const batchToDispatch = tokensChunk.slice(0, BATCH_SIZE);
                    tokensChunk = tokensChunk.slice(BATCH_SIZE);
                    await dispatchBatch(batchToDispatch);
                }
            }
        }

        if (tokensChunk.length > 0) {
            await dispatchBatch(tokensChunk);
        }

        if (tokensSent) {
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

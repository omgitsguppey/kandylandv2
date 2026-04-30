import "server-only";
import { adminDb } from "./firebase-admin";
import { recordRouteWarning } from "./route-diagnostics";
import * as admin from "firebase-admin";
import { buildBrowserNotificationTag, buildNotificationIdempotencyKey } from "@/lib/notification-identity";

export type NotificationBroadcastType = "new_drop" | "expiring_soon" | "system_alert" | "general";

type NotificationBroadcastOptions = {
    notificationId?: string | null;
    idempotencyKey?: string | null;
    browserTag?: string | null;
    dropId?: string | null;
    taskId?: string | null;
    lifecycleEvent?: string | null;
    audience?: string | null;
    data?: Record<string, string | number | boolean | null | undefined>;
};

function stringifyData(data: Record<string, string | number | boolean | null | undefined>) {
    return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value === null || typeof value === "undefined") {
            return acc;
        }

        acc[key] = String(value);
        return acc;
    }, {});
}

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
export async function broadcastFCM(
    title: string,
    body: string,
    url: string = "/drops",
    type: NotificationBroadcastType = "general",
    options: NotificationBroadcastOptions = {},
): Promise<boolean> {
    if (!adminDb) return false;

    try {
        const BATCH_SIZE = 500;
        let tokensChunk: string[] = [];
        let tokenToUidMap = new Map<string, string>();
        const queuedTokens = new Set<string>();
        let successCount = 0;
        let failureCount = 0;
        let tokensSent = false;
        let duplicatePushPreventedCount = 0;
        const idempotencyKey = options.idempotencyKey || buildNotificationIdempotencyKey({
            type,
            notificationId: options.notificationId,
            dropId: options.dropId,
            taskId: options.taskId,
            lifecycleEvent: options.lifecycleEvent,
            audience: options.audience ?? "broadcast",
        });
        const browserTag = options.browserTag || buildBrowserNotificationTag(idempotencyKey);
        const baseData = stringifyData({
            title,
            body,
            url,
            type,
            notificationId: options.notificationId,
            idempotencyKey,
            tag: browserTag,
            dropId: options.dropId,
            taskId: options.taskId,
            lifecycleEvent: options.lifecycleEvent,
            pwaDisplayMode: "manual-service-worker",
            autoDisplayedByFcm: false,
            ...options.data,
        });

        const stream = adminDb.collection("users")
            .select("fcmTokens", "notificationSettings")
            .stream();

        const dispatchBatch = async (tokens: string[]) => {
            if (tokens.length === 0) return;
            tokensSent = true;
            const message = {
                data: baseData,
                webpush: {
                    headers: {
                        Urgency: type === "new_drop" || type === "system_alert" ? "high" : "normal",
                    },
                },
                tokens
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            if (response.failureCount > 0) {
                const failedTokensToRemoveByUid = new Map<string, string[]>();
                response.responses.forEach((resp, index) => {
                    const errorCode = resp.error?.code;
                    if (!resp.success && (errorCode === "messaging/invalid-registration-token" || errorCode === "messaging/registration-token-not-registered")) {
                        const deadToken = tokens[index];
                        const uid = tokenToUidMap.get(deadToken);
                        if (uid) {
                            const deadList = failedTokensToRemoveByUid.get(uid) ?? [];
                            deadList.push(deadToken);
                            failedTokensToRemoveByUid.set(uid, deadList);
                        }
                    }
                });
                
                if (failedTokensToRemoveByUid.size > 0) {
                    const batch = adminDb!.batch();
                    let batchCount = 0;
                    for (const [uid, deadTokens] of failedTokensToRemoveByUid.entries()) {
                        if (batchCount >= 500) break;
                        batch.update(adminDb!.collection("users").doc(uid), {
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...deadTokens)
                        });
                        batchCount++;
                    }
                    if (batchCount > 0) {
                        await batch.commit().catch(e => recordRouteWarning("fcm-token-cleanup", "FCM Token Cleanup Error", e));
                    }
                }
            }
        };

        for await (const doc of stream) {
            const documentSnapshot = doc as unknown as FirebaseFirestore.DocumentSnapshot;
            const data = documentSnapshot.data();
            const notificationSettings = data?.notificationSettings && typeof data.notificationSettings === "object"
                ? data.notificationSettings as Record<string, unknown>
                : {};
            const browserPushEnabled = notificationSettings.browserPushEnabled === true;
            const newDropAlertsEnabled = notificationSettings.newDropAlerts !== false;
            const expiringSoonAlertsEnabled = notificationSettings.expiringSoonAlerts !== false;
            const tokens = Array.isArray(data?.fcmTokens)
                ? data.fcmTokens.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
                : [];

            let shouldSend = false;
            if (browserPushEnabled) {
                if (type === "new_drop") {
                    shouldSend = newDropAlertsEnabled;
                } else if (type === "expiring_soon") {
                    shouldSend = expiringSoonAlertsEnabled;
                } else {
                    shouldSend = true;
                }
            }

            if (shouldSend && tokens.length > 0) {
                for (const token of tokens) {
                    if (queuedTokens.has(token)) {
                        duplicatePushPreventedCount++;
                        continue;
                    }

                    queuedTokens.add(token);
                    tokenToUidMap.set(token, documentSnapshot.id);
                    tokensChunk.push(token);
                }

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
                recordRouteWarning("fcm-multicast", `FCM Multicast Dispatch Partial Failure. Success: ${successCount}, Failed: ${failureCount}`);
                return false;
            }

            console.log(`FCM Multicast Dispatch Complete. Success: ${successCount}, Failed: ${failureCount}, Duplicate tokens prevented: ${duplicatePushPreventedCount}`);
            return true;
        }

        return true; 
    } catch (err) {
        recordRouteWarning("fcm-broadcast", "FCM broadcast multicasting failed", err);
        return false;
    }
}

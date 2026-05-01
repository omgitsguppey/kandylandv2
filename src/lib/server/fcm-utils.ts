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

export interface NotificationBroadcastReport {
    ok: boolean;
    tokensSent: boolean;
    successCount: number;
    failureCount: number;
    recipientCheckedCount: number;
    permissionSkippedCount: number;
    preferenceSkippedCount: number;
    missingTokenSkippedCount: number;
    duplicatePushPreventedCount: number;
    tokensQueuedCount: number;
    invalidTokenRemovedCount: number;
    idempotencyKey: string | null;
    browserTag: string | null;
    dataOnlyPayload: boolean;
    pwaDisplayMode: "manual-service-worker";
    errorMessage?: string;
}

function buildBroadcastReport(input: Partial<NotificationBroadcastReport>): NotificationBroadcastReport {
    return {
        ok: input.ok ?? false,
        tokensSent: input.tokensSent ?? false,
        successCount: input.successCount ?? 0,
        failureCount: input.failureCount ?? 0,
        recipientCheckedCount: input.recipientCheckedCount ?? 0,
        permissionSkippedCount: input.permissionSkippedCount ?? 0,
        preferenceSkippedCount: input.preferenceSkippedCount ?? 0,
        missingTokenSkippedCount: input.missingTokenSkippedCount ?? 0,
        duplicatePushPreventedCount: input.duplicatePushPreventedCount ?? 0,
        tokensQueuedCount: input.tokensQueuedCount ?? 0,
        invalidTokenRemovedCount: input.invalidTokenRemovedCount ?? 0,
        idempotencyKey: input.idempotencyKey ?? null,
        browserTag: input.browserTag ?? null,
        dataOnlyPayload: true,
        pwaDisplayMode: "manual-service-worker",
        errorMessage: input.errorMessage,
    };
}

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
    const report = await broadcastFCMWithReport(title, body, url, type, options);
    return report.ok;
}

export async function broadcastFCMWithReport(
    title: string,
    body: string,
    url: string = "/drops",
    type: NotificationBroadcastType = "general",
    options: NotificationBroadcastOptions = {},
): Promise<NotificationBroadcastReport> {
    if (!adminDb) return buildBroadcastReport({ ok: false });

    let idempotencyKey: string | null = null;
    let browserTag: string | null = null;
    try {
        const BATCH_SIZE = 500;
        let tokensChunk: string[] = [];
        let tokenToUidMap = new Map<string, string>();
        const queuedTokens = new Set<string>();
        let successCount = 0;
        let failureCount = 0;
        let tokensSent = false;
        let recipientCheckedCount = 0;
        let permissionSkippedCount = 0;
        let preferenceSkippedCount = 0;
        let missingTokenSkippedCount = 0;
        let duplicatePushPreventedCount = 0;
        let invalidTokenRemovedCount = 0;
        idempotencyKey = options.idempotencyKey || buildNotificationIdempotencyKey({
            type,
            notificationId: options.notificationId,
            dropId: options.dropId,
            taskId: options.taskId,
            lifecycleEvent: options.lifecycleEvent,
            audience: options.audience ?? "broadcast",
        });
        browserTag = options.browserTag || buildBrowserNotificationTag(idempotencyKey);
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
                        invalidTokenRemovedCount++;
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
            recipientCheckedCount++;
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

                if (!shouldSend) {
                    preferenceSkippedCount++;
                }
            } else {
                permissionSkippedCount++;
            }

            if (shouldSend && tokens.length === 0) {
                missingTokenSkippedCount++;
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
                return buildBroadcastReport({
                    ok: false,
                    tokensSent,
                    successCount,
                    failureCount,
                    recipientCheckedCount,
                    permissionSkippedCount,
                    preferenceSkippedCount,
                    missingTokenSkippedCount,
                    duplicatePushPreventedCount,
                    tokensQueuedCount: queuedTokens.size,
                    invalidTokenRemovedCount,
                    idempotencyKey,
                    browserTag,
                });
            }

            console.log(`FCM Multicast Dispatch Complete. Success: ${successCount}, Failed: ${failureCount}, Duplicate tokens prevented: ${duplicatePushPreventedCount}`);
            return buildBroadcastReport({
                ok: true,
                tokensSent,
                successCount,
                failureCount,
                recipientCheckedCount,
                permissionSkippedCount,
                preferenceSkippedCount,
                missingTokenSkippedCount,
                duplicatePushPreventedCount,
                tokensQueuedCount: queuedTokens.size,
                invalidTokenRemovedCount,
                idempotencyKey,
                browserTag,
            });
        }

        return buildBroadcastReport({
            ok: true,
            tokensSent,
            successCount,
            failureCount,
            recipientCheckedCount,
            permissionSkippedCount,
            preferenceSkippedCount,
            missingTokenSkippedCount,
            duplicatePushPreventedCount,
            tokensQueuedCount: queuedTokens.size,
            invalidTokenRemovedCount,
            idempotencyKey,
            browserTag,
        });
    } catch (err) {
        recordRouteWarning("fcm-broadcast", "FCM broadcast multicasting failed", err);
        return buildBroadcastReport({
            ok: false,
            idempotencyKey,
            browserTag,
            errorMessage: err instanceof Error ? err.message : String(err),
        });
    }
}

import "server-only";

import * as admin from "firebase-admin";

import {
    buildBrowserNotificationTag,
    buildNotificationDocumentId,
    buildNotificationIdempotencyKey,
} from "@/lib/notification-identity";
import { buildNotificationRecord } from "@/lib/notification-contracts";
import { buildNotificationQualityMetadata } from "@/lib/notifications/notification-quality-score";
import { adminDb } from "./firebase-admin";
import { broadcastFCMWithReport, type NotificationBroadcastReport } from "./fcm-utils";
import { touchNotificationsRuntime } from "./notification-runtime";
import { recordNotificationDispatchOutcome } from "./runtime-warning-store";
import { recordRouteWarning } from "./route-diagnostics";
import type { NotificationDispatchOutcomeStatus } from "../../../shared/runtime/runtime-warning-contract";

const DROP_COLLECTION_LINK = "/drops";

type DropNotificationDispatchResult = {
    activationKey: string | null;
    dropId: string;
    status: NotificationDispatchOutcomeStatus;
    errorCode: string | null;
    detail: Record<string, unknown>;
};

type DropNotificationIdentity = {
    idempotencyKey: string;
    browserTag: string;
    lifecycleEvent: string;
    audience: string;
};

function buildDropNotificationIdentity(input: {
    dropId: string;
    isReturn?: boolean;
    excludedUserIds?: string[];
}): DropNotificationIdentity {
    const lifecycleEvent = input.isReturn ? "drop_requeued_live" : "drop_live";
    const audience = input.excludedUserIds && input.excludedUserIds.length > 0
        ? `global_except_${input.excludedUserIds.length}`
        : "global";
    const idempotencyKey = buildNotificationIdempotencyKey({
        type: lifecycleEvent,
        dropId: input.dropId,
        lifecycleEvent,
        audience,
    });

    return {
        idempotencyKey,
        browserTag: buildBrowserNotificationTag(idempotencyKey),
        lifecycleEvent,
        audience,
    };
}

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

async function queueDropNotificationDoc(input: {
    dropTitle: string;
    dropId: string;
    imageUrl?: string;
    title: string;
    message: string;
    excludedUserIds?: string[];
    identity: DropNotificationIdentity;
}) {
    if (!adminDb) {
        return { queued: false, duplicateCreatedPrevented: false, notificationId: null };
    }

    const nowMs = Date.now();
    const notificationId = buildNotificationDocumentId(input.identity.idempotencyKey);
    const notificationRef = adminDb.collection("notifications").doc(notificationId);
    const qualityMetadata = buildNotificationQualityMetadata({
        notificationType: input.identity.lifecycleEvent,
        nowMs,
        dropUrgency: input.identity.lifecycleEvent === "drop_requeued_live" ? 0.72 : 0.64,
        creatorAffinity: 0.35,
    });
    let queued = false;
    let duplicateCreatedPrevented = false;

    await adminDb.runTransaction(async (transaction) => {
        const existing = await transaction.get(notificationRef);
        if (existing.exists) {
            duplicateCreatedPrevented = true;
            return;
        }

        transaction.set(notificationRef, {
            ...buildNotificationRecord({
                title: input.title,
                message: input.message,
                type: "success",
                target: { global: true, excludedUserIds: input.excludedUserIds ?? [], userIds: [] },
                link: DROP_COLLECTION_LINK,
                dropContext: input.imageUrl ? {
                    dropId: input.dropId,
                    dropTitle: input.dropTitle,
                    previewImageUrl: input.imageUrl,
                } : null,
                createdAtMs: nowMs,
                readBy: [],
                actorType: "system",
                sourceComponent: "push_notifications",
                sourceEntityType: "drop",
                sourceEntityId: input.dropId,
                surface: "background",
                lifecycleEvent: input.identity.lifecycleEvent,
                metadata: {
                    idempotencyKey: input.identity.idempotencyKey,
                    dedupeKey: input.identity.idempotencyKey,
                    browserTag: input.identity.browserTag,
                    ...qualityMetadata,
                },
            }),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        queued = true;
    });

    if (queued) {
        await touchNotificationsRuntime(nowMs);
    }

    return { queued, duplicateCreatedPrevented, notificationId };
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
    identity?: DropNotificationIdentity;
}) {
    return {
        dropTitle: input.dropTitle,
        imageUrlPresent: Boolean(input.imageUrl),
        isReturn: input.isReturn === true,
        queuedDropReturnedLive: input.isReturn === true,
        excludedUserIdsCount: input.excludedUserIds?.length ?? 0,
        idempotencyKey: input.identity?.idempotencyKey ?? null,
        tag: input.identity?.browserTag ?? null,
        lifecycleEvent: input.identity?.lifecycleEvent ?? null,
    };
}

function buildFcmDispatchDetail(report: NotificationBroadcastReport) {
    return {
        fcmDelivered: report.ok && report.tokensSent && report.failureCount === 0,
        fcmTokensSent: report.tokensSent,
        fcmSuccessCount: report.successCount,
        fcmFailureCount: report.failureCount,
        recipientCheckedCount: report.recipientCheckedCount,
        skippedPermissionDeniedCount: report.permissionSkippedCount,
        skippedMissingTokenCount: report.missingTokenSkippedCount,
        skippedPreferencesDisabledCount: report.preferenceSkippedCount,
        skippedQualityThrottleCount: report.throttleSkippedCount,
        duplicatePushPreventedCount: report.duplicatePushPreventedCount,
        invalidTokenRemovedCount: report.invalidTokenRemovedCount,
        dataOnlyPayload: report.dataOnlyPayload,
        pwaDisplayMode: report.pwaDisplayMode,
        duplicatePushPrevented: report.duplicatePushPreventedCount > 0,
        duplicateBrowserDisplayPrevented: false,
        browserTagUsed: Boolean(report.browserTag),
        dedupeKeyUsed: Boolean(report.idempotencyKey),
        errorMessage: report.errorMessage ?? null,
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

    const identity = buildDropNotificationIdentity({ dropId });
    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, identity }),
                duplicateCreatedPrevented: true,
                inAppQueued: false,
                fcmDelivered: false,
                duplicatePushPrevented: true,
                duplicateBrowserDisplayPrevented: true,
            },
        });
    }

    let inAppQueued = false;
    let duplicateCreatedPrevented = false;
    let notificationId: string | null = null;
    try {
        const queueResult = await queueDropNotificationDoc({
            dropTitle,
            dropId,
            imageUrl,
            title: "New Drop Live",
            message: `${dropTitle} is now available in the drops collection!`,
            identity,
        });
        inAppQueued = queueResult.queued;
        duplicateCreatedPrevented = queueResult.duplicateCreatedPrevented;
        notificationId = queueResult.notificationId;
    } catch (err) {
        recordRouteWarning("notification-global", "In-app notification queue failed", err);
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_in_app_queue_failed",
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, identity }),
                inAppQueued,
                duplicateCreatedPrevented,
                errorMessage: err instanceof Error ? err.message : String(err),
            },
        });
    }

    if (duplicateCreatedPrevented && !inAppQueued) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, identity }),
                inAppQueued,
                fcmDelivered: false,
                notificationId,
                duplicateCreatedPrevented,
                duplicatePushPrevented: true,
                duplicateBrowserDisplayPrevented: true,
            },
        });
    }

    const fcmReport = await broadcastFCMWithReport(
        "Kandy Drops",
        `${dropTitle} just went live! Don't miss out!`,
        DROP_COLLECTION_LINK,
        "new_drop",
        {
            notificationId,
            idempotencyKey: identity.idempotencyKey,
            browserTag: identity.browserTag,
            dropId,
            lifecycleEvent: identity.lifecycleEvent,
            audience: identity.audience,
            data: { duplicateCreatedPrevented },
        },
    );
    const fcmDelivered = fcmReport.ok;

    return finalizeDispatchResult({
        activationKey: activationKey ?? null,
        dropId,
        status: fcmDelivered ? "sent" : "failed",
        errorCode: fcmDelivered ? null : "notification_fcm_dispatch_failed",
        detail: {
            ...buildBaseDispatchDetail({ dropTitle, imageUrl, identity }),
            inAppQueued,
            notificationId,
            duplicateCreatedPrevented,
            ...buildFcmDispatchDetail(fcmReport),
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

    const identity = buildDropNotificationIdentity({ dropId, isReturn, excludedUserIds });
    const shouldSend = await reserveDropActivationNotification(dropId, activationKey);
    if (!shouldSend) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds, identity }),
                duplicateCreatedPrevented: true,
                inAppQueued: false,
                fcmDelivered: false,
                duplicatePushPrevented: true,
                duplicateBrowserDisplayPrevented: true,
            },
        });
    }

    const title = isReturn ? "Drop Returned" : "New Drop Live";
    const message = isReturn
        ? `Oh, snap! ${dropTitle} is back! Don't miss out this time!`
        : `${dropTitle} is now available in the drops collection!`;

    let inAppQueued = false;
    let duplicateCreatedPrevented = false;
    let notificationId: string | null = null;
    try {
        const queueResult = await queueDropNotificationDoc({
            dropTitle,
            dropId,
            imageUrl,
            title,
            message,
            excludedUserIds,
            identity,
        });
        inAppQueued = queueResult.queued;
        duplicateCreatedPrevented = queueResult.duplicateCreatedPrevented;
        notificationId = queueResult.notificationId;
    } catch (err) {
        recordRouteWarning("notification-targeted", "In-app targeted notification queue failed", err);
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "failed",
            errorCode: "notification_in_app_queue_failed",
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds, identity }),
                inAppQueued,
                duplicateCreatedPrevented,
                errorMessage: err instanceof Error ? err.message : String(err),
            },
        });
    }

    if (duplicateCreatedPrevented && !inAppQueued) {
        return finalizeDispatchResult({
            activationKey: activationKey ?? null,
            dropId,
            status: "duplicate",
            errorCode: null,
            detail: {
                ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds, identity }),
                inAppQueued,
                fcmDelivered: false,
                notificationId,
                duplicateCreatedPrevented,
                duplicatePushPrevented: true,
                duplicateBrowserDisplayPrevented: true,
            },
        });
    }

    const fcmReport = await broadcastFCMWithReport(
        "Kandy Drops",
        message,
        DROP_COLLECTION_LINK,
        "new_drop",
        {
            notificationId,
            idempotencyKey: identity.idempotencyKey,
            browserTag: identity.browserTag,
            dropId,
            lifecycleEvent: identity.lifecycleEvent,
            audience: identity.audience,
            data: {
                queuedDropReturnedLive: isReturn,
                duplicateCreatedPrevented,
            },
        },
    );
    const fcmDelivered = fcmReport.ok;

    return finalizeDispatchResult({
        activationKey: activationKey ?? null,
        dropId,
        status: fcmDelivered ? "sent" : "failed",
        errorCode: fcmDelivered ? null : "notification_fcm_dispatch_failed",
        detail: {
            ...buildBaseDispatchDetail({ dropTitle, imageUrl, isReturn, excludedUserIds, identity }),
            inAppQueued,
            notificationId,
            duplicateCreatedPrevented,
            ...buildFcmDispatchDetail(fcmReport),
        },
    });
}

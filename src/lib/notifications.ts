"use client";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { DropNotificationContext, NotificationTarget, NotificationType } from "@/lib/notification-contracts";

export interface NotificationPayload {
    title: string;
    message: string;
    type: NotificationType;
    target: NotificationTarget;
    link?: string;
    dropContext?: DropNotificationContext;
}

export async function sendNotification(payload: NotificationPayload) {
    try {
        const response = await authFetch("/api/notifications", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return {
            success: true,
            duplicate: result.duplicate === true,
        };
    } catch (error) {
        reportClientIssue({
            channel: "notifications",
            message: "Notification send failed",
            error,
            detail: {
                context: "sendNotification",
                payload,
            },
            consoleLabel: "[Notifications] send failed",
        });
        return { success: false, error };
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const result = await markNotificationsAsRead([notificationId]);
    return result.successCount > 0;
}

export async function markNotificationsAsRead(notificationIds: string[]) {
    try {
        const response = await authFetch("/api/notifications", {
            method: "PUT",
            body: JSON.stringify(
                notificationIds.length === 1
                    ? { notificationId: notificationIds[0] }
                    : { notificationIds },
            ),
        });

        const result = await response.json().catch(() => null) as {
            successCount?: unknown;
            failedCount?: unknown;
            notificationIds?: unknown;
        } | null;

        if (!response.ok) {
            return { successCount: 0, failedCount: notificationIds.length, notificationIds: [] };
        }

        return {
            successCount: typeof result?.successCount === "number" ? result.successCount : notificationIds.length,
            failedCount: typeof result?.failedCount === "number" ? result.failedCount : 0,
            notificationIds: Array.isArray(result?.notificationIds)
                ? result.notificationIds.filter((entry): entry is string => typeof entry === "string")
                : [...notificationIds],
        };
    } catch (error) {
        reportClientIssue({
            channel: "notifications",
            message: "Notification mark-as-read failed",
            error,
            detail: {
                context: "markNotificationsAsRead",
                notificationIds,
            },
            consoleLabel: "[Notifications] mark as read failed",
        });
        return { successCount: 0, failedCount: notificationIds.length, notificationIds: [] };
    }
}

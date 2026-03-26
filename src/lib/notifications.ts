
import { authFetch } from "@/lib/authFetch";
import { captureException } from "@/lib/monitoring";
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
        captureException(error, { context: "sendNotification", payload });
        return { success: false, error };
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const response = await authFetch("/api/notifications", {
            method: "PUT",
            body: JSON.stringify({ notificationId }),
        });

        return response.ok;
    } catch (error) {
        captureException(error, { context: "markNotificationAsRead", notificationId });
        return false;
    }
}

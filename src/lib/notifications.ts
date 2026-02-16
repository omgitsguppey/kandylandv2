
import { authFetch } from "@/lib/authFetch";

export interface NotificationPayload {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    target: {
        global: boolean;
        userIds?: string[];
    };
    link?: string;
}

export async function sendNotification(payload: NotificationPayload) {
    try {
        const response = await authFetch("/api/notifications", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return { success: true };
    } catch (error) {
        console.error("Error sending notification:", error);
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
        console.error("Error marking notification as read:", error);
        return false;
    }
}

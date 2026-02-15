
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
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

export async function markNotificationAsRead(notificationId: string, userId: string) {
    try {
        const response = await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId, userId }),
        });

        return response.ok;
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return false;
    }
}

export type NotificationLocalReadEntry = {
    id: string;
    readBy: string[];
};

function uniqueIds(ids: string[]) {
    return new Set(ids.filter((id) => id.trim().length > 0));
}

export function markNotificationsReadLocally<T extends NotificationLocalReadEntry>(
    notifications: T[],
    notificationIds: string[],
    userId: string,
) {
    const targetIds = uniqueIds(notificationIds);
    if (targetIds.size === 0) {
        return notifications;
    }

    return notifications.map((notification) => {
        if (!targetIds.has(notification.id) || notification.readBy.includes(userId)) {
            return notification;
        }

        return {
            ...notification,
            readBy: [...notification.readBy, userId],
        };
    });
}

export function removeNotificationsLocally<T extends NotificationLocalReadEntry>(
    notifications: T[],
    notificationIds: string[],
) {
    const targetIds = uniqueIds(notificationIds);
    if (targetIds.size === 0) {
        return notifications;
    }

    return notifications.filter((notification) => !targetIds.has(notification.id));
}

export function reconcileClearAllNotifications<T extends NotificationLocalReadEntry>(
    previousNotifications: T[],
    attemptedNotificationIds: string[],
    succeededNotificationIds: string[],
) {
    const attemptedIds = uniqueIds(attemptedNotificationIds);
    const succeededIds = uniqueIds(succeededNotificationIds);

    if (attemptedIds.size === 0) {
        return previousNotifications;
    }

    return previousNotifications.filter((notification) => {
        if (!attemptedIds.has(notification.id)) {
            return true;
        }

        return !succeededIds.has(notification.id);
    });
}

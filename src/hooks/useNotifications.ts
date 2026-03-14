"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthIdentity } from "@/context/AuthContext";
import { markNotificationAsRead } from "@/lib/notifications";
import { AppNotification } from "@/lib/notification-contracts";
import { trackEvent } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";

export type Notification = AppNotification;

export function useNotifications() {
    const { user } = useAuthIdentity();
    const userId = user?.uid ?? null;
    const [notificationsState, setNotificationsState] = useState<Notification[]>([]);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setNotificationsState([]);
            setLoadedForUserId(null);
            return;
        }
        const currentUserId = userId;

        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const response = await authFetch("/api/notifications");
                const result = await response.json() as {
                    success?: boolean;
                    notifications?: Array<Notification & { createdAtMs?: number }>;
                };

                if (!response.ok || !result.success) {
                    throw new Error("Failed to load notifications");
                }

                if (cancelled) {
                    return;
                }

                const scopedNotifications = (result.notifications || []).map((notification) => ({
                    ...notification,
                    createdAt: notification.createdAtMs
                        ? { toDate: () => new Date(notification.createdAtMs as number) }
                        : null,
                })) as Notification[];

                setNotificationsState(scopedNotifications);
                setLoadedForUserId(currentUserId);
            } catch (error) {
                console.error("Failed to load notifications", error);
                if (!cancelled) {
                    setNotificationsState([]);
                    setLoadedForUserId(currentUserId);
                }
            }
        };

        void fetchNotifications();
        const interval = window.setInterval(() => {
            void fetchNotifications();
        }, 30_000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [userId]);

    const notifications = useMemo(
        () => (userId && loadedForUserId === userId ? notificationsState : []),
        [loadedForUserId, notificationsState, userId]
    );
    const loading = Boolean(userId) && loadedForUserId !== userId;

    // Unread count is simply the length now, since strictly unread notifications are present
    const unreadCount = useMemo(
        () => (userId ? notifications.length : 0),
        [notifications, userId]
    );

    const markAsRead = async (id: string) => {
        if (!userId) return;

        setNotificationsState((prev) => prev.filter((notification) => notification.id !== id));
        trackEvent("notification_marked_read", {
            notification_id: id,
        });
        await markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if (!userId) return;

        const unreadIds = notifications.map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return;
        }

        setNotificationsState([]);
        trackEvent("notification_mark_all_read", {
            unread_count: unreadIds.length,
        });
        trackEvent("notification_marked_read", {
            unread_count: unreadIds.length,
        });
        await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

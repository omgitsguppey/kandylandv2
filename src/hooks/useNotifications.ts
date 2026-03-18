"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthIdentity } from "@/context/AuthContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { markNotificationAsRead } from "@/lib/notifications";
import { AppNotification } from "@/lib/notification-contracts";
import { trackEvent } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";

type Notification = AppNotification;

export function useNotifications() {
    const { user } = useAuthIdentity();
    const userId = user?.uid ?? null;
    const [notificationsState, setNotificationsState] = useState<Notification[]>([]);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const etagRef = useRef<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setNotificationsState([]);
            setLoadedForUserId(null);
            etagRef.current = null;
            return;
        }
        const currentUserId = userId;

        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const headers = new Headers();
                if (etagRef.current) {
                    headers.set("If-None-Match", etagRef.current);
                }

                const response = await authFetch("/api/notifications", { headers });
                if (response.status === 304) {
                    if (!cancelled) {
                        setLoadedForUserId(currentUserId);
                    }
                    return;
                }

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

                etagRef.current = response.headers.get("etag");
                setNotificationsState(scopedNotifications);
                setLoadedForUserId(currentUserId);
            } catch (error) {
                console.error("Failed to load notifications", error);
                if (!cancelled) {
                    setLoadedForUserId(currentUserId);
                }
            }
        };

        void fetchNotifications();
        const interval = window.setInterval(() => {
            void fetchNotifications();
        }, 30_000);
        const refreshOnVisible = () => {
            if (document.visibilityState === "visible") {
                void fetchNotifications();
            }
        };
        const refreshOnDemand = () => {
            void fetchNotifications();
        };

        window.addEventListener("focus", refreshOnDemand);
        window.addEventListener(CLIENT_RUNTIME_EVENTS.notificationsSync, refreshOnDemand);
        document.addEventListener("visibilitychange", refreshOnVisible);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
            window.removeEventListener("focus", refreshOnDemand);
            window.removeEventListener(CLIENT_RUNTIME_EVENTS.notificationsSync, refreshOnDemand);
            document.removeEventListener("visibilitychange", refreshOnVisible);
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
        if (!userId) return false;

        const success = await markNotificationAsRead(id);
        if (!success) {
            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
            return false;
        }

        setNotificationsState((prev) => prev.filter((notification) => notification.id !== id));
        trackEvent("notification_marked_read", {
            notification_id: id,
        });
        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
        return true;
    };

    const markAllAsRead = async () => {
        if (!userId) {
            return { successCount: 0, failedCount: 0 };
        }

        const unreadIds = notifications.map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return { successCount: 0, failedCount: 0 };
        }

        trackEvent("notification_mark_all_read", {
            unread_count: unreadIds.length,
        });

        const results = await Promise.allSettled(unreadIds.map((id) => markNotificationAsRead(id)));
        const succeededIds = unreadIds.filter((id, index) => {
            const result = results[index];
            return result?.status === "fulfilled" && result.value === true;
        });
        const failedCount = unreadIds.length - succeededIds.length;

        if (succeededIds.length > 0) {
            setNotificationsState((prev) => prev.filter((notification) => !succeededIds.includes(notification.id)));
            trackEvent("notification_marked_read", {
                unread_count: succeededIds.length,
            });
        }

        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
        return {
            successCount: succeededIds.length,
            failedCount,
        };
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

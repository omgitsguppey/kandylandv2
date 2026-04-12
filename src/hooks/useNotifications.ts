"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthIdentity } from "@/context/AuthContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { markNotificationsAsRead } from "@/lib/notifications";
import { AppNotification } from "@/lib/notification-contracts";
import { trackEvent } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";

type Notification = AppNotification;

interface MarkNotificationAsReadOptions {
    preserveVisible?: boolean;
}

interface UseNotificationsOptions {
    enabled?: boolean;
}

export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
    const { user } = useAuthIdentity();
    const userId = user?.uid ?? null;
    const [notificationsState, setNotificationsState] = useState<Notification[]>([]);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const etagRef = useRef<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setNotificationsState([]);
            setLoadedForUserId(null);
            setLoadError(null);
            etagRef.current = null;
            return;
        }
        if (!enabled) {
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
                        setLoadError(null);
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
                    createdAt: typeof notification.createdAtMs === "number" && Number.isFinite(notification.createdAtMs)
                        ? {
                            toDate: () => new Date(notification.createdAtMs as number),
                            toMillis: () => notification.createdAtMs as number,
                        }
                        : null,
                })) as Notification[];

                etagRef.current = response.headers.get("etag");
                setNotificationsState(scopedNotifications);
                setLoadedForUserId(currentUserId);
                setLoadError(null);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                reportRealtimeIssue("notifications fetch", error, {
                    userId: currentUserId,
                    message,
                });
                if (!cancelled) {
                    setLoadError(message);
                    setLoadedForUserId(currentUserId);
                }
            }
        };

        let lastFetchedAt = 0;

        const refreshOnDemand = () => {
            lastFetchedAt = Date.now();
            void fetchNotifications();
        };

        void fetchNotifications();
        lastFetchedAt = Date.now();

        const refreshOnVisible = () => {
            if (document.visibilityState === "visible" && Date.now() - lastFetchedAt > 120_000) {
                lastFetchedAt = Date.now();
                void fetchNotifications();
            }
        };

        window.addEventListener("focus", refreshOnVisible);
        window.addEventListener(CLIENT_RUNTIME_EVENTS.notificationsSync, refreshOnDemand);
        document.addEventListener("visibilitychange", refreshOnVisible);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", refreshOnVisible);
            window.removeEventListener(CLIENT_RUNTIME_EVENTS.notificationsSync, refreshOnDemand);
            document.removeEventListener("visibilitychange", refreshOnVisible);
        };
    }, [enabled, userId]);

    const notifications = useMemo(
        () => (userId && loadedForUserId === userId ? notificationsState : []),
        [loadedForUserId, notificationsState, userId]
    );
    const loading = Boolean(userId) && enabled && loadedForUserId !== userId;

    const unreadCount = useMemo(
        () => (userId ? notifications.filter((notification) => !notification.readBy.includes(userId)).length : 0),
        [notifications, userId]
    );

    const markAsRead = async (id: string, options?: MarkNotificationAsReadOptions) => {
        if (!userId) return false;

        const existingNotification = notificationsState.find((notification) => notification.id === id);
        if (existingNotification?.readBy.includes(userId)) {
            return true;
        }

        const result = await markNotificationsAsRead([id]);
        if (result.successCount === 0) {
            return false;
        }

        setNotificationsState((prev) => prev.map((notification) => {
            if (notification.id !== id) {
                return notification;
            }

            if (notification.readBy.includes(userId)) {
                return notification;
            }

            return {
                ...notification,
                readBy: [...notification.readBy, userId],
            };
        }));
        trackEvent("notification_marked_read", {
            notification_id: id,
        });

        if (!options?.preserveVisible) {
            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
        }

        return true;
    };

    const markAllAsRead = async () => {
        if (!userId) {
            return { successCount: 0, failedCount: 0 };
        }

        const unreadIds = notifications
            .filter((notification) => !notification.readBy.includes(userId))
            .map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return { successCount: 0, failedCount: 0 };
        }

        trackEvent("notification_mark_all_read", {
            unread_count: unreadIds.length,
        });

        const result = await markNotificationsAsRead(unreadIds);
        const failedCount = result.failedCount;
        const succeededIds = result.notificationIds;

        if (succeededIds.length > 0) {
            setNotificationsState((prev) => prev.map((notification) => (
                succeededIds.includes(notification.id)
                    ? {
                        ...notification,
                        readBy: notification.readBy.includes(userId)
                            ? notification.readBy
                            : [...notification.readBy, userId],
                    }
                    : notification
            )));
        }

        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync);
        return {
            successCount: succeededIds.length,
            failedCount,
        };
    };

    return { notifications, unreadCount, loading, error: loadError, markAsRead, markAllAsRead };
}

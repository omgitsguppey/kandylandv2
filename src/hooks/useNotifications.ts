"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthIdentity } from "@/context/AuthContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent, listenForClientRuntimeEvent } from "@/hooks/client-runtime";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import {
    markNotificationsReadLocally,
    reconcileClearAllNotifications,
    removeNotificationsLocally,
} from "@/lib/notification-local-state";
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
    const consecutiveFailuresRef = useRef<number>(0);

    useEffect(() => {
        if (!userId) {
            setNotificationsState([]);
            setLoadedForUserId(null);
            setLoadError(null);
            etagRef.current = null;
            consecutiveFailuresRef.current = 0;
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
                        consecutiveFailuresRef.current = 0;
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

                consecutiveFailuresRef.current = 0;
                etagRef.current = response.headers.get("etag");
                setNotificationsState(scopedNotifications);
                setLoadedForUserId(currentUserId);
                setLoadError(null);
            } catch (error) {
                consecutiveFailuresRef.current += 1;
                const failureCount = consecutiveFailuresRef.current;
                const isConsecutive = failureCount > 1;
                const message = error instanceof Error ? error.message : String(error);
                reportRealtimeIssue("notifications fetch", error, {
                    userId: currentUserId,
                    message,
                    failureCount: failureCount.toString(),
                    escalated: isConsecutive.toString(),
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
        const removeNotificationsSyncListener = listenForClientRuntimeEvent(
            CLIENT_RUNTIME_EVENTS.notificationsSync,
            refreshOnDemand,
        );
        document.addEventListener("visibilitychange", refreshOnVisible);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", refreshOnVisible);
            removeNotificationsSyncListener();
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

        const previousNotifications = notificationsState;
        setNotificationsState((prev) => options?.preserveVisible
            ? markNotificationsReadLocally(prev, [id], userId)
            : removeNotificationsLocally(prev, [id]));

        const result = await markNotificationsAsRead([id]);
        if (result.successCount === 0) {
            setNotificationsState(previousNotifications);
            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true);
            return false;
        }
        trackEvent("notification_marked_read", {
            notification_id: id,
            idempotency_key: id,
            recipient_id: userId,
            notification_type: "in_app",
            optimistic: true,
        });

        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true);

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
            idempotency_key: `mark_all:${userId}:${unreadIds.join("|")}`,
            recipient_id: userId,
            notification_type: "in_app",
            unread_count: unreadIds.length,
        });

        const previousNotifications = notificationsState;
        setNotificationsState((prev) => removeNotificationsLocally(prev, unreadIds));

        const result = await markNotificationsAsRead(unreadIds);
        const failedCount = result.failedCount;
        const succeededIds = result.notificationIds;

        if (succeededIds.length === 0 && failedCount > 0) {
            setNotificationsState(previousNotifications);
            dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true);
            return {
                successCount: 0,
                failedCount,
            };
        }

        if (succeededIds.length > 0 && failedCount > 0) {
            setNotificationsState(reconcileClearAllNotifications(previousNotifications, unreadIds, succeededIds));
        }

        if (succeededIds.length > 0) {
            trackEvent("notification_cleared", {
                source: "clear_all",
                idempotency_key: `clear_all:${userId}:${succeededIds.join("|")}`,
                recipient_id: userId,
                notification_type: "in_app",
                cleared_count: succeededIds.length,
                failed_count: failedCount,
            });
        }

        dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.notificationsSync, true);
        return {
            successCount: succeededIds.length,
            failedCount,
        };
    };

    return { notifications, unreadCount, loading, error: loadError, markAsRead, markAllAsRead };
}

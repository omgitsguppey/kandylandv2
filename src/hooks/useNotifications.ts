"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthIdentity } from "@/context/AuthContext";
import { CLIENT_RUNTIME_EVENTS, dispatchClientRuntimeEvent } from "@/hooks/client-runtime";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { markNotificationAsRead } from "@/lib/notifications";
import { NOTIFICATION_RUNTIME_COLLECTION, NOTIFICATION_RUNTIME_DOC_ID } from "@/lib/notification-runtime";
import { AppNotification } from "@/lib/notification-contracts";
import { trackEvent } from "@/lib/telemetry";
import { USER_RUNTIME_COLLECTION } from "@/lib/user-runtime";
import { authFetch } from "@/lib/authFetch";

type Notification = AppNotification;

interface MarkNotificationAsReadOptions {
    preserveVisible?: boolean;
}

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
        let unsubscribeSystemRuntime: (() => void) | undefined;
        let unsubscribeUserRuntime: (() => void) | undefined;
        let sawSystemRuntimeSnapshot = false;
        let sawUserRuntimeSnapshot = false;

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
                recordClientDiagnostic("realtime", "Notifications fetch failed", {
                    userId: currentUserId,
                    message: error instanceof Error ? error.message : String(error),
                });
                if (!cancelled) {
                    setLoadedForUserId(currentUserId);
                }
            }
        };

        const refreshOnDemand = () => {
            void fetchNotifications();
        };

        const subscribeToRuntimeSignals = async () => {
            try {
                const [{ doc, onSnapshot }, { db }] = await Promise.all([
                    import("firebase/firestore"),
                    import("@/lib/firebase-data"),
                ]);

                if (cancelled) {
                    return;
                }

                unsubscribeSystemRuntime = onSnapshot(
                    doc(db, NOTIFICATION_RUNTIME_COLLECTION, NOTIFICATION_RUNTIME_DOC_ID),
                    () => {
                        if (!sawSystemRuntimeSnapshot) {
                            sawSystemRuntimeSnapshot = true;
                            return;
                        }

                        refreshOnDemand();
                    },
                    (error) => {
                        recordClientDiagnostic("realtime", "Notifications runtime subscription failed", {
                            scope: "system",
                            message: error.message,
                        });
                    },
                );

                unsubscribeUserRuntime = onSnapshot(
                    doc(db, USER_RUNTIME_COLLECTION, currentUserId),
                    (snapshot) => {
                        if (!sawUserRuntimeSnapshot) {
                            sawUserRuntimeSnapshot = true;
                            return;
                        }

                        const data = snapshot.data() as { notificationsVersion?: number } | undefined;
                        if (typeof data?.notificationsVersion === "number") {
                            refreshOnDemand();
                        }
                    },
                    (error) => {
                        recordClientDiagnostic("realtime", "Notifications user runtime subscription failed", {
                            scope: "user",
                            message: error.message,
                        });
                    },
                );
            } catch (error) {
                recordClientDiagnostic("firebase", "Notifications runtime setup failed", {
                    userId: currentUserId,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        };

        void fetchNotifications();
        void subscribeToRuntimeSignals();
        const interval = window.setInterval(() => {
            void fetchNotifications();
        }, 90_000);
        const refreshOnVisible = () => {
            if (document.visibilityState === "visible") {
                void fetchNotifications();
            }
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
            if (unsubscribeSystemRuntime) {
                unsubscribeSystemRuntime();
            }
            if (unsubscribeUserRuntime) {
                unsubscribeUserRuntime();
            }
        };
    }, [userId]);

    const notifications = useMemo(
        () => (userId && loadedForUserId === userId ? notificationsState : []),
        [loadedForUserId, notificationsState, userId]
    );
    const loading = Boolean(userId) && loadedForUserId !== userId;

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

        const success = await markNotificationAsRead(id);
        if (!success) {
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

        const results = await Promise.allSettled(unreadIds.map((id) => markNotificationAsRead(id)));
        const succeededIds = unreadIds.filter((id, index) => {
            const result = results[index];
            return result?.status === "fulfilled" && result.value === true;
        });
        const failedCount = unreadIds.length - succeededIds.length;

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

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

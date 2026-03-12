"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { useAuthIdentity } from "@/context/AuthContext";
import { markNotificationAsRead } from "@/lib/notifications";
import { AppNotification, normalizeNotificationDoc } from "@/lib/notification-contracts";

export type Notification = AppNotification;

export function useNotifications() {
    const { user } = useAuthIdentity();
    const userId = user?.uid ?? null;
    const [notificationsState, setNotificationsState] = useState<Notification[]>([]);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            return;
        }
        const currentUserId = userId;

        const notificationsQuery = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const scopedNotifications: Notification[] = [];

            snapshot.forEach((noteDoc) => {
                const normalized = normalizeNotificationDoc(noteDoc.id, noteDoc.data());
                if (!normalized) {
                    return;
                }

                if (normalized.target.excludedUserIds && normalized.target.excludedUserIds.includes(currentUserId)) {
                    return;
                }

                // When users sign up (or generally), ensure notifications older than 7 days do not appear
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                if (normalized.createdAt && normalized.createdAt.toMillis() < sevenDaysAgo) {
                    return;
                }

                // When notifications are marked as read, remove them from the notification tab
                if (normalized.readBy.includes(currentUserId)) {
                    return;
                }

                if (normalized.target.global || normalized.target.userIds.includes(currentUserId)) {
                    scopedNotifications.push(normalized);
                }
            });

            setNotificationsState(scopedNotifications);
            setLoadedForUserId(currentUserId);
        });

        return () => unsubscribe();
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
        await markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if (!userId) return;

        const unreadIds = notifications.map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return;
        }

        setNotificationsState([]);
        await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

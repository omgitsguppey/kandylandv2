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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);

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

                if (normalized.target.excludedUserIds && normalized.target.excludedUserIds.includes(user.uid)) {
                    return;
                }

                // When users sign up (or generally), ensure notifications older than 7 days do not appear
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                if (normalized.createdAt && normalized.createdAt.toMillis() < sevenDaysAgo) {
                    return;
                }

                // When notifications are marked as read, remove them from the notification tab
                if (normalized.readBy.includes(user.uid)) {
                    return;
                }

                if (normalized.target.global || normalized.target.userIds.includes(user.uid)) {
                    scopedNotifications.push(normalized);
                }
            });

            setNotifications(scopedNotifications);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Unread count is simply the length now, since strictly unread notifications are present
    const unreadCount = useMemo(
        () => (user ? notifications.length : 0),
        [notifications, user]
    );

    const markAsRead = async (id: string) => {
        if (!user) return;

        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
        await markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const unreadIds = notifications.map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return;
        }

        setNotifications([]);
        await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

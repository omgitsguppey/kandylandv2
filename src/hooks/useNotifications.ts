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

                if (normalized.target.global || normalized.target.userIds.includes(user.uid)) {
                    scopedNotifications.push(normalized);
                }
            });

            setNotifications(scopedNotifications);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = useMemo(
        () => (user ? notifications.filter((notification) => !notification.readBy.includes(user.uid)).length : 0),
        [notifications, user]
    );

    const markAsRead = async (id: string) => {
        if (!user) return;

        setNotifications((prev) => prev.map((notification) => {
            if (notification.id !== id || notification.readBy.includes(user.uid)) {
                return notification;
            }

            return { ...notification, readBy: [...notification.readBy, user.uid] };
        }));

        await markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const unreadIds = notifications
            .filter((notification) => !notification.readBy.includes(user.uid))
            .map((notification) => notification.id);

        if (unreadIds.length === 0) {
            return;
        }

        setNotifications((prev) => prev.map((notification) => {
            if (notification.readBy.includes(user.uid)) {
                return notification;
            }

            return { ...notification, readBy: [...notification.readBy, user.uid] };
        }));

        await Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

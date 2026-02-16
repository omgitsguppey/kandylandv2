"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthIdentity } from "@/context/AuthContext";
import { markNotificationAsRead } from "@/lib/notifications";

interface NotificationTarget {
    global: boolean;
    userIds: string[];
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    createdAt: Timestamp | null;
    readBy: string[];
    target: NotificationTarget;
    link?: string;
}

interface NotificationDoc {
    title?: unknown;
    message?: unknown;
    type?: unknown;
    createdAt?: unknown;
    readBy?: unknown;
    target?: unknown;
    link?: unknown;
}

const NOTIFICATION_TYPES: Notification["type"][] = ["info", "success", "warning", "error"];

function normalizeNotification(id: string, data: NotificationDoc): Notification | null {
    if (typeof data.title !== "string" || typeof data.message !== "string") {
        return null;
    }

    const type = NOTIFICATION_TYPES.includes(data.type as Notification["type"])
        ? (data.type as Notification["type"])
        : "info";

    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : null;
    const readBy = Array.isArray(data.readBy) ? data.readBy.filter((entry): entry is string => typeof entry === "string") : [];

    const targetObj = (data.target && typeof data.target === "object") ? data.target as { global?: unknown; userIds?: unknown } : null;
    const userIds = Array.isArray(targetObj?.userIds)
        ? targetObj.userIds.filter((entry): entry is string => typeof entry === "string")
        : [];

    const target: NotificationTarget = {
        global: targetObj?.global === true,
        userIds,
    };

    return {
        id,
        title: data.title,
        message: data.message,
        type,
        createdAt,
        readBy,
        target,
        link: typeof data.link === "string" ? data.link : undefined,
    };
}

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
                const normalized = normalizeNotification(noteDoc.id, noteDoc.data() as NotificationDoc);
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


import { useState, useEffect } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    where,
    limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthIdentity } from "@/context/AuthContext";
import { markNotificationAsRead } from "@/lib/notifications";

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    createdAt: any;
    readBy: string[];
    target: {
        global: boolean;
        userIds?: string[];
    };
    link?: string;
}

export function useNotifications() {
    const { user } = useAuthIdentity();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        // Subscribe to global notifications OR notifications targeted at user
        // Note: Firestore OR queries can be tricky. For now, we'll fetch global ones 
        // and filter client side if needed, or two queries. 
        // Simplest valid query for now: global = true

        // Let's just fetch recent global notifications for MVP
        const q = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allNotes: Notification[] = [];
            let unread = 0;

            snapshot.forEach((doc) => {
                const data = doc.data() as Omit<Notification, "id">;

                // Filter logic
                const isGlobal = data.target?.global;
                const isTargeted = data.target?.userIds?.includes(user.uid);

                if (isGlobal || isTargeted) {
                    const isRead = data.readBy?.includes(user.uid);
                    if (!isRead) unread++;

                    allNotes.push({ id: doc.id, ...data });
                }
            });

            setNotifications(allNotes);
            setUnreadCount(unread);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (id: string) => {
        if (!user) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => {
            if (n.id === id && !n.readBy.includes(user.uid)) {
                return { ...n, readBy: [...n.readBy, user.uid] };
            }
            return n;
        }));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await markNotificationAsRead(id, user.uid);
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const unreadNotes = notifications.filter(n => !n.readBy.includes(user.uid));

        // Optimistic
        setNotifications(prev => prev.map(n => ({
            ...n,
            readBy: [...(n.readBy || []), user.uid]
        })));
        setUnreadCount(0);

        // This might be heavy if many unread, but okay for MVP
        unreadNotes.forEach(n => markNotificationAsRead(n.id, user.uid));
    };

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import { CHAT_COLLECTIONS, resolveChatThreadUnreadCount, type ChatThreadRecord } from "@/lib/chat";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";

export function useChatUnreadStatus() {
    const { user, userProfile } = useAuth();
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

    useEffect(() => {
        if (!user || !userProfile) {
            return;
        }

        const viewerField = userProfile.role === "creator" ? "creatorId" : "userId";

        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
            (snapshot) => {
                let unreadCount = 0;
                for (const docSnapshot of snapshot.docs) {
                    const raw = docSnapshot.data() as ChatThreadRecord;
                    const viewerRole = raw.creatorId === user.uid ? "creator" : "user";
                    unreadCount += resolveChatThreadUnreadCount(raw, viewerRole);
                }
                setHasUnreadMessages(unreadCount > 0);
            },
            (error) => {
                reportRealtimeIssue("chat unread status", error, {
                    userId: user.uid,
                });
            },
        );

        return () => unsubscribe();
    }, [user, userProfile]);

    return { hasUnreadMessages: (user && userProfile) ? hasUnreadMessages : false };
}

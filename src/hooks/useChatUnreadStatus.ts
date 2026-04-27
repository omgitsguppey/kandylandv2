import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import {
    CHAT_COLLECTIONS,
    resolveChatThreadUnreadCount,
    resolveChatViewerRole,
    type ChatThreadRecord,
} from "@/lib/chat";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";

export function useChatUnreadStatus() {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const [unreadState, setUnreadState] = useState({
        ownerKey: "",
        hasUnreadMessages: false,
    });
    const realtimeIssueReportedAtRef = useRef<number | null>(null);
    const preferRealtime = pathname?.startsWith("/dashboard/chat") === true;
    const viewerRole = resolveChatViewerRole({
        viewerUid: user?.uid || "",
        profile: userProfile,
    });
    const subscriptionKey =
        user && userProfile && preferRealtime ? `${user.uid}:${viewerRole}` : null;

    useEffect(() => {
        if (!subscriptionKey || !user) {
            realtimeIssueReportedAtRef.current = null;
            return;
        }

        const viewerField = viewerRole === "creator" ? "creatorId" : "userId";
        let cancelled = false;
        
        const observerControl = createAutoHealingObserver(
            () => {
                return onSnapshot(
                    query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
                    (snapshot) => {
                        if (cancelled) return;
                        let unreadCount = 0;
                        for (const docSnapshot of snapshot.docs) {
                            const raw = docSnapshot.data() as ChatThreadRecord;
                            const currentRole = raw.creatorId === user.uid ? "creator" : "user";
                            unreadCount += resolveChatThreadUnreadCount(raw, currentRole);
                        }
                        realtimeIssueReportedAtRef.current = null;
                        setUnreadState({
                            ownerKey: subscriptionKey,
                            hasUnreadMessages: unreadCount > 0,
                        });
                    },
                    (error) => {
                        if (cancelled) return;
                        observerControl.triggerReconnect(error);
                    }
                );
            },
            (error: unknown) => {
                if (cancelled) return;
                const now = Date.now();
                if (!realtimeIssueReportedAtRef.current || now - realtimeIssueReportedAtRef.current > 30000) {
                    realtimeIssueReportedAtRef.current = now;
                    reportRealtimeIssue("chat unread status", error, {
                        userId: user.uid,
                        ...buildFirestoreClientIssueDetail(error, {
                            fallbackMessage: buildFirestoreClientFallbackMessage("Chat unread badge", error),
                            path: `${CHAT_COLLECTIONS.threads}`
                        }) as Record<string, string>,
                    });
                }
            },
            5000 // Fixed 5s retry interval like ChatExperience
        );

        return () => {
            cancelled = true;
            observerControl.cleanup();
        };
    }, [subscriptionKey, user, viewerRole]);

    return {
        hasUnreadMessages:
            subscriptionKey !== null && unreadState.ownerKey === subscriptionKey
                ? unreadState.hasUnreadMessages
                : false,
    };
}

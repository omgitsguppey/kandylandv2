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
import { getChatRealtimeRetryDelayMs, shouldReportChatRealtimeFailure } from "@/lib/chat-realtime";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { authFetch } from "@/lib/authFetch";

export function useChatUnreadStatus() {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [realtimeRetryEpoch, setRealtimeRetryEpoch] = useState(0);
    const realtimeRetryAttemptRef = useRef(0);
    const realtimeRetryTimerRef = useRef<number | null>(null);
    const realtimeIssueReportedAtRef = useRef<number | null>(null);
    const preferRealtime = pathname?.startsWith("/dashboard/chat") === true;
    const viewerRole = resolveChatViewerRole({
        viewerUid: user?.uid || "",
        profile: userProfile,
    });

    useEffect(() => {
        if (!user || !userProfile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHasUnreadMessages(false);
            realtimeRetryAttemptRef.current = 0;
            realtimeIssueReportedAtRef.current = null;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            return;
        }
        const pollFallback = () => {
            void authFetch("/api/chat/threads").then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                         let unreadCount = 0;
                         if (Array.isArray(data?.threads)) {
                             for (const thread of data.threads) {
                                  const role = thread.creatorId === user.uid ? "creator" : "user";
                                  unreadCount += resolveChatThreadUnreadCount(thread, role);
                             }
                         }
                         setHasUnreadMessages(unreadCount > 0);
                    }).catch(() => {});
                }
            }).catch(() => {});
        };

        if (!preferRealtime) {
            realtimeRetryAttemptRef.current = 0;
            realtimeIssueReportedAtRef.current = null;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            pollFallback();
            return;
        }

        const viewerField = viewerRole === "creator" ? "creatorId" : "userId";
        const scheduleRetry = () => {
            if (realtimeRetryTimerRef.current) {
                return getChatRealtimeRetryDelayMs(realtimeRetryAttemptRef.current || 1);
            }

            realtimeRetryAttemptRef.current += 1;
            const retryDelayMs = getChatRealtimeRetryDelayMs(realtimeRetryAttemptRef.current);
            realtimeRetryTimerRef.current = window.setTimeout(() => {
                realtimeRetryTimerRef.current = null;
                setRealtimeRetryEpoch((current) => current + 1);
            }, retryDelayMs);
            return retryDelayMs;
        };

        let active = true;
        let unsubscribe: (() => void) | null = null;
        unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
            (snapshot) => {
                if (!active) {
                    return;
                }
                let unreadCount = 0;
                for (const docSnapshot of snapshot.docs) {
                    const raw = docSnapshot.data() as ChatThreadRecord;
                    const viewerRole = raw.creatorId === user.uid ? "creator" : "user";
                    unreadCount += resolveChatThreadUnreadCount(raw, viewerRole);
                }
                if (realtimeRetryTimerRef.current) {
                    window.clearTimeout(realtimeRetryTimerRef.current);
                    realtimeRetryTimerRef.current = null;
                }
                realtimeRetryAttemptRef.current = 0;
                realtimeIssueReportedAtRef.current = null;
                setHasUnreadMessages(unreadCount > 0);
            },
            (error) => {
                if (!active) {
                    return;
                }
                active = false;
                unsubscribe?.();
                const retryDelayMs = scheduleRetry();
                const now = Date.now();
                if (shouldReportChatRealtimeFailure(realtimeIssueReportedAtRef.current, now)) {
                    realtimeIssueReportedAtRef.current = now;
                    reportRealtimeIssue("chat unread status", error, {
                        userId: user.uid,
                        ...buildFirestoreClientIssueDetail(error, {
                            fallbackMessage: buildFirestoreClientFallbackMessage("Chat unread badge", error),
                            retryDelayMs,
                        }),
                    });
                }
                pollFallback();
            },
        );

        return () => {
            active = false;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            unsubscribe?.();
        };
    }, [preferRealtime, realtimeRetryEpoch, user, userProfile, viewerRole]);

    return { hasUnreadMessages: (user && userProfile) ? hasUnreadMessages : false };
}

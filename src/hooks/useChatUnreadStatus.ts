import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import {
    CHAT_COLLECTIONS,
    resolveChatThreadUnreadCount,
    resolveChatViewerRole,
    type ChatThreadRecord,
} from "@/lib/chat";
import { getChatRealtimeRetryDelayMs } from "@/lib/chat-realtime";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";

export function useChatUnreadStatus() {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [realtimeDegraded, setRealtimeDegraded] = useState(false);
    const [realtimeRetryEpoch, setRealtimeRetryEpoch] = useState(0);
    const realtimeRetryAttemptRef = useRef(0);
    const realtimeRetryTimerRef = useRef<number | null>(null);
    const preferRealtime = pathname?.startsWith("/dashboard/chat") === true;
    const viewerRole = resolveChatViewerRole({
        viewerUid: user?.uid || "",
        profile: userProfile,
    });
    const refreshUnreadFromApi = useCallback(async () => {
        if (!user || !userProfile) {
            setHasUnreadMessages(false);
            return;
        }

        try {
            const response = await authFetch("/api/chat/threads");
            const body = await response.json() as { threads?: ChatThreadRecord[]; error?: string };
            if (!response.ok) {
                throw new Error(body.error || "Failed to refresh unread chat state.");
            }

            const unreadCount = (Array.isArray(body.threads) ? body.threads : []).reduce((total, thread) => (
                total + resolveChatThreadUnreadCount(thread, thread.viewerRole)
            ), 0);
            setHasUnreadMessages(unreadCount > 0);
        } catch (error) {
            reportRealtimeIssue("chat unread status fallback", error, {
                userId: user.uid,
            });
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (!user || !userProfile) {
            setHasUnreadMessages(false);
            setRealtimeDegraded(false);
            realtimeRetryAttemptRef.current = 0;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            return;
        }
        if (!preferRealtime) {
            setRealtimeDegraded(false);
            realtimeRetryAttemptRef.current = 0;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
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

        const unsubscribe = onSnapshot(
            query(collection(db, CHAT_COLLECTIONS.threads), where(viewerField, "==", user.uid)),
            (snapshot) => {
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
                setRealtimeDegraded(false);
                setHasUnreadMessages(unreadCount > 0);
            },
            (error) => {
                setRealtimeDegraded(true);
                const retryDelayMs = scheduleRetry();
                reportRealtimeIssue("chat unread status", error, {
                    userId: user.uid,
                    ...buildFirestoreClientIssueDetail(error, {
                        fallbackMessage: buildFirestoreClientFallbackMessage("Chat unread badge", error),
                        retryDelayMs,
                    }),
                });
            },
        );

        return () => {
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            unsubscribe();
        };
    }, [preferRealtime, realtimeRetryEpoch, user, userProfile, viewerRole]);

    useEffect(() => {
        if (!user || !userProfile || (!realtimeDegraded && preferRealtime)) {
            return;
        }

        void refreshUnreadFromApi();
        const intervalId = window.setInterval(() => {
            void refreshUnreadFromApi();
        }, 15_000);
        const refreshOnFocus = () => {
            void refreshUnreadFromApi();
        };
        const refreshOnVisible = () => {
            if (document.visibilityState === "visible") {
                void refreshUnreadFromApi();
            }
        };

        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisible);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisible);
        };
    }, [preferRealtime, realtimeDegraded, refreshUnreadFromApi, user, userProfile]);

    return { hasUnreadMessages: (user && userProfile) ? hasUnreadMessages : false };
}

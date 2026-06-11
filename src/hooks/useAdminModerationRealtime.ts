import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue, buildFirestoreClientIssueDetail } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { CHAT_COLLECTIONS } from "@/lib/chat";
import { buildChatSoftSealScope, softOpenChatValue } from "@/lib/chat-soft-seal";
import {
    clusterAdminModerationSecurityAlerts,
    normalizeAdminModerationSecurityAlert,
} from "@/lib/admin-moderation-security-alerts";
import type {
    AdminModerationMessageRecord,
    AdminModerationRouteErrorCode,
    AdminModerationRouteErrorResponse,
    AdminModerationSecurityAlertsResponse,
    AdminModerationSecurityAlert,
    AdminModerationThreadDetailResponse,
    AdminModerationThreadsResponse,
    AdminModerationThreadSummary,
} from "@/lib/admin-moderation";

const THREAD_LIMIT = 80;
const MESSAGE_LIMIT = 250;
const SECURITY_LIMIT = 120;

type ModerationRouteError = Error & {
    status?: number;
    errorCode?: AdminModerationRouteErrorCode;
    adminModerationRoute?: boolean;
};

type ModerationSessionState = "waiting_for_admin_session" | "ready";

async function fetchAdminModerationJson<T>(path: string): Promise<T> {
    const response = await authFetch(path, {
        cache: "no-store",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null) as Partial<AdminModerationRouteErrorResponse> | null;
        const error = new Error(body?.error || `Admin moderation snapshot failed (${response.status})`) as ModerationRouteError;
        error.status = response.status;
        error.errorCode = body?.errorCode;
        error.adminModerationRoute = body?.adminModerationRoute === true;
        throw error;
    }

    return response.json() as Promise<T>;
}

function classifyModerationRouteError(error: unknown): ModerationRouteError {
    const routeError = error instanceof Error ? error as ModerationRouteError : new Error(String(error)) as ModerationRouteError;
    const message = routeError.message || "";

    if (routeError.errorCode) {
        return routeError;
    }

    if (message === "Not authenticated" || message === "Missing or invalid token") {
        routeError.status = 401;
        routeError.errorCode = "unauthorized";
        return routeError;
    }

    return routeError;
}

function toNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
        try { return Math.trunc((value as { toMillis: () => number }).toMillis()); } catch { return 0; }
    }
    return 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown) {
    const normalized = toStringValue(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function mapThreadSummary(id: string, value: Record<string, unknown>): AdminModerationThreadSummary {
    return {
        id,
        creatorId: toStringValue(value.creatorId),
        creatorDisplayName: toNullableString(value.creatorDisplayName) ?? undefined,
        creatorUsername: toNullableString(value.creatorUsername) ?? undefined,
        creatorPhotoURL: toNullableString(value.creatorPhotoURL),
        userId: toStringValue(value.userId),
        userDisplayName: toNullableString(value.userDisplayName) ?? undefined,
        userUsername: toNullableString(value.userUsername) ?? undefined,
        userPhotoURL: toNullableString(value.userPhotoURL),
        lastMessageAt: toNumber(value.lastMessageAt),
        lastMessagePreview: toStringValue(softOpenChatValue(buildChatSoftSealScope(id, "preview"), toStringValue(value.lastMessagePreview))) || "New message",
        messageCount: Math.max(0, toNumber(value.messageCount)),
        lastMessageSenderRole: value.lastMessageSenderRole === "creator" || value.lastMessageSenderRole === "admin" || value.lastMessageSenderRole === "user" ? value.lastMessageSenderRole : undefined,
        unreadCountForCreator: Math.max(0, toNumber(value.unreadCountForCreator)),
        unreadCountForUser: Math.max(0, toNumber(value.unreadCountForUser)),
        subscriberChatFree: value.subscriberChatFree === true,
    };
}

function mapMessageRecord(id: string, value: Record<string, unknown>): AdminModerationMessageRecord {
    const threadId = toStringValue(value.threadId);
    return {
        id,
        threadId,
        creatorId: toStringValue(value.creatorId),
        userId: toStringValue(value.userId),
        senderRole: value.senderRole === "creator" || value.senderRole === "admin" ? value.senderRole : "user",
        messageKind: value.messageKind === "image" || value.messageKind === "video" || value.messageKind === "broadcast" ? value.messageKind : "text",
        text: toNullableString(value.text) && !toNullableString(softOpenChatValue(buildChatSoftSealScope(threadId, "text"), toNullableString(value.text)))
            ? "[Decryption Failed]"
            : toNullableString(softOpenChatValue(buildChatSoftSealScope(threadId, "text"), toNullableString(value.text))) ?? undefined,
        assetUrl: toNullableString(softOpenChatValue(buildChatSoftSealScope(threadId, "assetUrl"), toNullableString(value.assetUrl))) ?? undefined,
        assetName: toNullableString(softOpenChatValue(buildChatSoftSealScope(threadId, "assetName"), toNullableString(value.assetName))) ?? undefined,
        assetMimeType: toNullableString(value.assetMimeType) ?? undefined,
        costGd: Math.max(0, toNumber(value.costGd)),
        createdAt: toNumber(value.createdAt),
        moderationRemovedAt: toNumber(value.moderationRemovedAt) || undefined,
        moderationRemovedBy: toNullableString(value.moderationRemovedBy) ?? undefined,
    };
}

function mapSecurityAlert(id: string, value: Record<string, unknown>): AdminModerationSecurityAlert {
    return normalizeAdminModerationSecurityAlert(id, value);
}

export function useAdminModerationRealtime(selectedThreadId: string | null) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [threads, setThreads] = useState<AdminModerationThreadSummary[]>([]);
    const [messages, setMessages] = useState<AdminModerationMessageRecord[]>([]);
    const [messagesThreadId, setMessagesThreadId] = useState<string | null>(null);
    const [rawAlerts, setRawAlerts] = useState<AdminModerationSecurityAlert[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
    const [threadsError, setThreadsError] = useState<ModerationRouteError | null>(null);
    const [messagesError, setMessagesError] = useState<ModerationRouteError | null>(null);
    const [alertsError, setAlertsError] = useState<ModerationRouteError | null>(null);
    const adminSessionState: ModerationSessionState = authLoading || !user || userProfile?.role !== "admin"
        ? "waiting_for_admin_session"
        : "ready";
    const activeThreadId = useMemo(() => {
        if (selectedThreadId) {
            return selectedThreadId;
        }

        return threads[0]?.id ?? null;
    }, [selectedThreadId, threads]);

    /* eslint-disable react-hooks/set-state-in-effect -- Realtime listener state intentionally synchronizes loading/error state from admin session readiness. */
    useEffect(() => {
        if (adminSessionState !== "ready") {
            setIsLoadingThreads(true);
            setThreadsError(null);
            return;
        }

        let cancelled = false;
        void fetchAdminModerationJson<AdminModerationThreadsResponse>("/api/admin/moderation/threads")
            .then((body) => {
                if (cancelled) return;
                setThreads(body.threads);
                setIsLoadingThreads(false);
                setThreadsError(null);
            })
            .catch((error) => {
                if (cancelled) return;
                setThreadsError(classifyModerationRouteError(error));
                setIsLoadingThreads(false);
            });

        const q = query(collection(db, CHAT_COLLECTIONS.threads), orderBy("lastMessageAt", "desc"), limit(THREAD_LIMIT));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs.map((doc) => mapThreadSummary(doc.id, doc.data() as Record<string, unknown>));
            setThreads(mapped);
            setIsLoadingThreads(false);
        }, (error) => {
            if (cancelled) return;
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation threads", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_threads" });
        });

        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [adminSessionState]);
    /* eslint-enable react-hooks/set-state-in-effect */

    /* eslint-disable react-hooks/set-state-in-effect -- Realtime listener state intentionally synchronizes loading/error state from admin session readiness. */
    useEffect(() => {
        if (adminSessionState !== "ready") {
            setIsLoadingAlerts(true);
            setAlertsError(null);
            return;
        }

        let cancelled = false;
        void fetchAdminModerationJson<AdminModerationSecurityAlertsResponse>("/api/admin/moderation/security-alerts")
            .then((body) => {
                if (cancelled) return;
                setRawAlerts(body.alerts);
                setIsLoadingAlerts(false);
                setAlertsError(null);
            })
            .catch((error) => {
                if (cancelled) return;
                setAlertsError(classifyModerationRouteError(error));
                setIsLoadingAlerts(false);
            });

        const q = query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(SECURITY_LIMIT));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs.map((doc) => mapSecurityAlert(doc.id, doc.data() as Record<string, unknown>));
            setRawAlerts(mapped);
            setIsLoadingAlerts(false);
        }, (error) => {
            if (cancelled) return;
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation security alerts", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_security_alerts" });
        });

        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [adminSessionState]);
    /* eslint-enable react-hooks/set-state-in-effect */

    /* eslint-disable react-hooks/set-state-in-effect -- Active thread message state intentionally resets when thread/session ownership changes. */
    useEffect(() => {
        if (!activeThreadId) {
            setMessages([]);
            setMessagesThreadId(null);
            setMessagesError(null);
            return;
        }

        if (adminSessionState !== "ready") {
            setMessagesThreadId(activeThreadId);
            setMessagesError(null);
            return;
        }

        let cancelled = false;
        void fetchAdminModerationJson<AdminModerationThreadDetailResponse>(`/api/admin/moderation/threads/${encodeURIComponent(activeThreadId)}`)
            .then((body) => {
                if (cancelled) return;
                setMessagesThreadId(activeThreadId);
                setMessages(body.messages.slice(-MESSAGE_LIMIT));
                setMessagesError(null);
            })
            .catch((error) => {
                if (cancelled) return;
                setMessagesThreadId(activeThreadId);
                setMessagesError(classifyModerationRouteError(error));
            });

        const q = query(collection(db, CHAT_COLLECTIONS.messages), where("threadId", "==", activeThreadId));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs
                .map((doc) => mapMessageRecord(doc.id, doc.data() as Record<string, unknown>))
                .sort((left, right) => left.createdAt - right.createdAt)
                .slice(-MESSAGE_LIMIT);
            setMessagesThreadId(activeThreadId);
            setMessages(mapped);
        }, (error) => {
            if (cancelled) return;
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation messages", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_messages", threadId: activeThreadId });
        });

        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [activeThreadId, adminSessionState]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const alerts = useMemo(() => clusterAdminModerationSecurityAlerts(rawAlerts), [rawAlerts]);
    const activeMessages = activeThreadId && messagesThreadId === activeThreadId ? messages : [];
    const activeMessagesError = activeThreadId && messagesThreadId === activeThreadId ? messagesError : null;
    const isLoadingMessages = adminSessionState === "waiting_for_admin_session"
        ? false
        : Boolean(activeThreadId && messagesThreadId !== activeThreadId && !activeMessagesError);

    return {
        threads,
        messages: activeMessages,
        alerts,
        activeThreadId,
        isLoadingThreads,
        isLoadingMessages,
        isLoadingAlerts,
        threadsError,
        messagesError: activeMessagesError,
        alertsError,
        adminSessionState,
    };
}

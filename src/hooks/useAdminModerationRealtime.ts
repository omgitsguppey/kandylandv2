import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
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
    AdminModerationSecurityAlertsResponse,
    AdminModerationSecurityAlert,
    AdminModerationThreadDetailResponse,
    AdminModerationThreadsResponse,
    AdminModerationThreadSummary,
} from "@/lib/admin-moderation";

const THREAD_LIMIT = 80;
const MESSAGE_LIMIT = 250;
const SECURITY_LIMIT = 120;

async function fetchAdminModerationJson<T>(path: string): Promise<T> {
    const response = await fetch(path, {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Admin moderation snapshot failed (${response.status})`);
    }

    return response.json() as Promise<T>;
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
    const [threads, setThreads] = useState<AdminModerationThreadSummary[]>([]);
    const [messages, setMessages] = useState<AdminModerationMessageRecord[]>([]);
    const [messagesThreadId, setMessagesThreadId] = useState<string | null>(null);
    const [rawAlerts, setRawAlerts] = useState<AdminModerationSecurityAlert[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
    const [threadsError, setThreadsError] = useState<Error | null>(null);
    const [messagesError, setMessagesError] = useState<Error | null>(null);
    const [alertsError, setAlertsError] = useState<Error | null>(null);
    const activeThreadId = useMemo(() => {
        if (selectedThreadId) {
            return selectedThreadId;
        }

        return threads[0]?.id ?? null;
    }, [selectedThreadId, threads]);

    // Threads Subscription
    useEffect(() => {
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
                setThreadsError(error as Error);
                setIsLoadingThreads(false);
            });
        const q = query(collection(db, CHAT_COLLECTIONS.threads), orderBy("lastMessageAt", "desc"), limit(THREAD_LIMIT));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs.map(doc => mapThreadSummary(doc.id, doc.data() as Record<string, unknown>));
            setThreads(mapped);
            setIsLoadingThreads(false);
            setThreadsError(null);
        }, (error) => {
            if (cancelled) return;
            setThreadsError(error as Error);
            setIsLoadingThreads(false);
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation threads", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_threads" });
        });
        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, []);

    // Security Alerts Subscription
    useEffect(() => {
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
                setAlertsError(error as Error);
                setIsLoadingAlerts(false);
            });
        const q = query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(SECURITY_LIMIT));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs.map(doc => mapSecurityAlert(doc.id, doc.data() as Record<string, unknown>));
            setRawAlerts(mapped);
            setIsLoadingAlerts(false);
            setAlertsError(null);
        }, (error) => {
            if (cancelled) return;
            setAlertsError(error as Error);
            setIsLoadingAlerts(false);
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation security alerts", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_security_alerts" });
        });
        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, []);

    // Thread Detail Subscription
    useEffect(() => {
        if (!activeThreadId) {
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
                setMessagesError(error as Error);
            });
        const q = query(collection(db, CHAT_COLLECTIONS.messages), where("threadId", "==", activeThreadId));
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs
                .map(doc => mapMessageRecord(doc.id, doc.data() as Record<string, unknown>))
                .sort((left, right) => left.createdAt - right.createdAt)
                .slice(-MESSAGE_LIMIT);
            setMessagesThreadId(activeThreadId);
            setMessages(mapped);
            setMessagesError(null);
        }, (error) => {
            if (cancelled) return;
            setMessagesThreadId(activeThreadId);
            setMessagesError(error as Error);
            control.triggerReconnect(error);
        }), (error) => {
            reportRealtimeIssue("Admin moderation messages", buildFirestoreClientIssueDetail(error), { listener: "admin_moderation_messages", threadId: activeThreadId });
        });
        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [activeThreadId]);

    const alerts = useMemo(() => clusterAdminModerationSecurityAlerts(rawAlerts), [rawAlerts]);
    const activeMessages = activeThreadId && messagesThreadId === activeThreadId ? messages : [];
    const activeMessagesError = activeThreadId && messagesThreadId === activeThreadId ? messagesError : null;
    const isLoadingMessages = Boolean(activeThreadId && messagesThreadId !== activeThreadId && !activeMessagesError);

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
    };
}

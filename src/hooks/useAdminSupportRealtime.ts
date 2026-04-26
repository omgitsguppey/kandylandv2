import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { reportRealtimeIssue } from "@/lib/client-error-reporting";
import { buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { createAutoHealingObserver } from "@/lib/self-healing";
import {
    SUPPORT_COLLECTIONS,
    normalizeSupportThreadStatus,
    normalizeSupportThreadCategory,
    type SupportMessageRecord,
    type SupportThreadRecord,
} from "@/lib/support-readiness";

type AdminSupportThreadRecord = SupportThreadRecord;

type AdminSupportThreadListSummary = {
    total: number;
    openCount: number;
    waitingOnUserCount: number;
    resolvedCount: number;
};

const THREAD_LIMIT = 200;
const MESSAGE_LIMIT = 250;

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

function mapSupportThread(id: string, value: Record<string, unknown>): AdminSupportThreadRecord {
    return {
        id,
        threadKey: toStringValue(value.threadKey),
        userId: toStringValue(value.userId),
        userEmail: toNullableString(value.userEmail),
        userDisplayName: toNullableString(value.userDisplayName),
        userHandle: toNullableString(value.userHandle),
        status: normalizeSupportThreadStatus(value.status),
        category: normalizeSupportThreadCategory(value.category),
        channel: value.channel === "email" || value.channel === "feedback" || value.channel === "system" ? value.channel : "in_app",
        subject: toNullableString(value.subject),
        lastMessagePreview: toNullableString(value.lastMessagePreview),
        messageCount: Math.max(0, toNumber(value.messageCount)),
        unreadForUser: value.unreadForUser === true,
        unreadForAdmin: value.unreadForAdmin === true,
        sourcePath: toNullableString(value.sourcePath),
        createdAt: toNumber(value.createdAt),
        updatedAt: toNumber(value.updatedAt),
        lastMessageAt: toNumber(value.lastMessageAt),
    };
}

function mapSupportMessage(id: string, value: Record<string, unknown>): SupportMessageRecord {
    return {
        id,
        threadId: toStringValue(value.threadId),
        senderRole: value.senderRole === "admin" || value.senderRole === "system" ? value.senderRole : "user",
        senderId: toNullableString(value.senderId),
        senderLabel: toNullableString(value.senderLabel),
        body: toStringValue(value.body),
        createdAt: toNumber(value.createdAt),
    };
}

export function useAdminSupportRealtime(selectedThreadId: string | null) {
    const [threads, setThreads] = useState<AdminSupportThreadRecord[]>([]);
    const [messages, setMessages] = useState<SupportMessageRecord[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [threadsError, setThreadsError] = useState<Error | null>(null);
    const [messagesError, setMessagesError] = useState<Error | null>(null);

    // Threads Subscription
    useEffect(() => {
        let cancelled = false;
        const q = query(
            collection(db, SUPPORT_COLLECTIONS.threads),
            orderBy("lastMessageAt", "desc"),
            limit(THREAD_LIMIT)
        );
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs.map(doc => mapSupportThread(doc.id, doc.data() as Record<string, unknown>));
            setThreads(mapped);
            setIsLoadingThreads(false);
            setThreadsError(null);
        }, (error) => {
            if (cancelled) return;
            setThreadsError(error as Error);
            setIsLoadingThreads(false);
            control.triggerReconnect(error);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin support threads: ${issueDetail}`, error, { listener: "admin_support_threads" });
        });
        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, []);

    // Thread Messages Subscription
    useEffect(() => {
        let cancelled = false;
        if (!selectedThreadId) {
            setMessages([]);
            setIsLoadingMessages(false);
            return () => {
                cancelled = true;
            };
        }

        setIsLoadingMessages(true);
        // Ordering by createdAt is natively supported here without composite indexes because there are no where() filters
        const q = query(
            collection(db, SUPPORT_COLLECTIONS.threads, selectedThreadId, SUPPORT_COLLECTIONS.messages),
            orderBy("createdAt", "asc")
        );
        const control = createAutoHealingObserver(() => onSnapshot(q, (snapshot) => {
            if (cancelled) return;
            const mapped = snapshot.docs
                .map(doc => mapSupportMessage(doc.id, doc.data() as Record<string, unknown>))
                .slice(-MESSAGE_LIMIT);
            setMessages(mapped);
            setIsLoadingMessages(false);
            setMessagesError(null);
        }, (error) => {
            if (cancelled) return;
            setMessagesError(error as Error);
            setIsLoadingMessages(false);
            control.triggerReconnect(error);
        }), (error) => {
            const issueDetail = buildFirestoreClientIssueDetail(error);
            reportRealtimeIssue(`Admin support messages: ${issueDetail}`, error, { listener: "admin_support_messages", threadId: selectedThreadId });
        });
        return () => {
            cancelled = true;
            control.cleanup();
        };
    }, [selectedThreadId]);

    const summary = useMemo<AdminSupportThreadListSummary>(() => {
        let openCount = 0;
        let waitingOnUserCount = 0;
        let resolvedCount = 0;

        for (const thread of threads) {
            if (thread.status === "open" || thread.status === "pending" || thread.status === "waiting_on_support") {
                openCount++;
            } else if (thread.status === "waiting_on_user") {
                waitingOnUserCount++;
            } else if (thread.status === "resolved" || thread.status === "closed") {
                resolvedCount++;
            }
        }

        return {
            total: threads.length,
            openCount,
            waitingOnUserCount,
            resolvedCount,
        };
    }, [threads]);

    return {
        threads,
        messages,
        summary,
        isLoadingThreads,
        isLoadingMessages,
        threadsError,
        messagesError,
    };
}

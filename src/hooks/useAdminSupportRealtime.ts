import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
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
        const q = query(
            collection(db, SUPPORT_COLLECTIONS.threads),
            orderBy("lastMessageAt", "desc"),
            limit(THREAD_LIMIT)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs.map(doc => mapSupportThread(doc.id, doc.data() as Record<string, unknown>));
            setThreads(mapped);
            setIsLoadingThreads(false);
        }, (error) => {
            setThreadsError(error as Error);
            setIsLoadingThreads(false);
        });
        return unsubscribe;
    }, []);

    // Thread Messages Subscription
    useEffect(() => {
        let cancelled = false;
        if (!selectedThreadId) {
            queueMicrotask(() => {
                if (cancelled) return;
                setMessages([]);
                setIsLoadingMessages(false);
            });
            return () => {
                cancelled = true;
            };
        }

        queueMicrotask(() => {
            if (!cancelled) {
                setIsLoadingMessages(true);
            }
        });
        // We only use where() here because ordering requires a composite index if used alongside where().
        // Messages are usually < 50 per thread, so client-side sorting is fast and doesn't require extra index.
        const q = query(
            collection(db, SUPPORT_COLLECTIONS.threads, selectedThreadId, SUPPORT_COLLECTIONS.messages)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs
                .map(doc => mapSupportMessage(doc.id, doc.data() as Record<string, unknown>))
                .sort((left, right) => left.createdAt - right.createdAt)
                .slice(-MESSAGE_LIMIT);
            setMessages(mapped);
            setIsLoadingMessages(false);
        }, (error) => {
            setMessagesError(error as Error);
            setIsLoadingMessages(false);
        });
        return () => {
            cancelled = true;
            unsubscribe();
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

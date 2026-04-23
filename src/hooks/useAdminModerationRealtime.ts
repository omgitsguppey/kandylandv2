import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { CHAT_COLLECTIONS } from "@/lib/chat";
import { buildChatSoftSealScope, softOpenChatValue } from "@/lib/chat-soft-seal";
import { describeSecurityEvent } from "@/lib/security-events";
import type {
    AdminModerationMessageRecord,
    AdminModerationSecurityAlert,
    AdminModerationThreadSummary,
} from "@/lib/admin-moderation";

const THREAD_LIMIT = 80;
const MESSAGE_LIMIT = 250;
const SECURITY_LIMIT = 120;

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

function normalizeSeverity(value: unknown): AdminModerationSecurityAlert["severity"] {
    return value === "high" || value === "low" || value === "medium" ? value : "medium";
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
        text: toNullableString(softOpenChatValue(buildChatSoftSealScope(threadId, "text"), toNullableString(value.text))) ?? undefined,
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
    return {
        id,
        userId: toStringValue(value.userId),
        username: toStringValue(value.username) || "Unknown user",
        label: toStringValue(value.label) || "Security event",
        message: toStringValue(value.message) || "Security event logged.",
        reason: toStringValue(value.reason) || "unknown",
        severity: normalizeSeverity(value.severity),
        confidence: value.confidence === "confirmed" || value.confidence === "heuristic" ? value.confidence : describeSecurityEvent(toStringValue(value.reason)).confidence,
        repeatCount: typeof value.repeatCount === "number" ? Math.max(1, value.repeatCount) : undefined,
        detectionKind: toStringValue(value.detectionKind) || "runtime",
        pagePath: toNullableString(value.pagePath),
        dropId: toNullableString(value.dropId),
        assetKey: toNullableString(value.assetKey),
        timestamp: toNumber(value.timestamp),
    };
}

// Canonical grouping to collapse noisy identical incidents from the same user
function clusterSecurityAlerts(alerts: AdminModerationSecurityAlert[]): AdminModerationSecurityAlert[] {
    const clustered = new Map<string, AdminModerationSecurityAlert>();
    
    // Sort ascending so the latest occurrence updates the cluster
    const sorted = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const alert of sorted) {
        // Create a canonical issue signature: user + reason
        const signature = `${alert.userId}:${alert.reason}`;
        
        if (clustered.has(signature)) {
            const existing = clustered.get(signature)!;
            // Only cluster if they occurred within a rolling 24 hour window
            if (alert.timestamp - existing.timestamp < 24 * 60 * 60 * 1000) {
                clustered.set(signature, {
                    ...alert, // take latest properties
                    repeatCount: (existing.repeatCount || 1) + (alert.repeatCount || 1),
                });
            } else {
                // If it's outside the window, just overwrite it as a new rolling window start
                // Or modify signature to include time slice. We will just take the latest.
                clustered.set(signature, alert);
            }
        } else {
            clustered.set(signature, alert);
        }
    }
    
    return Array.from(clustered.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function useAdminModerationRealtime(selectedThreadId: string | null) {
    const [threads, setThreads] = useState<AdminModerationThreadSummary[]>([]);
    const [messages, setMessages] = useState<AdminModerationMessageRecord[]>([]);
    const [rawAlerts, setRawAlerts] = useState<AdminModerationSecurityAlert[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
    const [threadsError, setThreadsError] = useState<Error | null>(null);
    const [messagesError, setMessagesError] = useState<Error | null>(null);
    const [alertsError, setAlertsError] = useState<Error | null>(null);

    // Threads Subscription
    useEffect(() => {
        const q = query(collection(db, CHAT_COLLECTIONS.threads), orderBy("lastMessageAt", "desc"), limit(THREAD_LIMIT));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs.map(doc => mapThreadSummary(doc.id, doc.data() as Record<string, unknown>));
            setThreads(mapped);
            setIsLoadingThreads(false);
        }, (error) => {
            setThreadsError(error as Error);
            setIsLoadingThreads(false);
        });
        return unsubscribe;
    }, []);

    // Security Alerts Subscription
    useEffect(() => {
        const q = query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(SECURITY_LIMIT));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs.map(doc => mapSecurityAlert(doc.id, doc.data() as Record<string, unknown>));
            setRawAlerts(mapped);
            setIsLoadingAlerts(false);
        }, (error) => {
            setAlertsError(error as Error);
            setIsLoadingAlerts(false);
        });
        return unsubscribe;
    }, []);

    // Thread Detail Subscription
    useEffect(() => {
        if (!selectedThreadId) {
            setMessages([]);
            setIsLoadingMessages(false);
            return;
        }

        setIsLoadingMessages(true);
        const q = query(collection(db, CHAT_COLLECTIONS.messages), where("threadId", "==", selectedThreadId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs
                .map(doc => mapMessageRecord(doc.id, doc.data() as Record<string, unknown>))
                .sort((left, right) => left.createdAt - right.createdAt)
                .slice(-MESSAGE_LIMIT);
            setMessages(mapped);
            setIsLoadingMessages(false);
        }, (error) => {
            setMessagesError(error as Error);
            setIsLoadingMessages(false);
        });
        return unsubscribe;
    }, [selectedThreadId]);

    const alerts = useMemo(() => clusterSecurityAlerts(rawAlerts), [rawAlerts]);

    return {
        threads,
        messages,
        alerts,
        isLoadingThreads,
        isLoadingMessages,
        isLoadingAlerts,
        threadsError,
        messagesError,
        alertsError,
    };
}

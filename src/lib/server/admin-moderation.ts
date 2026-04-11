import "server-only";

import { CHAT_COLLECTIONS } from "@/lib/chat";
import type {
    AdminModerationMessageRecord,
    AdminModerationSecurityAlert,
    AdminModerationThreadSummary,
} from "@/lib/admin-moderation";
import { buildChatSoftSealScope, softOpenChatValue } from "@/lib/chat-soft-seal";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const THREAD_LIMIT = 80;
const MESSAGE_LIMIT = 250;
const SECURITY_LIMIT = 120;

function toNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ) {
        try {
            return Math.trunc((value as { toMillis: () => number }).toMillis());
        } catch {
            return 0;
        }
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
        lastMessageSenderRole: value.lastMessageSenderRole === "creator" || value.lastMessageSenderRole === "admin" || value.lastMessageSenderRole === "user"
            ? value.lastMessageSenderRole
            : undefined,
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
        messageKind: value.messageKind === "image" || value.messageKind === "video" || value.messageKind === "broadcast"
            ? value.messageKind
            : "text",
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
        detectionKind: toStringValue(value.detectionKind) || "runtime",
        pagePath: toNullableString(value.pagePath),
        dropId: toNullableString(value.dropId),
        assetKey: toNullableString(value.assetKey),
        timestamp: toNumber(value.timestamp),
    };
}

export async function listAdminModerationThreads() {
    if (!adminDb) {
        return [] as AdminModerationThreadSummary[];
    }

    try {
        const snapshot = await adminDb.collection(CHAT_COLLECTIONS.threads)
            .orderBy("lastMessageAt", "desc")
            .limit(THREAD_LIMIT)
            .get();

        return snapshot.docs
            .map((doc) => mapThreadSummary(doc.id, doc.data() as Record<string, unknown>))
            .sort((left, right) => right.lastMessageAt - left.lastMessageAt);
    } catch (error) {
        recordRouteWarning("admin/moderation/threads", "Admin moderation threads read failed", error, {
            channel: "admin",
            detail: {
                threadLimit: THREAD_LIMIT,
            },
        });
        throw error;
    }
}

export async function getAdminModerationThreadDetail(threadId: string) {
    if (!adminDb) {
        return {
            thread: null,
            messages: [] as AdminModerationMessageRecord[],
        };
    }

    try {
        const threadSnapshot = await adminDb.collection(CHAT_COLLECTIONS.threads).doc(threadId).get();
        if (!threadSnapshot.exists) {
            return {
                thread: null,
                messages: [] as AdminModerationMessageRecord[],
            };
        }

        const messageSnapshot = await adminDb.collection(CHAT_COLLECTIONS.messages)
            .where("threadId", "==", threadId)
            .get();

        return {
            thread: mapThreadSummary(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>),
            messages: messageSnapshot.docs
                .map((doc) => mapMessageRecord(doc.id, doc.data() as Record<string, unknown>))
                .sort((left, right) => left.createdAt - right.createdAt)
                .slice(-MESSAGE_LIMIT),
        };
    } catch (error) {
        recordRouteWarning("admin/moderation/thread", "Admin moderation thread detail read failed", error, {
            channel: "admin",
            detail: {
                threadId,
            },
        });
        throw error;
    }
}

export async function listAdminModerationSecurityAlerts() {
    if (!adminDb) {
        return [] as AdminModerationSecurityAlert[];
    }

    try {
        const snapshot = await adminDb.collection("security_events")
            .orderBy("timestamp", "desc")
            .limit(SECURITY_LIMIT)
            .get();

        return snapshot.docs.map((doc) => mapSecurityAlert(doc.id, doc.data() as Record<string, unknown>));
    } catch (error) {
        recordRouteWarning("admin/moderation/security-alerts", "Admin moderation security alert read failed", error, {
            channel: "admin",
            detail: {
                alertLimit: SECURITY_LIMIT,
            },
        });
        throw error;
    }
}

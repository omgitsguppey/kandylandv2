import type { ChatMessageKind } from "@/lib/chat";
import type { AdminModuleVerification } from "@/lib/admin-parity";

export type AdminModerationThreadSummary = {
    id: string;
    creatorId: string;
    creatorDisplayName?: string;
    creatorUsername?: string;
    creatorPhotoURL?: string | null;
    userId: string;
    userDisplayName?: string;
    userUsername?: string;
    userPhotoURL?: string | null;
    lastMessageAt: number;
    lastMessagePreview: string;
    messageCount: number;
    lastMessageSenderRole?: "user" | "creator" | "admin";
    unreadCountForCreator: number;
    unreadCountForUser: number;
    subscriberChatFree: boolean;
};

export type AdminModerationMessageRecord = {
    id: string;
    threadId: string;
    creatorId: string;
    userId: string;
    senderRole: "creator" | "user" | "admin";
    messageKind: ChatMessageKind | "broadcast";
    text?: string;
    assetUrl?: string;
    assetName?: string;
    assetMimeType?: string;
    costGd: number;
    createdAt: number;
    moderationRemovedAt?: number;
    moderationRemovedBy?: string;
};

export type AdminModerationSecurityAlert = {
    id: string;
    userId: string;
    username: string;
    label: string;
    message: string;
    reason: string;
    severity: "low" | "medium" | "high";
    confidence: "confirmed" | "heuristic" | "unknown";
    accuracyLabel: string;
    falsePositiveRisk: "low" | "medium" | "high" | "unknown";
    reviewPriority: "urgent" | "elevated" | "normal" | "low";
    priorityLabel: string;
    actionLabel: string;
    contextLabel: string;
    source: string;
    sourceLabel: string;
    sourceVerified: boolean;
    serverConfirmed: boolean;
    evidenceCount: number;
    repeatCount?: number;
    detectionKind: string;
    pagePath: string | null;
    dropId: string | null;
    assetKey: string | null;
    timestamp: number;
};

export type AdminModerationThreadsResponse = {
    success: true;
    generatedAtMs: number;
    freshnessMs: number;
    threads: AdminModerationThreadSummary[];
    verification?: AdminModuleVerification;
};

export type AdminModerationThreadDetailResponse = {
    success: true;
    generatedAtMs: number;
    freshnessMs: number;
    thread: AdminModerationThreadSummary | null;
    messages: AdminModerationMessageRecord[];
    verification?: AdminModuleVerification;
};

export type AdminModerationSecurityAlertsResponse = {
    success: true;
    generatedAtMs: number;
    freshnessMs: number;
    alerts: AdminModerationSecurityAlert[];
    verification?: AdminModuleVerification;
};

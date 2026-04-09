import type { CreatorMessage, CreatorMessageThread } from "@/types/db";
import {
    CREATOR_COLLECTIONS,
    CREATOR_MESSAGE_COSTS,
    buildCreatorThreadId,
    normalizeMessageKind,
} from "@/lib/creator-experiences";

export const CHAT_COLLECTIONS = {
    threads: CREATOR_COLLECTIONS.messageThreads,
    messages: CREATOR_COLLECTIONS.messages,
} as const;

export const CHAT_PRESENCE_ROOT = "chat_presence";

export type ChatViewerRole = "creator" | "user";
export type ChatMessageKind = keyof typeof CREATOR_MESSAGE_COSTS;

export type ChatThreadRecord = CreatorMessageThread & {
    counterpartId: string;
    counterpartDisplayName: string;
    counterpartUsername?: string;
    counterpartPhotoURL?: string | null;
    viewerRole: ChatViewerRole;
    unreadCount: number;
    readAt: number;
};

export type ChatThreadPricing = {
    textPriceGd: number;
    imagePriceGd: number;
    videoPriceGd: number;
    purchasedOnly: boolean;
    purchasedBalanceGd: number;
    subscriberFreeChatApplies: boolean;
    subscriberFreeChatEnabled: boolean;
};

export type ChatThreadDetail = {
    thread: ChatThreadRecord;
    messages: CreatorMessage[];
    pricing: ChatThreadPricing;
    threadExists: boolean;
};

export type ChatInsufficientFundsPayload = {
    error: string;
    errorCode: "insufficient_paid_gumdrops";
    requiredPriceGd: number;
    purchasedBalanceGd: number;
    paidGdShortfall: number;
    subscriberFreeChatApplies: boolean;
    messageKind: ChatMessageKind;
};

export function parseCreatorThreadId(threadId: string) {
    const match = /^creator_(.+)__user_(.+)$/.exec(threadId.trim());
    if (!match) {
        return null;
    }

    const [, creatorId, userId] = match;
    if (!creatorId || !userId) {
        return null;
    }

    return {
        creatorId,
        userId,
    };
}

export function buildChatThreadId(creatorId: string, userId: string) {
    return buildCreatorThreadId(creatorId, userId);
}

export function normalizeChatMessageKind(value: unknown): ChatMessageKind {
    return normalizeMessageKind(value);
}

export function buildChatPresenceThreadPath(threadId: string) {
    return `${CHAT_PRESENCE_ROOT}/${threadId}`;
}

export function buildChatPresenceMemberPath(threadId: string, uid: string) {
    return `${buildChatPresenceThreadPath(threadId)}/${uid}`;
}

export function resolveChatThreadReadAt(thread: Pick<CreatorMessageThread, "lastReadByCreatorAt" | "lastReadByUserAt">, viewerRole: ChatViewerRole) {
    return viewerRole === "creator"
        ? (typeof thread.lastReadByCreatorAt === "number" ? thread.lastReadByCreatorAt : 0)
        : (typeof thread.lastReadByUserAt === "number" ? thread.lastReadByUserAt : 0);
}

export function resolveChatThreadUnreadCount(thread: Pick<CreatorMessageThread, "unreadCountForCreator" | "unreadCountForUser">, viewerRole: ChatViewerRole) {
    return viewerRole === "creator"
        ? (typeof thread.unreadCountForCreator === "number" ? thread.unreadCountForCreator : 0)
        : (typeof thread.unreadCountForUser === "number" ? thread.unreadCountForUser : 0);
}

export function isChatThreadParticipant(thread: Pick<CreatorMessageThread, "creatorId" | "userId">, uid: string) {
    return thread.creatorId === uid || thread.userId === uid;
}

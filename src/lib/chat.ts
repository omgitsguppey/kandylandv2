import type { CreatorMessage, CreatorMessageThread } from "@/types/db";
import {
    CREATOR_COLLECTIONS,
    CREATOR_MESSAGE_COSTS,
    buildCreatorThreadId,
    isCreatorMessagingAvailable,
    normalizeMessageKind,
    type CreatorRestrictions,
    type CreatorSettings,
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
    counterpartReadAt: number;
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

export type ChatPaidGdGateState = {
    requiredMinPaidGd: number;
    purchasedBalanceGd: number;
    paidGdShortfall: number;
    subscriberFreeChatApplies: boolean;
    creatorViewerBypass: boolean;
    gated: boolean;
};

export type ChatPaidGdLowBalanceReminderState = {
    lastRemindedAt: number;
    lastRemindedPaidBalanceGd: number;
    reminderCycleId: string;
    resetAtPaidBalanceGd?: number;
    eligibleAgain: boolean;
};

const CHAT_PAID_GD_LOW_BALANCE_REMINDER_DEFAULT_CYCLE_ID = "chat_paid_gd_cycle_initial";

function toFinitePositiveInteger(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.trunc(value))
        : 0;
}

export function buildChatPaidGdGateState(input: {
    viewerRole: ChatViewerRole;
    pricing: ChatThreadPricing | null | undefined;
}): ChatPaidGdGateState | null {
    if (!input.pricing) {
        return null;
    }

    const creatorViewerBypass = input.viewerRole === "creator";
    const subscriberFreeChatApplies = input.pricing.subscriberFreeChatApplies === true;
    const requiredMinPaidGd = subscriberFreeChatApplies || creatorViewerBypass
        ? 0
        : Math.max(1, toFinitePositiveInteger(input.pricing.textPriceGd) || 1);
    const purchasedBalanceGd = toFinitePositiveInteger(input.pricing.purchasedBalanceGd);
    const paidGdShortfall = Math.max(0, requiredMinPaidGd - purchasedBalanceGd);

    return {
        requiredMinPaidGd,
        purchasedBalanceGd,
        paidGdShortfall,
        subscriberFreeChatApplies,
        creatorViewerBypass,
        gated: !creatorViewerBypass && !subscriberFreeChatApplies && paidGdShortfall > 0,
    };
}

export function normalizeChatPaidGdLowBalanceReminderState(value: unknown): ChatPaidGdLowBalanceReminderState {
    const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const reminderCycleId = typeof raw.reminderCycleId === "string" && raw.reminderCycleId.trim().length > 0
        ? raw.reminderCycleId.trim()
        : CHAT_PAID_GD_LOW_BALANCE_REMINDER_DEFAULT_CYCLE_ID;

    return {
        lastRemindedAt: toFinitePositiveInteger(raw.lastRemindedAt),
        lastRemindedPaidBalanceGd: toFinitePositiveInteger(raw.lastRemindedPaidBalanceGd),
        reminderCycleId,
        resetAtPaidBalanceGd: raw.resetAtPaidBalanceGd == null ? undefined : toFinitePositiveInteger(raw.resetAtPaidBalanceGd),
        eligibleAgain: raw.eligibleAgain !== false,
    };
}

export function buildChatPaidGdLowBalanceReminderAfterSend(input: {
    current: ChatPaidGdLowBalanceReminderState | null | undefined;
    paidBalanceGd: number;
    remindedAt: number;
}): ChatPaidGdLowBalanceReminderState {
    const current = input.current ?? normalizeChatPaidGdLowBalanceReminderState(null);
    return {
        ...current,
        lastRemindedAt: toFinitePositiveInteger(input.remindedAt),
        lastRemindedPaidBalanceGd: toFinitePositiveInteger(input.paidBalanceGd),
        eligibleAgain: false,
    };
}

export function buildChatPaidGdLowBalanceReminderAfterPaidRefill(input: {
    current: ChatPaidGdLowBalanceReminderState | null | undefined;
    previousPaidBalanceGd: number;
    nextPaidBalanceGd: number;
    reminderCycleId: string;
}): ChatPaidGdLowBalanceReminderState {
    const current = input.current ?? normalizeChatPaidGdLowBalanceReminderState(null);
    return {
        ...current,
        reminderCycleId: input.reminderCycleId.trim() || CHAT_PAID_GD_LOW_BALANCE_REMINDER_DEFAULT_CYCLE_ID,
        resetAtPaidBalanceGd: toFinitePositiveInteger(input.nextPaidBalanceGd),
        eligibleAgain: toFinitePositiveInteger(input.previousPaidBalanceGd) < 100 && toFinitePositiveInteger(input.nextPaidBalanceGd) >= 100,
    };
}

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
    const parsed = parseCreatorThreadId(threadId);
    if (!parsed) {
        return `${CHAT_PRESENCE_ROOT}/invalid/${threadId}`;
    }

    return `${CHAT_PRESENCE_ROOT}/${parsed.creatorId}/${parsed.userId}`;
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

export function resolveChatThreadHiddenAt(
    thread: Pick<CreatorMessageThread, "hiddenByCreatorAt" | "hiddenByUserAt">,
    viewerRole: ChatViewerRole,
) {
    return viewerRole === "creator"
        ? (typeof thread.hiddenByCreatorAt === "number" ? thread.hiddenByCreatorAt : 0)
        : (typeof thread.hiddenByUserAt === "number" ? thread.hiddenByUserAt : 0);
}

export function isChatThreadVisibleToViewer(
    thread: Pick<CreatorMessageThread, "hiddenByCreatorAt" | "hiddenByUserAt" | "lastMessageAt">,
    viewerRole: ChatViewerRole,
) {
    const hiddenAt = resolveChatThreadHiddenAt(thread, viewerRole);
    if (!hiddenAt) {
        return true;
    }

    return (typeof thread.lastMessageAt === "number" ? thread.lastMessageAt : 0) > hiddenAt;
}

export function isChatThreadParticipant(thread: Pick<CreatorMessageThread, "creatorId" | "userId">, uid: string) {
    return thread.creatorId === uid || thread.userId === uid;
}

export function resolveChatViewerRole(input: {
    viewerUid: string;
    creatorId?: string | null;
    profile: {
        role?: unknown;
        status?: unknown;
        creatorApplication?: unknown;
        creatorSettings?: CreatorSettings | null | undefined;
        creatorRestrictions?: CreatorRestrictions | null | undefined;
    } | null | undefined;
}): ChatViewerRole {
    if (input.creatorId && input.creatorId !== input.viewerUid) {
        return "user";
    }

    if (!input.profile) {
        return "user";
    }

    return isCreatorMessagingAvailable({
        role: input.profile.role,
        status: input.profile.status,
        creatorApplication: input.profile.creatorApplication,
        creatorSettings: input.profile.creatorSettings,
        creatorRestrictions: input.profile.creatorRestrictions,
    })
        ? "creator"
        : "user";
}

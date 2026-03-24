import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { CREATOR_REVENUE_SHARE, buildCreatorRelationshipId, calculateCreatorCashoutUsd, getCreatorBookingRate, getCreatorMessageCost, normalizeCreatorRestrictions, normalizeCreatorSettings, normalizePositiveWholeNumber } from "@/lib/creator-experiences";
import { normalizeGumdropBalance } from "@/lib/gumdrop-ledger";

export { calculateCreatorCashoutUsd } from "@/lib/creator-experiences";

export type SourceAwareBalanceBreakdown = {
    total: number;
    purchased: number;
    reward: number;
};

export function readSourceAwareBalance(source: Record<string, unknown>): SourceAwareBalanceBreakdown {
    const total = normalizeGumdropBalance(source.gumDropsBalance);
    const purchased = normalizeGumdropBalance(source.gumDropsPurchasedBalance);
    const reward = normalizeGumdropBalance(source.gumDropsRewardBalance);

    if (purchased === 0 && reward === 0 && total > 0) {
        return {
            total,
            purchased: total,
            reward: 0,
        };
    }

    const normalizedTotal = normalizeGumdropBalance(purchased + reward);
    return {
        total: normalizedTotal,
        purchased,
        reward,
    };
}

export function buildSourceAwareBalancePatch(next: SourceAwareBalanceBreakdown) {
    return {
        gumDropsBalance: normalizeGumdropBalance(next.purchased + next.reward),
        gumDropsPurchasedBalance: normalizeGumdropBalance(next.purchased),
        gumDropsRewardBalance: normalizeGumdropBalance(next.reward),
    };
}

export function spendSourceAwareGumdrops(
    current: SourceAwareBalanceBreakdown,
    amount: number,
    options?: { purchasedOnly?: boolean },
) {
    const required = Math.max(0, normalizePositiveWholeNumber(amount));
    const purchasedOnly = options?.purchasedOnly === true;

    if (required === 0) {
        return {
            ok: true as const,
            next: current,
            purchasedSpent: 0,
            rewardSpent: 0,
        };
    }

    if (purchasedOnly) {
        if (current.purchased < required) {
            return {
                ok: false as const,
                error: "Insufficient purchased Gum Drops for this creator experience.",
            };
        }

        return {
            ok: true as const,
            next: {
                total: current.total - required,
                purchased: current.purchased - required,
                reward: current.reward,
            },
            purchasedSpent: required,
            rewardSpent: 0,
        };
    }

    const purchasedSpent = Math.min(current.purchased, required);
    const rewardSpent = Math.max(0, required - purchasedSpent);
    if (purchasedSpent + rewardSpent < required || rewardSpent > current.reward) {
        return {
            ok: false as const,
            error: "Insufficient Gum Drops for this creator experience.",
        };
    }

    return {
        ok: true as const,
        next: {
            total: current.total - required,
            purchased: current.purchased - purchasedSpent,
            reward: current.reward - rewardSpent,
        },
        purchasedSpent,
        rewardSpent,
    };
}

export function buildCreatorAccrual(input: {
    creatorId: string;
    userId: string;
    sourceType: "message" | "subscription" | "custom_request" | "booking_phone" | "booking_video";
    sourceId: string;
    grossSpendGd: number;
    createdAt?: number;
}) {
    const grossSpendGd = Math.max(0, normalizePositiveWholeNumber(input.grossSpendGd));
    const creatorShareGd = Math.max(0, Math.round(grossSpendGd * CREATOR_REVENUE_SHARE));
    const createdAt = typeof input.createdAt === "number" && Number.isFinite(input.createdAt)
        ? Math.trunc(input.createdAt)
        : Date.now();

    return {
        creatorId: input.creatorId,
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        grossSpendGd,
        creatorShareGd,
        cashoutValueUsd: calculateCreatorCashoutUsd(creatorShareGd),
        status: "accrued" as const,
        createdAt,
    };
}

export function buildRelationshipPatch(input: {
    userId: string;
    creatorId: string;
    creatorDisplayName?: string;
    creatorUsername?: string;
    creatorPhotoURL?: string | null;
    following?: boolean;
    favorited?: boolean;
    notificationsEnabled?: boolean;
    existing?: Record<string, unknown>;
}) {
    const now = Date.now();
    return {
        id: buildCreatorRelationshipId(input.userId, input.creatorId),
        userId: input.userId,
        creatorId: input.creatorId,
        creatorDisplayName: input.creatorDisplayName,
        creatorUsername: input.creatorUsername,
        creatorPhotoURL: input.creatorPhotoURL ?? null,
        following: input.following ?? input.existing?.following === true,
        favorited: input.favorited ?? input.existing?.favorited === true,
        notificationsEnabled: input.notificationsEnabled ?? input.existing?.notificationsEnabled === true,
        createdAt: typeof input.existing?.createdAt === "number" ? Number(input.existing.createdAt) : now,
        updatedAt: now,
    };
}

export function sanitizeCreatorSettingsUpdate(input: Record<string, unknown>) {
    return normalizeCreatorSettings(input);
}

export function sanitizeCreatorRestrictionsUpdate(input: Record<string, unknown>) {
    return normalizeCreatorRestrictions(input);
}

export function buildBookingSlotKey(input: {
    creatorId: string;
    serviceType: "phone" | "video";
    startAt: number;
    durationMinutes: number;
}) {
    return `${input.creatorId}:${input.serviceType}:${input.startAt}:${input.durationMinutes}`;
}

export function calculateBookingPriceGd(input: {
    serviceType: "phone" | "video";
    durationMinutes: number;
    subscriptionActive: boolean;
    videoDiscountPercent?: number;
}) {
    const baseRate = getCreatorBookingRate(input.serviceType);
    const durationMinutes = Math.max(5, normalizePositiveWholeNumber(input.durationMinutes));
    const basePrice = baseRate * durationMinutes;
    if (input.serviceType !== "video" || !input.subscriptionActive) {
        return basePrice;
    }

    const discountPercent = Math.min(100, Math.max(0, normalizePositiveWholeNumber(input.videoDiscountPercent ?? 50, 50)));
    return Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
}

export function calculateMessagePriceGd(input: {
    messageKind: "text" | "image" | "video";
    subscriptionActive: boolean;
    senderIsCreator: boolean;
}) {
    if (input.senderIsCreator || input.subscriptionActive) {
        return 0;
    }

    return getCreatorMessageCost(input.messageKind);
}

export function buildCreatorUpdateMerge(input: {
    creatorSettings?: Record<string, unknown>;
    creatorRestrictions?: Record<string, unknown>;
}) {
    const update: Record<string, unknown> = {};

    if (input.creatorSettings) {
        update.creatorSettings = sanitizeCreatorSettingsUpdate(input.creatorSettings);
    }

    if (input.creatorRestrictions) {
        update.creatorRestrictions = sanitizeCreatorRestrictionsUpdate(input.creatorRestrictions);
    }

    return update;
}

export function creatorDocumentCleanupWrites(uid: string) {
    return [
        { collection: "creator_relationships", field: "userId", value: uid },
        { collection: "creator_relationships", field: "creatorId", value: uid },
        { collection: "creator_subscriptions", field: "userId", value: uid },
        { collection: "creator_subscriptions", field: "creatorId", value: uid },
        { collection: "creator_message_threads", field: "userId", value: uid },
        { collection: "creator_message_threads", field: "creatorId", value: uid },
        { collection: "creator_messages", field: "userId", value: uid },
        { collection: "creator_messages", field: "creatorId", value: uid },
        { collection: "creator_broadcasts", field: "creatorId", value: uid },
        { collection: "creator_custom_requests", field: "userId", value: uid },
        { collection: "creator_custom_requests", field: "creatorId", value: uid },
        { collection: "creator_call_bookings", field: "userId", value: uid },
        { collection: "creator_call_bookings", field: "creatorId", value: uid },
        { collection: "creator_ledger_accruals", field: "userId", value: uid },
        { collection: "creator_ledger_accruals", field: "creatorId", value: uid },
        { collection: "creator_payout_requests", field: "creatorId", value: uid },
    ] as const;
}

export function buildCreatorTimestampFields(timestampMs?: number) {
    const now = typeof timestampMs === "number" && Number.isFinite(timestampMs) ? Math.trunc(timestampMs) : Date.now();
    return {
        createdAt: now,
        updatedAt: now,
        serverCreatedAt: FieldValue.serverTimestamp(),
        serverUpdatedAt: FieldValue.serverTimestamp(),
    };
}

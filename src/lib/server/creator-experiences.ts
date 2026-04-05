import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { CREATOR_REVENUE_SHARE, buildCreatorRelationshipId, calculateCreatorCashoutUsd, getCreatorBookingRate, getCreatorMessageCost, normalizeCreatorRestrictions, normalizeCreatorSettings, normalizePositiveWholeNumber } from "@/lib/creator-experiences";
import {
    buildSourceAwareBalancePatch,
    readSourceAwareBalance,
    spendSourceAwareGumdrops,
    type SourceAwareGumdropBalance,
} from "@/lib/gumdrop-ledger";
export {
    buildSourceAwareBalancePatch,
    readSourceAwareBalance,
    spendSourceAwareGumdrops,
    type SourceAwareGumdropBalance,
};

export { calculateCreatorCashoutUsd } from "@/lib/creator-experiences";

export type CreatorSpendPolicyKey =
    | "message"
    | "subscription"
    | "custom_request"
    | "booking_phone"
    | "booking_video";

export const CREATOR_SPEND_POLICIES: Record<CreatorSpendPolicyKey, {
    label: string;
    purchasedOnly: boolean;
    description: string;
}> = {
    message: {
        label: "Creator chat",
        purchasedOnly: true,
        description: "Paid creator messages must consume purchased Gum Drops only.",
    },
    subscription: {
        label: "Creator subscriptions",
        purchasedOnly: true,
        description: "Creator subscriptions and renewals must consume purchased Gum Drops only.",
    },
    custom_request: {
        label: "Custom requests",
        purchasedOnly: true,
        description: "Custom content requests must consume purchased Gum Drops only.",
    },
    booking_phone: {
        label: "Phone bookings",
        purchasedOnly: true,
        description: "Phone bookings must consume purchased Gum Drops only.",
    },
    booking_video: {
        label: "Video bookings",
        purchasedOnly: true,
        description: "Video bookings must consume purchased Gum Drops only.",
    },
};

export function spendCreatorExperienceGumdrops(
    current: SourceAwareGumdropBalance,
    amount: unknown,
    policyKey: CreatorSpendPolicyKey,
) {
    const policy = CREATOR_SPEND_POLICIES[policyKey];
    const spend = spendSourceAwareGumdrops(current, amount, {
        purchasedOnly: policy.purchasedOnly,
    });
    if (!spend.ok) {
        return spend;
    }

    const ledgerSource = spend.rewardSpent > 0
        ? spend.purchasedSpent > 0
            ? "mixed"
            : "reward"
        : "purchased";

    return {
        ...spend,
        policyKey,
        purchasedOnly: policy.purchasedOnly,
        policyLabel: policy.label,
        policyDescription: policy.description,
        ledgerSource,
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

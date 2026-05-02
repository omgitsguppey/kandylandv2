import "server-only";

import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { CREATOR_REVENUE_SHARE, buildCreatorRelationshipId, calculateCreatorCashoutUsd, getCreatorBookingRate, getCreatorMessageCost, normalizeCreatorRestrictions, normalizeCreatorSettings, normalizePositiveWholeNumber } from "@/lib/creator-experiences";
import type { ActorMarker } from "@/lib/identity/actor-markers";
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

export type CreatorExperiencePaidActionKey =
    | "fan_pass"
    | "private_chat"
    | "custom_request"
    | "live_time";

export const CREATOR_EXPERIENCE_PAID_EVENTS: Record<CreatorExperiencePaidActionKey, string> = {
    fan_pass: "creator_fan_pass_started",
    private_chat: "creator_private_chat_opened",
    custom_request: "creator_custom_request_created",
    live_time: "creator_live_time_booked",
};

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

function stableSerialize(value: unknown): string {
    if (value === null || typeof value === "undefined") {
        return "";
    }

    if (typeof value !== "object") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
    }

    return Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${key}:${stableSerialize((value as Record<string, unknown>)[key])}`)
        .join("|");
}

function hashCreatorExperienceValue(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function normalizeCreatorExperienceIdempotencyKey(value: unknown) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_./-]+/g, "-")
        .replace(/\//g, "_")
        .slice(0, 160);
}

export function buildCreatorExperienceIdempotencyKey(input: {
    action: CreatorExperiencePaidActionKey;
    userId: string;
    creatorId: string;
    clientKey?: unknown;
    payloadParts?: unknown[];
}) {
    const clientKey = normalizeCreatorExperienceIdempotencyKey(input.clientKey);
    const payloadKey = stableSerialize(input.payloadParts ?? []);
    const scopedSource = [
        input.action,
        input.userId,
        input.creatorId,
        clientKey || payloadKey,
    ].join("|");
    const hash = hashCreatorExperienceValue(scopedSource);

    return `creator-experience:${input.action}:${input.userId}:${input.creatorId}:${hash}`;
}

export function buildCreatorExperienceRecordIds(input: {
    action: CreatorExperiencePaidActionKey;
    idempotencyKey: string;
}) {
    const suffix = hashCreatorExperienceValue(`${input.action}:${input.idempotencyKey}`);
    return {
        userTransactionId: `creator_txn_${suffix}`,
        creatorAccrualId: `creator_accrual_${suffix}`,
        creatorExperienceRecordId: `${input.action}_${suffix}`,
    };
}

export function buildCreatorExperienceTransactionDebug(input: {
    userTransactionId: string;
    creatorAccrualId: string;
    creatorExperienceRecordId: string;
    priceGd: number;
    idempotencyKey: string;
    duplicatePrevented: boolean;
    sourceAwareBalanceBefore?: SourceAwareGumdropBalance | null;
    sourceAwareBalanceAfter?: SourceAwareGumdropBalance | null;
}) {
    const priceGd = Math.max(0, normalizePositiveWholeNumber(input.priceGd));
    const creatorShareGd = Math.max(0, Math.round(priceGd * CREATOR_REVENUE_SHARE));

    return {
        userTransactionId: input.userTransactionId,
        creatorAccrualId: input.creatorAccrualId,
        creatorExperienceRecordId: input.creatorExperienceRecordId,
        priceGd,
        platformShareGd: Math.max(0, priceGd - creatorShareGd),
        creatorShareGd,
        idempotencyKey: input.idempotencyKey,
        duplicatePrevented: input.duplicatePrevented,
        sourceAwareBalanceBefore: input.sourceAwareBalanceBefore ?? null,
        sourceAwareBalanceAfter: input.sourceAwareBalanceAfter ?? null,
    };
}

export function buildCreatorExperienceTelemetryPayload(input: {
    marker: ActorMarker;
    creatorId: string;
    priceGd: number;
    idempotencyKey: string;
    duplicatePrevented: boolean;
    userTransactionId?: string;
    creatorAccrualId?: string;
    creatorExperienceRecordId?: string;
    extra?: Record<string, string | number | boolean>;
}) {
    return {
        actorType: input.marker.actorType,
        actorUid: input.marker.actorUid ?? "",
        actorRole: input.marker.actorRole,
        targetUserId: input.marker.targetUserId ?? "",
        targetCreatorId: input.marker.targetCreatorId ?? input.creatorId,
        performedAs: input.marker.performedAs,
        surface: input.marker.surface,
        route: input.marker.route,
        actionKey: input.marker.actionKey,
        source: input.marker.source,
        actor_type: input.marker.actorType,
        actor_uid: input.marker.actorUid ?? "",
        actor_role: input.marker.actorRole,
        target_user_id: input.marker.targetUserId ?? "",
        target_creator_id: input.marker.targetCreatorId ?? input.creatorId,
        performed_as: input.marker.performedAs,
        action_key: input.marker.actionKey,
        creator_id: input.creatorId,
        price_gd: input.priceGd,
        spend_gd: input.priceGd,
        idempotency_key: input.idempotencyKey,
        duplicate_prevented: input.duplicatePrevented,
        user_transaction_id: input.userTransactionId ?? "",
        creator_accrual_id: input.creatorAccrualId ?? "",
        creator_experience_record_id: input.creatorExperienceRecordId ?? "",
        ...(input.extra ?? {}),
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

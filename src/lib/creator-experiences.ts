import type { CreatorRestrictions, CreatorSettings, CreatorAvailabilityWindow, CreatorRequestCategoryConfig } from "@/types/db";
import { generateSecureClientToken } from "@/lib/client-random";
import { normalizeCreatorOnboardingApprovalStatus } from "@/lib/creator-onboarding";

export type { CreatorRestrictions, CreatorSettings, CreatorAvailabilityWindow, CreatorRequestCategoryConfig } from "@/types/db";

export const CREATOR_MESSAGE_COSTS = {
    text: 1,
    image: 5,
    video: 10,
} as const;

export const CREATOR_BOOKING_RATES = {
    phone: 500,
    video: 1000,
} as const;

export const CREATOR_SUBSCRIPTION_MIN_GD = 500;
export const CREATOR_BOOKING_MIN_MINUTES = 5;
export const CREATOR_VIDEO_SUBSCRIBER_DISCOUNT_PERCENT = 50;
export const CREATOR_REVENUE_SHARE = 0.5;
export const CREATOR_PAYOUT_RATE_GD = 100;

export const DEFAULT_CREATOR_REQUEST_CATEGORIES: CreatorRequestCategoryConfig[] = [
    {
        id: "custom-photo",
        label: "Custom Photo",
        description: "Personalized photo request for one fan.",
        priceGd: 300,
        enabled: true,
    },
    {
        id: "custom-video",
        label: "Custom Video",
        description: "Short personalized video made just for one fan.",
        priceGd: 800,
        enabled: true,
    },
    {
        id: "voice-note",
        label: "Voice Note",
        description: "Private audio response or shoutout.",
        priceGd: 250,
        enabled: true,
    },
    {
        id: "vip-shoutout",
        label: "VIP Shoutout",
        description: "Premium fan shoutout fulfilled off-platform.",
        priceGd: 500,
        enabled: true,
    },
];

export const DEFAULT_CREATOR_AVAILABILITY_WINDOWS: CreatorAvailabilityWindow[] = [
    {
        id: "fri-evening-video",
        dayOfWeek: 5,
        startHour: 18,
        startMinute: 0,
        endHour: 21,
        endMinute: 0,
        serviceTypes: ["phone", "video"],
    },
];

export const DEFAULT_CREATOR_SETTINGS: CreatorSettings = {
    messagingEnabled: true,
    broadcastsEnabled: true,
    subscriptionsEnabled: true,
    bookingsEnabled: true,
    customRequestsEnabled: true,
    subscriptionPriceGd: CREATOR_SUBSCRIPTION_MIN_GD,
    phoneRatePerMinuteGd: CREATOR_BOOKING_RATES.phone,
    videoRatePerMinuteGd: CREATOR_BOOKING_RATES.video,
    bookingMinimumMinutes: CREATOR_BOOKING_MIN_MINUTES,
    videoSubscriberDiscountPercent: CREATOR_VIDEO_SUBSCRIBER_DISCOUNT_PERCENT,
    chatFreeForSubscribers: true,
    requestCategories: DEFAULT_CREATOR_REQUEST_CATEGORIES,
    availabilityTimezone: "America/Chicago",
    availabilityWindows: DEFAULT_CREATOR_AVAILABILITY_WINDOWS,
};

export const DEFAULT_CREATOR_RESTRICTIONS: CreatorRestrictions = {
    messagingRestricted: false,
    broadcastsRestricted: false,
    subscriptionsRestricted: false,
    bookingsRestricted: false,
    customRequestsRestricted: false,
    dropSubmissionsRestricted: false,
    payoutsRestricted: false,
};

export const CREATOR_COLLECTIONS = {
    relationships: "creator_relationships",
    subscriptions: "creator_subscriptions",
    messageThreads: "creator_message_threads",
    messages: "creator_messages",
    broadcasts: "creator_broadcasts",
    requests: "creator_custom_requests",
    bookings: "creator_call_bookings",
    ledgerAccruals: "creator_ledger_accruals",
    payoutRequests: "creator_payout_requests",
    categoryConfig: "creator_request_category_config",
} as const;

export function isCreatorRole(value: unknown) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const source = value as Record<string, unknown>;
        return source.role === "creator" || source.creator === true;
    }

    return value === "creator";
}

export function isCreatorOrAdminRole(value: unknown) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const source = value as Record<string, unknown>;
        return source.role === "admin" || source.role === "creator" || source.creator === true;
    }

    return value === "creator" || value === "admin";
}

export function buildCreatorRelationshipId(userId: string, creatorId: string) {
    return `${userId}__${creatorId}`;
}

export function buildCreatorThreadId(creatorId: string, userId: string) {
    return `creator_${creatorId}__user_${userId}`;
}

export function normalizePositiveWholeNumber(value: unknown, fallback = 0) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.round(value));
}

export function normalizeMessageKind(value: unknown): keyof typeof CREATOR_MESSAGE_COSTS {
    return value === "image" || value === "video" ? value : "text";
}

export function getCreatorMessageCost(kind: unknown) {
    return CREATOR_MESSAGE_COSTS[normalizeMessageKind(kind)];
}

export function getCreatorBookingRate(serviceType: unknown) {
    return serviceType === "video" ? CREATOR_BOOKING_RATES.video : CREATOR_BOOKING_RATES.phone;
}

export function normalizeCreatorRequestCategories(value: unknown): CreatorRequestCategoryConfig[] {
    if (!Array.isArray(value)) {
        return DEFAULT_CREATOR_REQUEST_CATEGORIES;
    }

    const normalized = value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
            return [];
        }

        const source = entry as Record<string, unknown>;
        const id = typeof source.id === "string" && source.id.trim().length > 0
            ? source.id.trim()
            : "";
        const label = typeof source.label === "string" && source.label.trim().length > 0
            ? source.label.trim()
            : "";
        if (!id || !label) {
            return [];
        }

        return [{
            id,
            label,
            description: typeof source.description === "string" ? source.description.trim() : undefined,
            priceGd: Math.max(0, normalizePositiveWholeNumber(source.priceGd, 0)),
            enabled: source.enabled !== false,
        } satisfies CreatorRequestCategoryConfig];
    });

    return normalized.length > 0 ? normalized : DEFAULT_CREATOR_REQUEST_CATEGORIES;
}

export function normalizeCreatorAvailabilityWindows(value: unknown): CreatorAvailabilityWindow[] {
    if (!Array.isArray(value)) {
        return DEFAULT_CREATOR_AVAILABILITY_WINDOWS;
    }

    const normalized = value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
            return [];
        }

        const source = entry as Record<string, unknown>;
        const serviceTypes = Array.isArray(source.serviceTypes)
            ? source.serviceTypes.filter((service): service is "phone" | "video" => service === "phone" || service === "video")
            : [];

        if (serviceTypes.length === 0) {
            return [];
        }

        return [{
            id: typeof source.id === "string" && source.id.trim().length > 0 ? source.id.trim() : cryptoSafeId("window"),
            dayOfWeek: Math.min(6, Math.max(0, normalizePositiveWholeNumber(source.dayOfWeek, 0))),
            startHour: Math.min(23, Math.max(0, normalizePositiveWholeNumber(source.startHour, 0))),
            startMinute: Math.min(59, Math.max(0, normalizePositiveWholeNumber(source.startMinute, 0))),
            endHour: Math.min(23, Math.max(0, normalizePositiveWholeNumber(source.endHour, 0))),
            endMinute: Math.min(59, Math.max(0, normalizePositiveWholeNumber(source.endMinute, 0))),
            serviceTypes,
        } satisfies CreatorAvailabilityWindow];
    });

    return normalized.length > 0 ? normalized : DEFAULT_CREATOR_AVAILABILITY_WINDOWS;
}

export function normalizeCreatorSettings(value: unknown): CreatorSettings {
    if (!value || typeof value !== "object") {
        return DEFAULT_CREATOR_SETTINGS;
    }

    const source = value as Record<string, unknown>;
    return {
        messagingEnabled: source.messagingEnabled !== false,
        broadcastsEnabled: source.broadcastsEnabled !== false,
        subscriptionsEnabled: source.subscriptionsEnabled !== false,
        bookingsEnabled: source.bookingsEnabled !== false,
        customRequestsEnabled: source.customRequestsEnabled !== false,
        subscriptionPriceGd: Math.max(CREATOR_SUBSCRIPTION_MIN_GD, normalizePositiveWholeNumber(source.subscriptionPriceGd, DEFAULT_CREATOR_SETTINGS.subscriptionPriceGd)),
        phoneRatePerMinuteGd: Math.max(CREATOR_BOOKING_RATES.phone, normalizePositiveWholeNumber(source.phoneRatePerMinuteGd, DEFAULT_CREATOR_SETTINGS.phoneRatePerMinuteGd)),
        videoRatePerMinuteGd: Math.max(CREATOR_BOOKING_RATES.video, normalizePositiveWholeNumber(source.videoRatePerMinuteGd, DEFAULT_CREATOR_SETTINGS.videoRatePerMinuteGd)),
        bookingMinimumMinutes: Math.max(CREATOR_BOOKING_MIN_MINUTES, normalizePositiveWholeNumber(source.bookingMinimumMinutes, DEFAULT_CREATOR_SETTINGS.bookingMinimumMinutes)),
        videoSubscriberDiscountPercent: Math.min(100, Math.max(0, normalizePositiveWholeNumber(source.videoSubscriberDiscountPercent, DEFAULT_CREATOR_SETTINGS.videoSubscriberDiscountPercent))),
        chatFreeForSubscribers: source.chatFreeForSubscribers !== false,
        requestCategories: normalizeCreatorRequestCategories(source.requestCategories),
        availabilityTimezone: typeof source.availabilityTimezone === "string" && source.availabilityTimezone.trim().length > 0
            ? source.availabilityTimezone.trim()
            : DEFAULT_CREATOR_SETTINGS.availabilityTimezone,
        availabilityWindows: normalizeCreatorAvailabilityWindows(source.availabilityWindows),
    };
}

export function normalizeCreatorRestrictions(value: unknown): CreatorRestrictions {
    if (!value || typeof value !== "object") {
        return DEFAULT_CREATOR_RESTRICTIONS;
    }

    const source = value as Record<string, unknown>;
    return {
        messagingRestricted: source.messagingRestricted === true,
        broadcastsRestricted: source.broadcastsRestricted === true,
        subscriptionsRestricted: source.subscriptionsRestricted === true,
        bookingsRestricted: source.bookingsRestricted === true,
        customRequestsRestricted: source.customRequestsRestricted === true,
        dropSubmissionsRestricted: source.dropSubmissionsRestricted === true,
        payoutsRestricted: source.payoutsRestricted === true,
        moderationNote: typeof source.moderationNote === "string" && source.moderationNote.trim().length > 0
            ? source.moderationNote.trim()
            : undefined,
    };
}

export function isCreatorMessagingAvailable(input: {
    role?: unknown;
    status?: unknown;
    creatorApplication?: unknown;
    creatorSettings?: CreatorSettings | null | undefined;
    creatorRestrictions?: CreatorRestrictions | null | undefined;
}) {
    const status = typeof input.status === "string" ? input.status : "";
    const creatorApplication = input.creatorApplication && typeof input.creatorApplication === "object" && !Array.isArray(input.creatorApplication)
        ? input.creatorApplication as Record<string, unknown>
        : null;
    const approvalStatus = creatorApplication
        ? normalizeCreatorOnboardingApprovalStatus(creatorApplication.approvalStatus ?? creatorApplication.status)
        : "creator_pending";
    const creatorEligible = isCreatorRole(input.role) || approvalStatus === "creator_approved";

    if (!creatorEligible || status === "suspended" || status === "banned") {
        return false;
    }

    const settings = input.creatorSettings
        ? normalizeCreatorSettings(input.creatorSettings)
        : DEFAULT_CREATOR_SETTINGS;
    const restrictions = input.creatorRestrictions
        ? normalizeCreatorRestrictions(input.creatorRestrictions)
        : DEFAULT_CREATOR_RESTRICTIONS;

    return settings.messagingEnabled !== false && restrictions.messagingRestricted !== true;
}

export function calculateCreatorCashoutUsd(gumDrops: number) {
    return Number((normalizePositiveWholeNumber(gumDrops) / CREATOR_PAYOUT_RATE_GD).toFixed(2));
}

export function cryptoSafeId(prefix: string) {
    return `${prefix}_${generateSecureClientToken(8)}`;
}

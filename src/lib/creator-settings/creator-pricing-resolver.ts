import {
    CREATOR_BOOKING_RATES,
    CREATOR_SUBSCRIPTION_MIN_GD,
    DEFAULT_CREATOR_SETTINGS,
    normalizeCreatorRequestCategories,
    normalizeCreatorSettings,
    normalizePositiveWholeNumber,
} from "@/lib/creator-experiences";
import type { CreatorRequestCategoryConfig } from "@/types/db";

export type CreatorPricingSource = "creator_settings" | "legacy_default" | "unavailable";

export type CreatorResolvedPrice = {
    kind: "fan_pass" | "request" | "booking" | "broadcast";
    enabled: boolean;
    priceGd: number;
    source: CreatorPricingSource;
    paidOnly: boolean;
    disabledReason?: string;
};

export type CreatorResolvedRequestPrice = CreatorResolvedPrice & {
    kind: "request";
    id: string;
    label: string;
};

export type CreatorResolvedBookingPrice = CreatorResolvedPrice & {
    kind: "booking";
    serviceType: "phone" | "video";
    durationMinutes: number;
    ratePerMinuteGd: number;
    subscriptionDiscountApplied: boolean;
};

export type CreatorResolvedPricing = {
    fanPass: CreatorResolvedPrice & { kind: "fan_pass" };
    requests: CreatorResolvedRequestPrice[];
    selectedRequest: CreatorResolvedRequestPrice | null;
    booking: CreatorResolvedBookingPrice | null;
    broadcast: CreatorResolvedPrice & { kind: "broadcast" };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOwn(source: Record<string, unknown>, key: string) {
    return Object.prototype.hasOwnProperty.call(source, key);
}

function pricingSource(rawSettings: unknown, keys: string[]): CreatorPricingSource {
    if (!isRecord(rawSettings)) {
        return "legacy_default";
    }
    return keys.some((key) => hasOwn(rawSettings, key)) ? "creator_settings" : "legacy_default";
}

function requestSource(rawSettings: unknown, category: CreatorRequestCategoryConfig | null) {
    if (!isRecord(rawSettings)) {
        return "legacy_default" as const;
    }
    if (!Array.isArray(rawSettings.requestCategories)) {
        return "legacy_default" as const;
    }
    return category ? "creator_settings" as const : "unavailable" as const;
}

export function resolveCreatorFanPassPricing(rawSettings: unknown): CreatorResolvedPrice & { kind: "fan_pass" } {
    const settings = normalizeCreatorSettings(rawSettings);
    const source = pricingSource(rawSettings, ["subscriptionsEnabled", "subscriptionPriceGd"]);
    const enabled = settings.subscriptionsEnabled !== false;
    return {
        kind: "fan_pass",
        enabled,
        priceGd: enabled ? Math.max(CREATOR_SUBSCRIPTION_MIN_GD, settings.subscriptionPriceGd) : 0,
        source: enabled ? source : "unavailable",
        paidOnly: true,
        disabledReason: enabled ? undefined : "fan_pass_disabled",
    };
}

export function resolveCreatorRequestPricing(rawSettings: unknown, categoryId?: string): CreatorResolvedRequestPrice | null {
    const settings = normalizeCreatorSettings(rawSettings);
    if (settings.customRequestsEnabled === false) {
        return {
            kind: "request",
            id: categoryId ?? "",
            label: "Requests",
            enabled: false,
            priceGd: 0,
            source: "unavailable",
            paidOnly: true,
            disabledReason: "requests_disabled",
        };
    }

    const categories = normalizeCreatorRequestCategories(settings.requestCategories)
        .filter((category) => category.enabled !== false);
    const selected = categoryId
        ? categories.find((category) => category.id === categoryId) ?? null
        : categories[0] ?? null;
    if (!selected) {
        return null;
    }

    return {
        kind: "request",
        id: selected.id,
        label: selected.label,
        enabled: true,
        priceGd: Math.max(0, normalizePositiveWholeNumber(selected.priceGd, 0)),
        source: requestSource(rawSettings, selected),
        paidOnly: true,
    };
}

export function resolveCreatorRequestPricingList(rawSettings: unknown): CreatorResolvedRequestPrice[] {
    const settings = normalizeCreatorSettings(rawSettings);
    const categories = normalizeCreatorRequestCategories(settings.requestCategories)
        .filter((category) => category.enabled !== false);
    return categories.flatMap((category) => {
        const resolved = resolveCreatorRequestPricing(rawSettings, category.id);
        return resolved ? [resolved] : [];
    });
}

export function resolveCreatorBookingPricing(
    rawSettings: unknown,
    input: {
        serviceType: "phone" | "video";
        durationMinutes: number;
        subscriptionActive?: boolean;
    },
): CreatorResolvedBookingPrice {
    const settings = normalizeCreatorSettings(rawSettings);
    const source = pricingSource(rawSettings, [
        "bookingsEnabled",
        "phoneRatePerMinuteGd",
        "videoRatePerMinuteGd",
        "videoSubscriberDiscountPercent",
    ]);
    const enabled = settings.bookingsEnabled !== false;
    const durationMinutes = Math.max(1, normalizePositiveWholeNumber(input.durationMinutes, 1));
    const baseRate = input.serviceType === "video"
        ? Math.max(CREATOR_BOOKING_RATES.video, settings.videoRatePerMinuteGd)
        : Math.max(CREATOR_BOOKING_RATES.phone, settings.phoneRatePerMinuteGd);
    const discountPercent = input.serviceType === "video" && input.subscriptionActive
        ? Math.min(100, Math.max(0, normalizePositiveWholeNumber(settings.videoSubscriberDiscountPercent, 0)))
        : 0;
    const ratePerMinuteGd = Math.max(0, Math.round(baseRate * (1 - discountPercent / 100)));
    return {
        kind: "booking",
        serviceType: input.serviceType,
        enabled,
        durationMinutes,
        ratePerMinuteGd,
        priceGd: enabled ? ratePerMinuteGd * durationMinutes : 0,
        source: enabled ? source : "unavailable",
        paidOnly: true,
        subscriptionDiscountApplied: discountPercent > 0,
        disabledReason: enabled ? undefined : "bookings_disabled",
    };
}

export function resolveCreatorBroadcastPricing(rawSettings: unknown): CreatorResolvedPrice & { kind: "broadcast" } {
    const settings = normalizeCreatorSettings(rawSettings);
    const enabled = settings.broadcastsEnabled !== false;
    return {
        kind: "broadcast",
        enabled,
        priceGd: 0,
        source: enabled ? pricingSource(rawSettings, ["broadcastsEnabled"]) : "unavailable",
        paidOnly: false,
        disabledReason: enabled ? undefined : "broadcasts_disabled",
    };
}

export function resolveCreatorPricing(
    rawSettings: unknown,
    input: {
        requestCategoryId?: string;
        bookingServiceType?: "phone" | "video";
        bookingDurationMinutes?: number;
        subscriptionActive?: boolean;
    } = {},
): CreatorResolvedPricing {
    return {
        fanPass: resolveCreatorFanPassPricing(rawSettings),
        requests: resolveCreatorRequestPricingList(rawSettings),
        selectedRequest: resolveCreatorRequestPricing(rawSettings, input.requestCategoryId),
        booking: input.bookingServiceType
            ? resolveCreatorBookingPricing(rawSettings, {
                serviceType: input.bookingServiceType,
                durationMinutes: input.bookingDurationMinutes ?? DEFAULT_CREATOR_SETTINGS.bookingMinimumMinutes,
                subscriptionActive: input.subscriptionActive,
            })
            : null,
        broadcast: resolveCreatorBroadcastPricing(rawSettings),
    };
}

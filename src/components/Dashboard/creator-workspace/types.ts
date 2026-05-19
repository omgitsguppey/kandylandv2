import type { FanPassSubscriberCrmRow } from "@/components/Creators/FanPassSubscriberRow";
import type { UiContinuityModuleState } from "@/lib/ui-continuity";

export type CreatorStats = {
    earningsGd: number;
    pendingCashoutGd: number;
    followerCount: number;
    profileViewsCount: number;
    liveDropsCount: number;
    contentCount?: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
};

export type CreatorSettingsSourceSummary = {
    settingsState?: "configured" | "not_configured";
    statsEvidence?: {
        sourceTruth?: "canonical" | "partial" | "needs_review" | "unavailable";
        issues?: string[];
        fanCountSource?: "relationship_count" | "profile_follower_count" | "settings_snapshot" | "unavailable";
        contentCountScope?: "creator_owned_or_assigned";
    } | null;
};

export type CreatorFanCountSource = NonNullable<NonNullable<CreatorSettingsSourceSummary["statsEvidence"]>["fanCountSource"]>;

export type CreatorRequestRecord = {
    id: string;
    categoryLabel?: string;
    details?: string;
    priceGd?: number;
    status?: string;
    responseNote?: string | null;
    createdAt?: number;
    respondedAt?: number;
    userId?: string;
};

export type CreatorBookingRecord = {
    id: string;
    serviceType?: string;
    status?: string;
    startAt?: number;
    durationMinutes?: number;
    priceGd?: number;
    userId?: string;
};

export type CreatorThreadRecord = {
    id: string;
    creatorId?: string;
    userId?: string;
    lastMessageAt?: number;
    lastMessagePreview?: string;
    unreadCount?: number;
    counterpartDisplayName?: string;
    counterpartUsername?: string;
    counterpartPhotoURL?: string | null;
};

export type CreatorSubscriptionRecord = FanPassSubscriberCrmRow;

export type ModuleKey =
    | "settings"
    | "requests"
    | "bookings"
    | "subscriptions"
    | "threads";

export const moduleLabels: Record<ModuleKey, string> = {
    settings: "creator settings",
    requests: "custom requests",
    bookings: "bookings",
    subscriptions: "subscriptions",
    threads: "messages",
};

export const DEFAULT_MODULE_STATE: Record<ModuleKey, UiContinuityModuleState> = {
    settings: { key: "settings", label: "creator settings", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    requests: { key: "requests", label: "custom requests", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
    bookings: { key: "bookings", label: "bookings", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    subscriptions: { key: "subscriptions", label: "subscriptions", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    threads: { key: "threads", label: "messages", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
};

export function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Not available";
    }

    const diffMs = timestamp - Date.now();
    const diffMinutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 48) {
        return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
        return rtf.format(diffDays, "day");
    }

    return new Date(timestamp).toLocaleString();
}

export function formatStatusLabel(value?: string) {
    return value ? value.replaceAll("_", " ") : "unknown";
}

export function formatDashboardMetric(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Unavailable";
}

export function formatFollowerSourceDetail(source: CreatorFanCountSource | "unavailable") {
    switch (source) {
        case "relationship_count":
            return "Follower count";
        case "profile_follower_count":
            return "Profile follower count";
        case "settings_snapshot":
            return "Settings snapshot";
        default:
            return "Source unavailable";
    }
}

import {
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    DEFAULT_CREATOR_SETTINGS,
    isCreatorRole,
    normalizeCreatorSettings,
    type CreatorSettings,
} from "@/lib/creator-experiences";
import { normalizeCreatorOnboardingApprovalStatus } from "@/lib/creator-onboarding";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";

export {
    buildCreatorAdminHref,
    buildCreatorProfileHref,
    buildCreatorProfileLinkTelemetryPayload,
    buildCreatorPublicHref,
    buildCreatorReviewHref,
    canLinkToCreatorPublicProfile,
    explainCreatorProfileRouteMissing,
    normalizeCreatorProfileSlug,
    type CreatorProfileRouteInput,
    type CreatorProfileRouteSource,
} from "@/lib/creator-profile-routing";

export type CreatorDiscoverySurface = "dashboard" | "drops" | "experiences" | "home";

export type CreatorPublicExperienceKey =
    | "drops"
    | "subscriptions"
    | "messages"
    | "requests"
    | "bookings"
    | "broadcasts";

export type CreatorPublicExperienceCard = {
    key: CreatorPublicExperienceKey;
    eyebrow: string;
    label: string;
    summary: string;
};

export type CreatorDiscoveryProfile = {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    bio: string;
    isVerified: boolean;
    activeDropCount: number;
    followerCount: number;
    notificationsEnabledCount?: number;
};

export function buildCreatorDiscoveryNavigationParams(input: {
    creatorId: string;
    creatorUsername?: string;
    surface: CreatorDiscoverySurface;
}) {
    const destination = buildCreatorPublicHref({
        creatorId: input.creatorId,
        creatorUsername: input.creatorUsername,
    }) ?? "/creators";

    return {
        destination,
        source: `creator_discovery_${input.surface}`,
        action: "open_creator_profile",
        creator_id: input.creatorId,
        creator_username: input.creatorUsername || "unknown",
    };
}

export function isCreatorVisibleInDiscovery(input: {
    role?: unknown;
    status?: unknown;
    creatorApplication?: unknown;
    activeDropCount?: number;
}) {
    const status = typeof input.status === "string" ? input.status : "";
    if (status === "suspended" || status === "banned") {
        return false;
    }

    const activeDropCount = typeof input.activeDropCount === "number" && Number.isFinite(input.activeDropCount)
        ? input.activeDropCount
        : 0;
    const creatorApplication = input.creatorApplication && typeof input.creatorApplication === "object" && !Array.isArray(input.creatorApplication)
        ? input.creatorApplication as Record<string, unknown>
        : null;
    const approvalStatus = creatorApplication
        ? normalizeCreatorOnboardingApprovalStatus(creatorApplication.approvalStatus ?? creatorApplication.status)
        : "creator_pending";

    return isCreatorRole(input.role)
        || approvalStatus === "creator_approved"
        || activeDropCount > 0;
}

export function resolveCreatorPublicExperienceState(settingsInput: CreatorSettings | null | undefined, activeDropCount: number) {
    const settings = settingsInput ? normalizeCreatorSettings(settingsInput) : DEFAULT_CREATOR_SETTINGS;
    const enabledRequestCategories = settings.requestCategories.filter((category) => category.enabled);
    const summaryCards: CreatorPublicExperienceCard[] = [];

    if (activeDropCount > 0) {
        summaryCards.push({
            key: "drops",
            eyebrow: "Live now",
            label: activeDropCount === 1 ? "1 drop ready" : `${activeDropCount} drops ready`,
            summary: "Fans can browse this creator's current drop lineup from the profile.",
        });
    }

    if (settings.subscriptionsEnabled) {
        summaryCards.push({
            key: "subscriptions",
            eyebrow: "Fan pass",
            label: `${settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD monthly`,
            summary: "Unlock recurring creator access with chat perks and discounted calls.",
        });
    }

    if (settings.messagingEnabled) {
        summaryCards.push({
            key: "messages",
            eyebrow: "Private chat",
            label: `${CREATOR_MESSAGE_COSTS.text} to ${CREATOR_MESSAGE_COSTS.video} GD`,
            summary: "Fans can send private messages, images, or video requests from the same page.",
        });
    }

    if (settings.customRequestsEnabled && enabledRequestCategories.length > 0) {
        summaryCards.push({
            key: "requests",
            eyebrow: "Custom work",
            label: enabledRequestCategories[0]?.label || "Custom request",
            summary: enabledRequestCategories.length > 1
                ? `${enabledRequestCategories.length} request categories are open right now.`
                : "A private request lane is open for one-off creator work.",
        });
    }

    if (settings.bookingsEnabled) {
        summaryCards.push({
            key: "bookings",
            eyebrow: "Calls",
            label: `${settings.phoneRatePerMinuteGd || CREATOR_BOOKING_RATES.phone}/${settings.videoRatePerMinuteGd || CREATOR_BOOKING_RATES.video} GD per min`,
            summary: `Fans can reserve phone or video time starting at ${settings.bookingMinimumMinutes} minutes.`,
        });
    }

    if (settings.broadcastsEnabled) {
        summaryCards.push({
            key: "broadcasts",
            eyebrow: "Updates",
            label: "Follower and subscriber posts",
            summary: "Quick creator updates stay attached to the profile for returning fans.",
        });
    }

    return {
        settings,
        enabledRequestCategories,
        summaryCards,
        hasEnabledExperiences: summaryCards.some((card) => card.key !== "drops"),
    };
}

import {
    CREATOR_BOOKING_RATES,
    CREATOR_SUBSCRIPTION_MIN_GD,
    DEFAULT_CREATOR_REQUEST_CATEGORIES,
    DEFAULT_CREATOR_SETTINGS,
    normalizeCreatorRequestCategories,
    normalizeCreatorSettings,
} from "@/lib/creator-experiences";
import type { CreatorSettings } from "@/types/db";

export type CreatorSettingsState = "configured" | "not_configured";
export type CreatorBroadcastDefaultAudience = "followers" | "fan_pass_subscribers" | "followers_and_subscribers";
export type CreatorSettingsSectionId = "profile_basics" | "fan_pass" | "gumdrop_experiences" | "broadcasts" | "timeline";

export type CreatorSettingsControlPlane = {
    fanPassEnabled: boolean;
    fanPassPriceGd: number;
    fanPassWelcomeText: string;
    creatorRequestsEnabled: boolean;
    requestBasePriceGd: number;
    allowedRequestTypes: string[];
    callsEnabled: boolean;
    callPriceGd: number;
    broadcastsEnabled: boolean;
    broadcastDefaultAudience: CreatorBroadcastDefaultAudience;
    profileTimelineEnabled: boolean;
    showApprovedDropsOnTimeline: boolean;
    showBroadcastsOnTimeline: boolean;
    profileDisplayName: string;
    bio: string;
    profilePhotoURL: string;
};

export type CreatorSettingsCompletionItem = {
    id: CreatorSettingsSectionId;
    label: string;
    complete: boolean;
    controlId: string;
    userFacingImpact: string;
};

export type CreatorSettingsCompletion = {
    complete: boolean;
    items: CreatorSettingsCompletionItem[];
    missingSetupItems: CreatorSettingsSectionId[];
};

export type CreatorSettingsUserFacingImpact = {
    fanPassVisible: boolean;
    requestsVisible: boolean;
    callsVisible: boolean;
    broadcastsAvailable: boolean;
    timelineVisible: boolean;
    disabledReason?: string;
};

export const CREATOR_SETTINGS_ADMIN_ONLY_FIELDS = [
    "publicDiscovery",
    "rotationEligibility",
    "live",
    "approved",
    "published",
    "reviewStatus",
    "reviewedByAdminId",
    "reviewedAt",
    "approvalStatus",
    "creatorRestrictions",
    "dropSubmissionsRestricted",
    "payoutsRestricted",
    "adminOnly",
    "createdByRole",
    "submittedByCreatorId",
] as const;

const MAX_PROFILE_NAME_LENGTH = 80;
const MAX_BIO_LENGTH = 280;
const MAX_WELCOME_TEXT_LENGTH = 160;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boolValue(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
}

function wholeNumber(value: unknown, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.round(value);
}

function normalizeBroadcastAudience(value: unknown): CreatorBroadcastDefaultAudience {
    return value === "fan_pass_subscribers" || value === "followers_and_subscribers" ? value : "followers";
}

function requestBasePrice(settings: CreatorSettings) {
    const enabled = settings.requestCategories.filter((category) => category.enabled !== false);
    const firstPrice = enabled[0]?.priceGd ?? settings.requestCategories[0]?.priceGd;
    return Math.max(0, wholeNumber(firstPrice, DEFAULT_CREATOR_REQUEST_CATEGORIES[0]?.priceGd ?? 300));
}

function allowedRequestTypes(settings: CreatorSettings) {
    return settings.requestCategories
        .filter((category) => category.enabled !== false)
        .map((category) => category.id);
}

export function buildCreatorSettingsControlPlane(
    rawSettings: unknown,
    profile: { displayName?: unknown; bio?: unknown; photoURL?: unknown } = {},
): CreatorSettingsControlPlane {
    const settings = normalizeCreatorSettings(rawSettings);
    return {
        fanPassEnabled: settings.subscriptionsEnabled,
        fanPassPriceGd: settings.subscriptionPriceGd,
        fanPassWelcomeText: settings.fanPassWelcomeText ?? "",
        creatorRequestsEnabled: settings.customRequestsEnabled,
        requestBasePriceGd: requestBasePrice(settings),
        allowedRequestTypes: allowedRequestTypes(settings),
        callsEnabled: settings.bookingsEnabled,
        callPriceGd: Math.max(settings.phoneRatePerMinuteGd, settings.videoRatePerMinuteGd),
        broadcastsEnabled: settings.broadcastsEnabled,
        broadcastDefaultAudience: normalizeBroadcastAudience(settings.broadcastDefaultAudience),
        profileTimelineEnabled: settings.profileTimelineEnabled !== false,
        showApprovedDropsOnTimeline: settings.showApprovedDropsOnTimeline !== false,
        showBroadcastsOnTimeline: settings.showBroadcastsOnTimeline !== false,
        profileDisplayName: cleanText(profile.displayName, MAX_PROFILE_NAME_LENGTH),
        bio: cleanText(profile.bio, MAX_BIO_LENGTH),
        profilePhotoURL: cleanText(profile.photoURL, 500),
    };
}

export function buildCreatorSettingsCompletion(
    settings: CreatorSettingsControlPlane,
    settingsState: CreatorSettingsState,
): CreatorSettingsCompletion {
    const notConfigured = settingsState === "not_configured";
    const items: CreatorSettingsCompletionItem[] = [
        {
            id: "profile_basics",
            label: "Profile basics",
            complete: !notConfigured && settings.profileDisplayName.trim().length > 0 && settings.bio.trim().length > 0,
            controlId: "profile-basics",
            userFacingImpact: "Controls the public creator profile name and bio.",
        },
        {
            id: "fan_pass",
            label: "Fan Pass",
            complete: !notConfigured && (!settings.fanPassEnabled || settings.fanPassPriceGd >= CREATOR_SUBSCRIPTION_MIN_GD),
            controlId: "fan-pass",
            userFacingImpact: "Controls whether Fan Pass appears and how many paid GumDrops it costs.",
        },
        {
            id: "gumdrop_experiences",
            label: "GumDrop experiences",
            complete: !notConfigured && (!settings.creatorRequestsEnabled || settings.requestBasePriceGd > 0) && (!settings.callsEnabled || settings.callPriceGd >= CREATOR_BOOKING_RATES.phone),
            controlId: "gumdrop-experiences",
            userFacingImpact: "Controls request and live-time actions on the public profile.",
        },
        {
            id: "broadcasts",
            label: "Broadcasts",
            complete: !notConfigured && typeof settings.broadcastsEnabled === "boolean",
            controlId: "broadcasts",
            userFacingImpact: "Controls whether creator broadcasts can be sent and surfaced.",
        },
        {
            id: "timeline",
            label: "Timeline",
            complete: !notConfigured && typeof settings.profileTimelineEnabled === "boolean",
            controlId: "timeline",
            userFacingImpact: "Controls which approved creator updates are prepared for profile timeline surfaces.",
        },
    ];

    return {
        complete: items.every((item) => item.complete),
        items,
        missingSetupItems: items.filter((item) => !item.complete).map((item) => item.id),
    };
}

export function buildCreatorSettingsUserFacingImpact(settings: CreatorSettingsControlPlane): CreatorSettingsUserFacingImpact {
    return {
        fanPassVisible: settings.fanPassEnabled && settings.fanPassPriceGd >= CREATOR_SUBSCRIPTION_MIN_GD,
        requestsVisible: settings.creatorRequestsEnabled && settings.requestBasePriceGd > 0,
        callsVisible: settings.callsEnabled && settings.callPriceGd >= CREATOR_BOOKING_RATES.phone,
        broadcastsAvailable: settings.broadcastsEnabled,
        timelineVisible: settings.profileTimelineEnabled,
        disabledReason: settings.fanPassEnabled && settings.fanPassPriceGd < CREATOR_SUBSCRIPTION_MIN_GD ? "fan_pass_price_too_low" : undefined,
    };
}

export function isCreatorSettingsAdminOnlyField(field: string) {
    return (CREATOR_SETTINGS_ADMIN_ONLY_FIELDS as readonly string[]).includes(field);
}

export function stripAdminOnlyCreatorSettingsFields(input: Record<string, unknown>) {
    const safeInput: Record<string, unknown> = {};
    const rejectedAdminOnlyFields: string[] = [];
    for (const [key, value] of Object.entries(input)) {
        if (isCreatorSettingsAdminOnlyField(key)) {
            rejectedAdminOnlyFields.push(key);
            continue;
        }
        safeInput[key] = value;
    }
    return {
        input: safeInput,
        rejectedAdminOnlyFields,
    };
}

function sectionForField(field: string): CreatorSettingsSectionId | null {
    if (field.startsWith("fanPass")) return "fan_pass";
    if (field === "creatorRequestsEnabled" || field === "requestBasePriceGd" || field === "allowedRequestTypes" || field === "callsEnabled" || field === "callPriceGd") return "gumdrop_experiences";
    if (field === "broadcastsEnabled" || field === "broadcastDefaultAudience") return "broadcasts";
    if (field === "profileTimelineEnabled" || field === "showApprovedDropsOnTimeline" || field === "showBroadcastsOnTimeline") return "timeline";
    if (field === "profileDisplayName" || field === "bio" || field === "profilePhotoURL") return "profile_basics";
    return null;
}

function updateRequestCategories(input: Record<string, unknown>, fallback: CreatorSettings) {
    const categories = normalizeCreatorRequestCategories(fallback.requestCategories);
    const enabledIds = Array.isArray(input.allowedRequestTypes)
        ? new Set(input.allowedRequestTypes.filter((value): value is string => typeof value === "string"))
        : null;
    const price = wholeNumber(input.requestBasePriceGd, requestBasePrice(fallback));
    return categories.map((category) => ({
        ...category,
        enabled: enabledIds ? enabledIds.has(category.id) : category.enabled,
        priceGd: Math.max(0, price),
    }));
}

export type CreatorSettingsControlPlaneSanitizeResult =
    | {
        ok: true;
        creatorSettings: CreatorSettings;
        profilePatch: { displayName?: string; bio?: string; photoURL?: string };
        changedSections: CreatorSettingsSectionId[];
        rejectedAdminOnlyFields: string[];
    }
    | {
        ok: false;
        errors: string[];
        rejectedAdminOnlyFields: string[];
    };

export function sanitizeCreatorSettingsControlPlaneUpdate(
    input: unknown,
    currentSettings: unknown = DEFAULT_CREATOR_SETTINGS,
): CreatorSettingsControlPlaneSanitizeResult {
    if (!isRecord(input)) {
        return { ok: false, errors: ["Creator settings update must be an object."], rejectedAdminOnlyFields: [] };
    }

    const stripped = stripAdminOnlyCreatorSettingsFields(input);
    const source = stripped.input;
    const errors: string[] = [];
    const fallback = normalizeCreatorSettings(currentSettings);
    const fanPassPriceGd = wholeNumber(source.fanPassPriceGd, fallback.subscriptionPriceGd);
    const requestPriceGd = wholeNumber(source.requestBasePriceGd, requestBasePrice(fallback));
    const callPriceGd = wholeNumber(source.callPriceGd, Math.max(fallback.phoneRatePerMinuteGd, fallback.videoRatePerMinuteGd));

    if (Object.prototype.hasOwnProperty.call(source, "fanPassPriceGd") && fanPassPriceGd < CREATOR_SUBSCRIPTION_MIN_GD) {
        errors.push(`fanPassPriceGd must be at least ${CREATOR_SUBSCRIPTION_MIN_GD} GD.`);
    }
    if (Object.prototype.hasOwnProperty.call(source, "requestBasePriceGd") && requestPriceGd < 0) {
        errors.push("requestBasePriceGd must be zero or greater.");
    }
    if (Object.prototype.hasOwnProperty.call(source, "callPriceGd") && callPriceGd < CREATOR_BOOKING_RATES.phone) {
        errors.push(`callPriceGd must be at least ${CREATOR_BOOKING_RATES.phone} GD.`);
    }

    if (stripped.rejectedAdminOnlyFields.length > 0) {
        errors.push("Creator settings cannot include admin-only fields.");
    }
    if (errors.length > 0) {
        return { ok: false, errors, rejectedAdminOnlyFields: stripped.rejectedAdminOnlyFields };
    }

    const creatorSettings = normalizeCreatorSettings({
        ...fallback,
        subscriptionsEnabled: boolValue(source.fanPassEnabled, fallback.subscriptionsEnabled),
        subscriptionPriceGd: fanPassPriceGd,
        fanPassWelcomeText: cleanText(source.fanPassWelcomeText, MAX_WELCOME_TEXT_LENGTH) || fallback.fanPassWelcomeText,
        customRequestsEnabled: boolValue(source.creatorRequestsEnabled, fallback.customRequestsEnabled),
        requestCategories: updateRequestCategories(source, fallback),
        bookingsEnabled: boolValue(source.callsEnabled, fallback.bookingsEnabled),
        phoneRatePerMinuteGd: callPriceGd,
        videoRatePerMinuteGd: callPriceGd,
        broadcastsEnabled: boolValue(source.broadcastsEnabled, fallback.broadcastsEnabled),
        broadcastDefaultAudience: normalizeBroadcastAudience(source.broadcastDefaultAudience ?? fallback.broadcastDefaultAudience),
        profileTimelineEnabled: boolValue(source.profileTimelineEnabled, fallback.profileTimelineEnabled !== false),
        showApprovedDropsOnTimeline: boolValue(source.showApprovedDropsOnTimeline, fallback.showApprovedDropsOnTimeline !== false),
        showBroadcastsOnTimeline: boolValue(source.showBroadcastsOnTimeline, fallback.showBroadcastsOnTimeline !== false),
    });
    const profilePatch = {
        ...(typeof source.profileDisplayName === "string" ? { displayName: cleanText(source.profileDisplayName, MAX_PROFILE_NAME_LENGTH) } : {}),
        ...(typeof source.bio === "string" ? { bio: cleanText(source.bio, MAX_BIO_LENGTH) } : {}),
        ...(typeof source.profilePhotoURL === "string" ? { photoURL: cleanText(source.profilePhotoURL, 500) } : {}),
    };
    const changedSections = Array.from(new Set(Object.keys(source).flatMap((field) => {
        const section = sectionForField(field);
        return section ? [section] : [];
    })));

    return {
        ok: true,
        creatorSettings,
        profilePatch,
        changedSections,
        rejectedAdminOnlyFields: stripped.rejectedAdminOnlyFields,
    };
}

export function assertCreatorSettingsUpdateSafe(payload: CreatorSettingsControlPlaneSanitizeResult) {
    if (!payload.ok) {
        throw new Error(payload.errors.join(" "));
    }
    return payload;
}

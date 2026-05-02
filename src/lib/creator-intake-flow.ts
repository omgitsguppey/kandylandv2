export const CREATOR_INTAKE_VERSION = "creator_intake_v1";
export const CREATOR_INTAKE_SOURCE = "creator_site";

export const CREATOR_MONETIZATION_GOAL_OPTIONS = [
    { value: "paid_drops", label: "Paid drops" },
    { value: "fan_pass", label: "Fan pass" },
    { value: "private_chat", label: "Private chat" },
    { value: "custom_requests", label: "Custom requests" },
    { value: "live_time", label: "Live time" },
    { value: "not_sure_yet", label: "Not sure yet" },
] as const;

export const CREATOR_PLATFORM_OPTIONS = [
    "Instagram",
    "TikTok",
    "YouTube",
    "X",
    "OnlyFans",
    "Twitch",
    "Independent / Other",
] as const;

export const CREATOR_FOLLOWER_RANGE_OPTIONS = [
    { value: "under_1k", label: "Under 1K" },
    { value: "1k_10k", label: "1K to 10K" },
    { value: "10k_50k", label: "10K to 50K" },
    { value: "50k_250k", label: "50K to 250K" },
    { value: "250k_plus", label: "250K+" },
] as const;

export const CREATOR_POSTING_FREQUENCY_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "few_times_week", label: "A few times a week" },
    { value: "weekly", label: "Weekly" },
    { value: "occasionally", label: "Occasionally" },
] as const;

export const CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "not_sure", label: "Not sure" },
] as const;

export const CREATOR_RECOMMENDED_SETUP_OPTIONS = [
    { value: "timed_drops_private_chat", label: "Timed drops + private chat" },
    { value: "fan_pass_custom_requests", label: "Fan pass + custom requests" },
    { value: "live_time_priority_chat", label: "Live time + priority chat" },
    { value: "drops_only", label: "Drops only" },
    { value: "start_simple_decide_later", label: "Start simple / decide later" },
] as const;

export const CREATOR_INTAKE_STEPS = [
    {
        key: "monetization_goals",
        title: "You already have attention. Let’s decide what it should become.",
    },
    {
        key: "audience_state",
        title: "Where do your fans already find you?",
    },
    {
        key: "recommended_setup",
        title: "Recommended creator setup",
        copy: "Based on your answers, KandyDrops can start you with a simple fan-access lane.",
    },
    {
        key: "creator_agreement",
        title: "Review the creator agreement",
        copy: "Before creator tools turn on, review and sign the creator service agreement.",
    },
    {
        key: "submit_for_review",
        title: "Submit for review",
        copy: "We’ll review your intake, agreement, and identity steps before creator tools go live.",
    },
] as const;

export const CREATOR_INTAKE_STEP_COUNT = CREATOR_INTAKE_STEPS.length;

export type CreatorMonetizationGoal = (typeof CREATOR_MONETIZATION_GOAL_OPTIONS)[number]["value"];
export type CreatorFollowerRange = (typeof CREATOR_FOLLOWER_RANGE_OPTIONS)[number]["value"];
export type CreatorPostingFrequency = (typeof CREATOR_POSTING_FREQUENCY_OPTIONS)[number]["value"];
export type CreatorFansAlreadyAskForAccess = (typeof CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS)[number]["value"];
export type CreatorRecommendedSetup = (typeof CREATOR_RECOMMENDED_SETUP_OPTIONS)[number]["value"];
export type CreatorIntakeStepKey = (typeof CREATOR_INTAKE_STEPS)[number]["key"];

export type CreatorIntakeFields = {
    creatorMonetizationGoals?: CreatorMonetizationGoal[];
    creatorFollowerRange?: CreatorFollowerRange;
    creatorPostingFrequency?: CreatorPostingFrequency;
    fansAlreadyAskForAccess?: CreatorFansAlreadyAskForAccess;
    creatorRecommendedSetup?: CreatorRecommendedSetup;
    intakeVersion?: string;
    intakeSubmittedAt?: number;
    intakeSource?: typeof CREATOR_INTAKE_SOURCE;
};

const GOAL_VALUES = new Set(CREATOR_MONETIZATION_GOAL_OPTIONS.map((option) => option.value));
const FOLLOWER_RANGE_VALUES = new Set(CREATOR_FOLLOWER_RANGE_OPTIONS.map((option) => option.value));
const POSTING_FREQUENCY_VALUES = new Set(CREATOR_POSTING_FREQUENCY_OPTIONS.map((option) => option.value));
const FANS_ASK_VALUES = new Set(CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS.map((option) => option.value));
const RECOMMENDED_SETUP_VALUES = new Set(CREATOR_RECOMMENDED_SETUP_OPTIONS.map((option) => option.value));

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readPositiveTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

function readAllowedString<T extends string>(value: unknown, allowed: Set<T>) {
    const text = readString(value);
    return allowed.has(text as T) ? text as T : undefined;
}

function readGoalValues(value: unknown) {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split("|") : [];
    const normalized = values
        .map((entry) => readAllowedString(entry, GOAL_VALUES))
        .filter((entry): entry is CreatorMonetizationGoal => Boolean(entry));

    return [...new Set(normalized)];
}

export function recommendCreatorSetupFromGoals(goals: unknown): CreatorRecommendedSetup {
    const normalizedGoals = readGoalValues(goals);
    const goalSet = new Set(normalizedGoals);

    if (goalSet.has("live_time")) {
        return "live_time_priority_chat";
    }

    if (goalSet.has("fan_pass") || goalSet.has("custom_requests")) {
        return "fan_pass_custom_requests";
    }

    if (goalSet.has("paid_drops") && goalSet.has("private_chat")) {
        return "timed_drops_private_chat";
    }

    if (goalSet.has("paid_drops")) {
        return "drops_only";
    }

    return "start_simple_decide_later";
}

export function sanitizeCreatorIntakeFields(value: unknown): CreatorIntakeFields {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const creatorMonetizationGoals = readGoalValues(source.creatorMonetizationGoals);
    const creatorFollowerRange = readAllowedString(source.creatorFollowerRange, FOLLOWER_RANGE_VALUES);
    const creatorPostingFrequency = readAllowedString(source.creatorPostingFrequency, POSTING_FREQUENCY_VALUES);
    const fansAlreadyAskForAccess = readAllowedString(source.fansAlreadyAskForAccess, FANS_ASK_VALUES);
    const creatorRecommendedSetup = readAllowedString(source.creatorRecommendedSetup, RECOMMENDED_SETUP_VALUES)
        ?? (creatorMonetizationGoals.length > 0 ? recommendCreatorSetupFromGoals(creatorMonetizationGoals) : undefined);
    const intakeSubmittedAt = readPositiveTimestamp(source.intakeSubmittedAt);

    return {
        creatorMonetizationGoals: creatorMonetizationGoals.length > 0 ? creatorMonetizationGoals : undefined,
        creatorFollowerRange,
        creatorPostingFrequency,
        fansAlreadyAskForAccess,
        creatorRecommendedSetup,
        intakeVersion: readString(source.intakeVersion) || CREATOR_INTAKE_VERSION,
        intakeSubmittedAt,
        intakeSource: CREATOR_INTAKE_SOURCE,
    };
}

export function buildCreatorIntakeTelemetryPayload(input: {
    actorType: "guest" | "user" | "creator" | "admin" | "owner_admin" | "system" | "unknown";
    actorUid?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
    signupIntent: "creator";
    stepKey: CreatorIntakeStepKey;
    selectedGoals?: unknown;
    source?: string;
    route?: string;
    creatorRecommendedSetup?: unknown;
}) {
    const selectedGoals = readGoalValues(input.selectedGoals).join("|");
    const creatorRecommendedSetup = readAllowedString(input.creatorRecommendedSetup, RECOMMENDED_SETUP_VALUES);
    const actorUid = readString(input.actorUid);
    const anonymousVisitorId = readString(input.anonymousVisitorId);
    const sessionId = readString(input.sessionId);
    const source = readString(input.source) || "creator_intake";
    const route = readString(input.route) || "/creator-intake";

    return {
        actorType: input.actorType,
        actorUid,
        anonymousVisitorId,
        sessionId,
        signupIntent: "creator",
        stepKey: input.stepKey,
        selectedGoals,
        source,
        route,
        creatorRecommendedSetup: creatorRecommendedSetup ?? "",
        actor_type: input.actorType,
        actor_uid: actorUid,
        anonymous_visitor_id: anonymousVisitorId,
        session_id: sessionId,
        signup_intent: "creator",
        step_key: input.stepKey,
        selected_goals: selectedGoals,
        creator_recommended_setup: creatorRecommendedSetup ?? "",
    };
}

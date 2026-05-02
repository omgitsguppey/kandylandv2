import type { CreatorApplication, UserProfile } from "@/types/db";
import {
    buildCreatorOnboardingProjectionState,
    type LegacyCreatorApplicationSnapshot,
} from "@/lib/creator-onboarding";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";

// Legacy compatibility boundary: users/{uid}.creatorApplication is a projection,
// not creator onboarding truth. New lifecycle writes must go through canonical
// creator_onboarding sync helpers before this projection is rebuilt.
export const CREATOR_APPLICATION_PATH = "/creators/apply";
export const CREATOR_WAITLIST_PATH = "/creators/waitlist";
export const DEFAULT_CREATOR_QUEUE_POSITION = 1;

export type CreatorNavigationState = "creator_waitlist";

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

function readQueuePosition(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

export function resolveCreatorQueuePosition(value: unknown) {
    return readQueuePosition(value) ?? DEFAULT_CREATOR_QUEUE_POSITION;
}

export function buildInitialCreatorApplication(input: {
    creatorDisplayName: string;
    creatorMonetizationGoals?: CreatorApplication["creatorMonetizationGoals"];
    creatorPrimaryPlatform?: string;
    creatorFollowerRange?: CreatorApplication["creatorFollowerRange"];
    creatorPostingFrequency?: CreatorApplication["creatorPostingFrequency"];
    creatorContentFocus?: string;
    fansAlreadyAskForAccess?: CreatorApplication["fansAlreadyAskForAccess"];
    creatorRecommendedSetup?: CreatorApplication["creatorRecommendedSetup"];
    queuePosition?: number;
    submittedAt?: number;
}): CreatorApplication {
    const submittedAt = typeof input.submittedAt === "number" && Number.isFinite(input.submittedAt)
        ? Math.trunc(input.submittedAt)
        : Date.now();

    return buildCreatorOnboardingProjectionState({
        queuePosition: resolveCreatorQueuePosition(input.queuePosition),
        creatorDisplayName: input.creatorDisplayName.trim(),
        creatorMonetizationGoals: input.creatorMonetizationGoals,
        creatorPrimaryPlatform: readString(input.creatorPrimaryPlatform) || undefined,
        creatorFollowerRange: input.creatorFollowerRange,
        creatorPostingFrequency: input.creatorPostingFrequency,
        creatorContentFocus: readString(input.creatorContentFocus) || undefined,
        fansAlreadyAskForAccess: input.fansAlreadyAskForAccess,
        creatorRecommendedSetup: input.creatorRecommendedSetup,
        intakeSubmittedAt: submittedAt,
        nowMs: submittedAt,
        source: {
            submissionStatus: "awaiting_manual_review",
            onboardingStartedAt: submittedAt,
            submittedAt,
            onboardingSubmittedAt: submittedAt,
            awaitingManualReviewAt: submittedAt,
            updatedAt: submittedAt,
            idVerificationStatus: "id_not_requested",
        } satisfies LegacyCreatorApplicationSnapshot & Record<string, unknown>,
    });
}

export function normalizeCreatorApplication(value: unknown): CreatorApplication | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const creatorDisplayName = readString(source.creatorDisplayName);
    if (!creatorDisplayName) {
        return undefined;
    }

    const nowMs = readOptionalTimestamp(source.updatedAt)
        ?? readOptionalTimestamp(source.awaitingManualReviewAt)
        ?? readOptionalTimestamp(source.onboardingSubmittedAt)
        ?? readOptionalTimestamp(source.submittedAt)
        ?? Date.now();

    return buildCreatorOnboardingProjectionState({
        queuePosition: resolveCreatorQueuePosition(source.queuePosition),
        creatorDisplayName,
        creatorMonetizationGoals: Array.isArray(source.creatorMonetizationGoals)
            ? source.creatorMonetizationGoals as CreatorApplication["creatorMonetizationGoals"]
            : undefined,
        creatorPrimaryPlatform: readString(source.creatorPrimaryPlatform) || undefined,
        creatorFollowerRange: source.creatorFollowerRange as CreatorApplication["creatorFollowerRange"],
        creatorPostingFrequency: source.creatorPostingFrequency as CreatorApplication["creatorPostingFrequency"],
        creatorContentFocus: readString(source.creatorContentFocus) || undefined,
        fansAlreadyAskForAccess: source.fansAlreadyAskForAccess as CreatorApplication["fansAlreadyAskForAccess"],
        creatorRecommendedSetup: source.creatorRecommendedSetup as CreatorApplication["creatorRecommendedSetup"],
        intakeVersion: readString(source.intakeVersion) || undefined,
        intakeSubmittedAt: typeof source.intakeSubmittedAt === "number" ? source.intakeSubmittedAt : undefined,
        intakeSource: source.intakeSource as CreatorApplication["intakeSource"],
        nowMs,
        source,
    });
}

export function sanitizeCreatorApplicationUpdate(
    value: unknown,
    options?: {
        nowMs?: number;
        reviewedBy?: string | null;
    },
): CreatorApplication | undefined {
    const normalized = normalizeCreatorApplication(value);
    if (!normalized) {
        return undefined;
    }

    const nowMs = typeof options?.nowMs === "number" && Number.isFinite(options.nowMs)
        ? Math.trunc(options.nowMs)
        : Date.now();

    return {
        ...normalized,
        updatedAt: nowMs,
        reviewedBy: readString(options?.reviewedBy) || normalized.reviewedBy,
    };
}

export function getCreatorNavigationState(
    value: CreatorApplication | null | undefined,
    role?: UserProfile["role"] | null,
): CreatorNavigationState | null {
    if (!value || value.bypassFanOnboarding !== true) {
        return null;
    }

    if (role === "creator" || role === "admin") {
        return null;
    }

    return "creator_waitlist";
}

export function shouldBypassFanOnboarding(profile: Pick<UserProfile, "role" | "creatorApplication"> | null | undefined) {
    if (!profile) {
        return false;
    }

    return profile.role === "creator"
        || profile.role === "admin"
        || profile.creatorApplication?.bypassFanOnboarding === true;
}

export function getPreferredAuthenticatedPathForProfile(
    profile: Pick<UserProfile, "role" | "creatorApplication"> | null | undefined,
    ownerId?: string | null,
) {
    if (getCreatorNavigationState(profile?.creatorApplication, profile?.role) === "creator_waitlist") {
        return CREATOR_WAITLIST_PATH;
    }

    return readPreferredAuthenticatedPath(profile?.role ?? "user", ownerId);
}

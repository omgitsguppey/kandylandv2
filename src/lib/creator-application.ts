import type { CreatorApplication, UserProfile } from "@/types/db";
import {
    buildCreatorOnboardingProjectionState,
    type LegacyCreatorApplicationSnapshot,
} from "@/lib/creator-onboarding";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";

export const CREATOR_APPLICATION_PATH = "/creators/apply";
export const CREATOR_WAITLIST_PATH = "/creators/waitlist";

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

export function generateCreatorQueuePosition() {
    const minimum = 1200;
    const maximum = 14850;
    const span = maximum - minimum + 1;

    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return minimum + (buffer[0] % span);
    }

    throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

export function buildInitialCreatorApplication(input: {
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    queuePosition?: number;
    submittedAt?: number;
}): CreatorApplication {
    const submittedAt = typeof input.submittedAt === "number" && Number.isFinite(input.submittedAt)
        ? Math.trunc(input.submittedAt)
        : Date.now();

    return buildCreatorOnboardingProjectionState({
        queuePosition: typeof input.queuePosition === "number" && Number.isFinite(input.queuePosition)
            ? Math.trunc(input.queuePosition)
            : generateCreatorQueuePosition(),
        creatorDisplayName: input.creatorDisplayName.trim(),
        creatorPrimaryPlatform: readString(input.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(input.creatorContentFocus) || undefined,
        nowMs: submittedAt,
        source: {
            onboardingStartedAt: submittedAt,
            submittedAt,
            onboardingSubmittedAt: submittedAt,
            awaitingManualReviewAt: submittedAt,
            updatedAt: submittedAt,
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
        queuePosition: readQueuePosition(source.queuePosition) ?? generateCreatorQueuePosition(),
        creatorDisplayName,
        creatorPrimaryPlatform: readString(source.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(source.creatorContentFocus) || undefined,
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

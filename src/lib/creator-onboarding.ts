/**
 * Creator onboarding state map
 *
 * Current submission entrypoint audit:
 * 1. `src/components/Auth/AuthModal.tsx`
 *    Creator applicants complete the three-step creator signup UI.
 * 2. `src/context/AuthContext.tsx`
 *    `signUpWithEmail()` posts creator signup data to `/api/user/register`.
 * 3. `src/app/api/user/register/route.ts`
 *    The current flow writes only `users/{uid}.creatorApplication`.
 * 4. `src/app/api/auth/navigation-session/route.ts`
 *    Creator applicants are routed into `/creators/waitlist` from the nested
 *    `users/{uid}.creatorApplication` snapshot.
 * 5. Current admin readers:
 *    - `src/app/api/admin/roster/route.ts`
 *    - `src/app/api/admin/users/route.ts`
 *    - `src/app/api/admin/user/[userId]/route.ts`
 *    These readers inspect `users/{uid}.creatorApplication`, but the roster
 *    intake lane still filters mainly by `role === "creator"`, so applicants
 *    who stay `role === "user"` can complete onboarding without surfacing in
 *    the creator review queue.
 *
 * Canonical target model for the hardening phases:
 * - `creator_onboarding/{uid}`:
 *   Source of truth for creator onboarding, legal, ID, segmentation, and
 *   approval state.
 * - `creator_onboarding/{uid}/history/{eventId}`:
 *   Append-only audit trail for creator onboarding lifecycle and admin actions.
 * - `creator_review_queue/{uid}`:
 *   Deterministic admin projection consumed by the existing `/admin/roster`
 *   surface for creator intake review.
 * - `users/{uid}.creatorApplication`:
 *   Creator-facing projection used for waitlist routing and status rendering.
 *
 * The goal is one canonical record with deterministic derived projections,
 * instead of ad hoc nested status blobs with no queue materializer.
 */

export const CREATOR_ONBOARDING_SUBMISSION_STATUSES = [
    "onboarding_started",
    "onboarding_submitted",
    "awaiting_manual_review",
] as const;

export const CREATOR_ONBOARDING_LEGAL_STATUSES = [
    "legal_pending",
    "legal_sent",
    "legal_signed",
] as const;

export const CREATOR_ONBOARDING_ID_STATUSES = [
    "id_not_requested",
    "id_requested",
    "id_submitted",
    "id_verified",
    "id_rejected",
] as const;

export const CREATOR_ONBOARDING_SEGMENT_STATUSES = [
    "segment_unassigned",
    "segment_assigned",
] as const;

export const CREATOR_ONBOARDING_APPROVAL_STATUSES = [
    "creator_pending",
    "creator_approved",
    "creator_rejected",
    "creator_needs_changes",
] as const;

export type CreatorOnboardingSubmissionStatus = (typeof CREATOR_ONBOARDING_SUBMISSION_STATUSES)[number];
export type CreatorOnboardingLegalStatus = (typeof CREATOR_ONBOARDING_LEGAL_STATUSES)[number];
export type CreatorOnboardingIdStatus = (typeof CREATOR_ONBOARDING_ID_STATUSES)[number];
export type CreatorOnboardingSegmentStatus = (typeof CREATOR_ONBOARDING_SEGMENT_STATUSES)[number];
export type CreatorOnboardingApprovalStatus = (typeof CREATOR_ONBOARDING_APPROVAL_STATUSES)[number];

const SUBMISSION_STATUS_SET = new Set<CreatorOnboardingSubmissionStatus>(CREATOR_ONBOARDING_SUBMISSION_STATUSES);
const LEGAL_STATUS_SET = new Set<CreatorOnboardingLegalStatus>(CREATOR_ONBOARDING_LEGAL_STATUSES);
const ID_STATUS_SET = new Set<CreatorOnboardingIdStatus>(CREATOR_ONBOARDING_ID_STATUSES);
const SEGMENT_STATUS_SET = new Set<CreatorOnboardingSegmentStatus>(CREATOR_ONBOARDING_SEGMENT_STATUSES);
const APPROVAL_STATUS_SET = new Set<CreatorOnboardingApprovalStatus>(CREATOR_ONBOARDING_APPROVAL_STATUSES);

export type LegacyCreatorApplicationSnapshot = {
    status?: unknown;
    legalDocumentStatus?: unknown;
    idVerificationStatus?: unknown;
    segmentationStatus?: unknown;
};

export function normalizeCreatorOnboardingSubmissionStatus(
    value: unknown,
): CreatorOnboardingSubmissionStatus {
    if (SUBMISSION_STATUS_SET.has(value as CreatorOnboardingSubmissionStatus)) {
        return value as CreatorOnboardingSubmissionStatus;
    }

    return "awaiting_manual_review";
}

export function normalizeCreatorOnboardingLegalStatus(
    value: unknown,
): CreatorOnboardingLegalStatus {
    if (LEGAL_STATUS_SET.has(value as CreatorOnboardingLegalStatus)) {
        return value as CreatorOnboardingLegalStatus;
    }

    if (value === "sent" || value === "opened") {
        return "legal_sent";
    }

    if (value === "signed") {
        return "legal_signed";
    }

    return "legal_pending";
}

export function normalizeCreatorOnboardingIdStatus(
    value: unknown,
): CreatorOnboardingIdStatus {
    if (ID_STATUS_SET.has(value as CreatorOnboardingIdStatus)) {
        return value as CreatorOnboardingIdStatus;
    }

    if (value === "requested") {
        return "id_requested";
    }

    if (value === "submitted") {
        return "id_submitted";
    }

    if (value === "verified") {
        return "id_verified";
    }

    if (value === "rejected") {
        return "id_rejected";
    }

    return "id_not_requested";
}

export function normalizeCreatorOnboardingSegmentStatus(
    value: unknown,
): CreatorOnboardingSegmentStatus {
    if (SEGMENT_STATUS_SET.has(value as CreatorOnboardingSegmentStatus)) {
        return value as CreatorOnboardingSegmentStatus;
    }

    if (value === "segmented") {
        return "segment_assigned";
    }

    return "segment_unassigned";
}

export function normalizeCreatorOnboardingApprovalStatus(
    value: unknown,
): CreatorOnboardingApprovalStatus {
    if (APPROVAL_STATUS_SET.has(value as CreatorOnboardingApprovalStatus)) {
        return value as CreatorOnboardingApprovalStatus;
    }

    if (value === "approved") {
        return "creator_approved";
    }

    if (value === "declined" || value === "rejected") {
        return "creator_rejected";
    }

    if (value === "needs_changes") {
        return "creator_needs_changes";
    }

    return "creator_pending";
}

export function deriveCanonicalCreatorOnboardingStatuses(
    legacy: LegacyCreatorApplicationSnapshot | null | undefined,
) {
    return {
        submissionStatus: normalizeCreatorOnboardingSubmissionStatus(legacy?.status),
        legalStatus: normalizeCreatorOnboardingLegalStatus(legacy?.legalDocumentStatus),
        idVerificationStatus: normalizeCreatorOnboardingIdStatus(legacy?.idVerificationStatus),
        segmentationStatus: normalizeCreatorOnboardingSegmentStatus(legacy?.segmentationStatus),
        approvalStatus: normalizeCreatorOnboardingApprovalStatus(legacy?.status),
    };
}

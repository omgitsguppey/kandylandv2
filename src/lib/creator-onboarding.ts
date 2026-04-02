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

export const CREATOR_ONBOARDING_BLOCKING_REASONS = [
    "awaiting_legal",
    "awaiting_id_request",
    "awaiting_id_submission",
    "awaiting_id_review",
    "awaiting_segment_assignment",
    "approval_needs_changes",
    "approval_rejected",
    "role_activation_blocked",
] as const;

export type CreatorOnboardingSubmissionStatus = (typeof CREATOR_ONBOARDING_SUBMISSION_STATUSES)[number];
export type CreatorOnboardingLegalStatus = (typeof CREATOR_ONBOARDING_LEGAL_STATUSES)[number];
export type CreatorOnboardingIdStatus = (typeof CREATOR_ONBOARDING_ID_STATUSES)[number];
export type CreatorOnboardingSegmentStatus = (typeof CREATOR_ONBOARDING_SEGMENT_STATUSES)[number];
export type CreatorOnboardingApprovalStatus = (typeof CREATOR_ONBOARDING_APPROVAL_STATUSES)[number];
export type CreatorOnboardingBlockingReason = (typeof CREATOR_ONBOARDING_BLOCKING_REASONS)[number];

const SUBMISSION_STATUS_SET = new Set<CreatorOnboardingSubmissionStatus>(CREATOR_ONBOARDING_SUBMISSION_STATUSES);
const LEGAL_STATUS_SET = new Set<CreatorOnboardingLegalStatus>(CREATOR_ONBOARDING_LEGAL_STATUSES);
const ID_STATUS_SET = new Set<CreatorOnboardingIdStatus>(CREATOR_ONBOARDING_ID_STATUSES);
const SEGMENT_STATUS_SET = new Set<CreatorOnboardingSegmentStatus>(CREATOR_ONBOARDING_SEGMENT_STATUSES);
const APPROVAL_STATUS_SET = new Set<CreatorOnboardingApprovalStatus>(CREATOR_ONBOARDING_APPROVAL_STATUSES);
const BLOCKING_REASON_SET = new Set<CreatorOnboardingBlockingReason>(CREATOR_ONBOARDING_BLOCKING_REASONS);
const HISTORY_EVENT_TYPE_SET = new Set<CreatorOnboardingHistoryEventType>([
    "onboarding_started",
    "onboarding_submitted",
    "awaiting_manual_review",
    "admin_queue_materialized",
    "legal_sent",
    "legal_signed",
    "id_requested",
    "id_submitted",
    "id_verified",
    "id_rejected",
    "segment_assigned",
    "creator_approved",
    "creator_rejected",
    "creator_needs_changes",
    "creator_role_activated",
    "creator_role_activation_blocked",
    "admin_notes_updated",
]);

export type LegacyCreatorApplicationSnapshot = {
    submissionStatus?: unknown;
    approvalStatus?: unknown;
    status?: unknown;
    legalStatus?: unknown;
    legalDocumentStatus?: unknown;
    idVerificationStatus?: unknown;
    segmentationStatus?: unknown;
    blockingReasons?: unknown;
};

export type CreatorOnboardingStateSource = LegacyCreatorApplicationSnapshot & Record<string, unknown>;

export type CreatorOnboardingIdDocument = {
    fileName: string;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: number;
    uploadedByUid: string;
    reviewNote?: string;
    reviewedAt?: number;
};

export type CreatorOnboardingProjectionState = {
    signupType: "creator";
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    queuePosition: number;
    onboardingStartedAt: number;
    submittedAt: number;
    onboardingSubmittedAt: number;
    awaitingManualReviewAt: number;
    updatedAt: number;
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    bypassFanOnboarding: boolean;
    legalStatus: CreatorOnboardingLegalStatus;
    legalDocumentUrl?: string;
    legalDocumentSentAt?: number;
    legalDocumentSignedAt?: number;
    idVerificationStatus: CreatorOnboardingIdStatus;
    idVerificationRequestedAt?: number;
    idVerificationSubmittedAt?: number;
    idVerificationReviewedAt?: number;
    idDocument?: CreatorOnboardingIdDocument;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    segmentLabel?: string;
    segmentAssignedAt?: number;
    reviewedBy?: string;
    adminNotes?: string;
    blockingReasons: CreatorOnboardingBlockingReason[];
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
};

export type CreatorOnboardingCanonicalRecord = CreatorOnboardingProjectionState & {
    userId: string;
    username?: string;
    email: string | null;
    photoURL: string | null;
    role: "user" | "creator" | "admin";
    createdAt: number;
    sourceVersion: number;
    lastAdminActionAt?: number;
    lastAdminActionBy?: string;
};

export type CreatorReviewQueueBucket =
    | "newest_submissions"
    | "waiting_on_legal"
    | "waiting_on_id"
    | "ready_for_approval"
    | "needs_changes"
    | "rejected"
    | "approved";

export type CreatorReviewQueueEntry = {
    userId: string;
    onboardingRefPath: string;
    queueBucket: CreatorReviewQueueBucket;
    queueSortAt: number;
    queuePosition: number;
    displayName: string;
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    email: string;
    username: string;
    photoURL: string | null;
    role: "user" | "creator" | "admin";
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
    blockingReasons: CreatorOnboardingBlockingReason[];
    submittedAt: number;
    updatedAt: number;
    legalDocumentUrl?: string;
    segmentLabel?: string;
    idDocumentFileName?: string;
    adminNotes?: string;
    reviewedBy?: string;
};

export type CreatorOnboardingHistoryEventType =
    | "onboarding_started"
    | "onboarding_submitted"
    | "awaiting_manual_review"
    | "admin_queue_materialized"
    | "legal_sent"
    | "legal_signed"
    | "id_requested"
    | "id_submitted"
    | "id_verified"
    | "id_rejected"
    | "segment_assigned"
    | "creator_approved"
    | "creator_rejected"
    | "creator_needs_changes"
    | "creator_role_activated"
    | "creator_role_activation_blocked"
    | "admin_notes_updated";

export type CreatorOnboardingHistoryEntry = {
    eventType: CreatorOnboardingHistoryEventType;
    actorId: string;
    actorRole: "creator" | "admin" | "system";
    actorLabel: string;
    timestamp: number;
    summary: string;
    detail?: string;
    metadata?: Record<string, unknown>;
};

export type CreatorOnboardingBlockingReasonDetail = {
    reason: CreatorOnboardingBlockingReason;
    label: string;
    description: string;
    severity: "info" | "warn" | "error";
};

export type CreatorOnboardingStatusSummary = {
    label: string;
    summary: string;
};

type CreatorOnboardingStatusSummaryInput = Pick<
    CreatorOnboardingProjectionState,
    | "submissionStatus"
    | "approvalStatus"
    | "idVerificationStatus"
    | "legalStatus"
    | "segmentationStatus"
> & {
    blockingReasons?: CreatorOnboardingBlockingReason[];
    readyForApproval?: boolean;
};

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

function normalizeBlockingReasons(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((entry): entry is CreatorOnboardingBlockingReason => BLOCKING_REASON_SET.has(entry as CreatorOnboardingBlockingReason));
}

function normalizeIdDocument(value: unknown): CreatorOnboardingIdDocument | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const fileName = readString(source.fileName);
    const storagePath = readString(source.storagePath);
    const contentType = readString(source.contentType);
    const sizeBytes = typeof source.sizeBytes === "number" && Number.isFinite(source.sizeBytes) && source.sizeBytes >= 0
        ? Math.trunc(source.sizeBytes)
        : 0;
    const uploadedAt = readOptionalTimestamp(source.uploadedAt);
    const uploadedByUid = readString(source.uploadedByUid);

    if (!fileName || !storagePath || !contentType || !uploadedAt || !uploadedByUid) {
        return undefined;
    }

    return {
        fileName,
        storagePath,
        contentType,
        sizeBytes,
        uploadedAt,
        uploadedByUid,
        reviewNote: readString(source.reviewNote) || undefined,
        reviewedAt: readOptionalTimestamp(source.reviewedAt),
    };
}

export function normalizeCreatorOnboardingHistoryEntry(
    value: unknown,
): CreatorOnboardingHistoryEntry | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const eventType = readString(source.eventType) as CreatorOnboardingHistoryEventType;
    const actorId = readString(source.actorId);
    const actorRole = source.actorRole === "creator" || source.actorRole === "admin" || source.actorRole === "system"
        ? source.actorRole
        : undefined;
    const actorLabel = readString(source.actorLabel);
    const timestamp = readOptionalTimestamp(source.timestamp);
    const summary = readString(source.summary);

    if (!HISTORY_EVENT_TYPE_SET.has(eventType) || !actorId || !actorRole || !actorLabel || !timestamp || !summary) {
        return undefined;
    }

    const metadata = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? source.metadata as Record<string, unknown>
        : undefined;

    return {
        eventType,
        actorId,
        actorRole,
        actorLabel,
        timestamp,
        summary,
        detail: readString(source.detail) || undefined,
        metadata,
    };
}

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
        submissionStatus: normalizeCreatorOnboardingSubmissionStatus(legacy?.submissionStatus ?? legacy?.status),
        legalStatus: normalizeCreatorOnboardingLegalStatus(legacy?.legalStatus ?? legacy?.legalDocumentStatus),
        idVerificationStatus: normalizeCreatorOnboardingIdStatus(legacy?.idVerificationStatus),
        segmentationStatus: normalizeCreatorOnboardingSegmentStatus(legacy?.segmentationStatus),
        approvalStatus: normalizeCreatorOnboardingApprovalStatus(legacy?.approvalStatus ?? legacy?.status),
    };
}

export function computeCreatorOnboardingBlockingReasons(input: {
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    role?: string | null;
}) {
    const blockingReasons: CreatorOnboardingBlockingReason[] = [];

    if (input.approvalStatus === "creator_rejected") {
        blockingReasons.push("approval_rejected");
    } else if (input.approvalStatus === "creator_needs_changes") {
        blockingReasons.push("approval_needs_changes");
    }

    if (input.legalStatus !== "legal_signed") {
        blockingReasons.push("awaiting_legal");
    }

    if (input.idVerificationStatus === "id_not_requested") {
        blockingReasons.push("awaiting_id_request");
    } else if (input.idVerificationStatus === "id_requested" || input.idVerificationStatus === "id_rejected") {
        blockingReasons.push("awaiting_id_submission");
    } else if (input.idVerificationStatus === "id_submitted") {
        blockingReasons.push("awaiting_id_review");
    }

    if (input.segmentationStatus !== "segment_assigned") {
        blockingReasons.push("awaiting_segment_assignment");
    }

    if (input.approvalStatus === "creator_approved" && input.role !== "creator" && input.role !== "admin") {
        blockingReasons.push("role_activation_blocked");
    } else if (input.approvalStatus !== "creator_approved" && input.role === "creator") {
        blockingReasons.push("role_activation_blocked");
    }

    return Array.from(new Set(blockingReasons));
}

export function hasCreatorApprovalPrerequisites(input: {
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
}) {
    return input.legalStatus === "legal_signed"
        && input.idVerificationStatus === "id_verified"
        && input.segmentationStatus === "segment_assigned";
}

export function isCreatorReadyForApproval(input: {
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
}) {
    return hasCreatorApprovalPrerequisites(input)
        && input.approvalStatus === "creator_pending";
}

export function describeCreatorOnboardingBlockingReason(
    reason: CreatorOnboardingBlockingReason,
): CreatorOnboardingBlockingReasonDetail {
    switch (reason) {
        case "approval_rejected":
            return {
                reason,
                label: "Application rejected",
                description: "This creator application was rejected and will stay out of the creator tools lane until admin reopens it.",
                severity: "error",
            };
        case "approval_needs_changes":
            return {
                reason,
                label: "Changes requested",
                description: "Admin requested updates before this application can be approved.",
                severity: "warn",
            };
        case "awaiting_legal":
            return {
                reason,
                label: "Legal still pending",
                description: "Creator approval is blocked until legal documents have been sent and signed.",
                severity: "warn",
            };
        case "awaiting_id_request":
            return {
                reason,
                label: "Waiting on ID request",
                description: "Admin has not requested identity verification for this creator yet.",
                severity: "info",
            };
        case "awaiting_id_submission":
            return {
                reason,
                label: "Waiting on ID upload",
                description: "An ID upload is required before admin can verify this creator.",
                severity: "warn",
            };
        case "awaiting_id_review":
            return {
                reason,
                label: "Waiting on ID review",
                description: "An ID was submitted and is waiting for admin review.",
                severity: "info",
            };
        case "awaiting_segment_assignment":
            return {
                reason,
                label: "Segment still unassigned",
                description: "Admin still needs to assign a manual creator segment before approval is fully ready.",
                severity: "warn",
            };
        case "role_activation_blocked":
            return {
                reason,
                label: "Role activation blocked",
                description: "The creator role is out of sync with onboarding approval requirements and needs admin attention.",
                severity: "error",
            };
        default:
            return {
                reason,
                label: "Blocked",
                description: "This creator application still has unresolved approval blockers.",
                severity: "warn",
            };
    }
}

function formatStatusLabel(value: string | undefined) {
    return value ? value.replaceAll("_", " ") : "waiting";
}

export function getCreatorOnboardingStatusSummary(
    value: CreatorOnboardingStatusSummaryInput | null | undefined,
): CreatorOnboardingStatusSummary {
    if (!value) {
        return {
            label: "waiting",
            summary: "Your creator application is still being prepared.",
        };
    }

    if (value.approvalStatus === "creator_needs_changes") {
        return {
            label: formatStatusLabel(value.approvalStatus),
            summary: "Admin requested changes before this creator application can move forward.",
        };
    }

    if (value.approvalStatus === "creator_rejected") {
        return {
            label: formatStatusLabel(value.approvalStatus),
            summary: "This creator application was rejected and will stay out of creator tools until admin reopens it.",
        };
    }

    if (value.approvalStatus === "creator_approved") {
            const roleBlocked = (value.blockingReasons ?? []).includes("role_activation_blocked");
        return {
            label: formatStatusLabel(value.approvalStatus),
            summary: roleBlocked
                ? "Approval is recorded, but the creator role cannot activate until the remaining review requirements are resolved."
                : "Approval is recorded and your creator access is being finalized.",
        };
    }

    if (value.readyForApproval) {
        return {
            label: "ready for approval",
            summary: "Legal, ID, and segment requirements are complete. Your application is waiting for final admin approval.",
        };
    }

    if (value.idVerificationStatus === "id_requested" || value.idVerificationStatus === "id_rejected") {
        return {
            label: formatStatusLabel(value.idVerificationStatus),
            summary: "Your next step is to upload your ID from this page so admin can continue the review.",
        };
    }

    if (value.idVerificationStatus === "id_submitted") {
        return {
            label: formatStatusLabel(value.idVerificationStatus),
            summary: "Your ID is uploaded and waiting for manual review.",
        };
    }

    if (value.legalStatus !== "legal_signed") {
        return {
            label: formatStatusLabel(value.legalStatus),
            summary: "Legal documents still need to be sent and signed before creator approval can finish.",
        };
    }

    if (value.segmentationStatus !== "segment_assigned") {
        return {
            label: formatStatusLabel(value.segmentationStatus),
            summary: "Admin still needs to assign your creator segment before final approval.",
        };
    }

    return {
        label: formatStatusLabel(value.submissionStatus),
        summary: "Your creator application is waiting in the manual review queue.",
    };
}

export function deriveCreatorReviewQueueBucket(input: {
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
}) {
    if (input.approvalStatus === "creator_approved") {
        return "approved" satisfies CreatorReviewQueueBucket;
    }

    if (input.approvalStatus === "creator_rejected") {
        return "rejected" satisfies CreatorReviewQueueBucket;
    }

    if (input.approvalStatus === "creator_needs_changes") {
        return "needs_changes" satisfies CreatorReviewQueueBucket;
    }

    if (isCreatorReadyForApproval(input)) {
        return "ready_for_approval" satisfies CreatorReviewQueueBucket;
    }

    if (input.idVerificationStatus !== "id_verified") {
        return "waiting_on_id" satisfies CreatorReviewQueueBucket;
    }

    if (input.legalStatus !== "legal_signed") {
        return "waiting_on_legal" satisfies CreatorReviewQueueBucket;
    }

    return "newest_submissions" satisfies CreatorReviewQueueBucket;
}

export function buildCreatorOnboardingProjectionState(input: {
    queuePosition: number;
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    nowMs: number;
    role?: string | null;
    source?: CreatorOnboardingStateSource | null;
}) {
    const source = input.source ?? null;
    const canonicalStatuses = deriveCanonicalCreatorOnboardingStatuses(source);
    const onboardingStartedAt = readOptionalTimestamp((source as Record<string, unknown> | null)?.["onboardingStartedAt"]) ?? input.nowMs;
    const submittedAt = readOptionalTimestamp((source as Record<string, unknown> | null)?.["submittedAt"]) ?? input.nowMs;
    const onboardingSubmittedAt = readOptionalTimestamp((source as Record<string, unknown> | null)?.["onboardingSubmittedAt"]) ?? submittedAt;
    const awaitingManualReviewAt = readOptionalTimestamp((source as Record<string, unknown> | null)?.["awaitingManualReviewAt"]) ?? onboardingSubmittedAt;
    const updatedAt = readOptionalTimestamp((source as Record<string, unknown> | null)?.["updatedAt"]) ?? input.nowMs;
    const legalStatus = canonicalStatuses.legalStatus;
    const idVerificationStatus = canonicalStatuses.idVerificationStatus;
    const segmentationStatus = canonicalStatuses.segmentationStatus;
    const approvalStatus = canonicalStatuses.approvalStatus;
    const blockingReasons = normalizeBlockingReasons(source?.blockingReasons) || computeCreatorOnboardingBlockingReasons({
        legalStatus,
        idVerificationStatus,
        segmentationStatus,
        approvalStatus,
        role: input.role,
    });
    const readyForApproval = isCreatorReadyForApproval({
        legalStatus,
        idVerificationStatus,
        segmentationStatus,
        approvalStatus,
    });

    return {
        signupType: "creator",
        submissionStatus: canonicalStatuses.submissionStatus,
        approvalStatus,
        queuePosition: input.queuePosition,
        onboardingStartedAt,
        submittedAt,
        onboardingSubmittedAt,
        awaitingManualReviewAt,
        updatedAt,
        creatorDisplayName: input.creatorDisplayName,
        creatorPrimaryPlatform: readString(input.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(input.creatorContentFocus) || undefined,
        bypassFanOnboarding: (source as Record<string, unknown> | null)?.["bypassFanOnboarding"] !== false,
        legalStatus,
        legalDocumentUrl: readString((source as Record<string, unknown> | null)?.["legalDocumentUrl"]) || undefined,
        legalDocumentSentAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["legalDocumentSentAt"]),
        legalDocumentSignedAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["legalDocumentSignedAt"]),
        idVerificationStatus,
        idVerificationRequestedAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["idVerificationRequestedAt"]),
        idVerificationSubmittedAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["idVerificationSubmittedAt"]),
        idVerificationReviewedAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["idVerificationReviewedAt"]),
        idDocument: normalizeIdDocument((source as Record<string, unknown> | null)?.["idDocument"]),
        segmentationStatus,
        segmentLabel: readString((source as Record<string, unknown> | null)?.["segmentLabel"]) || undefined,
        segmentAssignedAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["segmentAssignedAt"])
            ?? readOptionalTimestamp((source as Record<string, unknown> | null)?.["segmentedAt"]),
        reviewedBy: readString((source as Record<string, unknown> | null)?.["reviewedBy"]) || undefined,
        adminNotes: readString((source as Record<string, unknown> | null)?.["adminNotes"]) || undefined,
        blockingReasons,
        readyForApproval,
        creatorReviewQueueVisible: (source as Record<string, unknown> | null)?.["creatorReviewQueueVisible"] !== false,
    } satisfies CreatorOnboardingProjectionState;
}

function readRole(value: unknown): CreatorOnboardingCanonicalRecord["role"] {
    return value === "creator" || value === "admin" || value === "user"
        ? value
        : "user";
}

function readEmail(value: unknown) {
    return typeof value === "string" ? value : null;
}

function readNullablePhotoUrl(value: unknown) {
    return typeof value === "string" ? value : null;
}

function shouldCreatorReviewQueueBeVisible(input: {
    approvalStatus: CreatorOnboardingApprovalStatus;
    role: CreatorOnboardingCanonicalRecord["role"];
    creatorReviewQueueVisible?: boolean;
}) {
    if (typeof input.creatorReviewQueueVisible === "boolean") {
        return input.creatorReviewQueueVisible;
    }

    return !(input.approvalStatus === "creator_approved" && input.role === "creator");
}

export function buildCreatorOnboardingUserProjection(
    canonical: CreatorOnboardingCanonicalRecord,
): CreatorOnboardingProjectionState {
    return {
        signupType: canonical.signupType,
        submissionStatus: canonical.submissionStatus,
        approvalStatus: canonical.approvalStatus,
        queuePosition: canonical.queuePosition,
        onboardingStartedAt: canonical.onboardingStartedAt,
        submittedAt: canonical.submittedAt,
        onboardingSubmittedAt: canonical.onboardingSubmittedAt,
        awaitingManualReviewAt: canonical.awaitingManualReviewAt,
        updatedAt: canonical.updatedAt,
        creatorDisplayName: canonical.creatorDisplayName,
        creatorPrimaryPlatform: canonical.creatorPrimaryPlatform,
        creatorContentFocus: canonical.creatorContentFocus,
        bypassFanOnboarding: canonical.bypassFanOnboarding,
        legalStatus: canonical.legalStatus,
        legalDocumentUrl: canonical.legalDocumentUrl,
        legalDocumentSentAt: canonical.legalDocumentSentAt,
        legalDocumentSignedAt: canonical.legalDocumentSignedAt,
        idVerificationStatus: canonical.idVerificationStatus,
        idVerificationRequestedAt: canonical.idVerificationRequestedAt,
        idVerificationSubmittedAt: canonical.idVerificationSubmittedAt,
        idVerificationReviewedAt: canonical.idVerificationReviewedAt,
        idDocument: canonical.idDocument,
        segmentationStatus: canonical.segmentationStatus,
        segmentLabel: canonical.segmentLabel,
        segmentAssignedAt: canonical.segmentAssignedAt,
        reviewedBy: canonical.reviewedBy,
        adminNotes: canonical.adminNotes,
        blockingReasons: canonical.blockingReasons,
        readyForApproval: canonical.readyForApproval,
        creatorReviewQueueVisible: canonical.creatorReviewQueueVisible,
    };
}

export function buildCreatorOnboardingCanonicalRecord(input: {
    userId: string;
    email: string | null;
    username?: string;
    displayName?: string;
    photoURL?: string | null;
    role?: string | null;
    createdAt?: number;
    sourceVersion?: number;
    queuePosition: number;
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    nowMs: number;
    source?: CreatorOnboardingStateSource | CreatorOnboardingCanonicalRecord | null;
}) {
    const role = readRole(input.role);
    const source = input.source ?? null;
    const projection = buildCreatorOnboardingProjectionState({
        queuePosition: input.queuePosition,
        creatorDisplayName: input.creatorDisplayName,
        creatorPrimaryPlatform: input.creatorPrimaryPlatform,
        creatorContentFocus: input.creatorContentFocus,
        nowMs: input.nowMs,
        role,
        source,
    });

    const creatorReviewQueueVisible = shouldCreatorReviewQueueBeVisible({
        approvalStatus: projection.approvalStatus,
        role,
        creatorReviewQueueVisible: typeof (source as Record<string, unknown> | null)?.["creatorReviewQueueVisible"] === "boolean"
            ? (source as Record<string, unknown>)["creatorReviewQueueVisible"] as boolean
            : undefined,
    });
    const blockingReasons = computeCreatorOnboardingBlockingReasons({
        legalStatus: projection.legalStatus,
        idVerificationStatus: projection.idVerificationStatus,
        segmentationStatus: projection.segmentationStatus,
        approvalStatus: projection.approvalStatus,
        role,
    });
    const readyForApproval = isCreatorReadyForApproval({
        legalStatus: projection.legalStatus,
        idVerificationStatus: projection.idVerificationStatus,
        segmentationStatus: projection.segmentationStatus,
        approvalStatus: projection.approvalStatus,
    });

    return {
        ...projection,
        blockingReasons,
        readyForApproval,
        creatorReviewQueueVisible,
        userId: input.userId,
        username: readString(input.username) || readString((source as Record<string, unknown> | null)?.["username"]) || undefined,
        email: input.email ?? readEmail((source as Record<string, unknown> | null)?.["email"]) ?? null,
        photoURL: input.photoURL ?? readNullablePhotoUrl((source as Record<string, unknown> | null)?.["photoURL"]),
        role,
        createdAt: input.createdAt && Number.isFinite(input.createdAt)
            ? Math.trunc(input.createdAt)
            : readOptionalTimestamp((source as Record<string, unknown> | null)?.["createdAt"]) ?? input.nowMs,
        sourceVersion: typeof input.sourceVersion === "number" && Number.isFinite(input.sourceVersion)
            ? Math.trunc(input.sourceVersion)
            : 1,
        lastAdminActionAt: readOptionalTimestamp((source as Record<string, unknown> | null)?.["lastAdminActionAt"]),
        lastAdminActionBy: readString((source as Record<string, unknown> | null)?.["lastAdminActionBy"]) || undefined,
    } satisfies CreatorOnboardingCanonicalRecord;
}

export function normalizeCreatorOnboardingCanonicalRecord(
    value: unknown,
): CreatorOnboardingCanonicalRecord | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const creatorDisplayName = readString(source.creatorDisplayName);
    const userId = readString(source.userId);
    if (!creatorDisplayName || !userId) {
        return undefined;
    }

    return buildCreatorOnboardingCanonicalRecord({
        userId,
        email: readEmail(source.email),
        username: readString(source.username) || undefined,
        displayName: readString(source.displayName) || undefined,
        photoURL: readNullablePhotoUrl(source.photoURL),
        role: readRole(source.role),
        createdAt: readOptionalTimestamp(source.createdAt),
        sourceVersion: typeof source.sourceVersion === "number" && Number.isFinite(source.sourceVersion)
            ? Math.trunc(source.sourceVersion)
            : 1,
        queuePosition: typeof source.queuePosition === "number" && Number.isFinite(source.queuePosition) && source.queuePosition > 0
            ? Math.trunc(source.queuePosition)
            : 1,
        creatorDisplayName,
        creatorPrimaryPlatform: readString(source.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(source.creatorContentFocus) || undefined,
        nowMs: readOptionalTimestamp(source.updatedAt)
            ?? readOptionalTimestamp(source.lastAdminActionAt)
            ?? readOptionalTimestamp(source.awaitingManualReviewAt)
            ?? Date.now(),
        source,
    });
}

export function buildCreatorReviewQueueEntry(input: {
    canonical: CreatorOnboardingCanonicalRecord;
    displayName?: string;
}) {
    const canonical = input.canonical;
    const queueBucket = deriveCreatorReviewQueueBucket({
        legalStatus: canonical.legalStatus,
        idVerificationStatus: canonical.idVerificationStatus,
        segmentationStatus: canonical.segmentationStatus,
        approvalStatus: canonical.approvalStatus,
    });

    return {
        userId: canonical.userId,
        onboardingRefPath: `creator_onboarding/${canonical.userId}`,
        queueBucket,
        queueSortAt: canonical.lastAdminActionAt ?? canonical.awaitingManualReviewAt ?? canonical.submittedAt,
        queuePosition: canonical.queuePosition,
        displayName: readString(input.displayName) || canonical.creatorDisplayName,
        creatorDisplayName: canonical.creatorDisplayName,
        creatorPrimaryPlatform: canonical.creatorPrimaryPlatform,
        creatorContentFocus: canonical.creatorContentFocus,
        email: canonical.email || "",
        username: canonical.username || "",
        photoURL: canonical.photoURL,
        role: canonical.role,
        submissionStatus: canonical.submissionStatus,
        approvalStatus: canonical.approvalStatus,
        legalStatus: canonical.legalStatus,
        idVerificationStatus: canonical.idVerificationStatus,
        segmentationStatus: canonical.segmentationStatus,
        readyForApproval: canonical.readyForApproval,
        creatorReviewQueueVisible: canonical.creatorReviewQueueVisible,
        blockingReasons: canonical.blockingReasons,
        submittedAt: canonical.submittedAt,
        updatedAt: canonical.updatedAt,
        legalDocumentUrl: canonical.legalDocumentUrl,
        segmentLabel: canonical.segmentLabel,
        idDocumentFileName: canonical.idDocument?.fileName,
        adminNotes: canonical.adminNotes,
        reviewedBy: canonical.reviewedBy,
    } satisfies CreatorReviewQueueEntry;
}

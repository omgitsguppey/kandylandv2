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

import {
    CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
    CREATOR_ONBOARDING_INTRO_VERSION,
    DEFAULT_CREATOR_TEMPLATE_ID,
    DEFAULT_CREATOR_TEMPLATE_LABEL,
} from "@/lib/creator-contract";

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
    "awaiting_intro_acknowledgement",
    "awaiting_legal",
    "awaiting_creator_contract_signature",
    "awaiting_admin_countersign",
    "awaiting_id_request",
    "awaiting_id_submission",
    "awaiting_id_review",
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
export type CreatorContractDocumentStatus = "contract_not_sent" | "contract_sent";
export type CreatorContractSignatureStatus = "signature_pending" | "signature_signed";

export type CreatorOnboardingAgreementBasis = "legacy_signed" | "2026_mgsa" | "custom_uploaded";
export const CREATOR_ONBOARDING_AGREEMENT_BASIS_OPTIONS = [
    "legacy_signed",
    "2026_mgsa",
    "custom_uploaded",
] as const;

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
    "intro_acknowledged",
    "legal_sent",
    "id_requested",
    "id_submitted",
    "id_verified",
    "id_rejected",
    "creator_contract_signed",
    "admin_contract_signed",
    "legal_signed",
    "creator_approved",
    "creator_rejected",
    "creator_needs_changes",
    "owner_override_applied",
    "owner_override_cleared",
    "creator_legally_cleared",
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

export const CREATOR_ID_DOCUMENT_SIDES = [
    "front",
    "back",
    "face_with_id",
    "video_with_id",
] as const;

export const KREATOR_EXPERIENCES_DEFINITION = "Kreator Experiences is KandyDrops' gated creator program. Approved creators can publish drops, connect directly with fans, and earn from monetized audience access inside the platform.";
export const CREATOR_REVIEW_TIMELINE_COPY = "Most applications are reviewed within 5 to 7 business days.";
export const CREATOR_LEGAL_WAITING_HEADLINE = "No documents have been sent yet.";
export const CREATOR_LEGAL_WAITING_HELPER = "Documents will appear here once your application reaches the legal review stage.";

export type CreatorOnboardingIdDocumentSide = (typeof CREATOR_ID_DOCUMENT_SIDES)[number];

export type CreatorOnboardingIdDocuments = Partial<Record<CreatorOnboardingIdDocumentSide, CreatorOnboardingIdDocument>>;

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
    introAcknowledgedAt?: number;
    introAcknowledgedVersion?: string;
    introAcknowledgedByUid?: string;
    introAcknowledgedByName?: string;
    legalStatus: CreatorOnboardingLegalStatus;
    contractVersion?: string;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    legalDocumentUrl?: string;
    legalDocumentSentAt?: number;
    creatorContractSignedAt?: number;
    creatorContractSignedByName?: string;
    creatorContractSignedIp?: string;
    creatorContractSignedUserAgent?: string;
    adminContractSignedAt?: number;
    adminContractSignedByName?: string;
    adminContractSignedIp?: string;
    adminContractSignedUserAgent?: string;
    legalDocumentSignedAt?: number;
    idVerificationStatus: CreatorOnboardingIdStatus;
    kycDueAt?: number;
    idVerificationRequestedAt?: number;
    idVerificationSubmittedAt?: number;
    idVerificationReviewedAt?: number;
    idDocument?: CreatorOnboardingIdDocument;
    idDocuments?: CreatorOnboardingIdDocuments;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    segmentLabel?: string;
    segmentAssignedAt?: number;
    creatorTemplateId?: string;
    creatorTemplateLabel?: string;
    agreementBasis?: CreatorOnboardingAgreementBasis;
    legallyClearedAt?: number;
    legallyClearedBy?: string;
    ownerOverrideActive?: boolean;
    ownerOverrideReason?: string;
    ownerOverrideAt?: number;
    ownerOverrideBy?: string;
    rejectedAt?: number;
    reapplyAvailableAt?: number;
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
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    introAcknowledgedAt?: number;
    agreementBasis?: CreatorOnboardingAgreementBasis;
    legallyClearedAt?: number;
    legallyClearedBy?: string;
    ownerOverrideActive?: boolean;
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
    blockingReasons: CreatorOnboardingBlockingReason[];
    submittedAt: number;
    updatedAt: number;
    legalDocumentUrl?: string;
    segmentLabel?: string;
    idDocumentFileName?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFrontContentType?: string;
    idDocumentBackContentType?: string;
    idDocumentFaceFileName?: string;
    idDocumentVideoFileName?: string;
    idDocumentFaceContentType?: string;
    idDocumentVideoContentType?: string;
    idDocumentCount: number;
    adminNotes?: string;
    reviewedBy?: string;
};

export type CreatorOnboardingHistoryEventType =
    | "onboarding_started"
    | "onboarding_submitted"
    | "awaiting_manual_review"
    | "admin_queue_materialized"
    | "intro_acknowledged"
    | "legal_sent"
    | "id_requested"
    | "id_submitted"
    | "id_verified"
    | "id_rejected"
    | "creator_contract_signed"
    | "admin_contract_signed"
    | "legal_signed"
    | "creator_approved"
    | "creator_rejected"
    | "creator_needs_changes"
    | "creator_segment_assigned"
    | "owner_override_applied"
    | "owner_override_cleared"
    | "creator_legally_cleared"
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

export type CreatorFacingStage =
    | "Application received"
    | "Under review"
    | "Waiting on legal"
    | "Waiting on ID verification"
    | "Approved"
    | "Needs attention";

export type CreatorOnboardingStatusSummary = {
    stage: CreatorFacingStage;
    label: string;
    summary: string;
    timeline: string;
};

type CreatorOnboardingStatusSummaryInput = {
    submissionStatus?: CreatorOnboardingSubmissionStatus;
    approvalStatus?: CreatorOnboardingApprovalStatus;
    idVerificationStatus?: CreatorOnboardingIdStatus;
    legalStatus?: CreatorOnboardingLegalStatus;
    introAcknowledgedAt?: number;
    contractDocumentStatus?: CreatorContractDocumentStatus;
    creatorSignatureStatus?: CreatorContractSignatureStatus;
    adminSignatureStatus?: CreatorContractSignatureStatus;
    segmentationStatus?: CreatorOnboardingSegmentStatus;
    idDocument?: CreatorOnboardingIdDocument;
    idDocuments?: CreatorOnboardingIdDocuments;
    reapplyAvailableAt?: number;
    blockingReasons?: CreatorOnboardingBlockingReason[];
    readyForApproval?: boolean;
};

export type CreatorApplicantEditableFields = Pick<
    CreatorOnboardingProjectionState,
    "creatorDisplayName" | "creatorPrimaryPlatform" | "creatorContentFocus"
>;

function normalizeContractDocumentStatus(value: unknown, legalStatus?: CreatorOnboardingLegalStatus) {
    if (value === "contract_sent") {
        return "contract_sent" satisfies CreatorContractDocumentStatus;
    }

    if (legalStatus === "legal_sent" || legalStatus === "legal_signed") {
        return "contract_sent" satisfies CreatorContractDocumentStatus;
    }

    return "contract_not_sent" satisfies CreatorContractDocumentStatus;
}

function normalizeContractSignatureStatus(
    value: unknown,
    legalStatus?: CreatorOnboardingLegalStatus,
) {
    if (value === "signature_signed") {
        return "signature_signed" satisfies CreatorContractSignatureStatus;
    }

    if (legalStatus === "legal_signed") {
        return "signature_signed" satisfies CreatorContractSignatureStatus;
    }

    return "signature_pending" satisfies CreatorContractSignatureStatus;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

export function sanitizeCreatorApplicantEditableFields(
    value: unknown,
): CreatorApplicantEditableFields | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const creatorDisplayName = readString(source.creatorDisplayName);
    const creatorPrimaryPlatform = readString(source.creatorPrimaryPlatform);
    const creatorContentFocus = readString(source.creatorContentFocus);

    if (creatorDisplayName.length < 2 || creatorDisplayName.length > 80) {
        return undefined;
    }

    if (creatorPrimaryPlatform.length < 2 || creatorPrimaryPlatform.length > 60) {
        return undefined;
    }

    if (creatorContentFocus.length < 8 || creatorContentFocus.length > 500) {
        return undefined;
    }

    return {
        creatorDisplayName,
        creatorPrimaryPlatform,
        creatorContentFocus,
    };
}

export function canEditCreatorApplicantIntake(input: {
    approvalStatus: CreatorOnboardingApprovalStatus;
    role?: string | null;
} | null | undefined) {
    if (!input) {
        return false;
    }

    return input.approvalStatus !== "creator_approved"
        && input.approvalStatus !== "creator_rejected"
        && input.role !== "creator"
        && input.role !== "admin";
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

function normalizeIdDocuments(value: unknown): CreatorOnboardingIdDocuments | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const normalized: CreatorOnboardingIdDocuments = {};

    CREATOR_ID_DOCUMENT_SIDES.forEach((side) => {
        const document = normalizeIdDocument(source[side]);
        if (document) {
            normalized[side] = document;
        }
    });

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function buildIdDocumentsFromSource(source: Record<string, unknown> | null) {
    const normalizedDocuments = normalizeIdDocuments(source?.["idDocuments"]);
    const legacyDocument = normalizeIdDocument(source?.["idDocument"]);
    const idDocuments = normalizedDocuments
        ? {
            ...normalizedDocuments,
            ...(normalizedDocuments.front ? {} : legacyDocument ? { front: legacyDocument } : {}),
        }
        : legacyDocument
            ? { front: legacyDocument } satisfies CreatorOnboardingIdDocuments
            : undefined;
    const idDocument = idDocuments?.front ?? idDocuments?.back ?? legacyDocument;

    return {
        idDocument,
        idDocuments,
    };
}

export function getCreatorOnboardingIdDocumentBySide(
    value: Pick<CreatorOnboardingProjectionState, "idDocument" | "idDocuments"> | null | undefined,
    side: CreatorOnboardingIdDocumentSide,
) {
    if (!value) {
        return undefined;
    }

    if (value.idDocuments && Object.keys(value.idDocuments).length > 0) {
        return value.idDocuments[side];
    }

    if (side === "front") {
        return value.idDocument;
    }

    return undefined;
}

export function getCreatorOnboardingIdDocumentSummary(
    value: Pick<CreatorOnboardingProjectionState, "idDocument" | "idDocuments"> | null | undefined,
) {
    const front = getCreatorOnboardingIdDocumentBySide(value, "front");
    const back = getCreatorOnboardingIdDocumentBySide(value, "back");
    const faceWithId = getCreatorOnboardingIdDocumentBySide(value, "face_with_id");
    const videoWithId = getCreatorOnboardingIdDocumentBySide(value, "video_with_id");
    const count = [front, back, faceWithId, videoWithId].filter(Boolean).length;

    return {
        front,
        back,
        faceWithId,
        videoWithId,
        count,
        requiredCount: CREATOR_ID_DOCUMENT_SIDES.length,
        complete: Boolean(front && back && faceWithId && videoWithId),
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
    introAcknowledgedAt?: number;
    legalStatus: CreatorOnboardingLegalStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    ownerOverrideActive?: boolean;
    legallyClearedAt?: number;
    role?: string | null;
}) {
    const blockingReasons: CreatorOnboardingBlockingReason[] = [];

    if (!input.introAcknowledgedAt && !input.legallyClearedAt && !input.ownerOverrideActive) {
        blockingReasons.push("awaiting_intro_acknowledgement");
    }

    if (input.approvalStatus === "creator_rejected") {
        blockingReasons.push("approval_rejected");
    } else if (input.approvalStatus === "creator_needs_changes") {
        blockingReasons.push("approval_needs_changes");
    }

    if (input.ownerOverrideActive !== true && !input.legallyClearedAt && input.contractDocumentStatus !== "contract_sent") {
        blockingReasons.push("awaiting_legal");
    }

    if (!input.legallyClearedAt && !input.ownerOverrideActive) {
        if (input.idVerificationStatus === "id_not_requested") {
            blockingReasons.push("awaiting_id_request");
        } else if (input.idVerificationStatus === "id_requested" || input.idVerificationStatus === "id_rejected") {
            blockingReasons.push("awaiting_id_submission");
        } else if (input.idVerificationStatus === "id_submitted") {
            blockingReasons.push("awaiting_id_review");
        }
    }

    if (input.ownerOverrideActive !== true && !input.legallyClearedAt && input.contractDocumentStatus === "contract_sent") {
        if (input.creatorSignatureStatus !== "signature_signed") {
            blockingReasons.push("awaiting_creator_contract_signature");
        } else if (input.adminSignatureStatus !== "signature_signed") {
            blockingReasons.push("awaiting_admin_countersign");
        }
    }

    if (input.approvalStatus === "creator_approved" && input.role !== "creator" && input.role !== "admin") {
        blockingReasons.push("role_activation_blocked");
    } else if (input.approvalStatus !== "creator_approved" && input.role === "creator") {
        blockingReasons.push("role_activation_blocked");
    }

    return Array.from(new Set(blockingReasons));
}

export function hasCreatorApprovalPrerequisites(input: {
    introAcknowledgedAt?: number;
    legalStatus: CreatorOnboardingLegalStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    ownerOverrideActive?: boolean;
    legallyClearedAt?: number;
}) {
    if (input.ownerOverrideActive || input.legallyClearedAt) {
        return true;
    }

    return Boolean(input.introAcknowledgedAt)
        && input.legalStatus === "legal_signed"
        && input.creatorSignatureStatus === "signature_signed"
        && input.adminSignatureStatus === "signature_signed"
        && input.idVerificationStatus === "id_verified";
}

export function isCreatorReadyForApproval(input: {
    introAcknowledgedAt?: number;
    legalStatus: CreatorOnboardingLegalStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    ownerOverrideActive?: boolean;
    legallyClearedAt?: number;
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
                label: "Contract not sent",
                description: "Creator approval is blocked until the current agreement is sent from the native creator contract flow.",
                severity: "warn",
            };
        case "awaiting_intro_acknowledgement":
            return {
                reason,
                label: "Intro acknowledgment still missing",
                description: "The creator has not yet acknowledged the required intro explaining how creator access and fan access work in KandyDrops.",
                severity: "info",
            };
        case "awaiting_creator_contract_signature":
            return {
                reason,
                label: "Waiting on creator signature",
                description: "The agreement has been sent, but the creator still needs to sign before countersign and approval can continue.",
                severity: "warn",
            };
        case "awaiting_admin_countersign":
            return {
                reason,
                label: "Waiting on admin countersign",
                description: "The creator signed the agreement, but admin countersign is still missing.",
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
                description: "The creator still needs to upload the front and back of a government-issued ID before review can continue.",
                severity: "warn",
            };
        case "awaiting_id_review":
            return {
                reason,
                label: "Waiting on ID review",
                description: "An ID was submitted and is waiting for admin review.",
                severity: "info",
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

export function describeCreatorFacingOnboardingBlockingReason(
    reason: CreatorOnboardingBlockingReason,
): CreatorOnboardingBlockingReasonDetail {
    switch (reason) {
        case "approval_rejected":
            return {
                reason,
                label: "Application needs support",
                description: "Your creator application cannot move forward until creator support reviews it with you.",
                severity: "error",
            };
        case "approval_needs_changes":
            return {
                reason,
                label: "Application needs updates",
                description: "The review team still needs updated information before manual approval can continue.",
                severity: "warn",
            };
        case "awaiting_legal":
            return {
                reason,
                label: "Waiting on legal review",
                description: CREATOR_LEGAL_WAITING_HELPER,
                severity: "warn",
            };
        case "awaiting_intro_acknowledgement":
            return {
                reason,
                label: "Review the creator intro",
                description: "Before compliance starts, acknowledge the short creator intro on this page so the audit trail can record that you reviewed how creator access works.",
                severity: "info",
            };
        case "awaiting_creator_contract_signature":
            return {
                reason,
                label: "Sign your agreement",
                description: "Your contract is ready. Review the summary, read the full agreement, and sign it from this page.",
                severity: "warn",
            };
        case "awaiting_admin_countersign":
            return {
                reason,
                label: "Waiting on countersign",
                description: "Your agreement is signed on your side. The review team still needs to countersign before approval can continue.",
                severity: "info",
            };
        case "awaiting_id_request":
            return {
                reason,
                label: "ID verification setup pending",
                description: "ID verification is required for every creator application. The secure upload step will appear here as soon as intake setup is ready.",
                severity: "info",
            };
        case "awaiting_id_submission":
            return {
                reason,
                label: "Upload your ID",
                description: "Upload the front and back of a government-issued photo ID from this page so review can continue.",
                severity: "warn",
            };
        case "awaiting_id_review":
            return {
                reason,
                label: "ID review in progress",
                description: "Your ID files are in and waiting for manual review.",
                severity: "info",
            };
        case "role_activation_blocked":
            return {
                reason,
                label: "Approval needs follow-up",
                description: "Approval is recorded, but creator access still needs support follow-up before every creator tool can unlock cleanly.",
                severity: "error",
            };
        default:
            return describeCreatorOnboardingBlockingReason(reason);
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
            stage: "Application received",
            label: "Application received",
            summary: "Your creator application was received. We will show each required step here as review moves forward.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    const approvalStatus = value.approvalStatus ?? "creator_pending";
    const idVerificationStatus = value.idVerificationStatus ?? "id_not_requested";
    const legalStatus = value.legalStatus ?? "legal_pending";
    const contractDocumentStatus = value.contractDocumentStatus ?? normalizeContractDocumentStatus(undefined, legalStatus);
    const creatorSignatureStatus = value.creatorSignatureStatus ?? normalizeContractSignatureStatus(undefined, legalStatus);
    const submissionStatus = value.submissionStatus ?? "awaiting_manual_review";
    const roleBlocked = (value.blockingReasons ?? []).includes("role_activation_blocked");

    if (approvalStatus === "creator_needs_changes") {
        return {
            stage: "Needs attention",
            label: "Needs attention",
            summary: "Your application needs follow-up before manual approval can continue. Review the blockers on this page and contact creator support if anything looks wrong.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (approvalStatus === "creator_rejected" || roleBlocked) {
        return {
            stage: "Needs attention",
            label: "Needs attention",
            summary: approvalStatus === "creator_rejected"
                ? value.reapplyAvailableAt && value.reapplyAvailableAt > Date.now()
                    ? "Your application was rejected. You can start a new creator application after the required reapply wait period ends."
                    : "Your application was rejected. You can start a fresh creator application when you are ready to reapply."
                : "Approval is recorded, but creator access cannot finish until the remaining intake requirements are resolved.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (approvalStatus === "creator_approved") {
        return {
            stage: "Approved",
            label: "Approved",
            summary: "Your creator access is approved. Open your creator tools from the dashboard to manage your profile, drops, fan messaging, bookings, and payout requests.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (!value.introAcknowledgedAt) {
        return {
            stage: "Application received",
            label: "Application received",
            summary: "Your creator application is in the intake lane. Review the short creator intro on this page before identity verification begins.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (
        idVerificationStatus === "id_not_requested"
        || idVerificationStatus === "id_requested"
        || idVerificationStatus === "id_rejected"
    ) {
        const idSummary = getCreatorOnboardingIdDocumentSummary(value);
        return {
            stage: "Waiting on ID verification",
            label: "Waiting on ID verification",
            summary: idVerificationStatus === "id_not_requested"
                ? "ID verification is required for every creator application. The secure upload step will appear here as soon as intake setup is ready."
                : idSummary.count === 1
                    ? "Part of your verification package is already in. Upload the remaining required files from this page so identity review can continue."
                    : idVerificationStatus === "id_rejected"
                        ? "Your last ID submission needs a replacement. Upload a fresh verification package from this page so review can continue."
                        : "Upload the required verification package from this page so identity review can continue.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (idVerificationStatus === "id_submitted") {
        return {
            stage: "Waiting on ID verification",
            label: "Waiting on ID verification",
            summary: "Your ID is uploaded and waiting for manual review.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (legalStatus !== "legal_signed") {
        return {
            stage: "Waiting on legal",
            label: "Waiting on legal",
            summary: contractDocumentStatus === "contract_sent"
                ? creatorSignatureStatus !== "signature_signed"
                    ? "Your contract is ready. Open it from this page, review the summary, and complete your signature step."
                    : "Your contract is signed on your side and is waiting for admin countersign."
                : `${CREATOR_LEGAL_WAITING_HEADLINE} ${CREATOR_LEGAL_WAITING_HELPER}`,
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (value.readyForApproval) {
        return {
            stage: "Under review",
            label: "Under review",
            summary: "Your intake steps are complete. The application is waiting for final manual approval.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    if (submissionStatus === "onboarding_started" || submissionStatus === "onboarding_submitted") {
        return {
            stage: "Application received",
            label: "Application received",
            summary: "Your application is in the intake lane and will move into manual review as the team processes your compliance steps.",
            timeline: CREATOR_REVIEW_TIMELINE_COPY,
        };
    }

    return {
        stage: "Under review",
        label: "Under review",
        summary: "Your application is in manual review. We will only surface the next real step when the team needs action from you.",
        timeline: CREATOR_REVIEW_TIMELINE_COPY,
    };
}

export function deriveCreatorReviewQueueBucket(input: {
    legalStatus: CreatorOnboardingLegalStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    introAcknowledgedAt?: number;
    ownerOverrideActive?: boolean;
    legallyClearedAt?: number;
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

    if (input.legallyClearedAt || input.ownerOverrideActive) {
        return "newest_submissions" satisfies CreatorReviewQueueBucket;
    }

    if (!input.introAcknowledgedAt) {
        return "newest_submissions" satisfies CreatorReviewQueueBucket;
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
    const sourceRecord = source as Record<string, unknown> | null;
    const canonicalStatuses = deriveCanonicalCreatorOnboardingStatuses(source);
    const { idDocument, idDocuments } = buildIdDocumentsFromSource(sourceRecord);
    const onboardingStartedAt = readOptionalTimestamp(sourceRecord?.["onboardingStartedAt"]) ?? input.nowMs;
    const submittedAt = readOptionalTimestamp(sourceRecord?.["submittedAt"]) ?? input.nowMs;
    const onboardingSubmittedAt = readOptionalTimestamp(sourceRecord?.["onboardingSubmittedAt"]) ?? submittedAt;
    const awaitingManualReviewAt = readOptionalTimestamp(sourceRecord?.["awaitingManualReviewAt"]) ?? onboardingSubmittedAt;
    const updatedAt = readOptionalTimestamp(sourceRecord?.["updatedAt"]) ?? input.nowMs;
    const contractDocumentStatus = normalizeContractDocumentStatus(
        sourceRecord?.["contractDocumentStatus"],
        canonicalStatuses.legalStatus,
    );
    const creatorSignatureStatus = normalizeContractSignatureStatus(
        sourceRecord?.["creatorSignatureStatus"],
        canonicalStatuses.legalStatus,
    );
    const adminSignatureStatus = normalizeContractSignatureStatus(
        sourceRecord?.["adminSignatureStatus"],
        canonicalStatuses.legalStatus,
    );
    const legalStatus = creatorSignatureStatus === "signature_signed" && adminSignatureStatus === "signature_signed"
        ? "legal_signed"
        : contractDocumentStatus === "contract_sent"
            ? "legal_sent"
            : canonicalStatuses.legalStatus;
    const idVerificationStatus = canonicalStatuses.idVerificationStatus;
    const segmentationStatus = canonicalStatuses.segmentationStatus;
    const approvalStatus = canonicalStatuses.approvalStatus;
    const introAcknowledgedAt = readOptionalTimestamp(sourceRecord?.["introAcknowledgedAt"]);
    const ownerOverrideActive = sourceRecord?.["ownerOverrideActive"] === true;
    const legallyClearedAt = readOptionalTimestamp(sourceRecord?.["legallyClearedAt"]);
    const agreementBasis = typeof sourceRecord?.["agreementBasis"] === "string" 
        ? sourceRecord["agreementBasis"] as CreatorOnboardingAgreementBasis 
        : undefined;

    const blockingReasons = computeCreatorOnboardingBlockingReasons({
        introAcknowledgedAt,
        legalStatus,
        contractDocumentStatus,
        creatorSignatureStatus,
        adminSignatureStatus,
        idVerificationStatus,
        segmentationStatus,
        approvalStatus,
        ownerOverrideActive,
        legallyClearedAt,
        role: input.role,
    });
    const readyForApproval = isCreatorReadyForApproval({
        introAcknowledgedAt,
        legalStatus,
        creatorSignatureStatus,
        adminSignatureStatus,
        idVerificationStatus,
        segmentationStatus,
        approvalStatus,
        ownerOverrideActive,
        legallyClearedAt,
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
        bypassFanOnboarding: sourceRecord?.["bypassFanOnboarding"] !== false,
        introAcknowledgedAt,
        introAcknowledgedVersion: readString(sourceRecord?.["introAcknowledgedVersion"]) || CREATOR_ONBOARDING_INTRO_VERSION,
        introAcknowledgedByUid: readString(sourceRecord?.["introAcknowledgedByUid"]) || undefined,
        introAcknowledgedByName: readString(sourceRecord?.["introAcknowledgedByName"]) || undefined,
        legalStatus,
        contractVersion: readString(sourceRecord?.["contractVersion"]) || CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
        contractDocumentStatus,
        creatorSignatureStatus,
        adminSignatureStatus,
        legalDocumentUrl: readString(sourceRecord?.["legalDocumentUrl"]) || undefined,
        legalDocumentSentAt: readOptionalTimestamp(sourceRecord?.["legalDocumentSentAt"]),
        creatorContractSignedAt: readOptionalTimestamp(sourceRecord?.["creatorContractSignedAt"]),
        creatorContractSignedByName: readString(sourceRecord?.["creatorContractSignedByName"]) || undefined,
        creatorContractSignedIp: readString(sourceRecord?.["creatorContractSignedIp"]) || undefined,
        creatorContractSignedUserAgent: readString(sourceRecord?.["creatorContractSignedUserAgent"]) || undefined,
        adminContractSignedAt: readOptionalTimestamp(sourceRecord?.["adminContractSignedAt"]),
        adminContractSignedByName: readString(sourceRecord?.["adminContractSignedByName"]) || undefined,
        adminContractSignedIp: readString(sourceRecord?.["adminContractSignedIp"]) || undefined,
        adminContractSignedUserAgent: readString(sourceRecord?.["adminContractSignedUserAgent"]) || undefined,
        legalDocumentSignedAt: readOptionalTimestamp(sourceRecord?.["legalDocumentSignedAt"]),
        idVerificationStatus,
        kycDueAt: readOptionalTimestamp(sourceRecord?.["kycDueAt"]),
        idVerificationRequestedAt: readOptionalTimestamp(sourceRecord?.["idVerificationRequestedAt"]),
        idVerificationSubmittedAt: readOptionalTimestamp(sourceRecord?.["idVerificationSubmittedAt"]),
        idVerificationReviewedAt: readOptionalTimestamp(sourceRecord?.["idVerificationReviewedAt"]),
        idDocument,
        idDocuments,
        segmentationStatus,
        segmentLabel: readString(sourceRecord?.["segmentLabel"]) || undefined,
        segmentAssignedAt: readOptionalTimestamp(sourceRecord?.["segmentAssignedAt"])
            ?? readOptionalTimestamp(sourceRecord?.["segmentedAt"]),
        creatorTemplateId: readString(sourceRecord?.["creatorTemplateId"]) || DEFAULT_CREATOR_TEMPLATE_ID,
        creatorTemplateLabel: readString(sourceRecord?.["creatorTemplateLabel"]) || DEFAULT_CREATOR_TEMPLATE_LABEL,
        agreementBasis,
        legallyClearedAt,
        legallyClearedBy: readString(sourceRecord?.["legallyClearedBy"]) || undefined,
        ownerOverrideActive,
        ownerOverrideReason: readString(sourceRecord?.["ownerOverrideReason"]) || undefined,
        ownerOverrideAt: readOptionalTimestamp(sourceRecord?.["ownerOverrideAt"]),
        ownerOverrideBy: readString(sourceRecord?.["ownerOverrideBy"]) || undefined,
        rejectedAt: readOptionalTimestamp(sourceRecord?.["rejectedAt"]),
        reapplyAvailableAt: readOptionalTimestamp(sourceRecord?.["reapplyAvailableAt"]),
        reviewedBy: readString(sourceRecord?.["reviewedBy"]) || undefined,
        adminNotes: readString(sourceRecord?.["adminNotes"]) || undefined,
        blockingReasons,
        readyForApproval,
        creatorReviewQueueVisible: sourceRecord?.["creatorReviewQueueVisible"] !== false,
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
        introAcknowledgedAt: canonical.introAcknowledgedAt,
        introAcknowledgedVersion: canonical.introAcknowledgedVersion,
        introAcknowledgedByUid: canonical.introAcknowledgedByUid,
        introAcknowledgedByName: canonical.introAcknowledgedByName,
        legalStatus: canonical.legalStatus,
        contractVersion: canonical.contractVersion,
        contractDocumentStatus: canonical.contractDocumentStatus,
        creatorSignatureStatus: canonical.creatorSignatureStatus,
        adminSignatureStatus: canonical.adminSignatureStatus,
        legalDocumentUrl: canonical.legalDocumentUrl,
        legalDocumentSentAt: canonical.legalDocumentSentAt,
        creatorContractSignedAt: canonical.creatorContractSignedAt,
        creatorContractSignedByName: canonical.creatorContractSignedByName,
        creatorContractSignedIp: canonical.creatorContractSignedIp,
        creatorContractSignedUserAgent: canonical.creatorContractSignedUserAgent,
        adminContractSignedAt: canonical.adminContractSignedAt,
        adminContractSignedByName: canonical.adminContractSignedByName,
        adminContractSignedIp: canonical.adminContractSignedIp,
        adminContractSignedUserAgent: canonical.adminContractSignedUserAgent,
        legalDocumentSignedAt: canonical.legalDocumentSignedAt,
        idVerificationStatus: canonical.idVerificationStatus,
        kycDueAt: canonical.kycDueAt,
        idVerificationRequestedAt: canonical.idVerificationRequestedAt,
        idVerificationSubmittedAt: canonical.idVerificationSubmittedAt,
        idVerificationReviewedAt: canonical.idVerificationReviewedAt,
        idDocument: canonical.idDocument,
        idDocuments: canonical.idDocuments,
        segmentationStatus: canonical.segmentationStatus,
        segmentLabel: canonical.segmentLabel,
        segmentAssignedAt: canonical.segmentAssignedAt,
        creatorTemplateId: canonical.creatorTemplateId,
        creatorTemplateLabel: canonical.creatorTemplateLabel,
        agreementBasis: canonical.agreementBasis,
        legallyClearedAt: canonical.legallyClearedAt,
        legallyClearedBy: canonical.legallyClearedBy,
        ownerOverrideActive: canonical.ownerOverrideActive,
        ownerOverrideReason: canonical.ownerOverrideReason,
        ownerOverrideAt: canonical.ownerOverrideAt,
        ownerOverrideBy: canonical.ownerOverrideBy,
        rejectedAt: canonical.rejectedAt,
        reapplyAvailableAt: canonical.reapplyAvailableAt,
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
        introAcknowledgedAt: projection.introAcknowledgedAt,
        legalStatus: projection.legalStatus,
        contractDocumentStatus: projection.contractDocumentStatus,
        creatorSignatureStatus: projection.creatorSignatureStatus,
        adminSignatureStatus: projection.adminSignatureStatus,
        idVerificationStatus: projection.idVerificationStatus,
        segmentationStatus: projection.segmentationStatus,
        approvalStatus: projection.approvalStatus,
        ownerOverrideActive: projection.ownerOverrideActive,
        legallyClearedAt: projection.legallyClearedAt,
        role,
    });
    const readyForApproval = isCreatorReadyForApproval({
        introAcknowledgedAt: projection.introAcknowledgedAt,
        legalStatus: projection.legalStatus,
        creatorSignatureStatus: projection.creatorSignatureStatus,
        adminSignatureStatus: projection.adminSignatureStatus,
        idVerificationStatus: projection.idVerificationStatus,
        segmentationStatus: projection.segmentationStatus,
        approvalStatus: projection.approvalStatus,
        ownerOverrideActive: projection.ownerOverrideActive,
        legallyClearedAt: projection.legallyClearedAt,
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
    const idDocumentSummary = getCreatorOnboardingIdDocumentSummary(canonical);
    const queueBucket = deriveCreatorReviewQueueBucket({
        legalStatus: canonical.legalStatus,
        creatorSignatureStatus: canonical.creatorSignatureStatus,
        adminSignatureStatus: canonical.adminSignatureStatus,
        idVerificationStatus: canonical.idVerificationStatus,
        segmentationStatus: canonical.segmentationStatus,
        approvalStatus: canonical.approvalStatus,
        introAcknowledgedAt: canonical.introAcknowledgedAt,
        ownerOverrideActive: canonical.ownerOverrideActive,
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
        contractDocumentStatus: canonical.contractDocumentStatus,
        creatorSignatureStatus: canonical.creatorSignatureStatus,
        adminSignatureStatus: canonical.adminSignatureStatus,
        introAcknowledgedAt: canonical.introAcknowledgedAt,
        ownerOverrideActive: canonical.ownerOverrideActive,
        readyForApproval: canonical.readyForApproval,
        creatorReviewQueueVisible: canonical.creatorReviewQueueVisible,
        blockingReasons: canonical.blockingReasons,
        submittedAt: canonical.submittedAt,
        updatedAt: canonical.updatedAt,
        legalDocumentUrl: canonical.legalDocumentUrl,
        segmentLabel: canonical.segmentLabel,
        idDocumentFileName: canonical.idDocument?.fileName,
        idDocumentFrontFileName: idDocumentSummary.front?.fileName,
        idDocumentBackFileName: idDocumentSummary.back?.fileName,
        idDocumentFaceFileName: idDocumentSummary.faceWithId?.fileName,
        idDocumentVideoFileName: idDocumentSummary.videoWithId?.fileName,
        idDocumentFrontContentType: idDocumentSummary.front?.contentType,
        idDocumentBackContentType: idDocumentSummary.back?.contentType,
        idDocumentFaceContentType: idDocumentSummary.faceWithId?.contentType,
        idDocumentVideoContentType: idDocumentSummary.videoWithId?.contentType,
        idDocumentCount: idDocumentSummary.count,
        adminNotes: canonical.adminNotes,
        reviewedBy: canonical.reviewedBy,
    } satisfies CreatorReviewQueueEntry;
}

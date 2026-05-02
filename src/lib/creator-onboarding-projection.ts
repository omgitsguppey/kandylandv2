import {
    buildCreatorOnboardingCanonicalRecord,
    buildCreatorReviewQueueEntry,
    type CreatorContractDocumentStatus,
    type CreatorContractSignatureStatus,
    type CreatorOnboardingApprovalStatus,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingIdStatus,
    type CreatorOnboardingLegalStatus,
    type CreatorOnboardingSegmentStatus,
    type CreatorOnboardingSubmissionStatus,
    type CreatorReviewQueueEntry,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";

export type CreatorRosterDecisionBucket = "needs_review" | "waiting" | "approved";

export type CreatorOnboardingDecisionRecord = {
    uid?: string;
    userId?: string;
    role: "user" | "creator" | "admin";
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus?: CreatorOnboardingSegmentStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    readyForApproval: boolean;
    ownerOverrideActive?: boolean;
    introAcknowledgedAt?: number;
};

export type CreatorOnboardingVisibleStatusLabels = {
    contractDocumentStatus: string;
    creatorSignatureStatus: string;
    adminSignatureStatus: string;
    legalStatus: string;
    idVerificationStatus: string;
    segmentationStatus: string;
    approvalStatus: string;
    intakeStatus: string;
    agreementStatus: string;
};

export type CreatorOnboardingProjectionDebug = {
    normalizedFromLegacy: boolean;
    canonicalSourceUsed: boolean;
    projectionSourceUsed: boolean;
    rawStatusValues: Record<string, string>;
    visibleStatusLabels: CreatorOnboardingVisibleStatusLabels;
};

export type CreatorOnboardingVisibleStatus = {
    rosterBucket: CreatorRosterDecisionBucket;
    primaryAction: string;
    visibleStatusLabels: CreatorOnboardingVisibleStatusLabels;
    debug: CreatorOnboardingProjectionDebug;
};

export type NormalizedCreatorOnboardingProjection = CreatorOnboardingCanonicalRecord & {
    rosterBucket: CreatorRosterDecisionBucket;
    primaryAction: string;
    visibleStatusLabels: CreatorOnboardingVisibleStatusLabels;
    normalizedProjectionDebug: CreatorOnboardingProjectionDebug;
};

export type NormalizedCreatorReviewQueueEntry = CreatorReviewQueueEntry & {
    rosterBucket: CreatorRosterDecisionBucket;
    primaryAction: string;
    visibleStatusLabels: CreatorOnboardingVisibleStatusLabels;
    normalizedProjectionDebug: CreatorOnboardingProjectionDebug;
};

export const CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS = {
    contractDocumentStatus: {
        contract_not_sent: "Agreement not sent",
        contract_sent: "Agreement sent",
    },
    creatorSignatureStatus: {
        signature_pending: "Waiting for signature",
        signature_signed: "Signed",
    },
    adminSignatureStatus: {
        signature_pending: "Not countersigned",
        signature_signed: "Countersigned",
    },
    legalStatus: {
        legal_pending: "Legal not started",
        legal_sent: "Waiting on signatures",
        legal_signed: "Agreement complete",
    },
    idVerificationStatus: {
        id_not_requested: "ID not requested",
        id_requested: "Waiting for ID upload",
        id_submitted: "ID ready for review",
        id_verified: "ID verified",
        id_rejected: "ID needs resubmission",
    },
    segmentationStatus: {
        segment_unassigned: "Not assigned",
        segment_assigned: "Assigned",
    },
    approvalStatus: {
        creator_pending: "Pending review",
        creator_approved: "Approved",
        creator_rejected: "Rejected",
        creator_needs_changes: "Needs changes",
    },
} as const satisfies {
    contractDocumentStatus: Record<CreatorContractDocumentStatus, string>;
    creatorSignatureStatus: Record<CreatorContractSignatureStatus, string>;
    adminSignatureStatus: Record<CreatorContractSignatureStatus, string>;
    legalStatus: Record<CreatorOnboardingLegalStatus, string>;
    idVerificationStatus: Record<CreatorOnboardingIdStatus, string>;
    segmentationStatus: Record<CreatorOnboardingSegmentStatus, string>;
    approvalStatus: Record<CreatorOnboardingApprovalStatus, string>;
};

type NormalizeSource = "canonical" | "projection" | "legacy" | "unknown";

type NormalizeContext = {
    source?: NormalizeSource;
    userId?: string | null;
    uid?: string | null;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    role?: string | null;
    createdAt?: number | null;
    queuePosition?: number | null;
    nowMs?: number;
};

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readTimestamp(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return Math.trunc(value);
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        const millis = (value as { toMillis: () => number }).toMillis();
        return Number.isFinite(millis) && millis > 0 ? Math.trunc(millis) : undefined;
    }

    return undefined;
}

function readRole(value: unknown): "user" | "creator" | "admin" {
    return value === "creator" || value === "admin" ? value : "user";
}

function readQueuePosition(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : 1;
}

function buildRawStatusValues(source: Record<string, unknown>): Record<string, string> {
    return {
        submissionStatus: readString(source.submissionStatus),
        approvalStatus: readString(source.approvalStatus),
        legalStatus: readString(source.legalStatus),
        idVerificationStatus: readString(source.idVerificationStatus),
        segmentationStatus: readString(source.segmentationStatus),
        contractDocumentStatus: readString(source.contractDocumentStatus),
        creatorSignatureStatus: readString(source.creatorSignatureStatus),
        adminSignatureStatus: readString(source.adminSignatureStatus),
    };
}

function isLegacySource(source: Record<string, unknown>, context?: NormalizeContext) {
    return context?.source === "legacy"
        || readRecord(source.creatorApplication) !== null
        || (!readString(source.userId) && Boolean(readString(source.uid)))
        || Boolean(source.legalDocumentStatus)
        || Boolean(source.status && source.status !== "active" && source.status !== "suspended" && source.status !== "banned");
}

function buildProjectionDebug(
    source: Record<string, unknown>,
    context: NormalizeContext | undefined,
    labels: CreatorOnboardingVisibleStatusLabels,
): CreatorOnboardingProjectionDebug {
    const sourceHint = context?.source ?? "unknown";
    const normalizedFromLegacy = isLegacySource(source, context);
    const projectionSourceUsed = sourceHint === "projection" || Boolean(readString(source.queueBucket) || readString(source.onboardingRefPath));

    return {
        normalizedFromLegacy,
        canonicalSourceUsed: sourceHint === "canonical" || (!normalizedFromLegacy && !projectionSourceUsed && Boolean(readString(source.userId))),
        projectionSourceUsed,
        rawStatusValues: buildRawStatusValues(source),
        visibleStatusLabels: labels,
    };
}

function withProjectionDisplay<T extends CreatorOnboardingCanonicalRecord>(
    canonical: T,
    source: Record<string, unknown>,
    context?: NormalizeContext,
): T & NormalizedCreatorOnboardingProjection {
    const visible = deriveCreatorVisibleStatus(canonical, {
        source,
        context,
    });

    return {
        ...canonical,
        rosterBucket: visible.rosterBucket,
        primaryAction: visible.primaryAction,
        visibleStatusLabels: visible.visibleStatusLabels,
        normalizedProjectionDebug: visible.debug,
    };
}

export function deriveCreatorRosterBucket(record: CreatorOnboardingDecisionRecord): CreatorRosterDecisionBucket {
    if (record.role === "creator" || record.approvalStatus === "creator_approved") {
        return "approved";
    }

    if (
        !record.introAcknowledgedAt
        || record.approvalStatus === "creator_needs_changes"
        || (record.contractDocumentStatus === "contract_sent" && record.creatorSignatureStatus !== "signature_signed")
        || record.idVerificationStatus === "id_requested"
    ) {
        return "waiting";
    }

    return "needs_review";
}

export function deriveCreatorPrimaryAction(record: CreatorOnboardingDecisionRecord) {
    if (!record.introAcknowledgedAt) {
        return "Waiting for intro";
    }

    if (record.idVerificationStatus === "id_not_requested" || record.idVerificationStatus === "id_rejected") {
        return "Request ID upload";
    }

    if (record.contractDocumentStatus !== "contract_sent") {
        return "Send agreement";
    }

    if (record.creatorSignatureStatus === "signature_signed" && record.adminSignatureStatus !== "signature_signed") {
        return "Countersign agreement";
    }

    if (record.readyForApproval || record.ownerOverrideActive) {
        return "Approve creator";
    }

    return "Review application";
}

export function deriveCreatorVisibleStatus(
    record: CreatorOnboardingDecisionRecord,
    options?: {
        source?: Record<string, unknown>;
        context?: NormalizeContext;
    },
): CreatorOnboardingVisibleStatus {
    const visibleStatusLabels: CreatorOnboardingVisibleStatusLabels = {
        contractDocumentStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.contractDocumentStatus[record.contractDocumentStatus],
        creatorSignatureStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.creatorSignatureStatus[record.creatorSignatureStatus],
        adminSignatureStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.adminSignatureStatus[record.adminSignatureStatus],
        legalStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.legalStatus[record.legalStatus],
        idVerificationStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.idVerificationStatus[record.idVerificationStatus],
        segmentationStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.segmentationStatus[record.segmentationStatus ?? "segment_unassigned"],
        approvalStatus: CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.approvalStatus[record.approvalStatus],
        intakeStatus: !record.introAcknowledgedAt
            ? "Waiting for intro"
            : record.submissionStatus === "awaiting_manual_review"
                ? "Ready for review"
                : "Submitted",
        agreementStatus: record.legalStatus === "legal_signed"
            ? CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.legalStatus.legal_signed
            : record.contractDocumentStatus !== "contract_sent"
                ? CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.contractDocumentStatus.contract_not_sent
                : record.creatorSignatureStatus !== "signature_signed"
                    ? CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.creatorSignatureStatus.signature_pending
                    : CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.legalStatus.legal_sent,
    };

    const source = options?.source ?? {};

    return {
        rosterBucket: deriveCreatorRosterBucket(record),
        primaryAction: deriveCreatorPrimaryAction(record),
        visibleStatusLabels,
        debug: buildProjectionDebug(source, options?.context, visibleStatusLabels),
    };
}

export function normalizeCreatorOnboardingRecord(
    raw: unknown,
    context: NormalizeContext = {},
): NormalizedCreatorOnboardingProjection | null {
    const rawRecord = readRecord(raw);
    if (!rawRecord) {
        return null;
    }

    const nestedApplication = readRecord(rawRecord.creatorApplication);
    const source = nestedApplication ?? rawRecord;
    const userId = readString(source.userId)
        || readString(source.uid)
        || readString(rawRecord.userId)
        || readString(rawRecord.uid)
        || readString(context.userId)
        || readString(context.uid);
    const creatorDisplayName = readString(source.creatorDisplayName)
        || readString(rawRecord.creatorDisplayName)
        || readString(context.displayName)
        || readString(rawRecord.displayName);

    if (!userId || !creatorDisplayName) {
        return null;
    }

    const mergedSource: Record<string, unknown> = {
        ...source,
        userId,
        uid: readString(source.uid) || readString(rawRecord.uid) || userId,
        email: readString(source.email) || readString(rawRecord.email) || readString(context.email),
        username: readString(source.username) || readString(rawRecord.username) || readString(context.username),
        displayName: readString(source.displayName) || readString(rawRecord.displayName) || readString(context.displayName),
        photoURL: source.photoURL ?? rawRecord.photoURL ?? context.photoURL ?? null,
        role: readString(source.role) || readString(rawRecord.role) || readString(context.role),
        createdAt: source.createdAt ?? rawRecord.createdAt ?? context.createdAt,
        queuePosition: source.queuePosition ?? rawRecord.queuePosition ?? context.queuePosition,
        creatorDisplayName,
    };

    const canonical = normalizeCreatorOnboardingCanonicalRecord(mergedSource)
        ?? buildCreatorOnboardingCanonicalRecord({
            userId,
            email: readString(mergedSource.email) || null,
            username: readString(mergedSource.username) || undefined,
            displayName: readString(mergedSource.displayName) || creatorDisplayName,
            photoURL: typeof mergedSource.photoURL === "string" ? mergedSource.photoURL : null,
            role: readRole(mergedSource.role),
            createdAt: readTimestamp(mergedSource.createdAt),
            queuePosition: readQueuePosition(mergedSource.queuePosition),
            creatorDisplayName,
            creatorPrimaryPlatform: readString(mergedSource.creatorPrimaryPlatform) || undefined,
            creatorContentFocus: readString(mergedSource.creatorContentFocus) || undefined,
            nowMs: context.nowMs
                ?? readTimestamp(mergedSource.updatedAt)
                ?? readTimestamp(mergedSource.awaitingManualReviewAt)
                ?? readTimestamp(mergedSource.submittedAt)
                ?? Date.now(),
            source: mergedSource,
        });

    return withProjectionDisplay(canonical, mergedSource, {
        ...context,
        source: context.source ?? (nestedApplication ? "legacy" : "unknown"),
    });
}

export function normalizeCreatorReviewQueueEntry(
    raw: unknown,
    context: NormalizeContext = {},
): NormalizedCreatorReviewQueueEntry | null {
    const normalized = normalizeCreatorOnboardingRecord(raw, {
        ...context,
        source: context.source ?? "projection",
    });

    if (!normalized) {
        return null;
    }

    const queueEntry = buildCreatorReviewQueueEntry({
        canonical: normalized,
        displayName: readRecord(raw)?.displayName as string | undefined,
    });

    return {
        ...queueEntry,
        rosterBucket: normalized.rosterBucket,
        primaryAction: normalized.primaryAction,
        visibleStatusLabels: normalized.visibleStatusLabels,
        normalizedProjectionDebug: normalized.normalizedProjectionDebug,
    };
}

export function normalizeCreatorFacingApplication(
    raw: unknown,
    context: NormalizeContext = {},
): NormalizedCreatorOnboardingProjection | null {
    return normalizeCreatorOnboardingRecord(raw, {
        ...context,
        source: context.source ?? "legacy",
    });
}

export function normalizeCreatorAdminDetail(
    raw: unknown,
    context: NormalizeContext = {},
): {
    record: NormalizedCreatorOnboardingProjection;
    rosterBucket: CreatorRosterDecisionBucket;
    primaryAction: string;
    visibleStatusLabels: CreatorOnboardingVisibleStatusLabels;
    debug: CreatorOnboardingProjectionDebug;
} | null {
    const record = normalizeCreatorOnboardingRecord(raw, context);
    if (!record) {
        return null;
    }

    return {
        record,
        rosterBucket: record.rosterBucket,
        primaryAction: record.primaryAction,
        visibleStatusLabels: record.visibleStatusLabels,
        debug: record.normalizedProjectionDebug,
    };
}

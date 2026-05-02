import "server-only";

import {
    normalizeCreatorApplication,
} from "@/lib/creator-application";
import {
    normalizeCreatorOnboardingHistoryEntry,
    normalizeCreatorOnboardingCanonicalRecord,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
    type CreatorOnboardingHistoryEventType,
    type CreatorReviewQueueEntry,
} from "@/lib/creator-onboarding";
import { compareCreatorOnboardingToQueueRecords } from "@/lib/server/creator-review-queue";

export const CREATOR_LANE_ROSTER_WARNINGS = [
    "Review queue out of sync",
    "Role needs review",
    "Agreement evidence missing",
    "ID record needs review",
    "Settings need review",
] as const;

export type CreatorLaneRosterWarning = (typeof CREATOR_LANE_ROSTER_WARNINGS)[number];

export type CreatorOnboardingDiagnosticIssueKey =
    | "missing_queue_record"
    | "missing_source_onboarding"
    | "projection_without_source"
    | "queue_parity_mismatch"
    | "user_projection_mismatch"
    | "id_missing_metadata"
    | "id_verified_missing_metadata"
    | "stuck_without_blockers"
    | "role_status_mismatch"
    | "legal_signed_without_matching_signatures"
    | "creator_signature_missing_evidence"
    | "admin_signature_missing_evidence"
    | "owner_override_missing_reason"
    | "creator_settings_missing"
    | "creator_restrictions_conflict"
    | "sensitive_history_missing";

export type CreatorLaneSourceSnapshot = {
    onboardingExists: boolean;
    reviewQueueExists: boolean;
    userProjectionExists: boolean;
    userRole: string;
    approvalStatus: string;
    legalStatus: string;
    idVerificationStatus: string;
    creatorSignatureStatus: string;
    adminSignatureStatus: string;
    settingsPresent: boolean;
    restrictionsPresent: boolean;
    creatorExperienceActivityCount: number;
    queueBucket?: string;
    queueMaterializedAt?: number;
    sourceOnboardingUpdatedAt?: number;
    projectionLagMs?: number;
    queueParityOk?: boolean;
};

export type CreatorOnboardingDiagnosticIssue = {
    key: CreatorOnboardingDiagnosticIssueKey;
    severity: "warn" | "error";
    userId: string;
    creatorDisplayName: string;
    message: string;
    detail: string;
    link: string;
    rosterWarning: CreatorLaneRosterWarning;
    recommendedFix: string;
    canSelfHeal: boolean;
    sourceSnapshots: CreatorLaneSourceSnapshot;
    mismatches: Array<{ field: string; expected: unknown; actual: unknown }>;
    missingHistoryEvents?: CreatorOnboardingHistoryEventType[];
    missingEvidenceFields?: string[];
};

export type CreatorOnboardingDiagnosticSummary = {
    totalIssues: number;
    missingQueueCount: number;
    missingSourceCount: number;
    projectionWithoutSourceCount: number;
    queueParityMismatchCount: number;
    projectionMismatchCount: number;
    missingIdMetadataCount: number;
    agreementEvidenceIssueCount: number;
    stuckAwaitingReviewCount: number;
    roleMismatchCount: number;
    settingsIssueCount: number;
    historyCoverageIssueCount: number;
    reviewQueueOutOfSyncCount: number;
};

export type CreatorLaneHistoryCoverage = {
    userId: string;
    requiredEvents: CreatorOnboardingHistoryEventType[];
    presentEvents: CreatorOnboardingHistoryEventType[];
    missingEvents: CreatorOnboardingHistoryEventType[];
};

export type CreatorLaneDebugGroup = {
    groupTitle: "Creator Lane";
    parityStatus: "ok" | "needs_review";
    sourceSnapshots: {
        onboardingCount: number;
        reviewQueueCount: number;
        userProjectionCount: number;
        settingsCount: number;
        restrictionsCount: number;
        creatorExperienceActivityCount: number;
    };
    mismatches: CreatorOnboardingDiagnosticIssue[];
    historyCoverage: CreatorLaneHistoryCoverage[];
    lastMaterializedAt: number;
    recommendedFix: string;
    canSelfHeal: boolean;
};

type HistoryRecordInput = {
    userId: string;
    raw: Record<string, unknown>;
};

type CreatorExperienceRecordInput = {
    creatorId?: string;
    userId?: string;
    raw?: Record<string, unknown>;
};

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function valuesMatch(expected: unknown, actual: unknown) {
    return JSON.stringify(expected ?? null) === JSON.stringify(actual ?? null);
}

function hasRecord(value: unknown) {
    return Boolean(readRecord(value));
}

function countIdDocuments(record: Partial<CreatorOnboardingCanonicalRecord> | Record<string, unknown>) {
    const directCount = readNumber((record as Record<string, unknown>).idDocumentCount);
    if (directCount > 0) {
        return directCount;
    }

    const documents = readRecord((record as Record<string, unknown>).idDocuments);
    if (documents) {
        return Object.values(documents).filter(Boolean).length;
    }

    return hasRecord((record as Record<string, unknown>).idDocument) ? 1 : 0;
}

function hasAgreementEvidence(record: Partial<CreatorOnboardingCanonicalRecord>) {
    return Boolean(record.contractVersion && record.agreementHash);
}

function getCreatorExperienceActivityCount(records: CreatorExperienceRecordInput[] | undefined, userId: string) {
    if (!records?.length) {
        return 0;
    }

    return records.filter((entry) => entry.creatorId === userId || entry.userId === userId).length;
}

function hasRestrictionConflict(userRaw: Record<string, unknown> | undefined) {
    const settings = readRecord(userRaw?.creatorSettings);
    const restrictions = readRecord(userRaw?.creatorRestrictions);
    if (!settings || !restrictions) {
        return false;
    }

    const lanePairs = [
        ["messagingEnabled", "messagingRestricted"],
        ["broadcastsEnabled", "broadcastsRestricted"],
        ["subscriptionsEnabled", "subscriptionsRestricted"],
        ["bookingsEnabled", "bookingsRestricted"],
        ["customRequestsEnabled", "customRequestsRestricted"],
    ] as const;

    return lanePairs.some(([settingKey, restrictionKey]) => (
        settings[settingKey] !== false && restrictions[restrictionKey] === true
    ));
}

function buildSourceSnapshot(input: {
    canonical?: CreatorOnboardingCanonicalRecord;
    queue?: Record<string, unknown>;
    projectionExists: boolean;
    userRaw?: Record<string, unknown>;
    creatorExperienceActivityCount?: number;
}): CreatorLaneSourceSnapshot {
    const rawRole = readString(input.userRaw?.role);
    return {
        onboardingExists: Boolean(input.canonical),
        reviewQueueExists: Boolean(input.queue),
        userProjectionExists: input.projectionExists,
        userRole: rawRole || input.canonical?.role || readString(input.queue?.role) || "unknown",
        approvalStatus: input.canonical?.approvalStatus || readString(input.queue?.approvalStatus) || "unknown",
        legalStatus: input.canonical?.legalStatus || readString(input.queue?.legalStatus) || "unknown",
        idVerificationStatus: input.canonical?.idVerificationStatus || readString(input.queue?.idVerificationStatus) || "unknown",
        creatorSignatureStatus: input.canonical?.creatorSignatureStatus || readString(input.queue?.creatorSignatureStatus) || "unknown",
        adminSignatureStatus: input.canonical?.adminSignatureStatus || readString(input.queue?.adminSignatureStatus) || "unknown",
        settingsPresent: hasRecord(input.userRaw?.creatorSettings),
        restrictionsPresent: hasRecord(input.userRaw?.creatorRestrictions),
        creatorExperienceActivityCount: input.creatorExperienceActivityCount ?? 0,
        queueBucket: readString(input.queue?.queueBucket) || undefined,
        queueMaterializedAt: readNumber(input.queue?.queueMaterializedAt) || undefined,
        sourceOnboardingUpdatedAt: readNumber(input.queue?.sourceOnboardingUpdatedAt) || input.canonical?.updatedAt || undefined,
        projectionLagMs: readNumber(input.queue?.projectionLagMs) || undefined,
        queueParityOk: input.queue?.queueParityOk === true,
    };
}

function getRequiredHistoryEvents(canonical: CreatorOnboardingCanonicalRecord): CreatorOnboardingHistoryEventType[] {
    const required = new Set<CreatorOnboardingHistoryEventType>();

    if (canonical.submissionStatus === "onboarding_submitted" || canonical.submissionStatus === "awaiting_manual_review") {
        required.add("onboarding_submitted");
    }
    if (canonical.contractDocumentStatus === "contract_sent" || canonical.legalStatus === "legal_sent" || canonical.legalStatus === "legal_signed") {
        required.add("legal_sent");
    }
    if (canonical.creatorSignatureStatus === "signature_signed") {
        required.add("creator_contract_signed");
    }
    if (canonical.adminSignatureStatus === "signature_signed") {
        required.add("admin_contract_signed");
    }
    if (canonical.legalStatus === "legal_signed") {
        required.add("legal_signed");
    }
    if (canonical.idVerificationStatus === "id_requested") {
        required.add("id_requested");
    }
    if (canonical.idVerificationStatus === "id_submitted") {
        required.add("id_requested");
        required.add("id_submitted");
    }
    if (canonical.idVerificationStatus === "id_verified") {
        required.add("id_requested");
        required.add("id_submitted");
        required.add("id_verified");
    }
    if (canonical.idVerificationStatus === "id_rejected") {
        required.add("id_requested");
        required.add("id_submitted");
        required.add("id_rejected");
    }
    if (canonical.approvalStatus === "creator_approved") {
        required.add("creator_approved");
    }
    if (canonical.approvalStatus === "creator_rejected") {
        required.add("creator_rejected");
    }
    if (canonical.approvalStatus === "creator_needs_changes") {
        required.add("creator_needs_changes");
    }
    if (canonical.ownerOverrideActive) {
        required.add("owner_override_applied");
    }
    if (canonical.role === "creator" && canonical.approvalStatus === "creator_approved") {
        required.add("creator_role_activated");
    }

    return [...required];
}

function getHistoryWarning(missingEvents: CreatorOnboardingHistoryEventType[]): CreatorLaneRosterWarning {
    if (missingEvents.some((eventType) => eventType.includes("contract") || eventType === "legal_sent" || eventType === "legal_signed")) {
        return "Agreement evidence missing";
    }
    if (missingEvents.some((eventType) => eventType.startsWith("id_"))) {
        return "ID record needs review";
    }
    if (missingEvents.some((eventType) => eventType.includes("role") || eventType.includes("approved") || eventType.includes("override"))) {
        return "Role needs review";
    }
    return "Review queue out of sync";
}

function buildProjectionMismatches(canonical: CreatorOnboardingCanonicalRecord, projection: NonNullable<ReturnType<typeof normalizeCreatorApplication>> | undefined) {
    if (!projection) {
        return [];
    }

    const comparableFields = [
        "submissionStatus",
        "approvalStatus",
        "legalStatus",
        "idVerificationStatus",
        "segmentationStatus",
        "contractDocumentStatus",
        "creatorSignatureStatus",
        "adminSignatureStatus",
        "contractVersion",
        "agreementHash",
        "readyForApproval",
        "creatorReviewQueueVisible",
        "ownerOverrideActive",
    ] as const;

    return comparableFields.flatMap((field) => (
        valuesMatch(canonical[field], projection[field])
            ? []
            : [{ field, expected: canonical[field], actual: projection[field] }]
    ));
}

function addWarning(warnings: Set<CreatorLaneRosterWarning>, warning: CreatorLaneRosterWarning) {
    warnings.add(warning);
}

export function buildCreatorLaneRosterWarnings(input: {
    entry: Record<string, unknown>;
    userRaw?: Record<string, unknown>;
}): CreatorLaneRosterWarning[] {
    const warnings = new Set<CreatorLaneRosterWarning>();
    const role = readString(input.userRaw?.role) || readString(input.entry.role);
    const approvalStatus = readString(input.entry.approvalStatus);
    const legalStatus = readString(input.entry.legalStatus);
    const idStatus = readString(input.entry.idVerificationStatus);
    const creatorSignatureStatus = readString(input.entry.creatorSignatureStatus);
    const adminSignatureStatus = readString(input.entry.adminSignatureStatus);
    const queueParityDelta = Array.isArray(input.entry.queueParityDelta) ? input.entry.queueParityDelta : [];

    if (input.entry.queueParityOk === false || queueParityDelta.length > 0) {
        addWarning(warnings, "Review queue out of sync");
    }
    if (
        (approvalStatus === "creator_approved" && role !== "creator" && role !== "admin")
        || (approvalStatus !== "creator_approved" && role === "creator")
        || (input.entry.ownerOverrideActive === true && !readString(input.entry.ownerOverrideReason))
    ) {
        addWarning(warnings, "Role needs review");
    }
    if (
        legalStatus === "legal_signed"
        && (creatorSignatureStatus !== "signature_signed" || adminSignatureStatus !== "signature_signed")
    ) {
        addWarning(warnings, "Agreement evidence missing");
    }
    if (
        (creatorSignatureStatus === "signature_signed" || adminSignatureStatus === "signature_signed")
        && (!readString(input.entry.contractVersion) || !readString(input.entry.agreementHash))
    ) {
        addWarning(warnings, "Agreement evidence missing");
    }
    if ((idStatus === "id_submitted" || idStatus === "id_verified") && countIdDocuments(input.entry) === 0) {
        addWarning(warnings, "ID record needs review");
    }
    if ((approvalStatus === "creator_approved" || role === "creator") && !hasRecord(input.userRaw?.creatorSettings)) {
        addWarning(warnings, "Settings need review");
    }
    if (hasRestrictionConflict(input.userRaw)) {
        addWarning(warnings, "Settings need review");
    }

    return [...warnings];
}

export function buildCreatorOnboardingDiagnostics(input: {
    users: Array<{ uid: string; raw: Record<string, unknown> }>;
    onboardingRecords: Array<Record<string, unknown>>;
    queueRecords: Array<Record<string, unknown>>;
    historyRecords?: HistoryRecordInput[];
    creatorExperienceRecords?: CreatorExperienceRecordInput[];
}) {
    const userRawByUser = new Map(input.users.map((entry) => [entry.uid, entry.raw] as const));
    const projectionByUser = new Map(
        input.users
            .map((entry) => [entry.uid, normalizeCreatorApplication(entry.raw.creatorApplication)] as const)
            .filter((entry): entry is readonly [string, NonNullable<ReturnType<typeof normalizeCreatorApplication>>] => Boolean(entry[1])),
    );
    const onboardingByUser = new Map<string, CreatorOnboardingCanonicalRecord>();
    const onboardingRawByUser = new Map<string, Record<string, unknown>>();
    const queueByUser = new Map<string, CreatorReviewQueueEntry>();
    const historyByUser = new Map<string, CreatorOnboardingHistoryEntry[]>();
    const issues: CreatorOnboardingDiagnosticIssue[] = [];

    input.onboardingRecords.forEach((record) => {
        const canonical = normalizeCreatorOnboardingCanonicalRecord(record);
        if (canonical) {
            onboardingByUser.set(canonical.userId, canonical);
            onboardingRawByUser.set(canonical.userId, record);
        }
    });

    input.queueRecords.forEach((record) => {
        const userId = typeof record.userId === "string" ? record.userId : "";
        if (!userId) {
            return;
        }

        queueByUser.set(userId, record as CreatorReviewQueueEntry);
    });

    input.historyRecords?.forEach((record) => {
        const historyEntry = normalizeCreatorOnboardingHistoryEntry(record.raw);
        if (!historyEntry) {
            return;
        }

        const userId = record.userId || historyEntry.targetUserId || historyEntry.targetCreatorId || "";
        if (!userId) {
            return;
        }

        const current = historyByUser.get(userId) ?? [];
        current.push(historyEntry);
        historyByUser.set(userId, current);
    });

    const pushIssue = (issue: Omit<CreatorOnboardingDiagnosticIssue, "sourceSnapshots" | "mismatches"> & {
        sourceSnapshots?: CreatorLaneSourceSnapshot;
        mismatches?: Array<{ field: string; expected: unknown; actual: unknown }>;
    }) => {
        if (issues.some((entry) => entry.key === issue.key && entry.userId === issue.userId)) {
            return;
        }

        const canonical = onboardingByUser.get(issue.userId);
        const queue = queueByUser.get(issue.userId) as unknown as Record<string, unknown> | undefined;
        issues.push({
            ...issue,
            sourceSnapshots: issue.sourceSnapshots ?? buildSourceSnapshot({
                canonical,
                queue,
                projectionExists: projectionByUser.has(issue.userId),
                userRaw: userRawByUser.get(issue.userId),
                creatorExperienceActivityCount: getCreatorExperienceActivityCount(input.creatorExperienceRecords, issue.userId),
            }),
            mismatches: issue.mismatches ?? [],
        });
    };

    onboardingByUser.forEach((canonical, userId) => {
        const queueEntry = queueByUser.get(userId);
        const userRaw = userRawByUser.get(userId);
        const projection = projectionByUser.get(userId);
        const sourceSnapshot = buildSourceSnapshot({
            canonical,
            queue: queueEntry as unknown as Record<string, unknown> | undefined,
            projectionExists: Boolean(projection),
            userRaw,
            creatorExperienceActivityCount: getCreatorExperienceActivityCount(input.creatorExperienceRecords, userId),
        });

        if (canonical.creatorReviewQueueVisible && !queueByUser.has(userId)) {
            pushIssue({
                key: "missing_queue_record",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Canonical creator onboarding exists without an admin queue record",
                detail: "This creator should be visible in the roster review lane, but the derived queue record is missing.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Review queue out of sync",
                recommendedFix: "Rebuild the creator review queue projection for this user.",
                canSelfHeal: true,
                sourceSnapshots: sourceSnapshot,
            });
        }

        if (queueEntry) {
            const parity = compareCreatorOnboardingToQueueRecords({
                userId,
                canonical,
                queue: queueEntry as unknown as Record<string, unknown>,
            });

            if (!parity.queueParityOk) {
                pushIssue({
                    key: "queue_parity_mismatch",
                    severity: "warn",
                    userId,
                    creatorDisplayName: canonical.creatorDisplayName,
                    message: "Creator review queue projection is stale",
                    detail: `Queue projection differs from canonical onboarding on ${parity.queueParityDelta.map((entry) => entry.field).join(", ") || "unknown fields"}.`,
                    link: `/admin/user/${userId}`,
                    rosterWarning: "Review queue out of sync",
                    recommendedFix: "Materialize the queue entry from canonical onboarding again.",
                    canSelfHeal: true,
                    sourceSnapshots: sourceSnapshot,
                    mismatches: parity.queueParityDelta,
                });
            }
        }

        const projectionMismatches = buildProjectionMismatches(canonical, projection);
        if (projectionMismatches.length > 0) {
            pushIssue({
                key: "user_projection_mismatch",
                severity: "warn",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator-facing projection differs from canonical onboarding",
                detail: `User projection differs from canonical onboarding on ${projectionMismatches.map((entry) => entry.field).join(", ")}.`,
                link: `/admin/user/${userId}`,
                rosterWarning: "Review queue out of sync",
                recommendedFix: "Sync the user creatorApplication projection from canonical onboarding.",
                canSelfHeal: true,
                sourceSnapshots: sourceSnapshot,
                mismatches: projectionMismatches,
            });
        }

        if (canonical.idVerificationStatus === "id_submitted" && !canonical.idDocument) {
            pushIssue({
                key: "id_missing_metadata",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator ID status is submitted but metadata is missing",
                detail: "The canonical onboarding record says an ID was submitted, but no durable metadata record is attached.",
                link: `/admin/user/${userId}`,
                rosterWarning: "ID record needs review",
                recommendedFix: "Open the ID files section and request a new upload if no durable file metadata exists.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                missingEvidenceFields: ["idDocument"],
            });
        }

        if (canonical.idVerificationStatus === "id_verified" && countIdDocuments(canonical) === 0) {
            pushIssue({
                key: "id_verified_missing_metadata",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator ID is verified without document evidence",
                detail: "The ID status says verified, but the canonical record has no durable ID document metadata.",
                link: `/admin/user/${userId}`,
                rosterWarning: "ID record needs review",
                recommendedFix: "Attach the verified ID metadata or move the ID state back to review.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                missingEvidenceFields: ["idDocument", "idDocuments"],
            });
        }

        if (
            canonical.submissionStatus === "awaiting_manual_review"
            && canonical.approvalStatus === "creator_pending"
            && canonical.blockingReasons.length === 0
        ) {
            pushIssue({
                key: "stuck_without_blockers",
                severity: "warn",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator is awaiting review with no actionable blockers",
                detail: "This creator is still stuck in manual review even though the canonical record exposes no blocking reasons.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Review queue out of sync",
                recommendedFix: "Recompute canonical blocking reasons and queue bucket for this creator.",
                canSelfHeal: true,
                sourceSnapshots: sourceSnapshot,
            });
        }

        if (
            (canonical.approvalStatus === "creator_approved" && canonical.role !== "creator" && canonical.role !== "admin")
            || (canonical.approvalStatus !== "creator_approved" && canonical.role === "creator")
        ) {
            pushIssue({
                key: "role_status_mismatch",
                severity: "warn",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator role and approval state are out of sync",
                detail: "The public role does not match the canonical creator approval state, so the account can drift into a limbo state.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Role needs review",
                recommendedFix: "Review approval and role activation from Admin Roster before exposing creator access.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                mismatches: [{ field: "role", expected: canonical.approvalStatus === "creator_approved" ? "creator" : "not_creator", actual: canonical.role }],
            });
        }

        const raw = onboardingRawByUser.get(userId);
        if (
            raw?.legalStatus === "legal_signed"
            && (raw.creatorSignatureStatus !== "signature_signed" || raw.adminSignatureStatus !== "signature_signed")
        ) {
            pushIssue({
                key: "legal_signed_without_matching_signatures",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Agreement is complete without matching signatures",
                detail: "The raw legal status says complete, but creator and admin signatures do not both match the same completed state.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Agreement evidence missing",
                recommendedFix: "Verify the dispatch and signature records before treating legal review as complete.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                mismatches: [
                    { field: "creatorSignatureStatus", expected: "signature_signed", actual: raw.creatorSignatureStatus },
                    { field: "adminSignatureStatus", expected: "signature_signed", actual: raw.adminSignatureStatus },
                ],
            });
        }

        if (canonical.creatorSignatureStatus === "signature_signed" && (!hasAgreementEvidence(canonical) || !canonical.creatorContractSignedAt)) {
            const missingEvidenceFields = [
                !canonical.contractVersion ? "contractVersion" : "",
                !canonical.agreementHash ? "agreementHash" : "",
                !canonical.creatorContractSignedAt ? "creatorContractSignedAt" : "",
            ].filter(Boolean);
            pushIssue({
                key: "creator_signature_missing_evidence",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator signature evidence is incomplete",
                detail: `Creator signature is marked signed, but ${missingEvidenceFields.join(", ")} is missing.`,
                link: `/admin/user/${userId}`,
                rosterWarning: "Agreement evidence missing",
                recommendedFix: "Send an updated agreement or repair the signature evidence before approval.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                missingEvidenceFields,
            });
        }

        if (canonical.adminSignatureStatus === "signature_signed" && (!hasAgreementEvidence(canonical) || !canonical.adminContractSignedAt)) {
            const missingEvidenceFields = [
                !canonical.contractVersion ? "contractVersion" : "",
                !canonical.agreementHash ? "agreementHash" : "",
                !canonical.adminContractSignedAt ? "adminContractSignedAt" : "",
            ].filter(Boolean);
            pushIssue({
                key: "admin_signature_missing_evidence",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Admin countersign evidence is incomplete",
                detail: `Admin countersign is marked signed, but ${missingEvidenceFields.join(", ")} is missing.`,
                link: `/admin/user/${userId}`,
                rosterWarning: "Agreement evidence missing",
                recommendedFix: "Countersign again against the same agreement version and hash, or repair the evidence in Debug.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                missingEvidenceFields,
            });
        }

        if (canonical.ownerOverrideActive && !canonical.ownerOverrideReason) {
            pushIssue({
                key: "owner_override_missing_reason",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Owner override is active without a reason",
                detail: "Owner overrides must explain what was bypassed so launch support can audit why creator access changed.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Role needs review",
                recommendedFix: "Add an owner override reason or clear the override.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
                missingEvidenceFields: ["ownerOverrideReason"],
            });
        }

        if ((canonical.approvalStatus === "creator_approved" || canonical.role === "creator") && !hasRecord(userRaw?.creatorSettings)) {
            pushIssue({
                key: "creator_settings_missing",
                severity: "warn",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Live creator settings are missing",
                detail: "The creator is approved or live, but no fan experience settings are present on the user profile.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Settings need review",
                recommendedFix: "Open Fan experience settings and save the normalized creator settings.",
                canSelfHeal: true,
                sourceSnapshots: sourceSnapshot,
            });
        }

        if (hasRestrictionConflict(userRaw)) {
            pushIssue({
                key: "creator_restrictions_conflict",
                severity: "warn",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Creator restrictions conflict with enabled experiences",
                detail: "A fan experience lane is enabled in settings while the matching restriction is also active.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Settings need review",
                recommendedFix: "Review the restriction state and either pause the lane visibly or re-enable it.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
            });
        }

        if (input.historyRecords) {
            const requiredEvents = getRequiredHistoryEvents(canonical);
            const presentEvents = new Set((historyByUser.get(userId) ?? []).map((entry) => entry.eventType));
            const missingHistoryEvents = requiredEvents.filter((eventType) => !presentEvents.has(eventType));

            if (missingHistoryEvents.length > 0) {
                pushIssue({
                    key: "sensitive_history_missing",
                    severity: "warn",
                    userId,
                    creatorDisplayName: canonical.creatorDisplayName,
                    message: "Creator lifecycle history is incomplete",
                    detail: `History is missing ${missingHistoryEvents.join(", ")} for the current creator state.`,
                    link: `/admin/user/${userId}`,
                    rosterWarning: getHistoryWarning(missingHistoryEvents),
                    recommendedFix: "Use Debug to verify source evidence, then rebuild or annotate the missing audit history.",
                    canSelfHeal: false,
                    sourceSnapshots: sourceSnapshot,
                    missingHistoryEvents,
                });
            }
        }
    });

    queueByUser.forEach((queueEntry, userId) => {
        if (!onboardingByUser.has(userId)) {
            const sourceSnapshot = buildSourceSnapshot({
                queue: queueEntry as unknown as Record<string, unknown>,
                projectionExists: projectionByUser.has(userId),
                userRaw: userRawByUser.get(userId),
                creatorExperienceActivityCount: getCreatorExperienceActivityCount(input.creatorExperienceRecords, userId),
            });
            pushIssue({
                key: "missing_source_onboarding",
                severity: "error",
                userId,
                creatorDisplayName: queueEntry.creatorDisplayName,
                message: "Creator review queue record exists without a canonical onboarding source",
                detail: "The admin queue is pointing at a creator application that no longer has a canonical source-of-truth record.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Review queue out of sync",
                recommendedFix: "Rebuild canonical onboarding from verified evidence or remove the stale queue entry.",
                canSelfHeal: false,
                sourceSnapshots: sourceSnapshot,
            });
        }
    });

    projectionByUser.forEach((projection, userId) => {
        if (!onboardingByUser.has(userId)) {
            const sourceSnapshot = buildSourceSnapshot({
                queue: queueByUser.get(userId) as unknown as Record<string, unknown> | undefined,
                projectionExists: true,
                userRaw: userRawByUser.get(userId),
                creatorExperienceActivityCount: getCreatorExperienceActivityCount(input.creatorExperienceRecords, userId),
            });
            pushIssue({
                key: "projection_without_source",
                severity: "warn",
                userId,
                creatorDisplayName: projection.creatorDisplayName,
                message: "Creator-facing projection exists without a canonical onboarding source",
                detail: "The creator waitlist state is still present on the user profile, but the canonical onboarding record is missing.",
                link: `/admin/user/${userId}`,
                rosterWarning: "Review queue out of sync",
                recommendedFix: "Backfill canonical onboarding from the legacy projection, then materialize the review queue.",
                canSelfHeal: true,
                sourceSnapshots: sourceSnapshot,
            });
        }
    });

    const historyCoverage: CreatorLaneHistoryCoverage[] = [...onboardingByUser.values()]
        .map((canonical) => {
            const requiredEvents = getRequiredHistoryEvents(canonical);
            const presentEvents = [...new Set((historyByUser.get(canonical.userId) ?? []).map((entry) => entry.eventType))];
            return {
                userId: canonical.userId,
                requiredEvents,
                presentEvents,
                missingEvents: requiredEvents.filter((eventType) => !presentEvents.includes(eventType)),
            };
        })
        .filter((entry) => entry.requiredEvents.length > 0);

    const summary: CreatorOnboardingDiagnosticSummary = {
        totalIssues: issues.length,
        missingQueueCount: issues.filter((entry) => entry.key === "missing_queue_record").length,
        missingSourceCount: issues.filter((entry) => entry.key === "missing_source_onboarding").length,
        projectionWithoutSourceCount: issues.filter((entry) => entry.key === "projection_without_source").length,
        queueParityMismatchCount: issues.filter((entry) => entry.key === "queue_parity_mismatch").length,
        projectionMismatchCount: issues.filter((entry) => entry.key === "user_projection_mismatch").length,
        missingIdMetadataCount: issues.filter((entry) => entry.key === "id_missing_metadata" || entry.key === "id_verified_missing_metadata").length,
        agreementEvidenceIssueCount: issues.filter((entry) => entry.rosterWarning === "Agreement evidence missing").length,
        stuckAwaitingReviewCount: issues.filter((entry) => entry.key === "stuck_without_blockers").length,
        roleMismatchCount: issues.filter((entry) => entry.key === "role_status_mismatch").length,
        settingsIssueCount: issues.filter((entry) => entry.rosterWarning === "Settings need review").length,
        historyCoverageIssueCount: issues.filter((entry) => entry.key === "sensitive_history_missing").length,
        reviewQueueOutOfSyncCount: issues.filter((entry) => entry.rosterWarning === "Review queue out of sync").length,
    };

    const lastMaterializedAt = input.queueRecords.reduce((latest, record) => Math.max(latest, readNumber(record.queueMaterializedAt)), 0);
    const sourceSnapshots = {
        onboardingCount: onboardingByUser.size,
        reviewQueueCount: queueByUser.size,
        userProjectionCount: projectionByUser.size,
        settingsCount: input.users.filter((entry) => hasRecord(entry.raw.creatorSettings)).length,
        restrictionsCount: input.users.filter((entry) => hasRecord(entry.raw.creatorRestrictions)).length,
        creatorExperienceActivityCount: input.creatorExperienceRecords?.length ?? 0,
    };
    const creatorLaneDebug: CreatorLaneDebugGroup = {
        groupTitle: "Creator Lane",
        parityStatus: issues.length > 0 ? "needs_review" : "ok",
        sourceSnapshots,
        mismatches: issues,
        historyCoverage,
        lastMaterializedAt,
        recommendedFix: issues.length > 0
            ? "Open the affected creator in Admin Roster, then use Debug source details to rebuild projections or repair missing evidence."
            : "No action needed.",
        canSelfHeal: issues.some((entry) => entry.canSelfHeal),
    };

    return {
        summary,
        creatorLaneDebug,
        sourceSnapshots,
        parityStatus: creatorLaneDebug.parityStatus,
        mismatches: issues,
        historyCoverage,
        lastMaterializedAt,
        recommendedFix: creatorLaneDebug.recommendedFix,
        canSelfHeal: creatorLaneDebug.canSelfHeal,
        issues: issues.sort((left, right) => left.creatorDisplayName.localeCompare(right.creatorDisplayName)),
    };
}

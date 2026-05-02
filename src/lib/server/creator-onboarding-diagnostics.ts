import "server-only";

import {
    normalizeCreatorApplication,
} from "@/lib/creator-application";
import {
    normalizeCreatorOnboardingCanonicalRecord,
    type CreatorOnboardingCanonicalRecord,
    type CreatorReviewQueueEntry,
} from "@/lib/creator-onboarding";
import { compareCreatorOnboardingToQueueRecords } from "@/lib/server/creator-review-queue";

export type CreatorOnboardingDiagnosticIssueKey =
    | "missing_queue_record"
    | "missing_source_onboarding"
    | "projection_without_source"
    | "queue_parity_mismatch"
    | "id_missing_metadata"
    | "stuck_without_blockers"
    | "role_status_mismatch";

export type CreatorOnboardingDiagnosticIssue = {
    key: CreatorOnboardingDiagnosticIssueKey;
    severity: "warn" | "error";
    userId: string;
    creatorDisplayName: string;
    message: string;
    detail: string;
    link: string;
};

export type CreatorOnboardingDiagnosticSummary = {
    totalIssues: number;
    missingQueueCount: number;
    missingSourceCount: number;
    projectionWithoutSourceCount: number;
    queueParityMismatchCount: number;
    missingIdMetadataCount: number;
    stuckAwaitingReviewCount: number;
    roleMismatchCount: number;
};

export function buildCreatorOnboardingDiagnostics(input: {
    users: Array<{ uid: string; raw: Record<string, unknown> }>;
    onboardingRecords: Array<Record<string, unknown>>;
    queueRecords: Array<Record<string, unknown>>;
}) {
    const projectionByUser = new Map(
        input.users
            .map((entry) => [entry.uid, normalizeCreatorApplication(entry.raw.creatorApplication)] as const)
            .filter((entry): entry is readonly [string, NonNullable<ReturnType<typeof normalizeCreatorApplication>>] => Boolean(entry[1])),
    );
    const onboardingByUser = new Map<string, CreatorOnboardingCanonicalRecord>();
    const queueByUser = new Map<string, CreatorReviewQueueEntry>();
    const issues: CreatorOnboardingDiagnosticIssue[] = [];

    input.onboardingRecords.forEach((record) => {
        const canonical = normalizeCreatorOnboardingCanonicalRecord(record);
        if (canonical) {
            onboardingByUser.set(canonical.userId, canonical);
        }
    });

    input.queueRecords.forEach((record) => {
        const userId = typeof record.userId === "string" ? record.userId : "";
        if (!userId) {
            return;
        }

        queueByUser.set(userId, record as CreatorReviewQueueEntry);
    });

    const pushIssue = (issue: CreatorOnboardingDiagnosticIssue) => {
        if (issues.some((entry) => entry.key === issue.key && entry.userId === issue.userId)) {
            return;
        }

        issues.push(issue);
    };

    onboardingByUser.forEach((canonical, userId) => {
        if (canonical.creatorReviewQueueVisible && !queueByUser.has(userId)) {
            pushIssue({
                key: "missing_queue_record",
                severity: "error",
                userId,
                creatorDisplayName: canonical.creatorDisplayName,
                message: "Canonical creator onboarding exists without an admin queue record",
                detail: "This creator should be visible in the roster review lane, but the derived queue record is missing.",
                link: `/admin/user/${userId}`,
            });
        }

        const queueEntry = queueByUser.get(userId);
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
                });
            }
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
            });
        }
    });

    queueByUser.forEach((queueEntry, userId) => {
        if (!onboardingByUser.has(userId)) {
            pushIssue({
                key: "missing_source_onboarding",
                severity: "error",
                userId,
                creatorDisplayName: queueEntry.creatorDisplayName,
                message: "Creator review queue record exists without a canonical onboarding source",
                detail: "The admin queue is pointing at a creator application that no longer has a canonical source-of-truth record.",
                link: `/admin/user/${userId}`,
            });
        }
    });

    projectionByUser.forEach((projection, userId) => {
        if (!onboardingByUser.has(userId)) {
            pushIssue({
                key: "projection_without_source",
                severity: "warn",
                userId,
                creatorDisplayName: projection.creatorDisplayName,
                message: "Creator-facing projection exists without a canonical onboarding source",
                detail: "The creator waitlist state is still present on the user profile, but the canonical onboarding record is missing.",
                link: `/admin/user/${userId}`,
            });
        }
    });

    const summary: CreatorOnboardingDiagnosticSummary = {
        totalIssues: issues.length,
        missingQueueCount: issues.filter((entry) => entry.key === "missing_queue_record").length,
        missingSourceCount: issues.filter((entry) => entry.key === "missing_source_onboarding").length,
        projectionWithoutSourceCount: issues.filter((entry) => entry.key === "projection_without_source").length,
        queueParityMismatchCount: issues.filter((entry) => entry.key === "queue_parity_mismatch").length,
        missingIdMetadataCount: issues.filter((entry) => entry.key === "id_missing_metadata").length,
        stuckAwaitingReviewCount: issues.filter((entry) => entry.key === "stuck_without_blockers").length,
        roleMismatchCount: issues.filter((entry) => entry.key === "role_status_mismatch").length,
    };

    return {
        summary,
        issues: issues.sort((left, right) => left.creatorDisplayName.localeCompare(right.creatorDisplayName)),
    };
}

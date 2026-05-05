import { describe, expect, it } from "vitest";

import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";

const BASE_TIME = 1_710_000_000_000;

function canonical(overrides: Record<string, unknown>) {
    return {
        userId: "creator_1",
        email: "creator@example.com",
        role: "user",
        sourceVersion: 1,
        signupType: "creator",
        submissionStatus: "awaiting_manual_review",
        approvalStatus: "creator_pending",
        queuePosition: 1,
        onboardingStartedAt: BASE_TIME,
        submittedAt: BASE_TIME,
        onboardingSubmittedAt: BASE_TIME,
        awaitingManualReviewAt: BASE_TIME,
        updatedAt: BASE_TIME,
        creatorDisplayName: "Creator One",
        bypassFanOnboarding: true,
        introAcknowledgedAt: BASE_TIME,
        legalStatus: "legal_sent",
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_pending",
        adminSignatureStatus: "signature_pending",
        contractVersion: "mgsa_2026_v1",
        agreementHash: "hash_1",
        idVerificationStatus: "id_requested",
        segmentationStatus: "segment_assigned",
        creatorReviewQueueVisible: true,
        blockingReasons: ["awaiting_creator_contract_signature", "awaiting_admin_countersign", "awaiting_id_submission"],
        ...overrides,
    };
}

function queue(overrides: Record<string, unknown>) {
    return {
        userId: "creator_1",
        creatorDisplayName: "Creator One",
        displayName: "Creator One",
        email: "creator@example.com",
        username: "creator-one",
        role: "user",
        queueBucket: "waiting_on_legal",
        submissionStatus: "awaiting_manual_review",
        approvalStatus: "creator_pending",
        legalStatus: "legal_sent",
        idVerificationStatus: "id_requested",
        segmentationStatus: "segment_assigned",
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_pending",
        adminSignatureStatus: "signature_pending",
        agreementHash: "hash_1",
        contractVersion: "mgsa_2026_v1",
        blockingReasons: ["awaiting_creator_contract_signature", "awaiting_admin_countersign", "awaiting_id_submission"],
        readyForApproval: false,
        creatorReviewQueueVisible: true,
        submittedAt: BASE_TIME,
        updatedAt: BASE_TIME,
        queueMaterializedAt: BASE_TIME,
        sourceOnboardingUpdatedAt: BASE_TIME,
        projectionLagMs: 0,
        queueParityOk: true,
        queueParityDelta: [],
        ...overrides,
    };
}

function issueKeys(result: ReturnType<typeof buildCreatorOnboardingDiagnostics>) {
    return result.issues.map((issue) => issue.key);
}

describe("creator onboarding diagnostics", () => {
    it("detects queue missing for canonical onboarding", () => {
        const result = buildCreatorOnboardingDiagnostics({
            users: [],
            onboardingRecords: [canonical({ userId: "missing_queue", creatorDisplayName: "Missing Queue" })],
            queueRecords: [],
        });

        expect(issueKeys(result)).toContain("missing_queue_record");
        expect(result.issues.find((issue) => issue.key === "missing_queue_record")).toMatchObject({
            rosterWarning: "Review queue out of sync",
            canSelfHeal: true,
        });
        expect(result.creatorLaneDebug.groupTitle).toBe("Creator Lane");
    });

    it("detects approved role mismatch without treating creator access as healthy", () => {
        const result = buildCreatorOnboardingDiagnostics({
            users: [{ uid: "approved_user", raw: { role: "user", creatorSettings: {} } }],
            onboardingRecords: [
                canonical({
                    userId: "approved_user",
                    creatorDisplayName: "Approved User",
                    approvalStatus: "creator_approved",
                    role: "user",
                    blockingReasons: ["role_activation_blocked"],
                }),
            ],
            queueRecords: [queue({ userId: "approved_user", creatorDisplayName: "Approved User", approvalStatus: "creator_approved" })],
        });

        expect(issueKeys(result)).toContain("role_status_mismatch");
        expect(result.issues.find((issue) => issue.key === "role_status_mismatch")?.rosterWarning).toBe("Role needs review");
    });

    it("detects legal complete state without matching signature evidence", () => {
        const result = buildCreatorOnboardingDiagnostics({
            users: [{ uid: "legal_gap", raw: { role: "user" } }],
            onboardingRecords: [
                canonical({
                    userId: "legal_gap",
                    creatorDisplayName: "Legal Gap",
                    legalStatus: "legal_signed",
                    contractDocumentStatus: "contract_sent",
                    creatorSignatureStatus: "signature_signed",
                    adminSignatureStatus: "signature_pending",
                    agreementHash: "",
                    creatorContractSignedAt: 0,
                }),
            ],
            queueRecords: [queue({ userId: "legal_gap", creatorDisplayName: "Legal Gap", legalStatus: "legal_signed" })],
        });

        expect(issueKeys(result)).toEqual(expect.arrayContaining([
            "legal_signed_without_matching_signatures",
            "creator_signature_missing_evidence",
        ]));
        expect(result.summary.agreementEvidenceIssueCount).toBeGreaterThan(0);
        expect(result.issues.some((issue) => issue.rosterWarning === "Agreement evidence missing")).toBe(true);
    });

    it("treats owner override reason as optional audit context", () => {
        const result = buildCreatorOnboardingDiagnostics({
            users: [{ uid: "override_gap", raw: { role: "user" } }],
            onboardingRecords: [
                canonical({
                    userId: "override_gap",
                    creatorDisplayName: "Override Gap",
                    ownerOverrideActive: true,
                    ownerOverrideReason: "",
                }),
            ],
            queueRecords: [queue({ userId: "override_gap", creatorDisplayName: "Override Gap", ownerOverrideActive: true })],
        });

        expect(issueKeys(result)).not.toContain("role_status_mismatch");
        expect(result.summary.roleMismatchCount).toBe(0);
        expect(result.optionalAuditNotes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                key: "owner_override_reason_optional",
                status: "reason_optional",
                severity: "info",
                message: "Owner override reason is optional for admins.",
                suggestedAction: "No action required unless you want additional audit context.",
            }),
        ]));
    });

    it("detects missing sensitive history coverage when history snapshots are provided", () => {
        const result = buildCreatorOnboardingDiagnostics({
            users: [{ uid: "history_gap", raw: { role: "user" } }],
            onboardingRecords: [
                canonical({
                    userId: "history_gap",
                    creatorDisplayName: "History Gap",
                    idVerificationStatus: "id_verified",
                    idDocuments: {
                        front: {
                            fileName: "front.png",
                            storagePath: "creator-id/front.png",
                            contentType: "image/png",
                            sizeBytes: 100,
                            uploadedAt: BASE_TIME,
                            uploadedByUid: "history_gap",
                        },
                    },
                }),
            ],
            queueRecords: [queue({ userId: "history_gap", creatorDisplayName: "History Gap", idVerificationStatus: "id_verified", idDocumentCount: 1 })],
            historyRecords: [],
        });

        expect(issueKeys(result)).toContain("sensitive_history_missing");
        expect(result.summary.historyCoverageIssueCount).toBe(1);
        expect(result.historyCoverage.find((entry) => entry.userId === "history_gap")?.missingEvents).toContain("id_verified");
    });
});

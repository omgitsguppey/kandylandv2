import { describe, expect, it } from "vitest";

import {
    CREATOR_LEGAL_WAITING_HEADLINE,
    CREATOR_LEGAL_WAITING_HELPER,
    CREATOR_ONBOARDING_REQUIRED_HISTORY_EVENT_TYPES,
    describeCreatorFacingOnboardingBlockingReason,
    describeCreatorOnboardingBlockingReason,
    formatCreatorOnboardingHistoryEventSummary,
    getCreatorOnboardingIdDocumentSummary,
    deriveCanonicalCreatorOnboardingStatuses,
    getCreatorOnboardingStatusSummary,
    normalizeCreatorOnboardingApprovalStatus,
    normalizeCreatorOnboardingCanonicalRecord,
    normalizeCreatorOnboardingHistoryEntry,
    normalizeCreatorOnboardingIdStatus,
    normalizeCreatorOnboardingLegalStatus,
    normalizeCreatorOnboardingSegmentStatus,
    normalizeCreatorOnboardingSubmissionStatus,
} from "@/lib/creator-onboarding";

describe("creator onboarding contract", () => {
    it("normalizes current canonical status values without changing them", () => {
        expect(normalizeCreatorOnboardingSubmissionStatus("awaiting_manual_review")).toBe("awaiting_manual_review");
        expect(normalizeCreatorOnboardingLegalStatus("legal_signed")).toBe("legal_signed");
        expect(normalizeCreatorOnboardingIdStatus("id_verified")).toBe("id_verified");
        expect(normalizeCreatorOnboardingSegmentStatus("segment_assigned")).toBe("segment_assigned");
        expect(normalizeCreatorOnboardingApprovalStatus("creator_approved")).toBe("creator_approved");
    });

    it("maps legacy creator application values into the canonical state machine", () => {
        expect(deriveCanonicalCreatorOnboardingStatuses({
            status: "waitlist",
            legalDocumentStatus: "opened",
            idVerificationStatus: "submitted",
            segmentationStatus: "segmented",
        })).toEqual({
            submissionStatus: "awaiting_manual_review",
            legalStatus: "legal_sent",
            idVerificationStatus: "id_submitted",
            segmentationStatus: "segment_assigned",
            approvalStatus: "creator_pending",
        });
    });

    it("maps legacy approved and declined states to canonical approval outcomes", () => {
        expect(normalizeCreatorOnboardingApprovalStatus("approved")).toBe("creator_approved");
        expect(normalizeCreatorOnboardingApprovalStatus("declined")).toBe("creator_rejected");
        expect(normalizeCreatorOnboardingApprovalStatus("rejected")).toBe("creator_rejected");
        expect(normalizeCreatorOnboardingApprovalStatus("needs_changes")).toBe("creator_needs_changes");
    });

    it("falls back to safe defaults for unsupported or missing values", () => {
        expect(deriveCanonicalCreatorOnboardingStatuses({
            status: "mystery",
            legalDocumentStatus: "unknown",
            idVerificationStatus: "unknown",
            segmentationStatus: "unknown",
        })).toEqual({
            submissionStatus: "awaiting_manual_review",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_not_requested",
            segmentationStatus: "segment_unassigned",
            approvalStatus: "creator_pending",
        });
    });

    it("describes canonical blocking reasons for creator and admin status surfaces", () => {
        expect(describeCreatorOnboardingBlockingReason("awaiting_id_submission")).toMatchObject({
            label: "Waiting on ID upload",
            severity: "warn",
        });
        expect(describeCreatorOnboardingBlockingReason("role_activation_blocked")).toMatchObject({
            label: "Role activation blocked",
            severity: "error",
        });
        expect(describeCreatorFacingOnboardingBlockingReason("awaiting_intro_acknowledgement")).toMatchObject({
            label: "Review the creator intro",
            severity: "info",
        });
    });

    it("builds creator waitlist status messaging from canonical backend state", () => {
        expect(getCreatorOnboardingStatusSummary({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            idVerificationStatus: "id_requested",
            legalStatus: "legal_pending",
            contractDocumentStatus: "contract_not_sent",
            creatorSignatureStatus: "signature_pending",
            adminSignatureStatus: "signature_pending",
            blockingReasons: ["awaiting_intro_acknowledgement"],
            readyForApproval: false,
        })).toMatchObject({
            stage: "Application received",
            summary: "Your creator application is in the intake lane. Review the short creator intro on this page before identity verification begins.",
        });

        expect(getCreatorOnboardingStatusSummary({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_approved",
            idVerificationStatus: "id_verified",
            legalStatus: "legal_signed",
            contractDocumentStatus: "contract_sent",
            creatorSignatureStatus: "signature_signed",
            adminSignatureStatus: "signature_signed",
            blockingReasons: ["role_activation_blocked"],
            readyForApproval: false,
        })).toMatchObject({
            stage: "Needs attention",
            summary: "Approval is recorded, but creator access cannot finish until the remaining intake requirements are resolved.",
        });

        expect(getCreatorOnboardingStatusSummary({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            idVerificationStatus: "id_verified",
            legalStatus: "legal_pending",
            introAcknowledgedAt: 1_710_000_000_100,
            contractDocumentStatus: "contract_not_sent",
            creatorSignatureStatus: "signature_pending",
            adminSignatureStatus: "signature_pending",
            blockingReasons: ["awaiting_legal"],
            readyForApproval: false,
        })).toMatchObject({
            stage: "Waiting on legal",
            summary: `${CREATOR_LEGAL_WAITING_HEADLINE} ${CREATOR_LEGAL_WAITING_HELPER}`,
        });
    });

    it("tracks front and back ID uploads while preserving legacy single-file records", () => {
        const canonical = normalizeCreatorOnboardingCanonicalRecord({
            userId: "creator_1",
            email: "creator@example.com",
            role: "user",
            sourceVersion: 1,
            signupType: "creator",
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            queuePosition: 101,
            onboardingStartedAt: 1_710_000_000_000,
            submittedAt: 1_710_000_000_000,
            onboardingSubmittedAt: 1_710_000_000_000,
            awaitingManualReviewAt: 1_710_000_000_000,
            updatedAt: 1_710_000_000_000,
            creatorDisplayName: "Creator One",
            creatorMonetizationGoals: ["paid_drops", "private_chat"],
            bypassFanOnboarding: true,
            creatorFollowerRange: "10k_50k",
            creatorPostingFrequency: "weekly",
            fansAlreadyAskForAccess: "yes",
            creatorRecommendedSetup: "timed_drops_private_chat",
            intakeVersion: "creator_intake_v1",
            intakeSubmittedAt: 1_710_000_000_000,
            intakeSource: "creator_site",
            legalStatus: "legal_pending",
            idVerificationStatus: "id_requested",
            segmentationStatus: "segment_unassigned",
            idDocument: {
                fileName: "legacy-front.png",
                storagePath: "creator-onboarding/creator_1/id/front/legacy-front.png",
                contentType: "image/png",
                sizeBytes: 1024,
                uploadedAt: 1_710_000_000_500,
                uploadedByUid: "creator_1",
            },
            idDocuments: {
                back: {
                    fileName: "modern-back.png",
                    storagePath: "creator-onboarding/creator_1/id/back/modern-back.png",
                    contentType: "image/png",
                    sizeBytes: 2048,
                    uploadedAt: 1_710_000_000_900,
                    uploadedByUid: "creator_1",
                },
            },
        });

        expect(canonical?.idDocuments?.front?.fileName).toBe("legacy-front.png");
        expect(canonical?.idDocuments?.back?.fileName).toBe("modern-back.png");
        expect(canonical?.creatorMonetizationGoals).toEqual(["paid_drops", "private_chat"]);
        expect(canonical?.creatorRecommendedSetup).toBe("timed_drops_private_chat");
        expect(canonical?.intakeVersion).toBe("creator_intake_v1");
        expect(getCreatorOnboardingIdDocumentSummary(canonical)).toMatchObject({
            count: 2,
            complete: false,
        });
    });

    it("normalizes creator onboarding history entries", () => {
        expect(normalizeCreatorOnboardingHistoryEntry({
            eventType: "creator_approved",
            actorId: "admin_1",
            actorRole: "admin",
            actorLabel: "Admin",
            timestamp: 1_710_000_000_000,
            summary: "Creator approved",
            detail: "All review gates are complete.",
            agreementVersion: "agreement_v2",
            agreementHash: "sha256:v2",
            ip: "127.0.0.1",
            userAgent: "Vitest",
            metadata: {
                source: "admin",
            },
        })).toMatchObject({
            eventType: "creator_approved",
            actorRole: "admin",
            detail: "All review gates are complete.",
            agreementVersion: "agreement_v2",
            agreementHash: "sha256:v2",
            ip: "127.0.0.1",
            userAgent: "Vitest",
        });
        expect(normalizeCreatorOnboardingHistoryEntry({
            eventType: "intake_submitted",
            actorId: "creator_1",
            actorRole: "user",
            actorLabel: "Creator",
            timestamp: 1_710_000_000_000,
            summary: "Creator intake submitted",
        })).toMatchObject({
            eventType: "intake_submitted",
            actorRole: "user",
        });
        expect(normalizeCreatorOnboardingHistoryEntry({
            eventType: "mystery",
            actorId: "admin_1",
            actorRole: "admin",
            actorLabel: "Admin",
            timestamp: 1_710_000_000_000,
            summary: "Invalid",
        })).toBeUndefined();
    });

    it("keeps required lifecycle event labels human readable", () => {
        expect(CREATOR_ONBOARDING_REQUIRED_HISTORY_EVENT_TYPES).toEqual(expect.arrayContaining([
            "legal_sent",
            "agreement_update_sent",
            "creator_contract_signed",
            "admin_contract_signed",
            "owner_override_applied",
            "creator_experience_settings_updated",
            "admin_account_updated",
            "synthetic_creator_created",
            "synthetic_creator_marked",
            "admin_view_as_started",
            "admin_view_as_ended",
        ]));
        expect(formatCreatorOnboardingHistoryEventSummary({
            eventType: "creator_contract_signed",
            actorId: "creator_1",
            actorRole: "creator",
            actorLabel: "Creator",
            timestamp: 1_710_000_000_000,
            summary: "creator_contract_signed",
        })).toBe("Creator signed agreement");
    });
});

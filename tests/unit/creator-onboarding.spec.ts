import { describe, expect, it } from "vitest";

import {
    describeCreatorOnboardingBlockingReason,
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
    });

    it("builds creator waitlist status messaging from canonical backend state", () => {
        expect(getCreatorOnboardingStatusSummary({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            idVerificationStatus: "id_requested",
            legalStatus: "legal_pending",
            segmentationStatus: "segment_unassigned",
            blockingReasons: ["awaiting_legal", "awaiting_id_submission", "awaiting_segment_assignment"],
            readyForApproval: false,
        })).toMatchObject({
            label: "id requested",
            summary: "Your next step is to upload the front and back of your ID from this page so review can continue.",
        });

        expect(getCreatorOnboardingStatusSummary({
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_approved",
            idVerificationStatus: "id_verified",
            legalStatus: "legal_signed",
            segmentationStatus: "segment_assigned",
            blockingReasons: ["role_activation_blocked"],
            readyForApproval: false,
        })).toMatchObject({
            label: "creator approved",
            summary: "Approval is recorded, but the creator role cannot activate until the remaining review requirements are resolved.",
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
            bypassFanOnboarding: true,
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
        expect(getCreatorOnboardingIdDocumentSummary(canonical)).toMatchObject({
            count: 2,
            complete: true,
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
            metadata: {
                source: "admin",
            },
        })).toMatchObject({
            eventType: "creator_approved",
            actorRole: "admin",
            detail: "All review gates are complete.",
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
});

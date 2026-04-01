import { describe, expect, it } from "vitest";

import {
    describeCreatorOnboardingBlockingReason,
    deriveCanonicalCreatorOnboardingStatuses,
    normalizeCreatorOnboardingApprovalStatus,
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

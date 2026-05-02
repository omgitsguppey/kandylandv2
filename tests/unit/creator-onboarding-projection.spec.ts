import { describe, expect, it } from "vitest";

import {
  deriveCreatorPrimaryAction,
  deriveCreatorVisibleStatus,
  normalizeCreatorAdminDetail,
  normalizeCreatorFacingApplication,
  normalizeCreatorOnboardingRecord,
  normalizeCreatorReviewQueueEntry,
} from "@/lib/creator-onboarding-projection";

const baseRecord = {
  userId: "creator_1",
  creatorDisplayName: "Creator One",
  email: "creator@example.com",
  role: "user",
  queuePosition: 42,
  submissionStatus: "awaiting_manual_review",
  approvalStatus: "creator_pending",
  legalStatus: "legal_pending",
  idVerificationStatus: "id_not_requested",
  segmentationStatus: "segment_unassigned",
  contractDocumentStatus: "contract_not_sent",
  creatorSignatureStatus: "signature_pending",
  adminSignatureStatus: "signature_pending",
  introAcknowledgedAt: 1_710_000_000_000,
  submittedAt: 1_710_000_000_000,
  updatedAt: 1_710_000_000_000,
} as const;

describe("creator onboarding projection normalizer", () => {
  it("maps raw canonical statuses to required visible labels", () => {
    const visible = deriveCreatorVisibleStatus({
      role: "user",
      submissionStatus: "awaiting_manual_review",
      approvalStatus: "creator_needs_changes",
      legalStatus: "legal_sent",
      idVerificationStatus: "id_submitted",
      segmentationStatus: "segment_assigned",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_pending",
      adminSignatureStatus: "signature_pending",
      readyForApproval: false,
      introAcknowledgedAt: 1,
    });

    expect(visible.visibleStatusLabels).toMatchObject({
      creatorSignatureStatus: "Waiting for signature",
      contractDocumentStatus: "Agreement sent",
      legalStatus: "Waiting on signatures",
      idVerificationStatus: "ID ready for review",
      segmentationStatus: "Assigned",
      approvalStatus: "Needs changes",
      agreementStatus: "Waiting for signature",
    });
  });

  it("derives primary actions from legal, ID, and approval state", () => {
    expect(deriveCreatorPrimaryAction({ ...baseRecord, role: "user", readyForApproval: false, introAcknowledgedAt: undefined })).toBe("Waiting for intro");
    expect(deriveCreatorPrimaryAction({ ...baseRecord, role: "user", readyForApproval: false })).toBe("Request ID upload");
    expect(deriveCreatorPrimaryAction({ ...baseRecord, role: "user", readyForApproval: false, idVerificationStatus: "id_verified" })).toBe("Send agreement");
    expect(deriveCreatorPrimaryAction({
      ...baseRecord,
      role: "user",
      readyForApproval: false,
      idVerificationStatus: "id_verified",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
    })).toBe("Countersign agreement");
    expect(deriveCreatorPrimaryAction({
      ...baseRecord,
      role: "user",
      readyForApproval: true,
      idVerificationStatus: "id_verified",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
    })).toBe("Approve creator");
  });

  it("normalizes legacy creatorApplication into canonical projection display", () => {
    const normalized = normalizeCreatorOnboardingRecord({
      uid: "creator_1",
      email: "creator@example.com",
      displayName: "Creator One",
      role: "user",
      creatorApplication: {
        creatorDisplayName: "Creator One",
        status: "waitlist",
        legalDocumentStatus: "opened",
        idVerificationStatus: "submitted",
        segmentationStatus: "segmented",
        queuePosition: 42,
        updatedAt: 1_710_000_000_000,
      },
    });

    expect(normalized).toMatchObject({
      userId: "creator_1",
      legalStatus: "legal_sent",
      idVerificationStatus: "id_submitted",
      segmentationStatus: "segment_assigned",
      visibleStatusLabels: {
        legalStatus: "Waiting on signatures",
        idVerificationStatus: "ID ready for review",
        segmentationStatus: "Assigned",
      },
      normalizedProjectionDebug: {
        normalizedFromLegacy: true,
        canonicalSourceUsed: false,
      },
    });
  });

  it("normalizes queue, creator-facing, and admin detail projections through one helper", () => {
    expect(normalizeCreatorReviewQueueEntry(baseRecord, { source: "projection" })).toMatchObject({
      userId: "creator_1",
      primaryAction: "Request ID upload",
      visibleStatusLabels: {
        idVerificationStatus: "ID not requested",
      },
    });
    expect(normalizeCreatorFacingApplication(baseRecord, { source: "legacy" })).toMatchObject({
      normalizedProjectionDebug: {
        normalizedFromLegacy: true,
      },
    });
    expect(normalizeCreatorAdminDetail(baseRecord, { source: "canonical" })).toMatchObject({
      primaryAction: "Request ID upload",
      debug: {
        canonicalSourceUsed: true,
      },
    });
  });

  it("keeps raw enum values available in debug without using them as visible labels", () => {
    const normalized = normalizeCreatorOnboardingRecord(baseRecord, { source: "canonical" });

    expect(normalized?.normalizedProjectionDebug.rawStatusValues).toMatchObject({
      legalStatus: "legal_pending",
      idVerificationStatus: "id_not_requested",
    });
    expect(Object.values(normalized?.visibleStatusLabels ?? {})).not.toContain("legal_pending");
    expect(Object.values(normalized?.visibleStatusLabels ?? {})).not.toContain("id_not_requested");
  });
});

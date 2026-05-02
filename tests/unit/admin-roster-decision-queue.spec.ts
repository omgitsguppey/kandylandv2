import { describe, expect, it } from "vitest";

import {
  buildPrimaryActionLabel,
  buildRosterTelemetryPayload,
  classifyRosterDecisionEntry,
  formatAgreementStatus,
  formatApprovalStatus,
  formatIdStatus,
  formatIntakeStatus,
  ROSTER_DECISION_TABS,
  ROSTER_DETAIL_SECTION_KEYS,
} from "@/app/admin/roster/decision-queue";

const baseEntry = {
  uid: "creator_1",
  role: "user" as const,
  submissionStatus: "awaiting_manual_review" as const,
  approvalStatus: "creator_pending" as const,
  legalStatus: "legal_pending" as const,
  idVerificationStatus: "id_not_requested" as const,
  contractDocumentStatus: "contract_not_sent" as const,
  creatorSignatureStatus: "signature_pending" as const,
  adminSignatureStatus: "signature_pending" as const,
  readyForApproval: false,
  introAcknowledgedAt: 1_710_000_000_000,
};

describe("admin roster decision queue helpers", () => {
  it("uses decision queue tabs", () => {
    expect(ROSTER_DECISION_TABS.map((tab) => tab.label)).toEqual([
      "Needs Review",
      "Waiting",
      "Approved",
      "Create",
    ]);
    expect(ROSTER_DETAIL_SECTION_KEYS).toContain("account_controls");
    expect(ROSTER_DETAIL_SECTION_KEYS).toContain("fan_experience_settings");
    expect(ROSTER_DETAIL_SECTION_KEYS).toContain("agreement_document");
    expect(ROSTER_DETAIL_SECTION_KEYS).toContain("agreement_templates");
    expect(ROSTER_DETAIL_SECTION_KEYS).not.toContain("agreement_record");
  });

  it("classifies creator records by next decision", () => {
    expect(classifyRosterDecisionEntry(baseEntry)).toBe("needs_review");
    expect(classifyRosterDecisionEntry({ ...baseEntry, introAcknowledgedAt: undefined })).toBe("waiting");
    expect(classifyRosterDecisionEntry({ ...baseEntry, idVerificationStatus: "id_requested" })).toBe("waiting");
    expect(classifyRosterDecisionEntry({ ...baseEntry, role: "creator" })).toBe("approved");
    expect(classifyRosterDecisionEntry({ ...baseEntry, approvalStatus: "creator_approved" })).toBe("approved");
  });

  it("maps primary action labels to plain English", () => {
    expect(buildPrimaryActionLabel({ ...baseEntry, introAcknowledgedAt: undefined })).toBe("Waiting for intro");
    expect(buildPrimaryActionLabel(baseEntry)).toBe("Request ID upload");
    expect(buildPrimaryActionLabel({ ...baseEntry, idVerificationStatus: "id_verified" })).toBe("Send agreement");
    expect(buildPrimaryActionLabel({
      ...baseEntry,
      idVerificationStatus: "id_verified",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
    })).toBe("Countersign agreement");
    expect(buildPrimaryActionLabel({
      ...baseEntry,
      idVerificationStatus: "id_verified",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      readyForApproval: true,
    })).toBe("Approve creator");
  });

  it("formats status labels without raw enum text", () => {
    const labels = [
      formatIntakeStatus(baseEntry),
      formatAgreementStatus(baseEntry),
      formatIdStatus("id_not_requested"),
      formatIdStatus("id_submitted"),
      formatApprovalStatus("creator_needs_changes", "user"),
    ];

    expect(labels).toEqual([
      "Ready for review",
      "Agreement not sent",
      "ID not requested",
      "ID ready for review",
      "Needs changes",
    ]);

    labels.forEach((label) => {
      expect(label).not.toMatch(/signature_pending|id_not_requested|segment_unassigned|creator_needs_changes/);
    });
  });

  it("builds identity-marked telemetry payloads for admin roster actions", () => {
    expect(buildRosterTelemetryPayload({
      isOwner: false,
      actorUid: "admin_1",
      actorEmail: "admin@example.com",
      targetUserId: "creator_1",
      tab: "needs_review",
      actionKey: "admin_creator_record_opened",
    })).toMatchObject({
      actorType: "admin",
      actorUid: "admin_1",
      targetUserId: "creator_1",
      performedAs: "admin_on_behalf",
      tab: "needs_review",
      actionKey: "admin_creator_record_opened",
      actorMarkerPresent: true,
      rosterMode: "decision_queue",
    });
  });

  it("builds identity-marked telemetry payloads for creator view-as actions", () => {
    const payload = buildRosterTelemetryPayload({
      isOwner: false,
      actorUid: "admin_1",
      actorEmail: "admin@example.com",
      targetUserId: "creator_1",
      tab: "approved",
      actionKey: "admin_view_as_creator_started",
    });

    expect(payload).toMatchObject({
      actorType: "admin",
      targetUserId: "creator_1",
      performedAs: "admin_view_as_creator",
      actionKey: "admin_view_as_creator_started",
    });
  });

  it("marks owner telemetry distinctly", () => {
    expect(buildRosterTelemetryPayload({
      isOwner: true,
      actorUid: "owner_1",
      targetUserId: "creator_1",
      tab: "approved",
      actionKey: "owner_controls",
      sectionKey: "owner_controls",
    })).toMatchObject({
      actorType: "owner_admin",
      performedAs: "admin_on_behalf",
      sectionKey: "owner_controls",
    });
  });
});

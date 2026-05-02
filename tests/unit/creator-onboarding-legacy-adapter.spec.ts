import { describe, expect, it } from "vitest";

import {
  buildCreatorApplicationProjection,
  mapLegacyCreatorApplicationToCanonical,
  needsCreatorOnboardingBackfill,
  readLegacyCreatorApplicationFromUser,
} from "@/lib/server/creator-onboarding-legacy-adapter";

describe("creator onboarding legacy adapter", () => {
  it("maps a legacy pending creatorApplication to canonical pending onboarding", () => {
    const result = mapLegacyCreatorApplicationToCanonical({
      userId: "legacy_creator_1",
      userDoc: {
        uid: "legacy_creator_1",
        email: "creator@example.com",
        displayName: "Legacy Creator",
        username: "legacy-creator",
        role: "user",
        createdAt: 1_710_000_000_000,
        creatorApplication: {
          signupType: "creator",
          creatorDisplayName: "Legacy Creator",
          creatorPrimaryPlatform: "TikTok",
          creatorContentFocus: "Behind the scenes",
          queuePosition: 4,
          submissionStatus: "awaiting_manual_review",
          approvalStatus: "creator_pending",
          legalStatus: "legal_pending",
          idVerificationStatus: "id_not_requested",
          segmentationStatus: "segment_unassigned",
          submittedAt: 1_710_000_000_100,
          updatedAt: 1_710_000_000_200,
        },
      },
      nowMs: 1_710_000_000_300,
    });

    expect(result.legacyCreatorApplicationDetected).toBe(true);
    expect(result.legacyCreatorApplicationMapped).toBe(true);
    expect(result.mappingConfidence).toBe("high");
    expect(result.canonical).toMatchObject({
      userId: "legacy_creator_1",
      submissionStatus: "awaiting_manual_review",
      approvalStatus: "creator_pending",
      legalStatus: "legal_pending",
      idVerificationStatus: "id_not_requested",
      creatorDisplayName: "Legacy Creator",
      legacyCreatorApplicationDetected: true,
      legacyCreatorApplicationMapped: true,
    });
    expect(result.projection).toMatchObject({
      signupType: "creator",
      creatorDisplayName: "Legacy Creator",
      approvalStatus: "creator_pending",
    });
  });

  it("maps legacy approved applications without inventing missing signature evidence", () => {
    const result = mapLegacyCreatorApplicationToCanonical({
      userId: "legacy_creator_approved",
      userDoc: {
        uid: "legacy_creator_approved",
        email: "approved@example.com",
        displayName: "Approved Legacy",
        role: "user",
        creatorApplication: {
          signupType: "creator",
          creatorDisplayName: "Approved Legacy",
          submissionStatus: "awaiting_manual_review",
          approvalStatus: "creator_approved",
          legalStatus: "legal_signed",
          contractDocumentStatus: "contract_sent",
          creatorSignatureStatus: "signature_signed",
          adminSignatureStatus: "signature_signed",
          idVerificationStatus: "id_verified",
          segmentationStatus: "segment_assigned",
          submittedAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_100,
        },
      },
      nowMs: 1_710_000_000_200,
    });

    expect(result.canonical).toMatchObject({
      approvalStatus: "creator_approved",
      legalStatus: "legal_sent",
      contractDocumentStatus: "contract_sent",
      creatorSignatureStatus: "signature_pending",
      adminSignatureStatus: "signature_pending",
      readyForApproval: false,
    });
    expect(result.mappingWarnings).toEqual(expect.arrayContaining([
      "legacy_signed_without_signature_evidence",
      "legacy_creator_signature_without_evidence",
      "legacy_admin_signature_without_evidence",
    ]));
    expect(result.blockingRisks).toEqual(expect.arrayContaining([
      "legacy_legal_signature_evidence_missing",
      "approved_without_verified_legal_signature",
    ]));
  });

  it("does not overwrite an existing canonical onboarding record with weaker legacy data", () => {
    const existingCanonical = mapLegacyCreatorApplicationToCanonical({
      userId: "canonical_creator",
      userDoc: {
        uid: "canonical_creator",
        email: "canonical@example.com",
        displayName: "Canonical Creator",
        role: "user",
        creatorApplication: {
          signupType: "creator",
          creatorDisplayName: "Canonical Creator",
          submissionStatus: "awaiting_manual_review",
          approvalStatus: "creator_pending",
          legalStatus: "legal_pending",
          idVerificationStatus: "id_not_requested",
          segmentationStatus: "segment_unassigned",
          submittedAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_100,
        },
      },
      nowMs: 1_710_000_000_100,
    }).canonical;

    const skipped = mapLegacyCreatorApplicationToCanonical({
      userId: "canonical_creator",
      existingCanonical,
      userDoc: {
        uid: "canonical_creator",
        email: "canonical@example.com",
        displayName: "Canonical Creator",
        role: "user",
        creatorApplication: {
          signupType: "creator",
          creatorDisplayName: "Weaker Legacy",
          approvalStatus: "creator_approved",
          legalStatus: "legal_signed",
          idVerificationStatus: "id_verified",
        },
      },
      nowMs: 1_710_000_000_200,
    });

    expect(skipped.legacyCreatorApplicationSkipped).toBe(true);
    expect(skipped.canonical?.creatorDisplayName).toBe("Canonical Creator");
    expect(skipped.blockingRisks).toContain("canonical_record_exists");
    expect(skipped.recommendedAction).toContain("do not overwrite");
  });

  it("builds a users.creatorApplication-compatible projection", () => {
    const result = mapLegacyCreatorApplicationToCanonical({
      userId: "projection_creator",
      userDoc: {
        uid: "projection_creator",
        email: "projection@example.com",
        role: "user",
        creatorApplication: {
          signupType: "creator",
          creatorDisplayName: "Projection Creator",
          creatorPrimaryPlatform: "Instagram",
          submissionStatus: "awaiting_manual_review",
          approvalStatus: "creator_pending",
          legalStatus: "legal_pending",
          idVerificationStatus: "id_not_requested",
          segmentationStatus: "segment_unassigned",
          submittedAt: 1_710_000_000_000,
          updatedAt: 1_710_000_000_100,
        },
      },
      nowMs: 1_710_000_000_200,
    });

    expect(readLegacyCreatorApplicationFromUser({
      uid: "projection_creator",
      creatorApplication: result.projection,
    })).toBeTruthy();
    expect(needsCreatorOnboardingBackfill({
      uid: "projection_creator",
      creatorApplication: result.projection,
    })).toBe(true);
    expect(buildCreatorApplicationProjection(result.canonical!)).toMatchObject({
      signupType: "creator",
      creatorDisplayName: "Projection Creator",
      creatorPrimaryPlatform: "Instagram",
      approvalStatus: "creator_pending",
      creatorReviewQueueVisible: true,
    });
  });
});

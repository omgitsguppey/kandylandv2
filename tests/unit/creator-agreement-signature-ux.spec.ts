import { describe, expect, it } from "vitest";

import {
  buildCreatorAgreementTelemetryPayload,
  buildDefaultCreatorAgreementAcknowledgements,
  getCreatorAgreementSignatureReadiness,
  getCreatorAgreementStatusCopy,
  hasRequiredCreatorAgreementAcknowledgements,
  normalizeCreatorAgreementAcknowledgements,
} from "@/lib/creator-agreement-signature-ux";

const COMPLETE_ACKNOWLEDGEMENTS = {
  tools_activate_after_approval: true,
  access_may_pause_for_review: true,
  signature_record_stored: true,
  full_agreement_reviewed: true,
};

describe("creator agreement signature UX helpers", () => {
  it("requires every acknowledgement before signing", () => {
    expect(buildDefaultCreatorAgreementAcknowledgements()).toMatchObject({
      tools_activate_after_approval: false,
      access_may_pause_for_review: false,
      signature_record_stored: false,
      full_agreement_reviewed: false,
    });
    expect(hasRequiredCreatorAgreementAcknowledgements(COMPLETE_ACKNOWLEDGEMENTS)).toBe(true);
    expect(hasRequiredCreatorAgreementAcknowledgements({
      ...COMPLETE_ACKNOWLEDGEMENTS,
      full_agreement_reviewed: false,
    })).toBe(false);
    expect(normalizeCreatorAgreementAcknowledgements({
      ...COMPLETE_ACKNOWLEDGEMENTS,
      extra: true,
    })).toEqual(COMPLETE_ACKNOWLEDGEMENTS);
  });

  it("blocks signing until dispatch, version, hash, identity, source, and acknowledgements are ready", () => {
    expect(getCreatorAgreementSignatureReadiness({
      isAuthenticated: true,
      isAlreadySigned: false,
      contractDocumentStatus: "contract_sent",
      agreementVersion: "mgsa_2026_v1",
      agreementHash: "",
      dispatchId: "dispatch_1",
      signerName: "Creator One",
      signerEmail: "creator@example.com",
      contentSourceAvailable: true,
      acknowledgementValues: COMPLETE_ACKNOWLEDGEMENTS,
    })).toMatchObject({
      canSign: false,
      buttonLabel: "Review agreement to continue",
      missingReasons: expect.arrayContaining(["Agreement hash is missing."]),
    });

    expect(getCreatorAgreementSignatureReadiness({
      isAuthenticated: true,
      isAlreadySigned: false,
      contractDocumentStatus: "contract_sent",
      agreementVersion: "mgsa_2026_v1",
      agreementHash: "sha256:ok",
      dispatchId: "dispatch_1",
      signerName: "Creator One",
      signerEmail: "creator@example.com",
      contentSourceAvailable: true,
      acknowledgementValues: COMPLETE_ACKNOWLEDGEMENTS,
    })).toMatchObject({
      canSign: true,
      buttonLabel: "Sign creator agreement",
    });
  });

  it("maps creator-facing status copy without raw legal enum labels", () => {
    const statuses = [
      getCreatorAgreementStatusCopy({ contractDocumentStatus: "contract_not_sent" }),
      getCreatorAgreementStatusCopy({
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_pending",
      }),
      getCreatorAgreementStatusCopy({
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_signed",
        adminSignatureStatus: "signature_pending",
      }),
      getCreatorAgreementStatusCopy({
        contractDocumentStatus: "contract_sent",
        creatorSignatureStatus: "signature_signed",
        adminSignatureStatus: "signature_signed",
        legalStatus: "legal_signed",
      }),
    ];

    expect(statuses.map((status) => status.label)).toEqual([
      "Agreement not sent yet",
      "Ready to review",
      "Waiting for admin countersign",
      "Agreement complete",
    ]);
    expect(JSON.stringify(statuses)).not.toContain("signature_pending");
    expect(JSON.stringify(statuses)).not.toContain("legal_signed");
  });

  it("builds actor-marked agreement telemetry payloads", () => {
    expect(buildCreatorAgreementTelemetryPayload({
      actorUid: "creator_1",
      actorEmail: "creator@example.com",
      actionKey: "creator_agreement_signed",
      agreementVersion: "mgsa_2026_v1",
      agreementHash: "sha256:ok",
      dispatchId: "dispatch_1",
    })).toMatchObject({
      actorType: "user",
      actorUid: "creator_1",
      actorEmail: "creator@example.com",
      targetUserId: "creator_1",
      performedAs: "own_account",
      surface: "creator_intake",
      actionKey: "creator_agreement_signed",
      agreementVersion: "mgsa_2026_v1",
      agreementHash: "sha256:ok",
      dispatchId: "dispatch_1",
      actorMarkerPresent: true,
    });
  });
});

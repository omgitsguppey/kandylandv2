import { describe, expect, it } from "vitest";

import {
  ACTIVE_CREATOR_AGREEMENT_HASH,
  getActiveCreatorAgreementTemplate,
  getActiveCreatorAgreementVersion,
  assertAgreementEvidenceComplete,
  compareSignedAgreementToActive,
  resolveCreatorAgreementForUser,
} from "@/lib/creator-agreement-version";

describe("creator agreement version truth helpers", () => {
  it("active version resolves with template evidence", () => {
    const template = getActiveCreatorAgreementTemplate(1_710_000_000_000);

    expect(getActiveCreatorAgreementVersion()).toBe("mgsa_2026_v1");
    expect(template).toMatchObject({
      agreementVersion: "mgsa_2026_v1",
      agreementHash: ACTIVE_CREATOR_AGREEMENT_HASH,
      activeForNewCreators: true,
      effectiveAt: 1_710_000_000_000,
      embeddedFullTextReference: expect.stringContaining("creator-contract"),
    });
  });

  it("requires version, hash, and source snapshot for signature evidence", () => {
    const complete = assertAgreementEvidenceComplete({
      userId: "creator_1",
      dispatchId: "dispatch_1",
      agreementVersion: "mgsa_2026_v1",
      agreementHash: "sha256:ok",
      agreementSource: "native_full_text",
      embeddedFullTextReference: "src/lib/creator-contract.ts#CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS",
      signerUid: "creator_1",
      signerName: "Creator One",
      signerEmail: "creator@example.com",
      signerIp: "127.0.0.1",
      signerUserAgent: "Vitest",
      signedAt: 1_710_000_100_000,
    }, {
      requireSignatureEvidence: true,
      requireSourceSnapshot: true,
    });

    expect(complete).toMatchObject({
      evidenceComplete: true,
      missingEvidenceFields: [],
    });
  });

  it("missing hash fails signature evidence", () => {
    const incomplete = assertAgreementEvidenceComplete({
      userId: "creator_1",
      dispatchId: "dispatch_1",
      agreementVersion: "mgsa_2026_v1",
      agreementSource: "native_full_text",
      embeddedFullTextReference: "src/lib/creator-contract.ts#CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS",
      signerUid: "creator_1",
      signerName: "Creator One",
      signerIp: "127.0.0.1",
      signerUserAgent: "Vitest",
      signedAt: 1_710_000_100_000,
    }, {
      requireSignatureEvidence: true,
      requireSourceSnapshot: true,
    });

    expect(incomplete.evidenceComplete).toBe(false);
    expect(incomplete.missingEvidenceFields).toContain("agreementHash");
  });

  it("blocks countersign mismatch before legal completion", () => {
    const comparison = compareSignedAgreementToActive({
      agreementVersion: "agreement_v2",
      agreementHash: "sha256:v2",
      agreementSource: "uploaded_pdf_snapshot",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      legalStatus: "legal_signed",
      creatorSignatureAgreementVersion: "agreement_v2",
      creatorSignatureAgreementHash: "sha256:v2",
      adminSignatureAgreementVersion: "agreement_v3",
      adminSignatureAgreementHash: "sha256:v3",
    });

    expect(comparison.signaturesVersionMatch).toBe(false);
    expect(comparison.legalSignedAllowed).toBe(false);
  });

  it("signed old version remains valid after the active version changes", () => {
    const comparison = compareSignedAgreementToActive({
      agreementVersion: "agreement_v1",
      agreementHash: "sha256:v1",
      agreementSource: "uploaded_pdf_snapshot",
      creatorSignatureStatus: "signature_signed",
      adminSignatureStatus: "signature_signed",
      legalStatus: "legal_signed",
      creatorSignatureAgreementVersion: "agreement_v1",
      creatorSignatureAgreementHash: "sha256:v1",
      adminSignatureAgreementVersion: "agreement_v1",
      adminSignatureAgreementHash: "sha256:v1",
    }, {
      templateId: "creator_agreement_v2",
      agreementVersion: "agreement_v2",
      agreementTitle: "Creator Agreement v2",
      agreementHash: "sha256:v2",
      agreementSource: "uploaded_pdf_snapshot",
      activeForNewCreators: true,
      effectiveAt: 1_710_000_000_000,
      pdfStoragePath: "creator-agreements/v2/source.pdf",
    });

    expect(comparison.versionMatchesActive).toBe(false);
    expect(comparison.signaturesVersionMatch).toBe(true);
    expect(comparison.signedAgreementStillValid).toBe(true);
    expect(comparison.legalSignedAllowed).toBe(true);
  });

  it("uses active agreement for new creators and preserves dispatched user versions", () => {
    expect(resolveCreatorAgreementForUser("new_creator").displaySource).toBe("active_template");

    expect(resolveCreatorAgreementForUser("creator_1", {
      record: {
        contractVersion: "agreement_v1",
        agreementHash: "sha256:v1",
        agreementSource: "uploaded_pdf_snapshot",
        agreementDispatchId: "dispatch_v1",
        creatorSignatureStatus: "signature_signed",
      },
    })).toMatchObject({
      agreementVersion: "agreement_v1",
      agreementHash: "sha256:v1",
      displaySource: "user_dispatch",
      existingSignedVersionPreserved: true,
    });
  });
});

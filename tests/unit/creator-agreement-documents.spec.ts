import { describe, expect, it } from "vitest";

import {
  buildCreatorAgreementDispatch,
  buildCreatorAgreementSignature,
  buildCreatorAgreementTemplateId,
  buildDefaultCreatorAgreementTemplate,
  normalizeCreatorAgreementDispatch,
  normalizeCreatorAgreementTemplate,
  toCreatorAgreementTemplateAdminView,
} from "@/lib/creator-agreement-documents";

describe("creator agreement document contract helpers", () => {
  it("creates versioned template ids and active admin views", () => {
    const template = buildDefaultCreatorAgreementTemplate(1_710_000_000_000);

    expect(buildCreatorAgreementTemplateId({ agreementVersion: "DNS 2026 v2" })).toBe("creator_agreement_dns-2026-v2");
    expect(toCreatorAgreementTemplateAdminView(template)).toMatchObject({
      agreementVersion: template.agreementVersion,
      agreementHashAvailable: true,
      fullDocumentAvailable: true,
      activeForNewCreators: true,
    });
  });

  it("normalizes template records without leaking storage paths into admin view", () => {
    const normalized = normalizeCreatorAgreementTemplate({
      templateId: "creator_agreement_dns_2026_v2",
      agreementVersion: "dns_2026_v2",
      agreementTitle: "DNS Creator Agreement",
      agreementSource: "uploaded_pdf_snapshot",
      activeForNewCreators: false,
      pdfStoragePath: "creator-agreements/dns_2026_v2/source.pdf",
      agreementHash: "sha256:abc",
      summaryBullets: ["One", "Two"],
      createdAt: 1_710_000_000_000,
      createdByUid: "owner_1",
    });

    expect(normalized).toMatchObject({
      agreementVersion: "dns_2026_v2",
      pdfStoragePath: "creator-agreements/dns_2026_v2/source.pdf",
      agreementHash: "sha256:abc",
    });
    expect(toCreatorAgreementTemplateAdminView(normalized!)).not.toHaveProperty("pdfStoragePath");
  });

  it("builds dispatch and signature evidence with stable version/hash fields", () => {
    const template = {
      ...buildDefaultCreatorAgreementTemplate(1_710_000_000_000),
      templateId: "template_v2",
      agreementVersion: "v2",
      agreementHash: "sha256:v2",
    };
    const dispatch = buildCreatorAgreementDispatch({
      userId: "creator_1",
      sentByUid: "admin_1",
      template,
      sentAt: 1_710_000_100_000,
    });
    const signature = buildCreatorAgreementSignature({
      dispatch,
      agreementSource: "uploaded_pdf_snapshot",
      pdfStoragePath: "creator-agreements/v2/source.pdf",
      signerUid: "creator_1",
      signerName: "Creator One",
      signedAt: 1_710_000_200_000,
    });

    expect(dispatch).toMatchObject({
      userId: "creator_1",
      sentByUid: "admin_1",
      agreementVersion: "v2",
      templateId: "template_v2",
      agreementHash: "sha256:v2",
      status: "sent",
    });
    expect(signature).toMatchObject({
      dispatchId: dispatch.dispatchId,
      agreementVersion: "v2",
      templateId: "template_v2",
      agreementHash: "sha256:v2",
      agreementSource: "uploaded_pdf_snapshot",
      pdfStoragePath: "creator-agreements/v2/source.pdf",
      signerUid: "creator_1",
    });
    expect(normalizeCreatorAgreementDispatch(dispatch)).toMatchObject(dispatch);
  });
});

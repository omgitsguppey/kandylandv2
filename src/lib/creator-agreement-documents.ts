import {
  CREATOR_CONTRACT_SUMMARY_BULLETS,
  CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
} from "@/lib/creator-contract";
import {
  ACTIVE_CREATOR_AGREEMENT_HASH,
  ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE,
  ACTIVE_CREATOR_AGREEMENT_TITLE,
  compareSignedAgreementToActive,
  buildCreatorAgreementTemplateIdFromVersion,
  getActiveCreatorAgreementTemplate as getDefaultActiveCreatorAgreementTemplate,
} from "@/lib/creator-agreement-version";

export const CREATOR_AGREEMENT_TEMPLATE_COLLECTION = "creator_agreement_templates";
export const CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID = "active";
export const CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION = "agreement_dispatches";
export const CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION = "agreement_signatures";

export const CREATOR_AGREEMENT_SOURCES = [
  "native_full_text",
  "uploaded_pdf_snapshot",
  "hybrid",
] as const;

export type CreatorAgreementSource = (typeof CREATOR_AGREEMENT_SOURCES)[number];

export const CREATOR_AGREEMENT_DISPATCH_STATUSES = [
  "sent",
  "viewed",
  "signed",
  "superseded",
] as const;

export type CreatorAgreementDispatchStatus = (typeof CREATOR_AGREEMENT_DISPATCH_STATUSES)[number];

export const CREATOR_AGREEMENT_DELIVERY_METHODS = ["in_app"] as const;
export type CreatorAgreementDeliveryMethod = (typeof CREATOR_AGREEMENT_DELIVERY_METHODS)[number];

export const DEFAULT_CREATOR_AGREEMENT_TEMPLATE_ID = buildCreatorAgreementTemplateIdFromVersion(
  getDefaultActiveCreatorAgreementTemplate().agreementVersion,
);
export const DEFAULT_CREATOR_AGREEMENT_TITLE = ACTIVE_CREATOR_AGREEMENT_TITLE;
export const DEFAULT_CREATOR_AGREEMENT_HASH = ACTIVE_CREATOR_AGREEMENT_HASH;

export type CreatorAgreementTemplate = {
  templateId: string;
  agreementVersion: string;
  agreementTitle: string;
  agreementSource: CreatorAgreementSource;
  activeForNewCreators: boolean;
  fullTextStoragePath?: string;
  fullTextSnapshotPath?: string;
  pdfStoragePath?: string;
  embeddedFullTextReference?: string;
  agreementHash: string;
  summaryBullets: string[];
  createdAt: number;
  createdByUid: string;
  activatedAt?: number;
  activatedByUid?: string;
  effectiveAt?: number;
  supersedesVersion?: string;
};

export type CreatorAgreementDispatch = {
  dispatchId: string;
  userId: string;
  agreementVersion: string;
  templateId: string;
  agreementHash: string;
  sentAt: number;
  sentByUid: string;
  deliveryMethod: CreatorAgreementDeliveryMethod;
  status: CreatorAgreementDispatchStatus;
  supersededByDispatchId?: string;
};

export type CreatorAgreementSignature = {
  dispatchId: string;
  userId: string;
  agreementVersion: string;
  templateId: string;
  agreementHash: string;
  agreementSource: CreatorAgreementSource;
  pdfStoragePath?: string;
  fullTextSnapshotPath?: string;
  embeddedFullTextReference?: string;
  signerUid: string;
  signerName: string;
  signerEmail?: string;
  signedAt: number;
  signerIp?: string;
  signerUserAgent?: string;
  acknowledgementValues: Record<string, unknown>;
};

export type CreatorAgreementTemplateAdminView = {
  templateId: string;
  agreementVersion: string;
  agreementTitle: string;
  agreementSource: CreatorAgreementSource;
  activeForNewCreators: boolean;
  fullDocumentAvailable: boolean;
  agreementHashAvailable: boolean;
  agreementHash: string;
  summaryBullets: string[];
  createdAt: number;
  activatedAt?: number;
  effectiveAt?: number;
  supersedesVersion?: string;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => readString(entry)).filter(Boolean).slice(0, 8)
    : [];
}

function normalizeAgreementSource(value: unknown): CreatorAgreementSource {
  return CREATOR_AGREEMENT_SOURCES.includes(value as CreatorAgreementSource)
    ? value as CreatorAgreementSource
    : "native_full_text";
}

function normalizeDispatchStatus(value: unknown): CreatorAgreementDispatchStatus {
  return CREATOR_AGREEMENT_DISPATCH_STATUSES.includes(value as CreatorAgreementDispatchStatus)
    ? value as CreatorAgreementDispatchStatus
    : "sent";
}

export function sanitizeCreatorAgreementTemplateId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function buildCreatorAgreementTemplateId(input: {
  agreementVersion: string;
  agreementTitle?: string | null;
}) {
  const versionId = sanitizeCreatorAgreementTemplateId(input.agreementVersion);
  if (versionId) {
    return buildCreatorAgreementTemplateIdFromVersion(versionId);
  }

  return sanitizeCreatorAgreementTemplateId(`creator_agreement_${input.agreementTitle || "draft"}`)
    || DEFAULT_CREATOR_AGREEMENT_TEMPLATE_ID;
}

export function buildDefaultCreatorAgreementTemplate(nowMs = 0): CreatorAgreementTemplate {
  const activeTemplate = getDefaultActiveCreatorAgreementTemplate(nowMs);

  return {
    templateId: activeTemplate.templateId,
    agreementVersion: activeTemplate.agreementVersion,
    agreementTitle: activeTemplate.agreementTitle,
    agreementSource: activeTemplate.agreementSource,
    activeForNewCreators: true,
    agreementHash: activeTemplate.agreementHash,
    embeddedFullTextReference: activeTemplate.embeddedFullTextReference,
    summaryBullets: [...CREATOR_CONTRACT_SUMMARY_BULLETS],
    createdAt: nowMs,
    createdByUid: "system",
    activatedAt: nowMs || undefined,
    activatedByUid: "system",
    effectiveAt: activeTemplate.effectiveAt,
  };
}

export function normalizeCreatorAgreementTemplate(value: unknown): CreatorAgreementTemplate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const agreementVersion = readString(source.agreementVersion);
  const agreementTitle = readString(source.agreementTitle);
  const agreementHash = readString(source.agreementHash);
  const createdAt = readOptionalTimestamp(source.createdAt);
  const createdByUid = readString(source.createdByUid);
  const templateId = readString(source.templateId)
    || buildCreatorAgreementTemplateId({ agreementVersion, agreementTitle });

  if (!templateId || !agreementVersion || !agreementTitle || !agreementHash || !createdAt || !createdByUid) {
    return null;
  }

  const agreementSource = normalizeAgreementSource(source.agreementSource);

  return {
    templateId,
    agreementVersion,
    agreementTitle,
    agreementSource,
    activeForNewCreators: source.activeForNewCreators === true,
    fullTextStoragePath: readString(source.fullTextStoragePath) || undefined,
    fullTextSnapshotPath: readString(source.fullTextSnapshotPath) || undefined,
    pdfStoragePath: readString(source.pdfStoragePath) || undefined,
    embeddedFullTextReference: readString(source.embeddedFullTextReference)
      || (agreementSource === "native_full_text" ? ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE : undefined),
    agreementHash,
    summaryBullets: readStringArray(source.summaryBullets).length > 0
      ? readStringArray(source.summaryBullets)
      : [...CREATOR_CONTRACT_SUMMARY_BULLETS],
    createdAt,
    createdByUid,
    activatedAt: readOptionalTimestamp(source.activatedAt),
    activatedByUid: readString(source.activatedByUid) || undefined,
    effectiveAt: readOptionalTimestamp(source.effectiveAt),
    supersedesVersion: readString(source.supersedesVersion) || undefined,
  };
}

export function toCreatorAgreementTemplateAdminView(
  template: CreatorAgreementTemplate,
): CreatorAgreementTemplateAdminView {
  return {
    templateId: template.templateId,
    agreementVersion: template.agreementVersion,
    agreementTitle: template.agreementTitle,
    agreementSource: template.agreementSource,
    activeForNewCreators: template.activeForNewCreators,
    fullDocumentAvailable: template.agreementSource === "native_full_text"
      || Boolean(
        template.fullTextStoragePath
        || template.fullTextSnapshotPath
        || template.pdfStoragePath
        || template.embeddedFullTextReference
        || CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0,
      ),
    agreementHashAvailable: Boolean(template.agreementHash),
    agreementHash: template.agreementHash,
    summaryBullets: template.summaryBullets,
    createdAt: template.createdAt,
    activatedAt: template.activatedAt,
    effectiveAt: template.effectiveAt,
    supersedesVersion: template.supersedesVersion,
  };
}

export function buildCreatorAgreementDispatchId(input: {
  userId: string;
  templateId: string;
  agreementVersion: string;
  sentAt: number;
}) {
  const seed = [
    input.userId,
    input.templateId,
    input.agreementVersion,
    Math.trunc(input.sentAt),
  ].join(":");

  return sanitizeCreatorAgreementTemplateId(`agreement_dispatch_${seed}`);
}

export function buildCreatorAgreementDispatch(input: {
  userId: string;
  sentByUid: string;
  template: CreatorAgreementTemplate;
  sentAt: number;
  status?: CreatorAgreementDispatchStatus;
  dispatchId?: string;
  supersededByDispatchId?: string;
}): CreatorAgreementDispatch {
  const dispatchId = readString(input.dispatchId)
    || buildCreatorAgreementDispatchId({
      userId: input.userId,
      templateId: input.template.templateId,
      agreementVersion: input.template.agreementVersion,
      sentAt: input.sentAt,
    });

  return {
    dispatchId,
    userId: input.userId,
    agreementVersion: input.template.agreementVersion,
    templateId: input.template.templateId,
    agreementHash: input.template.agreementHash,
    sentAt: Math.trunc(input.sentAt),
    sentByUid: input.sentByUid,
    deliveryMethod: "in_app",
    status: input.status ?? "sent",
    supersededByDispatchId: readString(input.supersededByDispatchId) || undefined,
  };
}

export function normalizeCreatorAgreementDispatch(value: unknown): CreatorAgreementDispatch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const dispatchId = readString(source.dispatchId);
  const userId = readString(source.userId);
  const agreementVersion = readString(source.agreementVersion);
  const templateId = readString(source.templateId);
  const agreementHash = readString(source.agreementHash);
  const sentAt = readOptionalTimestamp(source.sentAt);
  const sentByUid = readString(source.sentByUid);

  if (!dispatchId || !userId || !agreementVersion || !templateId || !agreementHash || !sentAt || !sentByUid) {
    return null;
  }

  return {
    dispatchId,
    userId,
    agreementVersion,
    templateId,
    agreementHash,
    sentAt,
    sentByUid,
    deliveryMethod: "in_app",
    status: normalizeDispatchStatus(source.status),
    supersededByDispatchId: readString(source.supersededByDispatchId) || undefined,
  };
}

export function buildCreatorAgreementSignature(input: {
  dispatch: CreatorAgreementDispatch;
  agreementSource?: CreatorAgreementSource | null;
  pdfStoragePath?: string | null;
  fullTextSnapshotPath?: string | null;
  embeddedFullTextReference?: string | null;
  signerUid: string;
  signerName: string;
  signerEmail?: string | null;
  signedAt: number;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  acknowledgementValues?: Record<string, unknown>;
}): CreatorAgreementSignature {
  return {
    dispatchId: input.dispatch.dispatchId,
    userId: input.dispatch.userId,
    agreementVersion: input.dispatch.agreementVersion,
    templateId: input.dispatch.templateId,
    agreementHash: input.dispatch.agreementHash,
    agreementSource: input.agreementSource ?? "native_full_text",
    pdfStoragePath: readString(input.pdfStoragePath) || undefined,
    fullTextSnapshotPath: readString(input.fullTextSnapshotPath) || undefined,
    embeddedFullTextReference: readString(input.embeddedFullTextReference) || undefined,
    signerUid: input.signerUid,
    signerName: input.signerName,
    signerEmail: readString(input.signerEmail) || undefined,
    signedAt: Math.trunc(input.signedAt),
    signerIp: readString(input.signerIp) || undefined,
    signerUserAgent: readString(input.signerUserAgent) || undefined,
    acknowledgementValues: input.acknowledgementValues ?? {},
  };
}

export function buildCreatorAgreementDebugFields(input: {
  activeTemplate?: CreatorAgreementTemplate | null;
  selectedAgreementVersion?: string | null;
  selectedAgreementHash?: string | null;
  userAgreementVersion?: string | null;
  userAgreementHash?: string | null;
  creatorSignatureAgreementVersion?: string | null;
  creatorSignatureAgreementHash?: string | null;
  adminSignatureAgreementVersion?: string | null;
  adminSignatureAgreementHash?: string | null;
  legalStatus?: string | null;
  creatorSignatureStatus?: string | null;
  adminSignatureStatus?: string | null;
  dispatch?: CreatorAgreementDispatch | null;
  signatureEvidenceComplete?: boolean;
  missingEvidenceFields?: string[];
  priorAgreementPreserved?: boolean;
  requiresResign?: boolean;
}) {
  const comparison = compareSignedAgreementToActive({
    agreementVersion: input.userAgreementVersion ?? input.selectedAgreementVersion,
    agreementHash: input.userAgreementHash ?? input.selectedAgreementHash,
    creatorSignatureAgreementVersion: input.creatorSignatureAgreementVersion,
    creatorSignatureAgreementHash: input.creatorSignatureAgreementHash,
    adminSignatureAgreementVersion: input.adminSignatureAgreementVersion,
    adminSignatureAgreementHash: input.adminSignatureAgreementHash,
    legalStatus: input.legalStatus,
    creatorSignatureStatus: input.creatorSignatureStatus,
    adminSignatureStatus: input.adminSignatureStatus,
  }, input.activeTemplate ?? getDefaultActiveCreatorAgreementTemplate());

  return {
    activeAgreementVersion: comparison.activeAgreementVersion,
    activeAgreementHash: comparison.activeAgreementHash,
    userAgreementVersion: comparison.userAgreementVersion,
    userAgreementHash: comparison.userAgreementHash,
    versionMatchesActive: comparison.versionMatchesActive,
    signaturesVersionMatch: comparison.signaturesVersionMatch,
    evidenceComplete: input.signatureEvidenceComplete ?? comparison.evidenceComplete,
    missingEvidenceFields: input.missingEvidenceFields ?? comparison.missingEvidenceFields,
    selectedCreatorAgreementVersion: readString(input.selectedAgreementVersion) || null,
    selectedCreatorAgreementHash: readString(input.selectedAgreementHash) || null,
    dispatchStatus: input.dispatch?.status ?? null,
    signatureEvidenceComplete: input.signatureEvidenceComplete === true,
    priorAgreementPreserved: input.priorAgreementPreserved === true,
    requiresResign: input.requiresResign === true,
  };
}

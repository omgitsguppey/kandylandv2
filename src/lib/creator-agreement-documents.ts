import {
  CREATOR_CONTRACT_SUMMARY_BULLETS,
  CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
  CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
} from "@/lib/creator-contract";

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

export const DEFAULT_CREATOR_AGREEMENT_TEMPLATE_ID = "creator_agreement_mgsa_2026_v1";
export const DEFAULT_CREATOR_AGREEMENT_TITLE = "KandyDrops Creator Service Agreement";
export const DEFAULT_CREATOR_AGREEMENT_HASH = "sha256:cdf5886a4c2da3f35b99c6abf0c23d54c54f1aebb09bdc62e807e0b99a5ca5cf";

export type CreatorAgreementTemplate = {
  templateId: string;
  agreementVersion: string;
  agreementTitle: string;
  agreementSource: CreatorAgreementSource;
  activeForNewCreators: boolean;
  fullTextStoragePath?: string;
  pdfStoragePath?: string;
  agreementHash: string;
  summaryBullets: string[];
  createdAt: number;
  createdByUid: string;
  activatedAt?: number;
  activatedByUid?: string;
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
    return `creator_agreement_${versionId}`;
  }

  return sanitizeCreatorAgreementTemplateId(`creator_agreement_${input.agreementTitle || "draft"}`)
    || DEFAULT_CREATOR_AGREEMENT_TEMPLATE_ID;
}

export function buildDefaultCreatorAgreementTemplate(nowMs = 0): CreatorAgreementTemplate {
  return {
    templateId: DEFAULT_CREATOR_AGREEMENT_TEMPLATE_ID,
    agreementVersion: CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
    agreementTitle: DEFAULT_CREATOR_AGREEMENT_TITLE,
    agreementSource: "native_full_text",
    activeForNewCreators: true,
    agreementHash: DEFAULT_CREATOR_AGREEMENT_HASH,
    summaryBullets: [...CREATOR_CONTRACT_SUMMARY_BULLETS],
    createdAt: nowMs,
    createdByUid: "system",
    activatedAt: nowMs || undefined,
    activatedByUid: "system",
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

  return {
    templateId,
    agreementVersion,
    agreementTitle,
    agreementSource: normalizeAgreementSource(source.agreementSource),
    activeForNewCreators: source.activeForNewCreators === true,
    fullTextStoragePath: readString(source.fullTextStoragePath) || undefined,
    pdfStoragePath: readString(source.pdfStoragePath) || undefined,
    agreementHash,
    summaryBullets: readStringArray(source.summaryBullets).length > 0
      ? readStringArray(source.summaryBullets)
      : [...CREATOR_CONTRACT_SUMMARY_BULLETS],
    createdAt,
    createdByUid,
    activatedAt: readOptionalTimestamp(source.activatedAt),
    activatedByUid: readString(source.activatedByUid) || undefined,
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
      || Boolean(template.fullTextStoragePath || template.pdfStoragePath || CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0),
    agreementHashAvailable: Boolean(template.agreementHash),
    agreementHash: template.agreementHash,
    summaryBullets: template.summaryBullets,
    createdAt: template.createdAt,
    activatedAt: template.activatedAt,
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
  dispatch?: CreatorAgreementDispatch | null;
  signatureEvidenceComplete?: boolean;
  priorAgreementPreserved?: boolean;
  requiresResign?: boolean;
}) {
  return {
    activeAgreementVersion: input.activeTemplate?.agreementVersion ?? null,
    activeAgreementHash: input.activeTemplate?.agreementHash ?? null,
    selectedCreatorAgreementVersion: readString(input.selectedAgreementVersion) || null,
    selectedCreatorAgreementHash: readString(input.selectedAgreementHash) || null,
    dispatchStatus: input.dispatch?.status ?? null,
    signatureEvidenceComplete: input.signatureEvidenceComplete === true,
    priorAgreementPreserved: input.priorAgreementPreserved === true,
    requiresResign: input.requiresResign === true,
  };
}

import {
  CREATOR_CONTRACT_SUMMARY_BULLETS,
  CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
  CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
} from "@/lib/creator-contract";

export const ACTIVE_CREATOR_AGREEMENT_TITLE = "KandyDrops Creator Service Agreement";
export const ACTIVE_CREATOR_AGREEMENT_HASH = "sha256:cdf5886a4c2da3f35b99c6abf0c23d54c54f1aebb09bdc62e807e0b99a5ca5cf";
export const ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE =
  "src/lib/creator-contract.ts#CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS";

export type CreatorAgreementTruthSource =
  | "native_full_text"
  | "uploaded_pdf_snapshot"
  | "hybrid";

export type CreatorAgreementTemplateSnapshot = {
  templateId: string;
  agreementVersion: string;
  agreementTitle: string;
  agreementHash: string;
  agreementSource: CreatorAgreementTruthSource;
  activeForNewCreators: boolean;
  effectiveAt?: number;
  supersedesVersion?: string;
  fullTextSnapshotPath?: string;
  fullTextStoragePath?: string;
  pdfStoragePath?: string;
  embeddedFullTextReference?: string;
  summaryBullets?: string[];
  createdAt?: number;
  createdByUid?: string;
  activatedAt?: number;
  activatedByUid?: string;
};

export type CreatorAgreementEvidenceRecord = {
  userId?: string | null;
  dispatchId?: string | null;
  agreementDispatchId?: string | null;
  templateId?: string | null;
  agreementTemplateId?: string | null;
  agreementVersion?: string | null;
  contractVersion?: string | null;
  agreementTitle?: string | null;
  agreementHash?: string | null;
  agreementSource?: string | null;
  activeForNewCreators?: boolean | null;
  effectiveAt?: number | null;
  supersedesVersion?: string | null;
  fullTextSnapshotPath?: string | null;
  fullTextStoragePath?: string | null;
  pdfStoragePath?: string | null;
  embeddedFullTextReference?: string | null;
  legalDocumentUrl?: string | null;
  signerUid?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signedAt?: number | null;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  creatorSignatureStatus?: string | null;
  adminSignatureStatus?: string | null;
  legalStatus?: string | null;
  creatorSignatureAgreementVersion?: string | null;
  creatorSignatureAgreementHash?: string | null;
  adminSignatureAgreementVersion?: string | null;
  adminSignatureAgreementHash?: string | null;
  ownerOverrideActive?: boolean | null;
  ownerOverrideReason?: string | null;
};

export type CreatorAgreementEvidenceCheck = {
  evidenceComplete: boolean;
  missingEvidenceFields: string[];
};

export type CreatorAgreementComparison = CreatorAgreementEvidenceCheck & {
  activeAgreementVersion: string;
  activeAgreementHash: string;
  userAgreementVersion: string | null;
  userAgreementHash: string | null;
  versionMatchesActive: boolean;
  signaturesVersionMatch: boolean;
  signedAgreementStillValid: boolean;
  legalSignedAllowed: boolean;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : undefined;
}

function sanitizeAgreementId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function hasFullTextReference(record: CreatorAgreementEvidenceRecord) {
  return Boolean(
    readString(record.fullTextSnapshotPath)
      || readString(record.fullTextStoragePath)
      || readString(record.pdfStoragePath)
      || readString(record.embeddedFullTextReference)
      || readString(record.legalDocumentUrl),
  );
}

function hasValidTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeHashSeed(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function getActiveCreatorAgreementVersion() {
  return CREATOR_MASTER_SERVICE_AGREEMENT_VERSION;
}

export function buildCreatorAgreementTemplateIdFromVersion(version: string) {
  const normalizedVersion = sanitizeAgreementId(version);
  return normalizedVersion
    ? `creator_agreement_${normalizedVersion}`
    : "creator_agreement_active";
}

export function buildAgreementHash(input: {
  agreementHash?: string | null;
  content?: unknown;
  agreementVersion?: string | null;
}) {
  const explicitHash = readString(input.agreementHash);
  if (explicitHash) {
    return explicitHash;
  }

  const version = readString(input.agreementVersion);
  if (!normalizeHashSeed(input.content)) {
    return ACTIVE_CREATOR_AGREEMENT_HASH;
  }

  const seed = `${version}:${normalizeHashSeed(input.content)}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function getActiveCreatorAgreementTemplate(nowMs = 0): CreatorAgreementTemplateSnapshot {
  const effectiveAt = readPositiveTimestamp(nowMs);

  return {
    templateId: buildCreatorAgreementTemplateIdFromVersion(getActiveCreatorAgreementVersion()),
    agreementVersion: getActiveCreatorAgreementVersion(),
    agreementTitle: ACTIVE_CREATOR_AGREEMENT_TITLE,
    agreementSource: "native_full_text",
    activeForNewCreators: true,
    agreementHash: buildAgreementHash({
      agreementVersion: getActiveCreatorAgreementVersion(),
    }),
    embeddedFullTextReference: ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE,
    summaryBullets: [...CREATOR_CONTRACT_SUMMARY_BULLETS],
    createdAt: nowMs,
    createdByUid: "system",
    activatedAt: effectiveAt,
    activatedByUid: "system",
    effectiveAt,
  };
}

export function resolveCreatorAgreementForUser(
  userId: string,
  input?: {
    record?: CreatorAgreementEvidenceRecord | null;
    activeTemplate?: CreatorAgreementTemplateSnapshot | null;
    nowMs?: number;
  },
) {
  const activeTemplate = input?.activeTemplate ?? getActiveCreatorAgreementTemplate(input?.nowMs);
  const record = input?.record ?? null;
  const recordVersion = readString(record?.contractVersion) || readString(record?.agreementVersion);
  const recordHash = readString(record?.agreementHash);
  const recordDispatchId = readString(record?.agreementDispatchId) || readString(record?.dispatchId);
  const hasUserSpecificAgreement = Boolean(recordVersion && recordHash && recordDispatchId);

  if (hasUserSpecificAgreement) {
    return {
      userId,
      agreementVersion: recordVersion,
      agreementTitle: readString(record?.agreementTitle) || activeTemplate.agreementTitle,
      agreementHash: recordHash,
      agreementSource: readString(record?.agreementSource) || activeTemplate.agreementSource,
      templateId: readString(record?.agreementTemplateId) || readString(record?.templateId) || activeTemplate.templateId,
      dispatchId: recordDispatchId,
      displaySource: "user_dispatch" as const,
      activeTemplate,
      existingSignedVersionPreserved: record?.creatorSignatureStatus === "signature_signed"
        || record?.legalStatus === "legal_signed",
    };
  }

  return {
    userId,
    agreementVersion: activeTemplate.agreementVersion,
    agreementTitle: activeTemplate.agreementTitle,
    agreementHash: activeTemplate.agreementHash,
    agreementSource: activeTemplate.agreementSource,
    templateId: activeTemplate.templateId,
    dispatchId: null,
    displaySource: "active_template" as const,
    activeTemplate,
    existingSignedVersionPreserved: false,
  };
}

export function assertAgreementEvidenceComplete(
  record: CreatorAgreementEvidenceRecord,
  options?: {
    requireSignatureEvidence?: boolean;
    requireSourceSnapshot?: boolean;
  },
): CreatorAgreementEvidenceCheck {
  const missingEvidenceFields: string[] = [];
  const version = readString(record.agreementVersion) || readString(record.contractVersion);
  const hash = readString(record.agreementHash);
  const source = readString(record.agreementSource);
  const requireSignatureEvidence = options?.requireSignatureEvidence === true;
  const requireSourceSnapshot = options?.requireSourceSnapshot !== false;

  if (!version) {
    missingEvidenceFields.push("agreementVersion");
  }
  if (!hash) {
    missingEvidenceFields.push("agreementHash");
  }
  if (!source) {
    missingEvidenceFields.push("agreementSource");
  }
  if (requireSourceSnapshot && !hasFullTextReference(record)) {
    missingEvidenceFields.push("agreementSourceSnapshot");
  }

  if (requireSignatureEvidence) {
    if (!readString(record.dispatchId) && !readString(record.agreementDispatchId)) {
      missingEvidenceFields.push("dispatchId");
    }
    if (!readString(record.userId)) {
      missingEvidenceFields.push("userId");
    }
    if (!readString(record.signerUid)) {
      missingEvidenceFields.push("signerUid");
    }
    if (!readString(record.signerName)) {
      missingEvidenceFields.push("signerName");
    }
    if (!hasValidTimestamp(record.signedAt)) {
      missingEvidenceFields.push("signedAt");
    }
    if (!readString(record.signerIp)) {
      missingEvidenceFields.push("signerIp");
    }
    if (!readString(record.signerUserAgent)) {
      missingEvidenceFields.push("signerUserAgent");
    }
  }

  return {
    evidenceComplete: missingEvidenceFields.length === 0,
    missingEvidenceFields,
  };
}

export function compareSignedAgreementToActive(
  record: CreatorAgreementEvidenceRecord,
  activeTemplate = getActiveCreatorAgreementTemplate(),
): CreatorAgreementComparison {
  const evidence = assertAgreementEvidenceComplete(record, {
    requireSourceSnapshot: false,
  });
  const userAgreementVersion = readString(record.contractVersion) || readString(record.agreementVersion) || null;
  const userAgreementHash = readString(record.agreementHash) || null;
  const creatorVersion = readString(record.creatorSignatureAgreementVersion) || userAgreementVersion || "";
  const creatorHash = readString(record.creatorSignatureAgreementHash) || userAgreementHash || "";
  const adminVersion = readString(record.adminSignatureAgreementVersion) || userAgreementVersion || "";
  const adminHash = readString(record.adminSignatureAgreementHash) || userAgreementHash || "";
  const hasBothSignatures = record.creatorSignatureStatus === "signature_signed"
    && record.adminSignatureStatus === "signature_signed";
  const signaturesVersionMatch = !hasBothSignatures
    || Boolean(creatorVersion && adminVersion && creatorHash && adminHash
      && creatorVersion === adminVersion
      && creatorHash === adminHash);
  const ownerOverrideAllowsMismatch = record.ownerOverrideActive === true
    && Boolean(readString(record.ownerOverrideReason));

  return {
    ...evidence,
    activeAgreementVersion: activeTemplate.agreementVersion,
    activeAgreementHash: activeTemplate.agreementHash,
    userAgreementVersion,
    userAgreementHash,
    versionMatchesActive: userAgreementVersion === activeTemplate.agreementVersion
      && userAgreementHash === activeTemplate.agreementHash,
    signaturesVersionMatch,
    signedAgreementStillValid: evidence.evidenceComplete
      && Boolean(userAgreementVersion && userAgreementHash)
      && (signaturesVersionMatch || ownerOverrideAllowsMismatch),
    legalSignedAllowed: record.legalStatus !== "legal_signed"
      || (evidence.evidenceComplete && (signaturesVersionMatch || ownerOverrideAllowsMismatch)),
  };
}

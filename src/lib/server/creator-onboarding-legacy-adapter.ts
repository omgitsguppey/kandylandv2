import { normalizeCreatorApplication, resolveCreatorQueuePosition } from "@/lib/creator-application";
import {
  buildCreatorOnboardingCanonicalRecord,
  buildCreatorOnboardingUserProjection,
  normalizeCreatorOnboardingCanonicalRecord,
  type CreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import type { CreatorApplication, UserProfile } from "@/types/db";

// Deprecated compatibility adapter: this file may read old
// users/{uid}.creatorApplication records for migration/backfill only. It must
// never make the nested projection the future canonical creator source.
export type LegacyCreatorApplicationMappingConfidence = "none" | "low" | "medium" | "high";

export type LegacyCreatorApplicationDebugFields = {
  legacyCreatorApplicationDetected: boolean;
  legacyCreatorApplicationMapped: boolean;
  legacyCreatorApplicationSkipped: boolean;
  mappingConfidence: LegacyCreatorApplicationMappingConfidence;
  mappingWarnings: string[];
  legacyConfidence: LegacyCreatorApplicationMappingConfidence;
  legacyMappedAt?: number;
};

export type LegacyCreatorApplicationReadResult = {
  userId?: string;
  userData: Record<string, unknown>;
  rawCreatorApplication: Record<string, unknown>;
  creatorApplication: CreatorApplication;
  legacyCreatorApplicationDetected: true;
};

export type LegacyCreatorApplicationMappingResult = LegacyCreatorApplicationDebugFields & {
  canonical: (CreatorOnboardingCanonicalRecord & Partial<LegacyCreatorApplicationDebugFields>) | null;
  projection: CreatorApplication | null;
  missingFields: string[];
  blockingRisks: string[];
  recommendedAction: string;
};

export type LegacyCreatorApplicationMappingInput = {
  userId?: string;
  userDoc?: unknown;
  legacyCreatorApplication?: unknown;
  existingCanonical?: unknown;
  nowMs?: number;
};

const LEGACY_SIGNED_WITHOUT_EVIDENCE_WARNING = "legacy_signed_without_signature_evidence";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : undefined;
}

function readRole(value: unknown): UserProfile["role"] {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

function readPlainObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readUserDocumentData(userDoc: unknown): Record<string, unknown> {
  const documentLike = userDoc as { id?: unknown; data?: unknown } | null | undefined;
  if (documentLike && typeof documentLike.data === "function") {
    const data = readPlainObject((documentLike.data as () => unknown)()) ?? {};
    const id = readString(documentLike.id);
    return id && !readString(data.uid) && !readString(data.userId)
      ? { ...data, uid: id }
      : data;
  }

  return readPlainObject(userDoc) ?? {};
}

function readUserId(input: LegacyCreatorApplicationMappingInput, userData: Record<string, unknown>) {
  return readString(input.userId)
    || readString(userData.uid)
    || readString(userData.userId)
    || readString((input.userDoc as { id?: unknown } | null | undefined)?.id);
}

function hasSignatureEvidence(input: {
  signedStatus: boolean;
  signedAt: unknown;
  signedByName: unknown;
  agreementHash: unknown;
  contractVersion: unknown;
  dispatchId: unknown;
}) {
  if (!input.signedStatus) {
    return false;
  }

  const hasTimestamp = Boolean(readOptionalTimestamp(input.signedAt));
  const hasSigner = Boolean(readString(input.signedByName));
  const hasAgreementIdentity = Boolean(
    readString(input.agreementHash)
      || readString(input.contractVersion)
      || readString(input.dispatchId),
  );

  return hasTimestamp && hasSigner && hasAgreementIdentity;
}

function buildSafeLegacySource(raw: Record<string, unknown>) {
  const warnings: string[] = [];
  const source = { ...raw };
  const rawLegalSigned = raw.legalStatus === "legal_signed" || raw.legalDocumentStatus === "legal_signed";
  const rawCreatorSigned = raw.creatorSignatureStatus === "signature_signed" || rawLegalSigned;
  const rawAdminSigned = raw.adminSignatureStatus === "signature_signed" || rawLegalSigned;
  const creatorSignatureEvidence = hasSignatureEvidence({
    signedStatus: rawCreatorSigned,
    signedAt: raw.creatorContractSignedAt,
    signedByName: raw.creatorContractSignedByName,
    agreementHash: raw.agreementHash,
    contractVersion: raw.contractVersion,
    dispatchId: raw.agreementDispatchId,
  });
  const adminSignatureEvidence = hasSignatureEvidence({
    signedStatus: rawAdminSigned,
    signedAt: raw.adminContractSignedAt,
    signedByName: raw.adminContractSignedByName,
    agreementHash: raw.agreementHash,
    contractVersion: raw.contractVersion,
    dispatchId: raw.agreementDispatchId,
  });

  if (rawCreatorSigned && !creatorSignatureEvidence) {
    warnings.push("legacy_creator_signature_without_evidence");
  }

  if (rawAdminSigned && !adminSignatureEvidence) {
    warnings.push("legacy_admin_signature_without_evidence");
  }

  if (rawLegalSigned && (!creatorSignatureEvidence || !adminSignatureEvidence)) {
    warnings.push(LEGACY_SIGNED_WITHOUT_EVIDENCE_WARNING);
  }

  const contractWasSent = raw.contractDocumentStatus === "contract_sent"
    || raw.legalStatus === "legal_sent"
    || raw.legalDocumentStatus === "legal_sent"
    || rawLegalSigned
    || Boolean(readOptionalTimestamp(raw.legalDocumentSentAt))
    || creatorSignatureEvidence
    || adminSignatureEvidence;

  source.contractDocumentStatus = contractWasSent ? "contract_sent" : "contract_not_sent";
  source.creatorSignatureStatus = creatorSignatureEvidence ? "signature_signed" : "signature_pending";
  source.adminSignatureStatus = adminSignatureEvidence ? "signature_signed" : "signature_pending";
  source.legalStatus = creatorSignatureEvidence && adminSignatureEvidence
    ? "legal_signed"
    : contractWasSent
      ? "legal_sent"
      : "legal_pending";
  source.legalDocumentStatus = source.legalStatus;

  return {
    source,
    warnings: Array.from(new Set(warnings)),
  };
}

function buildMissingFields(input: {
  userId?: string;
  userData: Record<string, unknown>;
  legacy?: LegacyCreatorApplicationReadResult | null;
}) {
  const missingFields: string[] = [];

  if (!input.userId) {
    missingFields.push("userId");
  }

  if (!input.legacy) {
    missingFields.push("creatorApplication");
  } else {
    if (!readString(input.legacy.rawCreatorApplication.creatorDisplayName)) {
      missingFields.push("creatorDisplayName");
    }
    if (
      !readOptionalTimestamp(input.legacy.rawCreatorApplication.updatedAt)
      && !readOptionalTimestamp(input.legacy.rawCreatorApplication.submittedAt)
      && !readOptionalTimestamp(input.legacy.rawCreatorApplication.onboardingSubmittedAt)
    ) {
      missingFields.push("legacyTimestamp");
    }
  }

  if (!readString(input.userData.email)) {
    missingFields.push("email");
  }

  return missingFields;
}

function deriveMappingConfidence(input: {
  detected: boolean;
  missingFields: string[];
  warnings: string[];
  blockingRisks: string[];
}) {
  if (!input.detected) {
    return "none" satisfies LegacyCreatorApplicationMappingConfidence;
  }

  if (input.missingFields.includes("userId") || input.missingFields.includes("creatorApplication")) {
    return "low" satisfies LegacyCreatorApplicationMappingConfidence;
  }

  if (input.warnings.length > 0 || input.blockingRisks.length > 0 || input.missingFields.length > 0) {
    return "medium" satisfies LegacyCreatorApplicationMappingConfidence;
  }

  return "high" satisfies LegacyCreatorApplicationMappingConfidence;
}

function buildNoMappingResult(input: {
  detected?: boolean;
  skipped?: boolean;
  confidence?: LegacyCreatorApplicationMappingConfidence;
  warnings?: string[];
  missingFields?: string[];
  blockingRisks?: string[];
  recommendedAction: string;
  canonical?: CreatorOnboardingCanonicalRecord | null;
  projection?: CreatorApplication | null;
}): LegacyCreatorApplicationMappingResult {
  const confidence = input.confidence ?? "none";
  return {
    canonical: input.canonical ?? null,
    projection: input.projection ?? null,
    legacyCreatorApplicationDetected: input.detected === true,
    legacyCreatorApplicationMapped: false,
    legacyCreatorApplicationSkipped: input.skipped === true,
    mappingConfidence: confidence,
    mappingWarnings: input.warnings ?? [],
    legacyConfidence: confidence,
    missingFields: input.missingFields ?? [],
    blockingRisks: input.blockingRisks ?? [],
    recommendedAction: input.recommendedAction,
  };
}

export function readLegacyCreatorApplicationFromUser(userDoc: unknown): LegacyCreatorApplicationReadResult | null {
  const userData = readUserDocumentData(userDoc);
  const rawCreatorApplication = readPlainObject(userData.creatorApplication);
  const creatorApplication = normalizeCreatorApplication(rawCreatorApplication);

  if (!rawCreatorApplication || !creatorApplication) {
    return null;
  }

  return {
    userId: readString(userData.uid) || readString(userData.userId) || readString((userDoc as { id?: unknown } | null | undefined)?.id) || undefined,
    userData,
    rawCreatorApplication,
    creatorApplication,
    legacyCreatorApplicationDetected: true,
  };
}

export function mapLegacyCreatorApplicationToCanonical(
  input: LegacyCreatorApplicationMappingInput,
): LegacyCreatorApplicationMappingResult {
  const userData = readUserDocumentData(input.userDoc);
  const userId = readUserId(input, userData);
  const existingCanonical = normalizeCreatorOnboardingCanonicalRecord(input.existingCanonical);
  const legacy = input.legacyCreatorApplication
    ? readLegacyCreatorApplicationFromUser({
      ...userData,
      uid: userId || readString(userData.uid) || undefined,
      creatorApplication: input.legacyCreatorApplication,
    })
    : readLegacyCreatorApplicationFromUser({
      ...userData,
      uid: userId || readString(userData.uid) || undefined,
    });
  const missingFields = buildMissingFields({ userId, userData, legacy });

  if (existingCanonical) {
    return buildNoMappingResult({
      detected: Boolean(legacy),
      skipped: true,
      confidence: legacy ? "high" : "none",
      missingFields,
      blockingRisks: ["canonical_record_exists"],
      canonical: existingCanonical,
      projection: buildCreatorApplicationProjection(existingCanonical),
      recommendedAction: "Keep existing creator_onboarding canonical record; do not overwrite it with weaker legacy projection data.",
    });
  }

  if (!legacy || !userId) {
    const confidence = deriveMappingConfidence({
      detected: Boolean(legacy),
      missingFields,
      warnings: [],
      blockingRisks: [],
    });
    return buildNoMappingResult({
      detected: Boolean(legacy),
      confidence,
      missingFields,
      recommendedAction: legacy
        ? "Review legacy creatorApplication manually before creating canonical onboarding."
        : "No legacy creatorApplication projection was found.",
    });
  }

  const safeLegacy = buildSafeLegacySource(legacy.rawCreatorApplication);
  const blockingRisks: string[] = [];

  if (safeLegacy.warnings.includes(LEGACY_SIGNED_WITHOUT_EVIDENCE_WARNING)) {
    blockingRisks.push("legacy_legal_signature_evidence_missing");
  }

  if (
    legacy.rawCreatorApplication.approvalStatus === "creator_approved"
    && safeLegacy.source.legalStatus !== "legal_signed"
  ) {
    blockingRisks.push("approved_without_verified_legal_signature");
  }

  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
    ? Math.trunc(input.nowMs)
    : Date.now();
  const confidence = deriveMappingConfidence({
    detected: true,
    missingFields,
    warnings: safeLegacy.warnings,
    blockingRisks,
  });
  const canonical = {
    ...buildCreatorOnboardingCanonicalRecord({
      userId,
      email: readString(userData.email) || null,
      username: readString(userData.username) || undefined,
      displayName: readString(userData.displayName) || readString(legacy.rawCreatorApplication.creatorDisplayName) || undefined,
      photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
      role: readRole(userData.role),
      createdAt: readOptionalTimestamp(userData.createdAt)
        ?? readOptionalTimestamp(legacy.rawCreatorApplication.createdAt)
        ?? legacy.creatorApplication.submittedAt
        ?? nowMs,
      sourceVersion: 1,
      queuePosition: resolveCreatorQueuePosition(legacy.creatorApplication.queuePosition),
      creatorDisplayName: legacy.creatorApplication.creatorDisplayName,
      creatorMonetizationGoals: legacy.creatorApplication.creatorMonetizationGoals,
      creatorPrimaryPlatform: legacy.creatorApplication.creatorPrimaryPlatform,
      creatorFollowerRange: legacy.creatorApplication.creatorFollowerRange,
      creatorPostingFrequency: legacy.creatorApplication.creatorPostingFrequency,
      creatorContentFocus: legacy.creatorApplication.creatorContentFocus,
      fansAlreadyAskForAccess: legacy.creatorApplication.fansAlreadyAskForAccess,
      creatorRecommendedSetup: legacy.creatorApplication.creatorRecommendedSetup,
      intakeVersion: legacy.creatorApplication.intakeVersion,
      intakeSubmittedAt: legacy.creatorApplication.intakeSubmittedAt,
      intakeSource: legacy.creatorApplication.intakeSource,
      nowMs,
      source: {
        ...safeLegacy.source,
        updatedAt: readOptionalTimestamp(safeLegacy.source.updatedAt) ?? nowMs,
      },
    }),
    legacyCreatorApplicationDetected: true,
    legacyCreatorApplicationMapped: true,
    legacyCreatorApplicationSkipped: false,
    mappingConfidence: confidence,
    mappingWarnings: safeLegacy.warnings,
    legacyConfidence: confidence,
    legacyMappedAt: nowMs,
  } satisfies CreatorOnboardingCanonicalRecord & LegacyCreatorApplicationDebugFields;

  return {
    canonical,
    projection: buildCreatorApplicationProjection(canonical),
    legacyCreatorApplicationDetected: true,
    legacyCreatorApplicationMapped: true,
    legacyCreatorApplicationSkipped: false,
    mappingConfidence: confidence,
    mappingWarnings: safeLegacy.warnings,
    legacyConfidence: confidence,
    legacyMappedAt: nowMs,
    missingFields,
    blockingRisks,
    recommendedAction: blockingRisks.length > 0
      ? "Backfill canonical onboarding but keep legal/signature blockers visible for admin review."
      : "Backfill creator_onboarding and rebuild creator_review_queue from the mapped canonical record.",
  };
}

export function buildCreatorApplicationProjection(canonical: CreatorOnboardingCanonicalRecord): CreatorApplication {
  return buildCreatorOnboardingUserProjection(canonical) as CreatorApplication;
}

export function needsCreatorOnboardingBackfill(userDoc: unknown) {
  return readLegacyCreatorApplicationFromUser(userDoc) !== null;
}

export function explainLegacyMapping(
  input: LegacyCreatorApplicationMappingInput,
) {
  const mapping = mapLegacyCreatorApplicationToCanonical(input);
  return {
    legacyCreatorApplicationDetected: mapping.legacyCreatorApplicationDetected,
    legacyCreatorApplicationMapped: mapping.legacyCreatorApplicationMapped,
    legacyCreatorApplicationSkipped: mapping.legacyCreatorApplicationSkipped,
    mappingConfidence: mapping.mappingConfidence,
    mappingWarnings: mapping.mappingWarnings,
    legacyConfidence: mapping.legacyConfidence,
    missingFields: mapping.missingFields,
    blockingRisks: mapping.blockingRisks,
    recommendedAction: mapping.recommendedAction,
  };
}

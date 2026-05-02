import type { CreatorAgreementSource } from "@/lib/creator-agreement-documents";
import type {
  CreatorContractDocumentStatus,
  CreatorContractSignatureStatus,
  CreatorOnboardingLegalStatus,
} from "@/lib/creator-onboarding";

export const CREATOR_AGREEMENT_ACKNOWLEDGEMENTS = [
  {
    key: "tools_activate_after_approval",
    label: "I understand creator tools activate only after approval.",
  },
  {
    key: "access_may_pause_for_review",
    label: "I understand KandyDrops may pause creator access for compliance, moderation, payout, or safety review.",
  },
  {
    key: "signature_record_stored",
    label: "I understand my signed agreement version and signature record will be stored.",
  },
  {
    key: "full_agreement_reviewed",
    label: "I reviewed the full agreement before signing.",
  },
] as const;

export type CreatorAgreementAcknowledgementKey = (typeof CREATOR_AGREEMENT_ACKNOWLEDGEMENTS)[number]["key"];
export type CreatorAgreementAcknowledgementValues = Record<CreatorAgreementAcknowledgementKey, boolean>;

export const CREATOR_AGREEMENT_REVIEW_SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "acknowledgements", label: "Important acknowledgements" },
  { key: "full_agreement", label: "Full agreement" },
  { key: "signature", label: "Signature" },
] as const;

export type CreatorAgreementReviewSectionKey = (typeof CREATOR_AGREEMENT_REVIEW_SECTIONS)[number]["key"];

export function buildDefaultCreatorAgreementAcknowledgements(): CreatorAgreementAcknowledgementValues {
  return CREATOR_AGREEMENT_ACKNOWLEDGEMENTS.reduce((values, acknowledgement) => {
    values[acknowledgement.key] = false;
    return values;
  }, {} as CreatorAgreementAcknowledgementValues);
}

export function normalizeCreatorAgreementAcknowledgements(value: unknown): CreatorAgreementAcknowledgementValues {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return CREATOR_AGREEMENT_ACKNOWLEDGEMENTS.reduce((values, acknowledgement) => {
    values[acknowledgement.key] = source[acknowledgement.key] === true;
    return values;
  }, {} as CreatorAgreementAcknowledgementValues);
}

export function hasRequiredCreatorAgreementAcknowledgements(value: unknown) {
  const acknowledgements = normalizeCreatorAgreementAcknowledgements(value);
  return CREATOR_AGREEMENT_ACKNOWLEDGEMENTS.every((acknowledgement) => acknowledgements[acknowledgement.key] === true);
}

export function getCreatorAgreementStatusCopy(input: {
  contractDocumentStatus?: CreatorContractDocumentStatus | null;
  creatorSignatureStatus?: CreatorContractSignatureStatus | null;
  adminSignatureStatus?: CreatorContractSignatureStatus | null;
  legalStatus?: CreatorOnboardingLegalStatus | null;
}) {
  if (input.contractDocumentStatus !== "contract_sent") {
    return {
      label: "Agreement not sent yet",
      helper: "The agreement will appear here when review reaches the legal step.",
    };
  }

  if (input.creatorSignatureStatus !== "signature_signed") {
    return {
      label: "Ready to review",
      helper: "Waiting for your signature.",
    };
  }

  if (input.adminSignatureStatus !== "signature_signed" || input.legalStatus !== "legal_signed") {
    return {
      label: "Waiting for admin countersign",
      helper: "Your agreement is recorded and waiting for the review team.",
    };
  }

  return {
    label: "Agreement complete",
    helper: "Both signatures are recorded.",
  };
}

export function isCreatorAgreementContentSourceAvailable(input: {
  agreementSource?: CreatorAgreementSource | null;
  hasUploadedAgreementDocument?: boolean;
  hasNativeAgreementSections?: boolean;
}) {
  if (!input.agreementSource) {
    return false;
  }

  if (input.agreementSource === "native_full_text") {
    return input.hasNativeAgreementSections === true;
  }

  if (input.agreementSource === "hybrid") {
    return input.hasUploadedAgreementDocument === true || input.hasNativeAgreementSections === true;
  }

  return input.hasUploadedAgreementDocument === true;
}

export function getCreatorAgreementSignatureReadiness(input: {
  isAuthenticated: boolean;
  isAlreadySigned: boolean;
  contractDocumentStatus?: CreatorContractDocumentStatus | null;
  agreementVersion?: string | null;
  agreementHash?: string | null;
  dispatchId?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  contentSourceAvailable: boolean;
  acknowledgementValues: unknown;
}) {
  const missingReasons: string[] = [];

  if (input.isAlreadySigned) {
    return {
      canSign: false,
      buttonLabel: "Agreement signed",
      missingReasons,
    };
  }

  if (!input.isAuthenticated) {
    missingReasons.push("Sign in before signing.");
  }
  if (input.contractDocumentStatus !== "contract_sent") {
    missingReasons.push("Agreement not sent yet.");
  }
  if (!input.dispatchId) {
    missingReasons.push("Agreement dispatch is missing.");
  }
  if (!input.agreementVersion) {
    missingReasons.push("Agreement version is missing.");
  }
  if (!input.agreementHash) {
    missingReasons.push("Agreement hash is missing.");
  }
  if (!input.contentSourceAvailable) {
    missingReasons.push("Agreement content is unavailable.");
  }
  if (!input.signerEmail) {
    missingReasons.push("Account email is missing.");
  }
  if (!input.signerName || input.signerName.trim().length < 2) {
    missingReasons.push("Enter your legal name.");
  }
  if (!hasRequiredCreatorAgreementAcknowledgements(input.acknowledgementValues)) {
    missingReasons.push("Review and accept every acknowledgement.");
  }

  return {
    canSign: missingReasons.length === 0,
    buttonLabel: missingReasons.length === 0 ? "Sign creator agreement" : "Review agreement to continue",
    missingReasons,
  };
}

export function buildCreatorAgreementTelemetryPayload(input: {
  actorUid?: string | null;
  actorEmail?: string | null;
  actionKey: string;
  agreementVersion?: string | null;
  agreementHash?: string | null;
  dispatchId?: string | null;
  sectionKey?: string | null;
  extra?: Record<string, unknown>;
}) {
  const actorUid = input.actorUid || "";
  const occurredAt = new Date().toISOString();

  return {
    actorType: actorUid ? "user" : "unknown",
    actorUid,
    actorEmail: input.actorEmail || "",
    actorRole: "user",
    targetUserId: actorUid,
    targetCreatorId: actorUid,
    performedAs: "own_account",
    surface: "creator_intake",
    route: "/creators/waitlist",
    actionKey: input.actionKey,
    agreementVersion: input.agreementVersion || "",
    agreementHash: input.agreementHash || "",
    dispatchId: input.dispatchId || "",
    sectionKey: input.sectionKey || "",
    occurredAt,
    dedupeKey: `creator_agreement:${input.actionKey}:${actorUid || "unknown"}:${input.dispatchId || "no_dispatch"}:${occurredAt.slice(0, 19)}`,
    source: "creator_agreement_signature_ux",
    actorMarkerPresent: Boolean(actorUid),
    ...(input.extra ?? {}),
  };
}

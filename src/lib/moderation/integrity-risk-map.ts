import type { Drop } from "@/types/db";

export type IntegrityRiskTier = "clear" | "low" | "medium" | "high" | "critical";

export type IntegrityRiskSignals = {
  moderationRiskTier?: IntegrityRiskTier | string;
  moderationRisk?: number;
  contentProtectionWarning?: boolean;
  contentProtectionFailure?: boolean;
  supportComplaintRate?: number;
  supportComplaintCount?: number;
  negativeSatisfactionRate?: number;
  refundRisk?: number;
  negativeFeedbackRisk?: number;
  creatorVerificationComplete?: boolean;
  verificationRisk?: number;
  metadataRisk?: number;
  metadataUpdatedAtMs?: number;
  validUntil?: number;
  suspiciousAssetAccessRate?: number;
  suspiciousAssetAccessCount?: number;
  nowMs?: number;
};

export type IntegrityRiskComponents = {
  moderationRisk: number;
  supportComplaintRate: number;
  negativeSatisfactionRate: number;
  verificationRisk: number;
  metadataRisk: number;
};

export type IntegrityRiskAssessment = {
  tier: IntegrityRiskTier;
  components: IntegrityRiskComponents;
  criticalPolicyFailure: boolean;
  contentProtectionFailure: boolean;
  reasons: string[];
};

export type IntegrityDropIntelligenceLike = {
  dropId?: string;
  negativeSignalRate?: number;
  negativeFeedbackCount?: number;
  positiveFeedbackCount?: number;
  satisfactionScore?: number;
  satisfactionSampleCount?: number;
  updatedAtMs?: number;
  latestSourceAtMs?: number;
};

const TIER_RISK: Record<IntegrityRiskTier, number> = {
  clear: 0,
  low: 0.2,
  medium: 0.5,
  high: 0.8,
  critical: 1,
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeTier(value: unknown): IntegrityRiskTier {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critical" || normalized === "blocked" || normalized === "policy_blocked") {
    return "critical";
  }
  if (normalized === "high") {
    return "high";
  }
  if (normalized === "medium" || normalized === "review") {
    return "medium";
  }
  if (normalized === "low" || normalized === "warning") {
    return "low";
  }
  return "clear";
}

function readRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown) {
  return value === true;
}

function maxDefined(...values: Array<number | undefined>) {
  return Math.max(0, ...values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)));
}

function resolveMetadataRisk(input: IntegrityRiskSignals) {
  if (typeof input.metadataRisk === "number") {
    return clamp01(input.metadataRisk);
  }

  const nowMs = input.nowMs ?? Date.now();
  const metadataUpdatedAtMs = readNumber(input.metadataUpdatedAtMs);
  let risk = 0;
  if (input.validUntil && input.validUntil <= nowMs) {
    risk = Math.max(risk, 1);
  }
  if (metadataUpdatedAtMs > 0) {
    const ageDays = Math.max(0, (nowMs - metadataUpdatedAtMs) / (24 * 60 * 60 * 1000));
    risk = Math.max(risk, clamp01((ageDays - 45) / 45));
  }

  return risk;
}

export function assessIntegrityRisk(input: IntegrityRiskSignals): IntegrityRiskAssessment {
  const tier = normalizeTier(input.moderationRiskTier);
  const moderationRisk = Math.max(
    TIER_RISK[tier],
    clamp01(input.moderationRisk || 0),
    input.contentProtectionWarning ? 0.55 : 0,
    clamp01(input.suspiciousAssetAccessRate || 0),
    clamp01((input.suspiciousAssetAccessCount || 0) / 10),
  );
  const supportComplaintRate = Math.max(
    clamp01(input.supportComplaintRate || 0),
    clamp01((input.supportComplaintCount || 0) / 10),
  );
  const negativeSatisfactionRate = maxDefined(
    input.negativeSatisfactionRate,
    input.refundRisk,
    input.negativeFeedbackRisk,
  );
  const verificationRisk = Math.max(
    clamp01(input.verificationRisk || 0),
    input.creatorVerificationComplete === false ? 0.7 : 0,
  );
  const metadataRisk = resolveMetadataRisk(input);
  const contentProtectionFailure = input.contentProtectionFailure === true;
  const criticalPolicyFailure = tier === "critical" || contentProtectionFailure;
  const reasons: string[] = [];

  if (criticalPolicyFailure) {
    reasons.push("Removed by critical policy or content protection failure.");
  }
  if (moderationRisk >= 0.5) {
    reasons.push("Moderation or content protection risk is elevated.");
  }
  if (supportComplaintRate >= 0.2) {
    reasons.push("Support complaint rate contributes to integrity risk.");
  }
  if (negativeSatisfactionRate >= 0.2) {
    reasons.push("Refund or negative satisfaction risk contributes to integrity risk.");
  }
  if (verificationRisk >= 0.5) {
    reasons.push("Creator verification is incomplete or low trust.");
  }
  if (metadataRisk >= 0.5) {
    reasons.push("Metadata is stale, expired, or incomplete.");
  }

  return {
    tier: criticalPolicyFailure ? "critical" : tier,
    components: {
      moderationRisk: clamp01(moderationRisk),
      supportComplaintRate: clamp01(supportComplaintRate),
      negativeSatisfactionRate: clamp01(negativeSatisfactionRate),
      verificationRisk: clamp01(verificationRisk),
      metadataRisk: clamp01(metadataRisk),
    },
    criticalPolicyFailure,
    contentProtectionFailure,
    reasons,
  };
}

export function buildIntegrityRiskSignalsFromDrop(input: {
  drop: Drop;
  intelligence?: IntegrityDropIntelligenceLike;
  nowMs?: number;
}) : IntegrityRiskSignals {
  const rawDrop = input.drop as Drop & Record<string, unknown>;
  const moderation = readRecord(rawDrop.moderation);
  const contentProtection = readRecord(rawDrop.contentProtection);
  const support = readRecord(rawDrop.support);
  const creator = readRecord(rawDrop.creator);
  const assetAccess = readRecord(rawDrop.assetAccess);
  const intelligence = input.intelligence;
  const feedbackCount = readNumber(intelligence?.positiveFeedbackCount) + readNumber(intelligence?.negativeFeedbackCount);

  return {
    moderationRiskTier: rawDrop.moderationRiskTier as string | undefined
      || moderation.riskTier as string | undefined
      || rawDrop.riskTier as string | undefined,
    moderationRisk: readNumber(rawDrop.moderationRisk) || readNumber(moderation.riskScore),
    contentProtectionWarning: readBoolean(rawDrop.contentProtectionWarning) || readBoolean(contentProtection.warning),
    contentProtectionFailure: readBoolean(rawDrop.contentProtectionFailure) || readBoolean(contentProtection.failure),
    supportComplaintRate: readNumber(rawDrop.supportComplaintRate) || readNumber(support.complaintRate),
    supportComplaintCount: readNumber(rawDrop.supportComplaintCount) || readNumber(support.complaintCount),
    negativeSatisfactionRate: readNumber(rawDrop.negativeSatisfactionRate)
      || (typeof intelligence?.satisfactionScore === "number" ? clamp01(1 - intelligence.satisfactionScore) : 0),
    refundRisk: readNumber(rawDrop.refundRisk),
    negativeFeedbackRisk: readNumber(rawDrop.negativeFeedbackRisk)
      || readNumber(intelligence?.negativeSignalRate)
      || (feedbackCount > 0 ? readNumber(intelligence?.negativeFeedbackCount) / feedbackCount : 0),
    creatorVerificationComplete: typeof rawDrop.creatorVerificationComplete === "boolean"
      ? rawDrop.creatorVerificationComplete
      : typeof creator.verificationComplete === "boolean"
        ? creator.verificationComplete
        : undefined,
    verificationRisk: readNumber(rawDrop.verificationRisk) || readNumber(creator.verificationRisk),
    metadataRisk: readNumber(rawDrop.metadataRisk),
    metadataUpdatedAtMs: readNumber(rawDrop.metadataUpdatedAtMs) || readNumber(rawDrop.updatedAt) || readNumber(intelligence?.updatedAtMs) || readNumber(intelligence?.latestSourceAtMs),
    validUntil: input.drop.validUntil,
    suspiciousAssetAccessRate: readNumber(rawDrop.suspiciousAssetAccessRate) || readNumber(assetAccess.suspiciousRate),
    suspiciousAssetAccessCount: readNumber(rawDrop.suspiciousAssetAccessCount) || readNumber(assetAccess.suspiciousCount),
    nowMs: input.nowMs,
  };
}

export function buildIntegrityRiskMap(input: {
  drops: Drop[];
  dropIntelligence?: Map<string, IntegrityDropIntelligenceLike>;
  nowMs?: number;
}) {
  return new Map(input.drops.map((drop) => [drop.id, assessIntegrityRisk(buildIntegrityRiskSignalsFromDrop({
    drop,
    intelligence: input.dropIntelligence?.get(drop.id),
    nowMs: input.nowMs,
  }))]));
}

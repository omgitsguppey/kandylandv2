export type BehavioralConfidenceLabel =
  | "insufficient"
  | "low"
  | "usable"
  | "strong"
  | "verified";

export type BehavioralConfidenceBreakdown = {
  sourceAgreement: number;
  freshnessScore: number;
  sampleScore: number;
  schemaScore: number;
  issuePenalty: number;
};

export type BehavioralConfidenceResult = {
  score: number;
  normalizedScore: number;
  label: BehavioralConfidenceLabel;
  breakdown: BehavioralConfidenceBreakdown;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function toScoreLabel(score: number): BehavioralConfidenceLabel {
  if (score >= 90) return "verified";
  if (score >= 75) return "strong";
  if (score >= 50) return "usable";
  if (score >= 30) return "low";
  return "insufficient";
}

export function computeBehavioralConfidence(input: {
  agreeingSources: number;
  availableSources: number;
  ageMs: number;
  maxFreshnessMs: number;
  sampleCount: number;
  requiredFieldsPresent: number;
  requiredFieldsTotal: number;
  issueCount: number;
}): BehavioralConfidenceResult {
  const availableSources = Math.max(0, input.availableSources);
  const agreeingSources = Math.max(0, Math.min(input.agreeingSources, availableSources));
  const requiredFieldsTotal = Math.max(1, input.requiredFieldsTotal);
  const sourceAgreement = availableSources > 0 ? agreeingSources / availableSources : 0;
  const freshnessScore = input.maxFreshnessMs > 0
    ? Math.max(0, 1 - (Math.max(0, input.ageMs) / input.maxFreshnessMs))
    : 0;
  const sampleScore = Math.min(1, Math.log10(Math.max(0, input.sampleCount) + 1) / 3);
  const schemaScore = Math.max(0, Math.min(input.requiredFieldsPresent, requiredFieldsTotal)) / requiredFieldsTotal;
  const issuePenalty = Math.min(0.6, Math.max(0, input.issueCount) * 0.12);

  const normalizedScore = clamp01(
    (0.35 * sourceAgreement) +
    (0.25 * freshnessScore) +
    (0.25 * sampleScore) +
    (0.15 * schemaScore) -
    issuePenalty,
  );
  const score = Math.round(normalizedScore * 100);

  return {
    score,
    normalizedScore,
    label: toScoreLabel(score),
    breakdown: {
      sourceAgreement,
      freshnessScore,
      sampleScore,
      schemaScore,
      issuePenalty,
    },
  };
}

export type BehavioralConfidenceLineage = "identified_user" | "linked_guest_user" | "guest_only" | "legacy_only";
export type BehavioralOutcomeValidation = "validated" | "proxy" | "interaction_only" | "none";

export type BehavioralConfidenceV2Input = {
  sourceReliabilityMax: number;
  lineage: BehavioralConfidenceLineage;
  sampleCount: number;
  ageMs: number;
  maxFreshnessMs: number;
  requiredFieldsPresent: number;
  requiredFieldsTotal: number;
  outcomeValidation: BehavioralOutcomeValidation;
  hasServerOrCanonicalTruth: boolean;
};

export type BehavioralConfidenceLabel = "insufficient" | "directional" | "usable" | "strong" | "verified";

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function resolveBehavioralConfidenceLabel(value: number): BehavioralConfidenceLabel {
  if (value < 0.3) return "insufficient";
  if (value < 0.5) return "directional";
  if (value < 0.75) return "usable";
  if (value < 0.9) return "strong";
  return "verified";
}

function resolveLineageScore(lineage: BehavioralConfidenceLineage) {
  if (lineage === "identified_user") return 1;
  if (lineage === "linked_guest_user") return 0.75;
  if (lineage === "guest_only") return 0.45;
  return 0.25;
}

function resolveOutcomeValidationScore(outcome: BehavioralOutcomeValidation) {
  if (outcome === "validated") return 1;
  if (outcome === "proxy") return 0.7;
  if (outcome === "interaction_only") return 0.3;
  return 0;
}

export function computeBehavioralConfidenceV2(input: BehavioralConfidenceV2Input) {
  const sourceScore = clamp01(input.sourceReliabilityMax);
  const lineageScore = resolveLineageScore(input.lineage);
  const sampleScore = Math.min(1, Math.log10(Math.max(0, input.sampleCount) + 1) / 2.5);
  const freshnessScore = Math.max(0, 1 - (Math.max(0, input.ageMs) / Math.max(1, input.maxFreshnessMs)));
  const schemaScore = input.requiredFieldsTotal <= 0
    ? 0
    : clamp01(input.requiredFieldsPresent / input.requiredFieldsTotal);
  const outcomeValidationScore = resolveOutcomeValidationScore(input.outcomeValidation);

  let confidence = clamp01(
    (0.25 * sourceScore)
      + (0.20 * lineageScore)
      + (0.20 * sampleScore)
      + (0.15 * freshnessScore)
      + (0.10 * schemaScore)
      + (0.10 * outcomeValidationScore),
  );

  if (input.lineage === "guest_only") {
    confidence = Math.min(confidence, 0.45);
  }
  if (input.lineage === "legacy_only") {
    confidence = Math.min(confidence, 0.30);
  }
  if (input.outcomeValidation === "none" || input.outcomeValidation === "interaction_only") {
    confidence = Math.min(confidence, 0.60);
  }
  if (!input.hasServerOrCanonicalTruth) {
    confidence = Math.min(confidence, 0.89);
  }

  const label = resolveBehavioralConfidenceLabel(confidence);
  return {
    confidence,
    label,
    sourceScore,
    lineageScore,
    sampleScore,
    freshnessScore,
    schemaScore,
    outcomeValidationScore,
  };
}

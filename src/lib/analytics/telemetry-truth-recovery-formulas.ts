export const TELEMETRY_TRUTH_RECOVERY_FORMULAS = {
  observedViews: "observedViews = direct observed view events from raw viewer open/session start evidence",
  checkedViews: "checkedViews = observed view candidates after dedupe and validity checks",
  finalViews: "finalViews = checkedViews + approved estimated recovery when quality allows",
  estimatedRatio: "estimatedRatio = estimatedViews / max(finalViews, 1)",
  duplicateRate: "duplicateRate = duplicateViews / max(observedViews, 1)",
  confidence: "confidence = weighted quality score from freshness, duplicates, recovery rate, and source completeness",
} as const;

export function calculateTelemetryTruthRecoveryFormulas(input: {
  observedViews: number;
  checkedViews: number;
  finalViews?: number;
  estimatedViews: number;
  duplicateViews?: number;
  freshnessScore?: number;
  sourceCompletenessScore?: number;
  recoveryQualityScore?: number;
}) {
  const observedViews = Math.max(0, input.observedViews);
  const checkedViews = Math.max(0, input.checkedViews);
  const estimatedViews = Math.max(0, input.estimatedViews);
  const finalViews = Math.max(0, input.finalViews ?? checkedViews + estimatedViews);
  const duplicateViews = Math.max(0, input.duplicateViews ?? Math.max(0, observedViews - checkedViews));
  const estimatedRatioPct = Math.round((estimatedViews / Math.max(finalViews, 1)) * 100);
  const duplicateRatePct = Math.round((duplicateViews / Math.max(observedViews, 1)) * 100);
  const freshness = Math.max(0, Math.min(100, input.freshnessScore ?? 0));
  const completeness = Math.max(0, Math.min(100, input.sourceCompletenessScore ?? 0));
  const recoveryQuality = Math.max(0, Math.min(100, input.recoveryQualityScore ?? (estimatedViews > 0 ? 60 : 100)));
  const duplicatePenalty = Math.min(40, duplicateRatePct);
  const confidencePct = Math.max(0, Math.round((freshness * 0.3) + (completeness * 0.35) + (recoveryQuality * 0.35) - duplicatePenalty));

  return {
    observedViews,
    checkedViews,
    finalViews,
    estimatedViews,
    estimatedRatioPct,
    duplicateRatePct,
    confidencePct,
    formulas: TELEMETRY_TRUTH_RECOVERY_FORMULAS,
  };
}

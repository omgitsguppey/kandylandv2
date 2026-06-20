import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  buildRecoveredLaunchMetricState,
  classifyRecoveryMetricSourceEvidence,
  classifyRecoveryMetricConfidenceBand,
  type RecoveryMetricFreshnessState,
} from "@/lib/analytics/recovery-timeline-spine";

export const TELEMETRY_TRUTH_RECOVERY_FORMULAS = {
  observedViews: "observedViews = direct observed view events from raw viewer open/session start evidence",
  checkedViews: "checkedViews = observed view candidates after dedupe and validity checks",
  finalViews: "finalViews = checkedViews + approved estimated recovery when quality allows",
  estimatedRatio: "estimatedRatio = estimatedViews / max(finalViews, 1)",
  duplicateRate: "duplicateRate = duplicateViews / max(observedViews, 1)",
  confidence: "confidence = local formula quality score from freshness, duplicates, recovery rate, and source completeness; recoverySpineConfidenceScore is the canonical metric confidence from the recovery timeline spine",
  sourceTruth: "sourceTruth/evidenceKind/freshnessState/dedupeKey/lateArrivalWindowDays/recoverySpineConfidenceScore come from the recovery timeline spine",
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
  lastRebuildAtUtc?: string | null;
  sourcePath?: string | null;
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
  const formulaConfidenceScore = Math.max(0, Math.round((freshness * 0.3) + (completeness * 0.35) + (recoveryQuality * 0.35) - duplicatePenalty));
  const formulaConfidenceBand = classifyRecoveryMetricConfidenceBand(formulaConfidenceScore);
  const sourceEvidence = classifyRecoveryMetricSourceEvidence({
    checkedCount: checkedViews,
    estimatedCount: estimatedViews,
    finalCount: finalViews,
  });
  const rebuildTimestampMs = typeof input.lastRebuildAtUtc === "string"
    ? Date.parse(input.lastRebuildAtUtc)
    : Number.NaN;
  const recoveryMetric = buildRecoveredLaunchMetricState({
    eventName: "semantic_page_viewed",
    sourceTruth: sourceEvidence.sourceTruth,
    sourceObserved: sourceEvidence.sourceObserved,
    evidenceKind: sourceEvidence.evidenceKind,
    route: "telemetry_truth_recovery",
    objectId: input.sourcePath ?? "view_recovery",
    timestampMs: Number.isFinite(rebuildTimestampMs) ? rebuildTimestampMs : undefined,
    insideLateArrivalWindow: Boolean(input.lastRebuildAtUtc),
  });
  const freshnessState: RecoveryMetricFreshnessState = sourceEvidence.sourceTruth === "source_missing"
    ? "source_missing"
    : input.lastRebuildAtUtc
      ? recoveryMetric.freshnessState
      : "refresh_due";

  return {
    observedViews,
    checkedViews,
    finalViews,
    estimatedViews,
    estimatedRatioPct,
    duplicateRatePct,
    confidencePct: formulaConfidenceScore,
    confidenceScore: formulaConfidenceScore,
    confidenceBand: formulaConfidenceBand,
    formulaConfidenceScore,
    formulaConfidenceBand,
    recoverySpineConfidenceScore: recoveryMetric.confidenceScore,
    recoverySpineConfidenceBand: recoveryMetric.confidenceBand,
    sourceTruth: sourceEvidence.sourceTruth,
    freshnessState,
    evidenceKind: sourceEvidence.evidenceKind,
    dedupeKey: recoveryMetric.dedupeKey,
    dedupeDimensions: recoveryMetric.dedupeDimensions,
    lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
    productTruthEligible: sourceEvidence.productTruthEligible,
    missingVsZeroState: sourceEvidence.missingVsZeroState,
    formulas: TELEMETRY_TRUTH_RECOVERY_FORMULAS,
  };
}

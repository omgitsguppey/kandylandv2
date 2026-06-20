import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  buildRecoveredLaunchMetricState,
  classifyRecoveryMetricConfidenceBand,
  type RecoveryMetricEvidenceKind,
  type RecoveryMetricFreshnessState,
  type RecoveryMetricSourceTruth,
} from "@/lib/analytics/recovery-timeline-spine";

export const TELEMETRY_TRUTH_RECOVERY_FORMULAS = {
  observedViews: "observedViews = direct observed view events from raw viewer open/session start evidence",
  checkedViews: "checkedViews = observed view candidates after dedupe and validity checks",
  finalViews: "finalViews = checkedViews + approved estimated recovery when quality allows",
  estimatedRatio: "estimatedRatio = estimatedViews / max(finalViews, 1)",
  duplicateRate: "duplicateRate = duplicateViews / max(observedViews, 1)",
  confidence: "confidence = weighted quality score from freshness, duplicates, recovery rate, source completeness, and recovery-spine evidence role",
  sourceTruth: "sourceTruth/evidenceKind/freshnessState/dedupeKey/lateArrivalWindowDays come from the recovery timeline spine",
} as const;

function sourceTruthForRecoveryFormula(input: {
  checkedViews: number;
  estimatedViews: number;
  finalViews: number;
}): RecoveryMetricSourceTruth {
  if (input.checkedViews > 0) return "first_party_event_fact";
  if (input.estimatedViews > 0 || input.finalViews > 0) return "ga4_evidence_only";
  return "source_missing";
}

function evidenceKindForRecoveryFormula(sourceTruth: RecoveryMetricSourceTruth): RecoveryMetricEvidenceKind {
  if (sourceTruth === "first_party_event_fact") return "observed";
  if (sourceTruth === "ga4_evidence_only") return "modeled";
  return "missing";
}

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
  const confidenceScore = Math.max(0, Math.round((freshness * 0.3) + (completeness * 0.35) + (recoveryQuality * 0.35) - duplicatePenalty));
  const sourceTruth = sourceTruthForRecoveryFormula({ checkedViews, estimatedViews, finalViews });
  const evidenceKind = evidenceKindForRecoveryFormula(sourceTruth);
  const rebuildTimestampMs = typeof input.lastRebuildAtUtc === "string"
    ? Date.parse(input.lastRebuildAtUtc)
    : Number.NaN;
  const recoveryMetric = buildRecoveredLaunchMetricState({
    eventName: "semantic_page_viewed",
    sourceTruth,
    sourceObserved: sourceTruth !== "source_missing",
    evidenceKind,
    route: "telemetry_truth_recovery",
    objectId: input.sourcePath ?? "view_recovery",
    timestampMs: Number.isFinite(rebuildTimestampMs) ? rebuildTimestampMs : undefined,
    insideLateArrivalWindow: Boolean(input.lastRebuildAtUtc),
  });
  const freshnessState: RecoveryMetricFreshnessState = sourceTruth === "source_missing"
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
    confidencePct: confidenceScore,
    confidenceScore,
    confidenceBand: classifyRecoveryMetricConfidenceBand(confidenceScore),
    sourceTruth,
    freshnessState,
    evidenceKind,
    dedupeKey: recoveryMetric.dedupeKey,
    dedupeDimensions: recoveryMetric.dedupeDimensions,
    lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
    productTruthEligible: sourceTruth === "first_party_event_fact",
    missingVsZeroState: sourceTruth === "source_missing" ? "source_missing" : "source_present",
    formulas: TELEMETRY_TRUTH_RECOVERY_FORMULAS,
  };
}

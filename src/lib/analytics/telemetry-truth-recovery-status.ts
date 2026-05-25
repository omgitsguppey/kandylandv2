import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import { calculateTelemetryTruthRecoveryFormulas } from "@/lib/analytics/telemetry-truth-recovery-formulas";

export function buildTelemetryTruthRecoveryStatus(input: {
  observedViews: number;
  checkedViews: number;
  finalViews?: number;
  estimatedViews: number;
  dropMetricCount: number;
  userMetricCount: number;
  lastRebuildAtUtc?: string | null;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  qualityState?: "verified" | "mixed" | "estimated" | "degraded" | "unknown";
  sourcePath?: string | null;
}) {
  const formulas = calculateTelemetryTruthRecoveryFormulas({
    observedViews: input.observedViews,
    checkedViews: input.checkedViews,
    finalViews: input.finalViews,
    estimatedViews: input.estimatedViews,
    freshnessScore: input.lastRebuildAtUtc ? 100 : 0,
    sourceCompletenessScore: input.dropMetricCount + input.userMetricCount > 0 ? 100 : 0,
    recoveryQualityScore: input.qualityState === "verified" ? 100 : input.qualityState === "estimated" ? 55 : 70,
  });
  const rowsLoaded = Math.max(0, input.dropMetricCount) + Math.max(0, input.userMetricCount);
  const status = classifySourceWindowZeroShell({
    rowsLoaded,
    sampleCount: rowsLoaded,
    generatedAtUtc: input.lastRebuildAtUtc,
    lastRebuildAtUtc: input.lastRebuildAtUtc,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    sourceReady: Boolean(input.sourcePath && input.lastRebuildAtUtc),
    formulaState: "documented",
    freshnessState: input.lastRebuildAtUtc ? "fresh" : "unknown",
    nextAction: rowsLoaded === 0
      ? "Run the analytics truth reconciliation job or keep per-drop/per-user rows unavailable."
      : "Review estimated recovery quality before using final reporting values.",
  });

  return {
    status,
    ...formulas,
    qualityState: input.qualityState ?? "unknown",
    dropMetricCount: Math.max(0, input.dropMetricCount),
    userMetricCount: Math.max(0, input.userMetricCount),
  };
}

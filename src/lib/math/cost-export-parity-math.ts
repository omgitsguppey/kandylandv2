export const COST_EXPORT_PARITY_MATH_VERSION = "2026.05.cost-export-parity-math.1";

export const NONCRITICAL_ANALYTICS_REFRESH_MS = 24 * 60 * 60 * 1000;
export const REALTIME_SUMMARY_MIN_REFRESH_MS = 5 * 60 * 1000;
export const DIAGNOSTIC_ROLLUP_REFRESH_MS = 60 * 60 * 1000;
export const DEFAULT_EXPORT_BATCH_MAX_ROWS = 500;
export const COMPACT_ADMIN_SUMMARY_LIMIT = 250;

export type CostRiskLevel = "low" | "medium" | "high" | "critical";
export type CostReadinessStatus =
  | "externally_reviewed_full_credit"
  | "source_guarded_external_review_remaining"
  | "owner_review"
  | "source_guard_missing";

export type CostReadinessResult = {
  status: CostReadinessStatus;
  scoreCredit: "full" | "partial" | "none";
  externalReviewRemaining: boolean;
  reason: string;
};

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number) {
  return Math.max(0, Math.trunc(finiteNumber(value, fallback)));
}

export function calculateExportBatchWindow(input: {
  lastWatermarkMs?: number | null;
  nowMs?: number | null;
  requestedRows?: number | null;
  maxRows?: number | null;
}) {
  const nowMs = finiteNumber(input.nowMs, Date.now());
  const cadenceMs = NONCRITICAL_ANALYTICS_REFRESH_MS;
  const windowStartMs = finiteNumber(input.lastWatermarkMs, nowMs - cadenceMs);
  const maxRows = Math.min(
    nonNegativeInteger(input.requestedRows, DEFAULT_EXPORT_BATCH_MAX_ROWS) || DEFAULT_EXPORT_BATCH_MAX_ROWS,
    nonNegativeInteger(input.maxRows, DEFAULT_EXPORT_BATCH_MAX_ROWS) || DEFAULT_EXPORT_BATCH_MAX_ROWS,
    DEFAULT_EXPORT_BATCH_MAX_ROWS,
  );

  return {
    mode: "watermark_batch" as const,
    cadenceMs,
    windowStartMs,
    windowEndMs: nowMs,
    maxRows,
    perEventExportAllowed: false as const,
    providerCallRequired: false as const,
  };
}

export function calculateWatermarkRange(input: {
  lastWatermarkMs?: number | null;
  lastWatermarkEventId?: string | null;
  nowMs?: number | null;
  eventTriggered?: boolean | null;
}) {
  if (input.eventTriggered === true) {
    return {
      status: "blocked_per_event_export" as const,
      perEventExportAllowed: false as const,
      reason: "BigQuery export must be batch/watermark based, not event-triggered.",
    };
  }

  const window = calculateExportBatchWindow({
    lastWatermarkMs: input.lastWatermarkMs,
    nowMs: input.nowMs,
  });
  return {
    status: "watermark_ready" as const,
    perEventExportAllowed: false as const,
    windowStartMs: window.windowStartMs,
    windowEndMs: window.windowEndMs,
    watermarkEventId: typeof input.lastWatermarkEventId === "string" ? input.lastWatermarkEventId : "",
    reason: "Export range is bounded by watermark and daily cadence.",
  };
}

export function calculateSummaryFreshness(input: {
  kind: "noncritical_analytics" | "realtime_summary" | "diagnostic_rollup";
  refreshMs: number;
  userFacingCritical?: boolean | null;
  reason?: string | null;
}) {
  const refreshMs = nonNegativeInteger(input.refreshMs, 0);
  const minimumRefreshMs = input.kind === "noncritical_analytics"
    ? NONCRITICAL_ANALYTICS_REFRESH_MS
    : input.kind === "diagnostic_rollup"
      ? DIAGNOSTIC_ROLLUP_REFRESH_MS
      : input.userFacingCritical === true
        ? 0
        : REALTIME_SUMMARY_MIN_REFRESH_MS;
  const allowed = refreshMs >= minimumRefreshMs || (input.kind === "realtime_summary" && input.userFacingCritical === true);
  return {
    status: allowed ? "allowed" as const : "too_frequent" as const,
    refreshMs,
    minimumRefreshMs,
    reason: allowed
      ? input.reason || "Refresh cadence preserves cost and summary freshness."
      : `${input.kind} refresh cadence is faster than the allowed floor without a user-facing critical reason.`,
  };
}

export function calculateHotPathCostRisk(input: {
  writesEssentialFactsOnly: boolean;
  writesRawFirehose?: boolean | null;
  duplicateMaterializerCount?: number | null;
  canonicalFactsDropped: boolean;
}) {
  if (input.canonicalFactsDropped) {
    return {
      risk: "critical" as CostRiskLevel,
      accuracyPreserved: false,
      reason: "canonical_facts_dropped" as const,
    };
  }
  if (input.writesRawFirehose === true) {
    return {
      risk: "high" as CostRiskLevel,
      accuracyPreserved: true,
      reason: "raw_firehose_hot_path" as const,
    };
  }
  const duplicates = nonNegativeInteger(input.duplicateMaterializerCount, 0);
  if (duplicates > 0) {
    return {
      risk: "medium" as CostRiskLevel,
      accuracyPreserved: true,
      reason: "duplicate_materializers" as const,
    };
  }
  if (!input.writesEssentialFactsOnly) {
    return {
      risk: "medium" as CostRiskLevel,
      accuracyPreserved: true,
      reason: "nonessential_hot_path_writes" as const,
    };
  }
  return {
    risk: "low" as CostRiskLevel,
    accuracyPreserved: true,
    reason: "essential_summary_hot_path" as const,
  };
}

export function calculateAdminReadRisk(input: {
  defaultReadsSummary: boolean;
  rawDrilldownPaged: boolean;
  compactSummaryLimit?: number | null;
  rawFirehoseDefault?: boolean | null;
}) {
  if (input.rawFirehoseDefault === true) {
    return {
      risk: "critical" as CostRiskLevel,
      defaultSafe: false,
      reason: "raw_firehose_default" as const,
    };
  }
  const limit = nonNegativeInteger(input.compactSummaryLimit, COMPACT_ADMIN_SUMMARY_LIMIT);
  if (!input.defaultReadsSummary) {
    return {
      risk: "high" as CostRiskLevel,
      defaultSafe: false,
      reason: "summary_default_missing" as const,
    };
  }
  if (!input.rawDrilldownPaged) {
    return {
      risk: "high" as CostRiskLevel,
      defaultSafe: false,
      reason: "raw_drilldown_unpaged" as const,
    };
  }
  if (limit > COMPACT_ADMIN_SUMMARY_LIMIT) {
    return {
      risk: "medium" as CostRiskLevel,
      defaultSafe: false,
      reason: "compact_summary_limit_exceeded" as const,
    };
  }
  return {
    risk: "low" as CostRiskLevel,
    defaultSafe: true,
    reason: "summary_first_paged_drilldown" as const,
  };
}

export function classifyCostReadiness(input: {
  sourceGuarded: boolean;
  externalBillingReviewed: boolean;
  runtimeUsageDetected?: boolean | null;
}): CostReadinessResult {
  if (input.externalBillingReviewed && input.sourceGuarded) {
    return {
      status: "externally_reviewed_full_credit",
      scoreCredit: "full",
      externalReviewRemaining: false,
      reason: "Source guards exist and external billing was reviewed.",
    };
  }
  if (input.sourceGuarded && input.runtimeUsageDetected === false) {
    return {
      status: "source_guarded_external_review_remaining",
      scoreCredit: "partial",
      externalReviewRemaining: true,
      reason: "No runtime usage is detected and source guard exists, but external billing review remains.",
    };
  }
  if (input.sourceGuarded) {
    return {
      status: "source_guarded_external_review_remaining",
      scoreCredit: "partial",
      externalReviewRemaining: true,
      reason: "Source guard evidence exists; external billing proof remains separate.",
    };
  }
  if (input.runtimeUsageDetected === null || input.runtimeUsageDetected === undefined) {
    return {
      status: "owner_review",
      scoreCredit: "none",
      externalReviewRemaining: true,
      reason: "Runtime usage is unknown and needs owner review.",
    };
  }
  return {
    status: "source_guard_missing",
    scoreCredit: "none",
    externalReviewRemaining: true,
    reason: "Cost lane lacks source guard evidence.",
  };
}

export function explainCostAccuracyTradeoff(input: {
  canonicalFactsDropped: boolean;
  duplicateReadsReduced?: boolean | null;
  excessiveRefreshReduced?: boolean | null;
  duplicateWritesReduced?: boolean | null;
}) {
  if (input.canonicalFactsDropped) {
    return {
      allowed: false,
      accuracyPreserved: false,
      reason: "cost_reduction_drops_required_facts" as const,
      explanation: "Cost risk cannot be improved by deleting canonical event facts or required summary inputs.",
    };
  }
  const improvements = [
    input.duplicateReadsReduced ? "duplicate_reads_reduced" : "",
    input.duplicateWritesReduced ? "duplicate_writes_reduced" : "",
    input.excessiveRefreshReduced ? "excessive_refresh_reduced" : "",
  ].filter(Boolean);
  return {
    allowed: true,
    accuracyPreserved: true,
    reason: improvements.length ? "accuracy_preserving_cost_reduction" as const : "no_cost_change" as const,
    improvements,
    explanation: "Cost reduction preserves canonical facts and works by reducing duplicate reads/writes or excessive refresh frequency.",
  };
}

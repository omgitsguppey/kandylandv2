export type DeterministicMetricState =
  | "WAIT"
  | "loaded"
  | "live"
  | "review"
  | "stale"
  | "delayed"
  | "unavailable"
  | "not_observed"
  | "no_sample"
  | "partial"
  | "estimated"
  | "failed";

export type MetricFreshnessState = "live" | "recent" | "stale" | "delayed" | "unknown";

export function resolveMetricState(input: {
  isLoading: boolean;
  loaded: boolean;
  value: unknown;
  sourceTruth?: string | null;
  freshnessState?: MetricFreshnessState | string | null;
  required?: boolean;
  warnings?: unknown[] | number;
  errors?: unknown[] | number;
  estimated?: boolean;
  stale?: boolean;
  noSample?: boolean;
}): { state: DeterministicMetricState; reason: string } {
  if (input.isLoading || !input.loaded) {
    return { state: "WAIT", reason: "Request is actively loading." };
  }

  const errorCount = Array.isArray(input.errors) ? input.errors.length : Number(input.errors || 0);
  if (errorCount > 0) {
    return { state: "failed", reason: "Completed source returned errors." };
  }

  const sourceMissing = !input.sourceTruth || input.sourceTruth === "missing" || input.sourceTruth === "unknown";
  if (sourceMissing) {
    if (input.value === 0 || input.value === null || typeof input.value === "undefined") {
      return { state: "not_observed", reason: "Source completed without proof of an observed sample." };
    }
    return { state: "unavailable", reason: "Source truth is missing for the loaded value." };
  }

  if (input.noSample) {
    return { state: "no_sample", reason: "Source loaded and verified no sample for this range." };
  }

  if (input.estimated) {
    return { state: "estimated", reason: "Metric includes estimated or recovered values." };
  }

  if (input.stale || input.freshnessState === "stale") {
    return { state: "stale", reason: "Metric is loaded from stale source data." };
  }

  const warningCount = Array.isArray(input.warnings) ? input.warnings.length : Number(input.warnings || 0);
  if (warningCount > 0) {
    return { state: "review", reason: "Metric loaded with source warnings." };
  }

  if (input.value === 0) {
    return { state: "live", reason: "Source loaded and verified zero." };
  }

  return { state: "live", reason: "Source loaded with verified value." };
}

export type SafeRateState = "available" | "unavailable" | "event_volume_ratio";

export function safeRate(input: {
  numerator: number | null | undefined;
  denominator: number | null | undefined;
  numeratorSource: string;
  denominatorSource: string;
  numeratorRange: string;
  denominatorRange: string;
  label: string;
  allowEventRatio?: boolean;
}): {
  valuePct: number | null;
  display: string;
  state: SafeRateState;
  reason: string;
  denominatorLabel: string;
} {
  const numerator = Number(input.numerator);
  const denominator = Number(input.denominator);
  const denominatorLabel = `${input.denominatorSource} | ${input.denominatorRange}`;

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return { valuePct: null, display: "Unavailable", state: "unavailable", reason: `${input.label} unavailable: missing numerator or denominator.`, denominatorLabel };
  }

  if (input.numeratorRange !== input.denominatorRange || input.numeratorSource !== input.denominatorSource) {
    return { valuePct: null, display: "Unavailable", state: "unavailable", reason: `${input.label} unavailable: mismatched source/range.`, denominatorLabel };
  }

  if (denominator <= 0) {
    return { valuePct: null, display: "Unavailable", state: "unavailable", reason: `${input.label} unavailable: denominator is zero or not observed.`, denominatorLabel };
  }

  const valuePct = (Math.max(0, numerator) / denominator) * 100;
  if (valuePct > 100 && !input.allowEventRatio) {
    return { valuePct: null, display: "Unavailable", state: "unavailable", reason: `${input.label} unavailable: conversion rate exceeds 100% and is not an event-volume ratio.`, denominatorLabel };
  }

  const display =
    numerator > 0 && valuePct > 0 && valuePct < 0.1
      ? "<0.1%"
      : valuePct < 10
        ? `${valuePct.toFixed(1)}%`
        : `${Math.round(valuePct)}%`;

  return {
    valuePct,
    display,
    state: valuePct > 100 ? "event_volume_ratio" : "available",
    reason: valuePct > 100 ? `${input.label} is an event-volume ratio, not a conversion rate.` : `${input.label} uses matched source/range denominator.`,
    denominatorLabel,
  };
}

export function getRollingWindow(nowUtc: string | number | Date, days: number) {
  const endMs = typeof nowUtc === "number" ? nowUtc : new Date(nowUtc).getTime();
  const safeDays = Math.max(1, Math.floor(days));
  const windowMs = safeDays * 24 * 60 * 60 * 1000;
  const currentStartMs = endMs - windowMs;
  const priorEndMs = currentStartMs;
  const priorStartMs = priorEndMs - windowMs;
  return {
    currentStartUtc: new Date(currentStartMs).toISOString(),
    currentEndUtc: new Date(endMs).toISOString(),
    priorStartUtc: new Date(priorStartMs).toISOString(),
    priorEndUtc: new Date(priorEndMs).toISOString(),
    label: `Rolling ${safeDays}D`,
  };
}

export type DailyTaskWindowTruth = {
  dailyTaskWindowId: string;
  windowStartAtUtc: string;
  windowEndAtUtc: string;
  resetAtUtc: string;
};

export function calculateGumdropValueBasis(input: {
  paidUsdCollected: number;
  paidGdIssued: number;
  paidBonusGdIssued: number;
  rewardFreeGdIssued: number;
}) {
  const paidSourceGdIssued = Math.max(0, input.paidGdIssued) + Math.max(0, input.paidBonusGdIssued);
  const averageUsdPer100PaidSourceGd = paidSourceGdIssued > 0
    ? (Math.max(0, input.paidUsdCollected) / paidSourceGdIssued) * 100
    : null;
  const effectiveGdPerUsd = input.paidUsdCollected > 0 ? paidSourceGdIssued / input.paidUsdCollected : null;
  const floorState =
    averageUsdPer100PaidSourceGd === null
      ? "unknown"
      : averageUsdPer100PaidSourceGd < 0.5
        ? "error"
        : averageUsdPer100PaidSourceGd < 0.75
          ? "warn"
          : "healthy";
  return {
    paidSourceGdIssued,
    averageUsdPer100PaidSourceGd,
    effectiveGdPerUsd,
    floorState,
    rewardFreeGdIssued: Math.max(0, input.rewardFreeGdIssued),
  };
}

export function resolveWatchTruth(input: {
  verifiedWatchSeconds: number;
  estimatedWatchSeconds: number;
  fallbackWatchSeconds: number;
  rawGapCount: number;
  closeMissingCount: number;
  replayRecoveredCount: number;
}) {
  const verified = Math.max(0, input.verifiedWatchSeconds);
  const estimated = Math.max(0, input.estimatedWatchSeconds);
  const fallback = Math.max(0, input.fallbackWatchSeconds);
  const qualityReasons: string[] = [];
  if (estimated > 0) qualityReasons.push("estimated_watch_present");
  if (fallback > 0) qualityReasons.push("fallback_watch_present");
  if (input.rawGapCount > 0) qualityReasons.push("raw_capture_gaps");
  if (input.closeMissingCount > 0) qualityReasons.push("close_missing");
  if (input.replayRecoveredCount > 0) qualityReasons.push("replay_recovered");

  const quality =
    verified > 0 && estimated === 0 && fallback === 0 && input.rawGapCount === 0 && input.closeMissingCount === 0
      ? "exact"
      : estimated > 0
        ? "estimated"
        : fallback > 0
          ? "fallback"
          : verified > 0
            ? "mixed"
            : "unknown";

  const penalty = (estimated > 0 ? 25 : 0) + (fallback > 0 ? 25 : 0) + (input.rawGapCount > 0 ? 20 : 0) + (input.closeMissingCount > 0 ? 20 : 0);
  return {
    totalWatchSeconds: verified + estimated + fallback,
    quality,
    confidencePct: Math.max(0, 100 - penalty),
    qualityReasons,
  };
}

export type EventContextClassification = {
  actorType: "user" | "admin" | "creator" | "guest" | "system" | "unknown";
  eventContext:
    | "foreground_user"
    | "identity_linkage"
    | "background_task_engine"
    | "background_ledger"
    | "notification_system"
    | "server_system"
    | "admin_internal"
    | "creator_materialized"
    | "semantic_supporting";
  requiredFields: string[];
  optionalFields: string[];
  metricEligible: boolean;
  metricExclusionReason: string | null;
};

export function classifyEventContext(event: { eventName?: string; actorType?: string; isAdmin?: boolean; source?: string }): EventContextClassification {
  const eventName = event.eventName || "";
  if (event.isAdmin || event.actorType === "admin" || eventName.startsWith("admin_")) {
    return { actorType: "admin", eventContext: "admin_internal", requiredFields: ["actorUserId"], optionalFields: ["route", "surface"], metricEligible: false, metricExclusionReason: "admin_internal_excluded" };
  }
  if (eventName.includes("notification")) {
    return { actorType: "system", eventContext: "notification_system", requiredFields: ["targetUserId"], optionalFields: ["actorUserId", "route"], metricEligible: true, metricExclusionReason: null };
  }
  if (eventName.includes("task")) {
    return { actorType: "system", eventContext: "background_task_engine", requiredFields: ["taskId", "dailyTaskWindowId"], optionalFields: ["actorUserId"], metricEligible: true, metricExclusionReason: null };
  }
  if (eventName.includes("ledger") || eventName.includes("purchase") || eventName.includes("unwrap")) {
    return { actorType: "system", eventContext: "background_ledger", requiredFields: ["targetUserId"], optionalFields: ["packageId", "dropId"], metricEligible: true, metricExclusionReason: null };
  }
  return { actorType: event.actorType === "guest" ? "guest" : "user", eventContext: "foreground_user", requiredFields: ["actorUserId", "timestamp"], optionalFields: ["route", "surface", "sessionId"], metricEligible: true, metricExclusionReason: null };
}

export function adjustRegionalDemand<T extends { city?: string | null; country?: string | null; count?: number; rawCount?: number; adminInternalCount?: number; unknownIdentityCount?: number }>(rows: T[]) {
  return rows.map((row) => {
    const rawCount = Math.max(0, Number(row.rawCount ?? row.count ?? 0));
    const adminInternalCount = Math.max(0, Number(row.adminInternalCount ?? 0));
    const unknownIdentityCount = Math.max(0, Number(row.unknownIdentityCount ?? 0));
    const adjustedExternalCount = Math.max(0, rawCount - adminInternalCount);
    const demandState =
      !row.city || row.city === "(not set)" || !row.country || row.country === "(not set)"
        ? "unknown_location"
        : adminInternalCount > adjustedExternalCount
          ? "mostly_internal"
          : adminInternalCount > 0
            ? "mixed_with_internal"
            : "verified_external";
    return { ...row, rawCount, adjustedExternalCount, adminInternalCount, unknownIdentityCount, demandState };
  });
}

export function resolvePanelPagination(input: { page: number; pageSize: number; totalRows: number; sourceMode?: string }) {
  const pageSize = Math.max(1, Math.floor(input.pageSize || 1));
  const totalRows = Math.max(0, Math.floor(input.totalRows || 0));
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(Math.max(1, Math.floor(input.page || 1)), pageCount);
  return {
    page,
    pageSize,
    hasNext: page < pageCount,
    totalRows,
    sourceMode: input.sourceMode ?? "unknown",
    startIndex: (page - 1) * pageSize,
    endIndex: Math.min(totalRows, page * pageSize),
  };
}

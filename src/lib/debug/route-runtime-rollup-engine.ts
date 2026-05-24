import {
  ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS,
  ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS,
  type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";
import type {
  RouteRuntimeCohort,
  RouteRuntimeCohortSummary,
  RouteRuntimeHealthState,
  RouteRuntimeObservedState,
  RouteRuntimeRollup,
  RouteRuntimeRollupOptions,
  RouteRuntimeRouteClassification,
  RouteRuntimeWarningGroup,
} from "./route-runtime-rollup-contract";

const ALL_COHORTS: RouteRuntimeCohort[] = [
  "admin",
  "public",
  "support",
  "chat_native",
  "chat_compat",
  "creator",
  "ai",
  "analytics",
  "system",
];

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getTotalSamples(item: Pick<RouteRuntimeHealthItem, "successCount" | "clientErrorCount" | "serverErrorCount">) {
  return Math.max(0, numberValue(item.successCount))
    + Math.max(0, numberValue(item.clientErrorCount))
    + Math.max(0, numberValue(item.serverErrorCount));
}

function latestFailureAt(item: Pick<RouteRuntimeHealthItem, "lastClientErrorAtMs" | "lastServerErrorAtMs">) {
  return Math.max(0, numberValue(item.lastClientErrorAtMs), numberValue(item.lastServerErrorAtMs));
}

export function classifyRouteCohort(item: Pick<RouteRuntimeHealthItem, "key" | "routeName">): RouteRuntimeCohort {
  const key = String(item.key);
  const routeName = String(item.routeName);
  if (key.startsWith("chat/")) return "chat_native";
  if (key.startsWith("creator/messages:")) return "chat_compat";
  if (routeName.startsWith("admin/support") || routeName.startsWith("support")) return "support";
  if (routeName.startsWith("admin/")) return key.includes("assistant") ? "ai" : "admin";
  if (routeName.startsWith("creator/") || routeName.startsWith("creators/")) return "creator";
  if (routeName.startsWith("analytics/") || routeName.includes("watch-session")) return "analytics";
  if (routeName.startsWith("cron/") || routeName.startsWith("__/") || routeName.startsWith("security/")) return "system";
  return "public";
}

export function classifyRouteObservation(
  item: RouteRuntimeHealthItem,
  options: RouteRuntimeRollupOptions = {},
): RouteRuntimeObservedState {
  const nowMs = options.nowMs ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? ROUTE_RUNTIME_HEALTH_STALE_AFTER_MS;
  const updatedAtMs = numberValue(item.updatedAtMs);
  if (updatedAtMs <= 0) {
    return (options.expectedRouteKeys ?? []).includes(item.key) ? "unseen_expected" : "unseen_not_expected";
  }
  return nowMs - updatedAtMs >= staleAfterMs ? "observed_stale" : "observed_current";
}

export function classifyRouteHealth(
  item: RouteRuntimeHealthItem,
  options: RouteRuntimeRollupOptions = {},
): RouteRuntimeRouteClassification {
  const nowMs = options.nowMs ?? Date.now();
  const failActiveWindowMs = options.failActiveWindowMs ?? ROUTE_RUNTIME_HEALTH_FAIL_ACTIVE_WINDOW_MS;
  const observedState = classifyRouteObservation(item, options);
  const samples = getTotalSamples(item);
  const serverErrors = Math.max(0, numberValue(item.serverErrorCount));
  const clientErrors = Math.max(0, numberValue(item.clientErrorCount));
  const slowCount = Math.max(0, numberValue(item.slowCount));
  const lastFailureAtMs = latestFailureAt(item);
  const failureIsCurrent = item.lastResult === "server_error"
    && observedState === "observed_current"
    && lastFailureAtMs > 0
    && nowMs - lastFailureAtMs <= failActiveWindowMs;
  const slowIsCurrent = observedState === "observed_current"
    && numberValue(item.slowThresholdMs) > 0
    && numberValue(item.lastLatencyMs) >= numberValue(item.slowThresholdMs);
  const warningIsCurrent = !failureIsCurrent
    && observedState === "observed_current"
    && (item.lastResult === "client_error" || item.lastResult === "server_error" || slowIsCurrent);
  const healthState: RouteRuntimeHealthState = failureIsCurrent
    ? "failed"
    : observedState === "observed_stale"
      ? "stale"
      : observedState === "unseen_expected" || observedState === "unseen_not_expected"
        ? "unseen"
        : warningIsCurrent
          ? "warning"
          : "healthy";
  const freshnessState = observedState === "observed_current"
    ? "current"
    : observedState === "observed_stale"
      ? "stale"
      : observedState.startsWith("unseen")
        ? "unseen"
        : "unknown";
  const scoreImpact = failureIsCurrent ? 2 : warningIsCurrent ? 1 : 0;
  const nextAction = failureIsCurrent
    ? `Inspect the latest server error for ${item.key}.`
    : observedState === "observed_stale"
      ? "Refresh route runtime evidence; stale samples are not current failures."
      : observedState.startsWith("unseen")
        ? "Collect a runtime sample only if this route is expected in the current window."
        : warningIsCurrent
          ? "Inspect the current warning group for this route."
          : "No route action needed.";

  return {
    routeKey: item.key,
    routeName: item.routeName,
    method: item.method,
    cohort: classifyRouteCohort(item),
    observedState,
    healthState,
    sampleCounts: {
      success: Math.max(0, numberValue(item.successCount)),
      clientError: clientErrors,
      serverError: serverErrors,
      slow: slowCount,
      total: samples,
    },
    lastObservedAtMs: Math.max(0, numberValue(item.updatedAtMs)),
    lastFailureAtMs,
    freshnessState,
    failureIsCurrent,
    warningIsCurrent,
    slowIsCurrent,
    scoreImpact,
    nextAction,
  };
}

export function groupRouteRuntimeWarnings(items: readonly RouteRuntimeHealthItem[], options: RouteRuntimeRollupOptions = {}): RouteRuntimeWarningGroup[] {
  const records = items.map((item) => classifyRouteHealth(item, options));
  const groups = new Map<string, RouteRuntimeWarningGroup>();
  const add = (groupId: string, label: string, record: RouteRuntimeRouteClassification, current: boolean) => {
    const existing = groups.get(groupId) ?? { groupId, label, count: 0, current, routeKeys: [] };
    existing.count += 1;
    existing.current = existing.current || current;
    existing.routeKeys = Array.from(new Set([...existing.routeKeys, record.routeKey]));
    groups.set(groupId, existing);
  };

  for (const record of records) {
    if (record.failureIsCurrent) continue;
    if (record.observedState === "observed_stale") add("stale_route_sample", "Stale route samples", record, false);
    if (record.observedState.startsWith("unseen")) add("unseen_no_sample", "Unseen tracked routes", record, false);
    if (record.warningIsCurrent && record.sampleCounts.clientError > 0) add("client_error_current", "Current client-error warnings", record, true);
    if (record.warningIsCurrent && record.sampleCounts.serverError > 0) add("server_error_review", "Server-error warning history", record, true);
    if (record.slowIsCurrent) add("latency_current", "Current slow routes", record, true);
    if (!record.slowIsCurrent && record.sampleCounts.slow > 0) add("latency_history", "Historical slow samples", record, false);
  }

  return Array.from(groups.values()).sort((left, right) => Number(right.current) - Number(left.current) || right.count - left.count || left.groupId.localeCompare(right.groupId));
}

function emptyCohort(cohort: RouteRuntimeCohort, options: RouteRuntimeRollupOptions): RouteRuntimeCohortSummary {
  const errorThreshold = options.nativeChatErrorThreshold ?? 0.01;
  return {
    cohort,
    trackedRoutes: 0,
    observedRoutes: 0,
    unseenRoutes: 0,
    staleRoutes: 0,
    currentFailCount: 0,
    staleFailCount: 0,
    samples: 0,
    errorSamples: 0,
    errorRate: 0,
    errorRateLabel: "0.0%",
    errorThreshold,
    errorRateState: "no_samples",
    migrationStatus: cohort === "chat_compat" ? "legacy_visible_until_removal" : cohort === "chat_native" ? "native_current" : "not_applicable",
    legacyRemovalDate: cohort === "chat_compat" ? options.compatLegacyRemovalDate ?? "2026-07-31" : undefined,
    status: "no_sample",
    narrative: "",
    narrativeContradictionCount: 0,
  };
}

function finalizeCohort(summary: RouteRuntimeCohortSummary): RouteRuntimeCohortSummary {
  const errorRate = summary.samples > 0 ? summary.errorSamples / summary.samples : 0;
  const errorRateLabel = `${(errorRate * 100).toFixed(errorRate >= 0.1 ? 0 : 1)}%`;
  const errorRateState = summary.samples === 0 ? "no_samples" : errorRate > summary.errorThreshold ? "over_threshold" : "under_threshold";
  const label = summary.cohort === "chat_native" ? "Native chat" : summary.cohort === "chat_compat" ? "Compat chat" : summary.cohort;
  const status: RouteRuntimeCohortSummary["status"] = summary.currentFailCount > 0
    ? "failed"
    : summary.cohort === "chat_compat"
      ? "legacy_visible_until_removal"
      : summary.trackedRoutes === 0
        ? "no_sample"
        : summary.staleRoutes > 0 || summary.unseenRoutes > 0 || errorRateState === "over_threshold"
          ? "warning"
          : "healthy";
  return {
    ...summary,
    errorRate,
    errorRateLabel,
    errorRateState,
    status,
    narrative: `${label}: ${summary.currentFailCount} current fail / ${summary.staleRoutes} stale / ${summary.unseenRoutes} unseen; ${summary.errorSamples} error samples across ${summary.samples} tracked samples.`,
    narrativeContradictionCount: 0,
  };
}

export function buildRouteRuntimeCohortSummary(
  items: readonly RouteRuntimeHealthItem[],
  options: RouteRuntimeRollupOptions = {},
): Record<RouteRuntimeCohort, RouteRuntimeCohortSummary> {
  const byCohort = Object.fromEntries(ALL_COHORTS.map((cohort) => [cohort, emptyCohort(cohort, options)])) as Record<RouteRuntimeCohort, RouteRuntimeCohortSummary>;
  for (const item of items) {
    const record = classifyRouteHealth(item, options);
    const summary = byCohort[record.cohort];
    summary.trackedRoutes += 1;
    summary.observedRoutes += record.observedState.startsWith("observed") ? 1 : 0;
    summary.unseenRoutes += record.observedState.startsWith("unseen") ? 1 : 0;
    summary.staleRoutes += record.observedState === "observed_stale" ? 1 : 0;
    summary.currentFailCount += record.failureIsCurrent ? 1 : 0;
    summary.staleFailCount += !record.failureIsCurrent && record.sampleCounts.serverError > 0 && record.observedState === "observed_stale" ? 1 : 0;
    summary.samples += record.sampleCounts.total;
    summary.errorSamples += record.sampleCounts.clientError + record.sampleCounts.serverError;
  }
  return Object.fromEntries(ALL_COHORTS.map((cohort) => [cohort, finalizeCohort(byCohort[cohort])])) as Record<RouteRuntimeCohort, RouteRuntimeCohortSummary>;
}

export function reconcileRouteRuntimeCounts(input: Pick<RouteRuntimeRollup, "trackedCount" | "observedCount" | "unseenCount">) {
  const mismatchCount = input.trackedCount - input.observedCount - input.unseenCount;
  return {
    observedPlusUnseenMatchesTracked: mismatchCount === 0,
    mismatchCount,
  };
}

export function buildRouteRuntimeRollup(
  items: readonly RouteRuntimeHealthItem[],
  options: RouteRuntimeRollupOptions = {},
): RouteRuntimeRollup {
  const records = items.map((item) => classifyRouteHealth(item, options));
  const trackedCount = records.length;
  const observedCount = records.filter((record) => record.observedState.startsWith("observed")).length;
  const unseenCount = records.filter((record) => record.observedState.startsWith("unseen")).length;
  const staleCount = records.filter((record) => record.observedState === "observed_stale").length;
  const currentFailCount = records.filter((record) => record.failureIsCurrent).length;
  const staleFailCount = records.filter((record) => !record.failureIsCurrent && record.sampleCounts.serverError > 0 && record.observedState === "observed_stale").length;
  const warningGroups = groupRouteRuntimeWarnings(items, options);
  const warningGroupCount = warningGroups.length;
  const rawWarningCount = Math.max(warningGroupCount, Math.round(options.rawWarningCountOverride ?? records.filter((record) => record.warningIsCurrent || record.observedState === "observed_stale" || record.observedState.startsWith("unseen") || record.sampleCounts.slow > 0).length));
  const slowSampleCount = records.reduce((total, record) => total + record.sampleCounts.slow, 0);
  const currentSlowRouteCount = records.filter((record) => record.slowIsCurrent).length;
  const exactFailRoutes = records.filter((record) => record.failureIsCurrent);
  const routeListenerStatus = options.routeListenerStatus ?? "current";
  const reconciliation = reconcileRouteRuntimeCounts({ trackedCount, observedCount, unseenCount });
  const status: RouteRuntimeRollup["status"] = currentFailCount > 0
    ? "failed"
    : routeListenerStatus === "failed"
      ? "degraded"
      : warningGroups.some((group) => group.current)
        ? "degraded"
        : trackedCount > 0
          ? "healthy"
          : "unknown";

  return {
    trackedCount,
    observedCount,
    unseenCount,
    staleCount,
    currentFailCount,
    staleFailCount,
    warningGroupCount,
    rawWarningCount,
    slowSampleCount,
    currentSlowRouteCount,
    routeListenerStatus,
    exactFailRoutes,
    warningGroups,
    cohorts: buildRouteRuntimeCohortSummary(items, options),
    records,
    reconciliation,
    status,
    explanation: `${trackedCount} tracked routes. ${observedCount} observed, ${unseenCount} unseen, ${staleCount} stale. ${currentFailCount} current fail, ${staleFailCount} stale fail, ${rawWarningCount} warning samples grouped into ${warningGroupCount} root causes, ${slowSampleCount} slow samples across ${currentSlowRouteCount} current slow routes.`,
  };
}

export function explainRouteRuntimeStatus(input: RouteRuntimeRollup) {
  if (input.currentFailCount > 0) {
    return `Route runtime has ${input.currentFailCount} current failure: ${input.exactFailRoutes.map((route) => route.routeKey).join(", ")}. Stale and unseen routes are displayed separately.`;
  }
  if (input.routeListenerStatus === "failed") return "Route listener failed; use the last verified sample only as stale evidence.";
  if (input.warningGroupCount > 0) return `${input.rawWarningCount} warning samples are grouped into ${input.warningGroupCount} root causes.`;
  return "Route runtime has no current route failures.";
}

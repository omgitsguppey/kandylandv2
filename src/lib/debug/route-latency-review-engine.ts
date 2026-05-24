export type RouteLatencyReviewInput = {
  routeKey: string;
  lastResult: "success" | "client_error" | "server_error" | "no_sample";
  slowThresholdMs: number;
  lastLatencyMs: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  slowCount: number;
  sampleCount: number;
  updatedAtMs: number;
};

export type RouteLatencyReviewRecord = {
  routeKey: string;
  currentLatencyStatus: "current_fast" | "current_slow" | "current_unknown";
  historicalLatencyStatus: "healthy" | "review" | "degraded";
  slowRate: number;
  severity: "critical" | "review" | "info" | "none";
  nextAction: string;
};

const SUMMARY_FIRST_ROUTES = new Set([
  "admin/overview:GET",
  "admin/debug:GET",
  "admin/debug/control-tower:GET",
  "admin/analytics/historical:GET",
  "admin/debug/assistant:GET",
]);

function finiteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function resolveLatencyAction(routeKey: string, currentSlow: boolean) {
  if (SUMMARY_FIRST_ROUTES.has(routeKey)) {
    return currentSlow
      ? "Use summary-first/cache-safe policy before adding raw reads; keep drilldown refresh explicit."
      : "Keep summary-first/cache-safe policy; review only if current latency crosses threshold.";
  }
  if (routeKey.includes("relationships")) return "Review relationship caller batching and typed 4xx mapping before broad route refactors.";
  if (routeKey.includes("onboarding-progress")) return "Review replay suppression and typed onboarding errors before latency optimization.";
  return currentSlow ? "Inspect current latency threshold and cache/batch safe work." : "No immediate latency action.";
}

export function classifyRouteLatencyReview(input: RouteLatencyReviewInput): RouteLatencyReviewRecord {
  const threshold = Math.max(1, finiteNumber(input.slowThresholdMs));
  const lastLatencyMs = finiteNumber(input.lastLatencyMs);
  const sampleCount = Math.max(0, finiteNumber(input.sampleCount));
  const slowCount = Math.max(0, finiteNumber(input.slowCount));
  const slowRate = sampleCount > 0 ? slowCount / sampleCount : 0;
  const hasCurrentSample = input.lastResult !== "no_sample" && finiteNumber(input.updatedAtMs) > 0;
  const currentSlow = hasCurrentSample && lastLatencyMs >= threshold;
  const currentLatencyStatus = hasCurrentSample ? (currentSlow ? "current_slow" : "current_fast") : "current_unknown";
  const historicalLatencyStatus: RouteLatencyReviewRecord["historicalLatencyStatus"] = slowRate >= 0.25
    ? "degraded"
    : slowCount > 0
      ? "review"
      : "healthy";
  const severity: RouteLatencyReviewRecord["severity"] = currentSlow && slowRate >= 0.10
    ? "critical"
    : currentSlow
      ? "review"
      : slowCount > 0
        ? "info"
        : "none";

  return {
    routeKey: input.routeKey,
    currentLatencyStatus,
    historicalLatencyStatus,
    slowRate,
    severity,
    nextAction: resolveLatencyAction(input.routeKey, currentSlow),
  };
}

export function summarizeRouteLatencyReview(inputs: readonly RouteLatencyReviewInput[]) {
  const records = inputs.map(classifyRouteLatencyReview);
  return {
    records,
    currentSlowRoutes: records.filter((record) => record.currentLatencyStatus === "current_slow").map((record) => record.routeKey),
    historicalSlowReviewRoutes: records
      .filter((record) => record.currentLatencyStatus !== "current_slow" && record.historicalLatencyStatus !== "healthy")
      .map((record) => record.routeKey),
    totalSlowSamples: inputs.reduce((total, input) => total + Math.max(0, finiteNumber(input.slowCount)), 0),
  };
}

export type RouteLastResult = "success" | "client_error" | "server_error" | "no_sample";

export type RouteErrorHistoryInput = {
  routeKey: string;
  lastResult: RouteLastResult;
  updatedAtMs: number;
  lastServerErrorAtMs: number;
  lastClientErrorAtMs: number;
  successCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  expectedTypedClientError?: boolean;
};

export type RouteErrorHistoryClassification =
  | "current_server_error"
  | "current_client_error"
  | "historical_server_error"
  | "historical_client_error"
  | "resolved_error_history"
  | "expected_typed_client_error"
  | "stale_error_history"
  | "no_error";

export type RouteErrorHistoryOptions = {
  nowMs?: number;
  currentWindowMs?: number;
  staleErrorAfterMs?: number;
  clientErrorReviewThreshold?: number;
};

export type RouteErrorHistoryRecord = {
  routeKey: string;
  classification: RouteErrorHistoryClassification;
  currentFailure: boolean;
  lastErrorAtMs: number;
  lastErrorAgeMs: number;
  lastErrorAgeLabel: string;
  clientErrorRate: number;
  threshold: number;
  nextAction: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CURRENT_WINDOW_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STALE_ERROR_AFTER_MS = 14 * DAY_MS;
const DEFAULT_CLIENT_ERROR_REVIEW_THRESHOLD = 0.05;

function finiteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatAge(ms: number) {
  if (ms <= 0) return "just now";
  const days = Math.floor(ms / DAY_MS);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes}m`;
}

export function classifyRouteErrorHistory(
  input: RouteErrorHistoryInput,
  options: RouteErrorHistoryOptions = {},
): RouteErrorHistoryRecord {
  const nowMs = options.nowMs ?? Date.now();
  const currentWindowMs = options.currentWindowMs ?? DEFAULT_CURRENT_WINDOW_MS;
  const staleErrorAfterMs = options.staleErrorAfterMs ?? DEFAULT_STALE_ERROR_AFTER_MS;
  const threshold = options.clientErrorReviewThreshold ?? DEFAULT_CLIENT_ERROR_REVIEW_THRESHOLD;
  const lastServerErrorAtMs = finiteNumber(input.lastServerErrorAtMs);
  const lastClientErrorAtMs = finiteNumber(input.lastClientErrorAtMs);
  const lastErrorAtMs = Math.max(lastServerErrorAtMs, lastClientErrorAtMs);
  const lastErrorAgeMs = lastErrorAtMs > 0 ? Math.max(0, nowMs - lastErrorAtMs) : 0;
  const total = Math.max(0, finiteNumber(input.successCount) + finiteNumber(input.clientErrorCount) + finiteNumber(input.serverErrorCount));
  const clientErrorRate = total > 0 ? finiteNumber(input.clientErrorCount) / total : 0;
  const recentError = lastErrorAtMs > 0 && lastErrorAgeMs <= currentWindowMs;

  const classification: RouteErrorHistoryClassification = (() => {
    if (input.expectedTypedClientError && input.lastResult === "client_error") return "expected_typed_client_error";
    if (input.lastResult === "server_error" && recentError) return "current_server_error";
    if (input.lastResult === "client_error" && recentError && clientErrorRate >= threshold) return "current_client_error";
    if (input.lastResult === "client_error" && recentError) return "historical_client_error";
    if (lastServerErrorAtMs > 0 && lastErrorAgeMs > staleErrorAfterMs) return input.lastResult === "success" ? "resolved_error_history" : "stale_error_history";
    if (lastServerErrorAtMs > 0) return input.lastResult === "success" ? "resolved_error_history" : "historical_server_error";
    if (lastClientErrorAtMs > 0) return input.lastResult === "success" ? "resolved_error_history" : "historical_client_error";
    return "no_error";
  })();

  const currentFailure = classification === "current_server_error";
  const nextAction = currentFailure
    ? `Fix active server error for ${input.routeKey}; do not reclassify as history.`
    : classification === "current_client_error"
      ? `Review current high-volume client errors for ${input.routeKey}; map expected 4xx or repair caller spam.`
      : classification === "expected_typed_client_error"
        ? `Keep ${input.routeKey} out of failure count while monitoring typed 4xx volume.`
        : classification === "resolved_error_history"
          ? `Keep ${input.routeKey} as resolved history; last error ${formatAge(lastErrorAgeMs)} ago.`
          : "No current error action.";

  return {
    routeKey: input.routeKey,
    classification,
    currentFailure,
    lastErrorAtMs,
    lastErrorAgeMs,
    lastErrorAgeLabel: lastErrorAtMs > 0 ? formatAge(lastErrorAgeMs) : "none",
    clientErrorRate,
    threshold,
    nextAction,
  };
}

export function summarizeRouteErrorHistory(
  inputs: readonly RouteErrorHistoryInput[],
  options: RouteErrorHistoryOptions = {},
) {
  const records = inputs.map((input) => classifyRouteErrorHistory(input, options));
  return {
    records,
    currentServerFailures: records.filter((record) => record.classification === "current_server_error").map((record) => record.routeKey),
    currentClientErrors: records.filter((record) => record.classification === "current_client_error").map((record) => record.routeKey),
    historicalErrorRoutes: records.filter((record) => !record.currentFailure && record.lastErrorAtMs > 0).map((record) => record.routeKey),
  };
}

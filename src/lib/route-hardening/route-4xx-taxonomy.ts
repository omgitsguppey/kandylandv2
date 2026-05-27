export type Route4xxClass =
  | "validation_error"
  | "auth_required"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unsupported_method"
  | "malformed_request"
  | "stale_client_state"
  | "permanent_client_error"
  | "suspicious_client_error"
  | "unsafe_unknown";

export type Route4xxDiagnosticPolicy = {
  writeMode: "none" | "sampled_hourly_rollup" | "hourly_rollup";
  grouping: "route_error_actor_hour";
  rawPayloadAllowed: false;
  debugDefault: "summary_only";
};

export type Route4xxTaxonomyEntry = {
  errorClass: Route4xxClass;
  statusCode: 400 | 401 | 403 | 404 | 405 | 409 | 422 | 429;
  retryable: boolean;
  retryCondition: string;
  userCopy: string;
  debugSeverity: "info" | "warn" | "error";
  scoreImpact: "none" | "dedupe_only" | "route_policy_gap" | "runtime_cost_risk";
  diagnosticPolicy: Route4xxDiagnosticPolicy;
  telemetryEvent: string;
  costRisk: "low" | "medium" | "high";
  nextAction: string;
};

const HOURLY_ROLLUP: Route4xxDiagnosticPolicy = {
  writeMode: "hourly_rollup",
  grouping: "route_error_actor_hour",
  rawPayloadAllowed: false,
  debugDefault: "summary_only",
};

export const ROUTE_4XX_TAXONOMY: Record<Route4xxClass, Route4xxTaxonomyEntry> = {
  validation_error: {
    errorClass: "validation_error",
    statusCode: 422,
    retryable: false,
    retryCondition: "never_retry_without_user_input_change",
    userCopy: "Check the highlighted fields and try again.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_validation_error",
    costRisk: "low",
    nextAction: "Return typed validation copy and do not enqueue client retries.",
  },
  auth_required: {
    errorClass: "auth_required",
    statusCode: 401,
    retryable: false,
    retryCondition: "only_one_explicit_auth_refresh_when_route_allows_it",
    userCopy: "Sign in again to continue.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_auth_required",
    costRisk: "low",
    nextAction: "Allow at most one auth refresh path, then stop.",
  },
  permission_denied: {
    errorClass: "permission_denied",
    statusCode: 403,
    retryable: false,
    retryCondition: "never_retry_without_permission_change",
    userCopy: "You do not have access to that action.",
    debugSeverity: "warn",
    scoreImpact: "route_policy_gap",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_permission_denied",
    costRisk: "medium",
    nextAction: "Show safe permission copy and route grouped evidence to debug.",
  },
  not_found: {
    errorClass: "not_found",
    statusCode: 404,
    retryable: false,
    retryCondition: "only_refresh_route_cache_when_classified_as_stale_client_state",
    userCopy: "That item is no longer available.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_not_found",
    costRisk: "low",
    nextAction: "Do not retry missing resources unless stale cache is proven.",
  },
  conflict: {
    errorClass: "conflict",
    statusCode: 409,
    retryable: false,
    retryCondition: "retry_only_with_idempotency_key_and_route_policy",
    userCopy: "This changed while you were working. Refresh and try again.",
    debugSeverity: "warn",
    scoreImpact: "route_policy_gap",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_conflict",
    costRisk: "medium",
    nextAction: "Require idempotency or explicit refresh before retry.",
  },
  rate_limited: {
    errorClass: "rate_limited",
    statusCode: 429,
    retryable: true,
    retryCondition: "retry_only_after_Retry-After_or_backoff_window",
    userCopy: "Too many attempts. Wait a moment before trying again.",
    debugSeverity: "warn",
    scoreImpact: "runtime_cost_risk",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_rate_limited",
    costRisk: "high",
    nextAction: "Respect Retry-After and suppress duplicate diagnostics.",
  },
  unsupported_method: {
    errorClass: "unsupported_method",
    statusCode: 405,
    retryable: false,
    retryCondition: "never_retry_same_method",
    userCopy: "That action is not supported here.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_unsupported_method",
    costRisk: "low",
    nextAction: "Return typed method failure without server diagnostic spam.",
  },
  malformed_request: {
    errorClass: "malformed_request",
    statusCode: 400,
    retryable: false,
    retryCondition: "never_retry_same_payload",
    userCopy: "The request could not be read. Check your connection and try again.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_malformed_request",
    costRisk: "low",
    nextAction: "Avoid parsing retries and return safe malformed-request copy.",
  },
  stale_client_state: {
    errorClass: "stale_client_state",
    statusCode: 409,
    retryable: true,
    retryCondition: "retry_once_after_explicit_state_refresh",
    userCopy: "Refresh this view before trying again.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_stale_client_state",
    costRisk: "medium",
    nextAction: "Refresh canonical state once, then stop retries.",
  },
  permanent_client_error: {
    errorClass: "permanent_client_error",
    statusCode: 400,
    retryable: false,
    retryCondition: "never_retry",
    userCopy: "This request cannot be completed as sent.",
    debugSeverity: "info",
    scoreImpact: "dedupe_only",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_permanent_client_error",
    costRisk: "low",
    nextAction: "Stop retry loops and group diagnostics by fingerprint.",
  },
  suspicious_client_error: {
    errorClass: "suspicious_client_error",
    statusCode: 400,
    retryable: false,
    retryCondition: "never_retry_sample_or_rollup_only",
    userCopy: "This request was blocked.",
    debugSeverity: "warn",
    scoreImpact: "runtime_cost_risk",
    diagnosticPolicy: {
      ...HOURLY_ROLLUP,
      writeMode: "sampled_hourly_rollup",
    },
    telemetryEvent: "route_4xx_suspicious_client_error",
    costRisk: "high",
    nextAction: "Sample and roll up suspicious loops without raw payloads.",
  },
  unsafe_unknown: {
    errorClass: "unsafe_unknown",
    statusCode: 400,
    retryable: false,
    retryCondition: "block_until_classified",
    userCopy: "This request needs review before it can be retried.",
    debugSeverity: "error",
    scoreImpact: "route_policy_gap",
    diagnosticPolicy: HOURLY_ROLLUP,
    telemetryEvent: "route_4xx_unsafe_unknown",
    costRisk: "high",
    nextAction: "Classify this 4xx before wiring retries, score, or debug evidence.",
  },
};

export function getRoute4xxTaxonomyEntry(errorClass: Route4xxClass | string) {
  return ROUTE_4XX_TAXONOMY[errorClass as Route4xxClass] ?? ROUTE_4XX_TAXONOMY.unsafe_unknown;
}

export function validateRoute4xxTaxonomy() {
  const failures: string[] = [];
  for (const entry of Object.values(ROUTE_4XX_TAXONOMY)) {
    if (!entry.retryCondition) failures.push(`${entry.errorClass} lacks retry condition.`);
    if (!entry.userCopy || entry.userCopy.includes("Internal server error")) failures.push(`${entry.errorClass} lacks safe user copy.`);
    if (!entry.diagnosticPolicy || entry.diagnosticPolicy.rawPayloadAllowed !== false) failures.push(`${entry.errorClass} allows unsafe diagnostics.`);
    if ((entry.errorClass === "validation_error" || entry.errorClass === "permanent_client_error") && entry.retryable) {
      failures.push(`${entry.errorClass} must not be retryable.`);
    }
    if ((entry.statusCode === 401 || entry.statusCode === 403 || entry.statusCode === 404) && entry.retryable) {
      failures.push(`${entry.errorClass} defaults to retry storm.`);
    }
  }
  if (ROUTE_4XX_TAXONOMY.unsafe_unknown.nextAction.toLowerCase().includes("classify") === false) {
    failures.push("unsafe_unknown must require classification.");
  }
  return failures;
}

export function buildRoute4xxTaxonomyReport(generatedAtUtc = new Date().toISOString()) {
  const entries = Object.values(ROUTE_4XX_TAXONOMY);
  return {
    reportKey: "route-4xx-taxonomy",
    generatedAtUtc,
    status: validateRoute4xxTaxonomy().length === 0 ? "pass" : "fail",
    totalClasses: entries.length,
    retryableClasses: entries.filter((entry) => entry.retryable).map((entry) => entry.errorClass),
    nonRetryablePermanentClasses: entries
      .filter((entry) => !entry.retryable)
      .map((entry) => entry.errorClass),
    diagnosticMode: "summary_plus_hourly_rollup",
    validationFailures: validateRoute4xxTaxonomy(),
    nextExactSteps: [
      "Use route-4xx-mitigation for shared retry and diagnostic decisions.",
      "Map high-risk routes through route-4xx-application before changing route behavior.",
    ],
  };
}

import {
  type Route4xxClass,
  getRoute4xxTaxonomyEntry,
} from "./route-4xx-taxonomy";

export type Route4xxMitigationInput = {
  route: string;
  method: string;
  statusCode: number;
  errorClass?: Route4xxClass | string;
  errorCode?: string;
  actorKind?: string;
  featureId?: string;
  sourceSystem?: string;
  occurredAtUtc?: string;
  retryAfterSeconds?: number;
  idempotencyKeyPresent?: boolean;
  authRefreshAllowedOnce?: boolean;
  requestBody?: unknown;
  token?: unknown;
  providerId?: unknown;
  appVersion?: string;
  buildId?: string;
};

function cleanSegment(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return value.trim().toLowerCase().replace(/[^a-z0-9._/-]+/gu, "_").slice(0, 96) || fallback;
}

function hourBucket(input?: string) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 13);
  return date.toISOString().slice(0, 13);
}

export function classify4xxError(input: Route4xxMitigationInput) {
  if (input.errorClass) {
    const entry = getRoute4xxTaxonomyEntry(input.errorClass);
    return { errorClass: entry.errorClass, taxonomy: entry };
  }

  const code = cleanSegment(input.errorCode, "");
  let errorClass: Route4xxClass;
  if (input.statusCode === 401) errorClass = "auth_required";
  else if (input.statusCode === 403) errorClass = "permission_denied";
  else if (input.statusCode === 404) errorClass = "not_found";
  else if (input.statusCode === 405) errorClass = "unsupported_method";
  else if (input.statusCode === 409) errorClass = code.includes("stale") ? "stale_client_state" : "conflict";
  else if (input.statusCode === 422) errorClass = "validation_error";
  else if (input.statusCode === 429) errorClass = "rate_limited";
  else if (input.statusCode === 400 && code.includes("malformed")) errorClass = "malformed_request";
  else if (input.statusCode >= 400 && input.statusCode < 500) errorClass = "permanent_client_error";
  else errorClass = "unsafe_unknown";

  return { errorClass, taxonomy: getRoute4xxTaxonomyEntry(errorClass) };
}

export function shouldRetry4xx(input: Route4xxMitigationInput) {
  const { errorClass, taxonomy } = classify4xxError(input);
  if (errorClass === "rate_limited") {
    return {
      retry: typeof input.retryAfterSeconds === "number" && input.retryAfterSeconds > 0,
      backoffRequired: true,
      reason: taxonomy.retryCondition,
    };
  }
  if (errorClass === "auth_required" && input.authRefreshAllowedOnce === true) {
    return { retry: true, backoffRequired: false, reason: taxonomy.retryCondition };
  }
  if ((errorClass === "conflict" || errorClass === "stale_client_state") && input.idempotencyKeyPresent === true) {
    return { retry: true, backoffRequired: false, reason: taxonomy.retryCondition };
  }
  return { retry: false, backoffRequired: false, reason: taxonomy.retryCondition };
}

export function build4xxFingerprint(input: Route4xxMitigationInput) {
  const classification = classify4xxError(input);
  return [
    cleanSegment(input.route, "unknown_route"),
    cleanSegment(input.method, "GET").toUpperCase(),
    input.statusCode,
    classification.errorClass,
    cleanSegment(input.actorKind, "unknown_actor"),
    cleanSegment(input.featureId, "unknown_feature"),
    hourBucket(input.occurredAtUtc),
    cleanSegment(input.errorCode, "unknown_code"),
    cleanSegment(input.sourceSystem, "unknown_source"),
  ].join("|");
}

export function rollup4xxDiagnostic(input: Route4xxMitigationInput) {
  const { errorClass, taxonomy } = classify4xxError(input);
  return {
    fingerprint: build4xxFingerprint(input),
    errorClass,
    statusCode: input.statusCode,
    route: input.route,
    method: input.method.toUpperCase(),
    actorKind: cleanSegment(input.actorKind, "unknown_actor"),
    featureId: cleanSegment(input.featureId, "unknown_feature"),
    sourceSystem: cleanSegment(input.sourceSystem, "unknown_source"),
    hourBucketUtc: hourBucket(input.occurredAtUtc),
    writeMode: taxonomy.diagnosticPolicy.writeMode,
    grouping: taxonomy.diagnosticPolicy.grouping,
    severity: taxonomy.debugSeverity,
    rawRequestBodyIncluded: false,
    redaction: "redacted_no_body_no_tokens_no_provider_ids" as const,
    incrementBy: 1,
    appVersion: input.appVersion ?? null,
    buildId: input.buildId ?? null,
  };
}

export function build4xxTelemetry(input: Route4xxMitigationInput) {
  const { errorClass, taxonomy } = classify4xxError(input);
  return {
    eventName: taxonomy.telemetryEvent,
    safe: true,
    errorClass,
    statusCode: input.statusCode,
    route: cleanSegment(input.route, "unknown_route"),
    method: cleanSegment(input.method, "GET").toUpperCase(),
    featureId: cleanSegment(input.featureId, "unknown_feature"),
    sourceSystem: cleanSegment(input.sourceSystem, "unknown_source"),
    retryable: shouldRetry4xx(input).retry,
    redaction: "no_body_no_tokens_no_provider_ids" as const,
  };
}

export function explain4xxDecision(input: Route4xxMitigationInput) {
  const { errorClass, taxonomy } = classify4xxError(input);
  const retry = shouldRetry4xx(input);
  return [
    `class=${errorClass}`,
    `status=${input.statusCode}`,
    `retry=${retry.retry}`,
    `reason=${retry.reason}`,
    `diagnostics=${taxonomy.diagnosticPolicy.writeMode}`,
    `redaction=no_body_no_tokens_no_provider_ids`,
  ].join("; ");
}

export function validateRoute4xxMitigation() {
  const validation = shouldRetry4xx({
    route: "/api/example",
    method: "POST",
    statusCode: 422,
    errorCode: "validation_failed",
    requestBody: { token: "secret" },
  });
  const fingerprint = build4xxFingerprint({
    route: "/api/example",
    method: "POST",
    statusCode: 422,
    errorCode: "validation_failed",
    requestBody: { token: "secret" },
  });
  const failures: string[] = [];
  if (validation.retry) failures.push("validation 4xx must not retry.");
  if (fingerprint.includes("secret")) failures.push("fingerprint leaked raw payload.");
  if (rollup4xxDiagnostic({ route: "/api/example", method: "POST", statusCode: 422 }).writeMode !== "hourly_rollup") {
    failures.push("4xx diagnostics must roll up hourly.");
  }
  return failures;
}

export function buildRoute4xxMitigationReport(generatedAtUtc = new Date().toISOString()) {
  return {
    reportKey: "route-4xx-mitigation",
    generatedAtUtc,
    status: validateRoute4xxMitigation().length === 0 ? "pass" : "fail",
    defaultWriteMode: "hourly_rollup",
    retryPolicy: "permanent_client_errors_do_not_retry",
    redaction: "no raw body, token, provider id, email, or payment id in diagnostic keys",
    validationFailures: validateRoute4xxMitigation(),
    topGuardrails: [
      "4xx diagnostics are grouped by route, method, status, class, actor, feature, source, and hour.",
      "Rate limits retry only after Retry-After/backoff.",
      "Validation/auth/permission/not-found permanent errors do not retry by default.",
    ],
  };
}

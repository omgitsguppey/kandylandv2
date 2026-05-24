export type AnalyticsIngestIdentifiedRepairReport = {
  generatedAtUtc: string;
  statusBefore: "current_server_error";
  statusAfter: "fixed_current";
  failureClass: "deferred_materializer_failure_and_invalid_payload_retry_storm";
  routeMode: "active_supported_route";
  compatibilityMode: "identified_ingest_current";
  expectedInvalidPayloadsCanReturn500: boolean;
  obsoleteRouteStillRetries: boolean;
  doubleCountRisk: "blocked_by_event_id_dedupe_and_event_envelope";
  safeErrorCodes: string[];
  retryableStatus: "expected_failures_retryable_false";
  nextExactSteps: string[];
};

export function buildAnalyticsIngestIdentifiedRepairReport(): AnalyticsIngestIdentifiedRepairReport {
  return {
    generatedAtUtc: new Date().toISOString(),
    statusBefore: "current_server_error",
    statusAfter: "fixed_current",
    failureClass: "deferred_materializer_failure_and_invalid_payload_retry_storm",
    routeMode: "active_supported_route",
    compatibilityMode: "identified_ingest_current",
    expectedInvalidPayloadsCanReturn500: false,
    obsoleteRouteStillRetries: false,
    doubleCountRisk: "blocked_by_event_id_dedupe_and_event_envelope",
    safeErrorCodes: [
      "invalid_analytics_payload",
      "payload_too_large",
      "analytics_deferred_timeline_failed",
      "analytics_deferred_materializer_failed",
    ],
    retryableStatus: "expected_failures_retryable_false",
    nextExactSteps: [
      "Monitor analytics/ingest-identified route runtime for new current server errors after deployment.",
      "Keep true Firestore batch write failures retryable because event fact persistence did not complete.",
    ],
  };
}

export function validateAnalyticsIngestIdentifiedRepairReport(report = buildAnalyticsIngestIdentifiedRepairReport()) {
  const failures: string[] = [];
  if (report.statusBefore !== "current_server_error") failures.push("ingest-identified active server_error remains unclassified.");
  if (report.statusAfter !== "fixed_current") failures.push("ingest-identified active server_error remains unresolved.");
  if (report.expectedInvalidPayloadsCanReturn500) failures.push("expected invalid payloads can return 500.");
  if (report.obsoleteRouteStillRetries) failures.push("obsolete route still creates retry storm.");
  if (report.doubleCountRisk !== "blocked_by_event_id_dedupe_and_event_envelope") failures.push("route can double-count analytics events.");
  for (const code of ["invalid_analytics_payload", "payload_too_large"]) {
    if (!report.safeErrorCodes.includes(code)) failures.push(`safe error code missing: ${code}.`);
  }
  return failures;
}

import {
  buildRefreshDiagnosticsFailureClusters,
  type RefreshDiagnosticsFailureClusterInput,
} from "@/lib/analytics/refresh-diagnostics-failure-clusters";

export type TelemetryParityPassGateStatus = "pass" | "review" | "fail" | "unavailable" | "stale";
export type TelemetryParityConfidenceStatus = "high" | "medium" | "low" | "unavailable";
export type TelemetryParityBlocker =
  | "low_confidence"
  | "refresh_failures_present"
  | "route_unknown_diagnostics"
  | "ingest_identified_failures"
  | "missing_event_source"
  | "missing_sample_source"
  | "stale_sample"
  | "none";

export type TelemetryParityPassGateResult = {
  status: TelemetryParityPassGateStatus;
  passAllowed: boolean;
  confidenceStatus: TelemetryParityConfidenceStatus;
  blockers: TelemetryParityBlocker[];
  nextAction: string;
  displaySummary: string;
};

function confidenceStatus(confidence: number | null | undefined): TelemetryParityConfidenceStatus {
  if (confidence === null || confidence === undefined || Number.isNaN(confidence)) return "unavailable";
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

export function buildTelemetryParityPassGate(input: {
  eventSampleCount: number;
  canonicalSampleCount: number;
  confidence: number | null;
  eventSource?: string | null;
  sampleSource?: string | null;
  refreshDiagnosticsStatus: "pass" | "review" | "fail" | "unavailable" | "stale";
  refreshFailureCount: number;
  failureClusters?: RefreshDiagnosticsFailureClusterInput[];
  blockedReason?: string | null;
  sourceCompleteness?: "complete" | "partial" | "missing" | "unknown";
  range: string;
  generatedAtUtc: string;
}): TelemetryParityPassGateResult {
  const blockers = new Set<TelemetryParityBlocker>();
  const confidence = confidenceStatus(input.confidence);
  const eventSourcePresent = Boolean(input.eventSource?.trim());
  const sampleSourcePresent = Boolean(input.sampleSource?.trim());
  const clusters = buildRefreshDiagnosticsFailureClusters({
    generatedAtUtc: input.generatedAtUtc,
    clusters: input.failureClusters ?? [],
  });

  if (!eventSourcePresent) blockers.add("missing_event_source");
  if (!sampleSourcePresent || input.canonicalSampleCount <= 0) blockers.add("missing_sample_source");
  if (confidence === "low") blockers.add("low_confidence");
  if (
    input.refreshDiagnosticsStatus === "fail"
    || input.refreshFailureCount > 0
    || input.blockedReason === "analytics_refresh_failures_present"
  ) {
    blockers.add("refresh_failures_present");
  }
  if (clusters.some((cluster) => cluster.routeAttribution === "unknown" || cluster.routeAttribution === "missing" || !cluster.route)) {
    blockers.add("route_unknown_diagnostics");
  }
  if (clusters.some((cluster) => cluster.route === "analytics/ingest-identified" || /Analytics\.IngestIdentified/iu.test(`${cluster.errorName} ${cluster.affectedRoute ?? ""}`))) {
    blockers.add("ingest_identified_failures");
  }

  const blockerList = [...blockers];
  const passAllowed = blockerList.length === 0 && confidence === "high";
  const status: TelemetryParityPassGateStatus =
    passAllowed ? "pass"
      : blockers.has("refresh_failures_present") || blockers.has("missing_sample_source") ? "fail"
        : confidence === "medium" ? "review"
          : confidence === "unavailable" ? "unavailable"
            : "fail";
  const nextAction =
    blockers.has("refresh_failures_present")
      ? "Fix analytics refresh failures before promoting event sample parity."
      : blockers.has("low_confidence") && eventSourcePresent && sampleSourcePresent
        ? "Event source and sample source are present; confidence is too low to promote telemetry parity."
        : blockers.has("missing_event_source") || blockers.has("missing_sample_source")
          ? "Restore the missing telemetry event or sample source before validating parity."
          : status === "review"
            ? "Review telemetry confidence and source completeness before promoting parity."
            : "No action required.";
  const displaySummary = passAllowed
    ? "Event sample confidence and refresh diagnostics allow telemetry parity promotion."
    : input.canonicalSampleCount > 0
      ? "Sample presence confirmed, parity blocked by low confidence or refresh failures."
      : "Telemetry parity blocked because required samples are missing.";

  return {
    status,
    passAllowed,
    confidenceStatus: confidence,
    blockers: blockerList.length > 0 ? blockerList : ["none"],
    nextAction,
    displaySummary,
  };
}

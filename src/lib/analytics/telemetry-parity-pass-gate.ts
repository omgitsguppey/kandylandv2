import {
  buildRefreshDiagnosticsFailureClusters,
  type RefreshDiagnosticsFailureClusterInput,
} from "@/lib/analytics/refresh-diagnostics-failure-clusters";

export type TelemetryParityPassGateStatus = "pass" | "review" | "fail" | "unavailable" | "stale";
export type TelemetryParityConfidenceStatus = "high" | "medium" | "low" | "unavailable";
export type TelemetryParityProofClass =
  | "source_parity"
  | "runtime_route_health"
  | "provider_smoke"
  | "admin_truth_sample";
export type TelemetryParityProofStatus =
  | "present"
  | "missing"
  | "stale"
  | "not_required";
export type TelemetryParityBlocker =
  | "low_confidence"
  | "refresh_failures_present"
  | "route_unknown_diagnostics"
  | "ingest_identified_failures"
  | "missing_event_source"
  | "missing_sample_source"
  | "stale_sample"
  | "runtime_route_health_missing"
  | "provider_smoke_missing"
  | "admin_truth_sample_missing"
  | "none";

export type TelemetryParityProofClassState = {
  proofClass: TelemetryParityProofClass;
  status: TelemetryParityProofStatus;
  required: boolean;
  evidenceKind: "source_only" | "runtime" | "provider" | "admin";
  nextAction: string;
};

export type TelemetryParityPassGateResult = {
  status: TelemetryParityPassGateStatus;
  sourceParityStatus: TelemetryParityPassGateStatus;
  finalEvidenceStatus: TelemetryParityPassGateStatus;
  passAllowed: boolean;
  sourceParityPassAllowed: boolean;
  finalPassAllowed: boolean;
  confidenceStatus: TelemetryParityConfidenceStatus;
  blockers: TelemetryParityBlocker[];
  proofClasses: TelemetryParityProofClassState[];
  missingProofClasses: TelemetryParityProofClass[];
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
  requiredProofClasses?: TelemetryParityProofClass[];
  proofClasses?: Partial<Record<TelemetryParityProofClass, TelemetryParityProofStatus>>;
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

  const sourceBlockers = [...blockers];
  const sourceParityPassAllowed = sourceBlockers.length === 0 && confidence === "high";
  const sourceParityStatus: TelemetryParityPassGateStatus =
    sourceParityPassAllowed ? "pass"
      : blockers.has("refresh_failures_present") || blockers.has("missing_sample_source") ? "fail"
        : confidence === "medium" ? "review"
          : confidence === "unavailable" ? "unavailable"
            : "fail";
  const requiredProofClasses = input.requiredProofClasses ?? ["source_parity"];
  const proofStatus = input.proofClasses ?? {};
  const proofClasses: TelemetryParityProofClassState[] = [
    {
      proofClass: "source_parity",
      status: sourceParityPassAllowed ? "present" : "missing",
      required: requiredProofClasses.includes("source_parity"),
      evidenceKind: "source_only",
      nextAction: sourceParityPassAllowed
        ? "Source telemetry parity is present; this does not prove runtime, provider, or admin truth."
        : "Restore source telemetry parity before considering final evidence gates.",
    },
    {
      proofClass: "runtime_route_health",
      status: proofStatus.runtime_route_health ?? "missing",
      required: requiredProofClasses.includes("runtime_route_health"),
      evidenceKind: "runtime",
      nextAction: "Attach fresh route-health/runtime smoke evidence for telemetry ingest and analytics display paths.",
    },
    {
      proofClass: "provider_smoke",
      status: proofStatus.provider_smoke ?? "missing",
      required: requiredProofClasses.includes("provider_smoke"),
      evidenceKind: "provider",
      nextAction: "Attach formal redacted provider smoke evidence; source parity cannot clear this gate.",
    },
    {
      proofClass: "admin_truth_sample",
      status: proofStatus.admin_truth_sample ?? "missing",
      required: requiredProofClasses.includes("admin_truth_sample"),
      evidenceKind: "admin",
      nextAction: "Attach a fresh redacted Admin Truth sample with source freshness and sample counts.",
    },
  ];
  const missingProofClasses = proofClasses
    .filter((proof) => proof.required && proof.status !== "present")
    .map((proof) => proof.proofClass);
  if (missingProofClasses.includes("runtime_route_health")) blockers.add("runtime_route_health_missing");
  if (missingProofClasses.includes("provider_smoke")) blockers.add("provider_smoke_missing");
  if (missingProofClasses.includes("admin_truth_sample")) blockers.add("admin_truth_sample_missing");
  const finalPassAllowed = sourceParityPassAllowed && missingProofClasses.length === 0;
  const finalEvidenceStatus: TelemetryParityPassGateStatus =
    finalPassAllowed
      ? "pass"
      : sourceParityStatus === "fail" || sourceParityStatus === "unavailable"
        ? sourceParityStatus
        : "review";
  const status = finalEvidenceStatus;
  const blockerList = [...blockers];
  const nextAction =
    blockers.has("refresh_failures_present")
      ? "Fix analytics refresh failures before promoting event sample parity."
      : missingProofClasses.includes("runtime_route_health")
        ? "Source parity may pass, but final telemetry lock still needs runtime route-health evidence."
        : missingProofClasses.includes("provider_smoke")
          ? "Source parity may pass, but final telemetry lock still needs formal provider smoke evidence."
          : missingProofClasses.includes("admin_truth_sample")
            ? "Source parity may pass, but final telemetry lock still needs a redacted admin truth sample."
      : blockers.has("low_confidence") && eventSourcePresent && sampleSourcePresent
        ? "Event source and sample source are present; confidence is too low to promote telemetry parity."
        : blockers.has("missing_event_source") || blockers.has("missing_sample_source")
          ? "Restore the missing telemetry event or sample source before validating parity."
          : sourceParityStatus === "review"
            ? "Review telemetry confidence and source completeness before promoting parity."
            : "No action required.";
  const displaySummary = sourceParityPassAllowed && !finalPassAllowed
    ? `Source telemetry parity passes, but final proof is blocked by missing ${missingProofClasses.join(", ")}.`
    : finalPassAllowed
      ? "Source telemetry parity and all required formal proof classes are present."
    : input.canonicalSampleCount > 0
      ? "Sample presence confirmed, parity blocked by low confidence or refresh failures."
      : "Telemetry parity blocked because required samples are missing.";

  return {
    status,
    sourceParityStatus,
    finalEvidenceStatus,
    passAllowed: finalPassAllowed,
    sourceParityPassAllowed,
    finalPassAllowed,
    confidenceStatus: confidence,
    blockers: blockerList.length > 0 ? blockerList : ["none"],
    proofClasses,
    missingProofClasses,
    nextAction,
    displaySummary,
  };
}

export type AdminSummaryLaneStatus =
  | "healthy_current"
  | "healthy_proven_zero"
  | "source_ready_collecting"
  | "source_ready_no_sample_loaded"
  | "sample_source_missing"
  | "source_missing_actionable"
  | "degraded"
  | "stale_artifact_refresh_required"
  | "external_review_required"
  | "formal_gate_required"
  | "unknown";

export type AdminSummaryLaneDisplayState =
  | "live"
  | "collecting"
  | "stale"
  | "degraded"
  | "blocked"
  | "unknown";

export type AdminSummaryLaneStatusInput = {
  laneId: string;
  sourceContractPresent?: boolean;
  sampleLoaded?: boolean;
  sourceWindowPresent?: boolean;
  sourceWindowProvesZero?: boolean;
  expectedRuntimeActivity?: boolean;
  telemetryMapped?: boolean;
  configTruthHealthy?: boolean;
  counts?: readonly number[];
  artifactCurrent?: boolean;
  artifactRefreshCommand?: string;
  sourceMissing?: boolean;
  sampleSourceMissing?: boolean;
  criticalCount?: number;
  warningCount?: number;
  externalReviewRequired?: boolean;
  formalGateRequired?: boolean;
};

export type AdminSummaryLaneStatusDecision = {
  laneId: string;
  status: AdminSummaryLaneStatus;
  displayState: AdminSummaryLaneDisplayState;
  reason: string;
  nextAction: string;
  liveDisplayAllowed: boolean;
};

function hasNonZeroCount(counts: readonly number[] | undefined) {
  return (counts ?? []).some((count) => Number.isFinite(Number(count)) && Number(count) > 0);
}

function refreshCommand(input: AdminSummaryLaneStatusInput) {
  return input.artifactRefreshCommand ?? "Run the lane owner validator to refresh this artifact.";
}

export function classifyAdminSummaryLaneStatus(input: AdminSummaryLaneStatusInput): AdminSummaryLaneStatusDecision {
  const sampleLoaded = input.sampleLoaded === true || hasNonZeroCount(input.counts);
  const sourceWindowProvesZero = input.sourceWindowPresent === true && input.sourceWindowProvesZero === true;
  const telemetryMapped = input.telemetryMapped === true;

  if (input.sourceMissing || input.sourceContractPresent === false) {
    return {
      laneId: input.laneId,
      status: "source_missing_actionable",
      displayState: "degraded",
      reason: "Required source contract or source summary is missing.",
      nextAction: "Wire the lane to its source contract or summary artifact.",
      liveDisplayAllowed: false,
    };
  }

  if (input.sampleSourceMissing) {
    return {
      laneId: input.laneId,
      status: "sample_source_missing",
      displayState: "degraded",
      reason: "The source contract exists, but no bounded sample source is available.",
      nextAction: "Add or refresh the bounded source summary for this lane.",
      liveDisplayAllowed: false,
    };
  }

  if (input.artifactCurrent === false) {
    return {
      laneId: input.laneId,
      status: "stale_artifact_refresh_required",
      displayState: "stale",
      reason: "Artifact freshness is stale; source health is not being downgraded.",
      nextAction: refreshCommand(input),
      liveDisplayAllowed: false,
    };
  }

  if ((input.criticalCount ?? 0) > 0 || (input.warningCount ?? 0) > 0) {
    return {
      laneId: input.laneId,
      status: "degraded",
      displayState: "degraded",
      reason: "The lane has active warning or critical findings.",
      nextAction: "Fix the classified warning or critical findings for this lane.",
      liveDisplayAllowed: false,
    };
  }

  if (input.formalGateRequired) {
    return {
      laneId: input.laneId,
      status: "formal_gate_required",
      displayState: "blocked",
      reason: "Formal evidence is required and cannot be replaced by source status.",
      nextAction: "Attach the required formal evidence artifact.",
      liveDisplayAllowed: false,
    };
  }

  if (input.externalReviewRequired) {
    return {
      laneId: input.laneId,
      status: "external_review_required",
      displayState: "blocked",
      reason: "External owner review remains required.",
      nextAction: "Complete the external owner review and attach its artifact.",
      liveDisplayAllowed: false,
    };
  }

  if (input.configTruthHealthy) {
    return {
      laneId: input.laneId,
      status: "healthy_current",
      displayState: "live",
      reason: "Configuration/source contract truth is current and healthy.",
      nextAction: "No source status action required.",
      liveDisplayAllowed: true,
    };
  }

  if (sampleLoaded) {
    return {
      laneId: input.laneId,
      status: "healthy_current",
      displayState: "live",
      reason: "A current bounded sample is loaded.",
      nextAction: "No source status action required.",
      liveDisplayAllowed: true,
    };
  }

  if (sourceWindowProvesZero) {
    return {
      laneId: input.laneId,
      status: "healthy_proven_zero",
      displayState: "live",
      reason: "A current source window proves zero activity.",
      nextAction: "No source status action required.",
      liveDisplayAllowed: true,
    };
  }

  if (telemetryMapped && input.expectedRuntimeActivity) {
    return {
      laneId: input.laneId,
      status: "source_ready_collecting",
      displayState: "collecting",
      reason: "Telemetry/source contracts are mapped, but no bounded runtime sample is loaded.",
      nextAction: "Load a bounded source summary before displaying this lane as live.",
      liveDisplayAllowed: false,
    };
  }

  if (input.sourceContractPresent) {
    return {
      laneId: input.laneId,
      status: "source_ready_no_sample_loaded",
      displayState: "collecting",
      reason: "The source contract is present, but no bounded sample is loaded.",
      nextAction: "Load or attach the lane source sample.",
      liveDisplayAllowed: false,
    };
  }

  return {
    laneId: input.laneId,
    status: "unknown",
    displayState: "unknown",
    reason: "The lane does not provide enough source or sample context.",
    nextAction: "Classify the source contract, sample source, and artifact freshness.",
    liveDisplayAllowed: false,
  };
}


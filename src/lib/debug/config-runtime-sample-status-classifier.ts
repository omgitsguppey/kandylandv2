export type ConfigRuntimeSampleStatus =
  | "config_healthy_current"
  | "source_ready_collecting"
  | "source_ready_no_sample_loaded"
  | "runtime_sample_healthy_current"
  | "runtime_sample_proven_zero"
  | "runtime_sample_missing"
  | "source_missing_actionable"
  | "stale_artifact_refresh_required"
  | "external_review_required"
  | "formal_gate_required"
  | "degraded"
  | "unknown";

export type ConfigRuntimeArtifactFreshness = "current" | "stale" | "unknown";

export type ConfigRuntimeSampleInput = {
  laneId: string;
  laneKind: "config" | "runtime_sample" | "mixed";
  configSourceHealthy?: boolean;
  sourceContractPresent?: boolean;
  sampleSourcePresent?: boolean;
  sampleLoaded?: boolean;
  counts?: readonly number[];
  sourceWindowPresent?: boolean;
  sourceWindowProvesZero?: boolean;
  artifactCurrent?: boolean;
  artifactRefreshCommand?: string;
  externalReviewRequired?: boolean;
  formalGateRequired?: boolean;
  criticalCount?: number;
  warningCount?: number;
};

export type ConfigRuntimeSampleDecision = {
  laneId: string;
  status: ConfigRuntimeSampleStatus;
  displayState: "healthy" | "collecting" | "stale" | "blocked" | "degraded" | "unknown";
  artifactFreshness: ConfigRuntimeArtifactFreshness;
  reason: string;
  nextAction: string;
  runtimeLiveAllowed: boolean;
};

function hasNonZeroCount(counts: readonly number[] | undefined) {
  return (counts ?? []).some((count) => Number.isFinite(Number(count)) && Number(count) > 0);
}

function refreshCommand(input: ConfigRuntimeSampleInput) {
  return input.artifactRefreshCommand ?? "Run the owning validator to refresh this artifact.";
}

export function classifyConfigRuntimeSampleStatus(input: ConfigRuntimeSampleInput): ConfigRuntimeSampleDecision {
  const sourcePresent = input.sourceContractPresent !== false;
  const sampleLoaded = input.sampleLoaded === true || hasNonZeroCount(input.counts);
  const artifactFreshness: ConfigRuntimeArtifactFreshness = input.artifactCurrent === false ? "stale" : input.artifactCurrent === true ? "current" : "unknown";

  if (!sourcePresent) {
    return {
      laneId: input.laneId,
      status: "source_missing_actionable",
      displayState: "degraded",
      artifactFreshness,
      reason: "The source contract or producer mapping is missing.",
      nextAction: "Wire the lane to its source contract before hiding or promoting it.",
      runtimeLiveAllowed: false,
    };
  }

  if (input.artifactCurrent === false) {
    return {
      laneId: input.laneId,
      status: "stale_artifact_refresh_required",
      displayState: "stale",
      artifactFreshness: "stale",
      reason: "Artifact freshness is stale; this is not source health or deployed route evidence.",
      nextAction: refreshCommand(input),
      runtimeLiveAllowed: false,
    };
  }

  if ((input.criticalCount ?? 0) > 0 || (input.warningCount ?? 0) > 0) {
    return {
      laneId: input.laneId,
      status: "degraded",
      displayState: "degraded",
      artifactFreshness,
      reason: "The lane has active warning or critical findings.",
      nextAction: "Fix the active source/debug finding for this lane.",
      runtimeLiveAllowed: false,
    };
  }

  if (input.formalGateRequired) {
    return {
      laneId: input.laneId,
      status: "formal_gate_required",
      displayState: "blocked",
      artifactFreshness,
      reason: "A typed evidence gate is required and cannot be replaced by source status.",
      nextAction: "Attach the lane's required typed evidence artifact before clearing this gate.",
      runtimeLiveAllowed: false,
    };
  }

  if (input.externalReviewRequired) {
    return {
      laneId: input.laneId,
      status: "external_review_required",
      displayState: "blocked",
      artifactFreshness,
      reason: "External owner or billing review remains required.",
      nextAction: "Complete the external review and attach its artifact.",
      runtimeLiveAllowed: false,
    };
  }

  if (input.laneKind === "config" && input.configSourceHealthy === true) {
    return {
      laneId: input.laneId,
      status: "config_healthy_current",
      displayState: "healthy",
      artifactFreshness,
      reason: "Configuration/source contract truth is current and healthy.",
      nextAction: "No config status action required.",
      runtimeLiveAllowed: false,
    };
  }

  if (input.laneKind === "runtime_sample" || input.laneKind === "mixed") {
    if (sampleLoaded) {
      return {
        laneId: input.laneId,
        status: "runtime_sample_healthy_current",
        displayState: "healthy",
        artifactFreshness,
        reason: "A current bounded runtime sample is loaded.",
        nextAction: "No runtime sample action required.",
        runtimeLiveAllowed: true,
      };
    }
    if (input.sourceWindowPresent === true && input.sourceWindowProvesZero === true) {
      return {
        laneId: input.laneId,
        status: "runtime_sample_proven_zero",
        displayState: "healthy",
        artifactFreshness,
        reason: "A current source window proves zero runtime activity.",
        nextAction: "No runtime sample action required.",
        runtimeLiveAllowed: true,
      };
    }
    if (input.sampleSourcePresent === false) {
      return {
        laneId: input.laneId,
        status: "runtime_sample_missing",
        displayState: "degraded",
        artifactFreshness,
        reason: "The contract is present, but no bounded sample source exists.",
        nextAction: "Add or refresh a bounded runtime sample source.",
        runtimeLiveAllowed: false,
      };
    }
    if (input.configSourceHealthy === true) {
      return {
        laneId: input.laneId,
        status: "source_ready_collecting",
        displayState: "collecting",
        artifactFreshness,
        reason: "Source contracts are healthy, but no bounded runtime activity sample is loaded.",
        nextAction: "Load a bounded runtime source window before displaying this sample as live.",
        runtimeLiveAllowed: false,
      };
    }
    return {
      laneId: input.laneId,
      status: "source_ready_no_sample_loaded",
      displayState: "collecting",
      artifactFreshness,
      reason: "No bounded runtime sample is loaded.",
      nextAction: "Load or attach a bounded runtime sample.",
      runtimeLiveAllowed: false,
    };
  }

  return {
    laneId: input.laneId,
    status: "unknown",
    displayState: "unknown",
    artifactFreshness,
    reason: "The lane does not provide enough config/runtime status context.",
    nextAction: "Classify config health, runtime sample source, and artifact freshness.",
    runtimeLiveAllowed: false,
  };
}

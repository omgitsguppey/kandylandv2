export type NoSampleStatus =
  | "healthy_current"
  | "healthy_proven_zero"
  | "source_ready_no_sample_loaded"
  | "sample_unavailable"
  | "source_missing_actionable"
  | "stale_artifact_refresh_required"
  | "degraded_current"
  | "unknown";

export type NoSampleDisplayState = "LIVE" | "REVIEW" | "WAIT" | "ACTION" | "STALE" | "UNKNOWN";

export type NoSampleSourceWindow = {
  generatedAtUtc?: string | null;
  windowLabel?: string | null;
  provesZero: boolean;
};

export type NoSampleStatusInput = {
  lane: string;
  loadedCount: number;
  sampleLoaded: boolean;
  sourceReady?: boolean;
  sourceMissing?: boolean;
  staleArtifact?: boolean;
  failureCount?: number;
  warningCount?: number;
  sourceWindow?: NoSampleSourceWindow | null;
  emptyStateText?: string;
  nextAction?: string;
};

export type NoSampleStatusResult = {
  status: NoSampleStatus;
  displayState: NoSampleDisplayState;
  liveAllowed: boolean;
  provenZero: boolean;
  reason: string;
  nextAction: string;
  sourceWindowLabel: string;
};

function titleLane(lane: string) {
  return lane.replace(/_/gu, " ");
}

function defaultLoadAction(lane: string) {
  return `Load a current ${titleLane(lane)} sample or attach a source window proving zero before marking this lane live.`;
}

function defaultRestoreAction(lane: string) {
  return `Restore the ${titleLane(lane)} sample source before treating zero loaded rows as healthy.`;
}

export function adminTruthStateForNoSampleStatus(status: NoSampleStatus) {
  if (status === "healthy_current" || status === "healthy_proven_zero") return "live" as const;
  if (status === "degraded_current") return "degraded" as const;
  if (status === "stale_artifact_refresh_required") return "stale" as const;
  if (status === "source_missing_actionable") return "failed" as const;
  return "unavailable" as const;
}

export function badgeLabelForNoSampleStatus(status: NoSampleStatus) {
  if (status === "healthy_proven_zero") return "ZERO";
  if (status === "source_ready_no_sample_loaded") return "NO SAMPLE";
  if (status === "sample_unavailable") return "UNAVAILABLE";
  if (status === "source_missing_actionable") return "ACTION";
  if (status === "stale_artifact_refresh_required") return "STALE";
  return undefined;
}

export function classifyNoSampleStatus(input: NoSampleStatusInput): NoSampleStatusResult {
  const loadedCount = Math.max(0, input.loadedCount);
  const failureCount = Math.max(0, input.failureCount ?? 0);
  const warningCount = Math.max(0, input.warningCount ?? 0);
  const sourceWindow = input.sourceWindow ?? null;
  const sourceWindowLabel = sourceWindow?.windowLabel || "missing";
  const provenZero = loadedCount === 0 && input.sampleLoaded && sourceWindow?.provesZero === true;

  if (input.staleArtifact) {
    return {
      status: "stale_artifact_refresh_required",
      displayState: "STALE",
      liveAllowed: false,
      provenZero: false,
      reason: `${titleLane(input.lane)} depends on a stale generated artifact.`,
      nextAction: input.nextAction || `Refresh the ${titleLane(input.lane)} artifact before using this sample as current truth.`,
      sourceWindowLabel,
    };
  }

  if (input.sourceMissing) {
    return {
      status: "source_missing_actionable",
      displayState: "ACTION",
      liveAllowed: false,
      provenZero: false,
      reason: `${titleLane(input.lane)} source is missing; zero loaded rows are not health evidence.`,
      nextAction: input.nextAction || defaultRestoreAction(input.lane),
      sourceWindowLabel,
    };
  }

  if (failureCount > 0 || warningCount > 0) {
    return {
      status: "degraded_current",
      displayState: "REVIEW",
      liveAllowed: false,
      provenZero: false,
      reason: `${titleLane(input.lane)} has ${failureCount} fail and ${warningCount} warn signals in the loaded sample.`,
      nextAction: input.nextAction || `Review current ${titleLane(input.lane)} signals.`,
      sourceWindowLabel,
    };
  }

  if (provenZero) {
    return {
      status: "healthy_proven_zero",
      displayState: "LIVE",
      liveAllowed: true,
      provenZero: true,
      reason: `${titleLane(input.lane)} has a current source window proving zero rows.`,
      nextAction: input.nextAction || "No action needed while the source window remains current.",
      sourceWindowLabel,
    };
  }

  if (loadedCount > 0 && input.sampleLoaded) {
    return {
      status: "healthy_current",
      displayState: "LIVE",
      liveAllowed: true,
      provenZero: false,
      reason: `${titleLane(input.lane)} has a loaded current sample.`,
      nextAction: input.nextAction || "No action needed for the loaded sample.",
      sourceWindowLabel,
    };
  }

  if (input.sourceReady) {
    return {
      status: "source_ready_no_sample_loaded",
      displayState: "WAIT",
      liveAllowed: false,
      provenZero: false,
      reason: input.emptyStateText
        ? "This is a no-sample state, not live health."
        : `${titleLane(input.lane)} source is ready, but no sample rows are loaded.`,
      nextAction: input.nextAction || defaultLoadAction(input.lane),
      sourceWindowLabel,
    };
  }

  if (loadedCount === 0) {
    return {
      status: "sample_unavailable",
      displayState: "WAIT",
      liveAllowed: false,
      provenZero: false,
      reason: `${titleLane(input.lane)} sample is unavailable; zero loaded rows are not health evidence.`,
      nextAction: input.nextAction || defaultLoadAction(input.lane),
      sourceWindowLabel,
    };
  }

  return {
    status: "unknown",
    displayState: "UNKNOWN",
    liveAllowed: false,
    provenZero: false,
    reason: `${titleLane(input.lane)} sample status is unknown.`,
    nextAction: input.nextAction || defaultLoadAction(input.lane),
    sourceWindowLabel,
  };
}

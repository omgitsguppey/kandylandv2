export type EmptyLiveLaneStatus =
  | "live"
  | "source_ready_collecting"
  | "source_ready_no_sample_loaded"
  | "source_missing"
  | "healthy_proven_zero"
  | "degraded";

export type EmptyLiveLaneDecision = {
  laneId: string;
  status: EmptyLiveLaneStatus;
  displayState: "live" | "collecting" | "source_missing" | "proven_zero" | "degraded";
  reason: string;
  nextAction: string;
};

export type EmptyLiveLaneInput = {
  laneId: string;
  sourceContractPresent: boolean;
  sampleLoaded: boolean;
  expectedTraffic: boolean;
  provenZero?: boolean;
  sourceWindow?: string | null;
  lowConfidenceCount?: number;
  counts: readonly number[];
};

function hasPositiveCount(counts: readonly number[]) {
  return counts.some((count) => Number.isFinite(count) && count > 0);
}

export function classifyEmptyLiveLane(input: EmptyLiveLaneInput): EmptyLiveLaneDecision {
  const lowConfidenceCount = Math.max(0, Math.trunc(Number(input.lowConfidenceCount ?? 0)));
  const positiveCount = hasPositiveCount(input.counts);

  if (!input.sourceContractPresent) {
    return {
      laneId: input.laneId,
      status: "source_missing",
      displayState: "source_missing",
      reason: "The lane has no source contract for its runtime sample.",
      nextAction: "Add or connect a bounded source summary before showing this lane as live.",
    };
  }

  if (input.provenZero && input.sourceWindow) {
    return {
      laneId: input.laneId,
      status: "healthy_proven_zero",
      displayState: "proven_zero",
      reason: `A bounded source window proves zero activity for ${input.sourceWindow}.`,
      nextAction: "Keep the proven-zero source window attached to the debug lane.",
    };
  }

  if (lowConfidenceCount > 0) {
    return {
      laneId: input.laneId,
      status: "source_ready_collecting",
      displayState: "collecting",
      reason: `${lowConfidenceCount} metric(s) are mapped but still below exact confidence.`,
      nextAction: "Load or materialize bounded envelope samples before promoting this lane to live.",
    };
  }

  if (!input.sampleLoaded || (!positiveCount && input.expectedTraffic)) {
    return {
      laneId: input.laneId,
      status: "source_ready_collecting",
      displayState: "collecting",
      reason: "The source contract exists, but no bounded runtime sample has been loaded.",
      nextAction: "Attach a bounded source-summary sample or proven-zero source window.",
    };
  }

  return {
    laneId: input.laneId,
    status: positiveCount ? "live" : "source_ready_collecting",
    displayState: positiveCount ? "live" : "collecting",
    reason: positiveCount ? "Bounded source sample contains activity." : "Source contract exists and is collecting activity.",
    nextAction: positiveCount ? "No source repair needed." : "Wait for bounded source-summary activity or attach proven-zero evidence.",
  };
}

export type CreatorLaneFreshnessInput = {
  parityStatus: string;
  issueCount: number;
  historyGapCount: number;
  freshness: string;
  sourceSnapshotCount: number;
  lastMaterializedAtUtc: string | null;
  sourceWindowProvesZero: boolean;
};

export type CreatorLaneFreshnessStatus = {
  freshnessStatus: "healthy_current" | "source_ready_no_sample_loaded" | "runtime_sample_proven_zero";
  materializerStatus: "materializer_current" | "materializer_completion_missing";
  displayAsNoActionNeeded: boolean;
  nextAction: string;
};

export function classifyCreatorLaneFreshness(input: CreatorLaneFreshnessInput): CreatorLaneFreshnessStatus {
  const materializerMissing = !input.lastMaterializedAtUtc || input.freshness === "not_recorded";
  const sourceEmptyUnproven = input.sourceSnapshotCount === 0 && !input.sourceWindowProvesZero;

  if (materializerMissing || sourceEmptyUnproven) {
    return {
      freshnessStatus: input.sourceWindowProvesZero ? "runtime_sample_proven_zero" : "source_ready_no_sample_loaded",
      materializerStatus: materializerMissing ? "materializer_completion_missing" : "materializer_current",
      displayAsNoActionNeeded: false,
      nextAction: "Load a creator lane source window and materializer completion timestamp before claiming full freshness.",
    };
  }

  return {
    freshnessStatus: "healthy_current",
    materializerStatus: "materializer_current",
    displayAsNoActionNeeded: input.parityStatus === "ok" && input.issueCount === 0 && input.historyGapCount === 0,
    nextAction: "Creator lane source window and materializer timestamp are current.",
  };
}

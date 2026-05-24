export type SystemHealthMaterializerInput = {
  scorePercent: number | null;
  penaltyCount: number;
  routeFailureCount: number;
  downstreamWritersNeedingReview: number;
  materializerSampleLoaded: boolean;
  freshestSignalLabel: string;
};

export type SystemHealthMaterializerStatus = {
  scoreStatus: "healthy_current" | "degraded_current" | "unavailable_no_sample";
  downstreamWriterSampleStatus: "healthy_current" | "materializer_sample_missing";
  displayAsHealthyLive: boolean;
  nextAction: string;
};

export function classifySystemHealthMaterializer(input: SystemHealthMaterializerInput): SystemHealthMaterializerStatus {
  if (!input.materializerSampleLoaded) {
    return {
      scoreStatus: "unavailable_no_sample",
      downstreamWriterSampleStatus: "materializer_sample_missing",
      displayAsHealthyLive: false,
      nextAction: "Load a current downstream materializer sample before claiming writer health as live.",
    };
  }

  if ((input.scorePercent ?? 0) === 0 && input.penaltyCount === 0) {
    return {
      scoreStatus: "unavailable_no_sample",
      downstreamWriterSampleStatus: "healthy_current",
      displayAsHealthyLive: false,
      nextAction: "Explain why system health score is zero before surfacing it as an actual score.",
    };
  }

  const degraded = input.routeFailureCount > 0 || input.downstreamWritersNeedingReview > 0 || (input.scorePercent ?? 100) < 80;
  return {
    scoreStatus: degraded ? "degraded_current" : "healthy_current",
    downstreamWriterSampleStatus: "healthy_current",
    displayAsHealthyLive: !degraded,
    nextAction: degraded ? "Review current route failures or downstream writer warnings." : "No current materializer issues in loaded sample.",
  };
}

export type AnalyticsRecoveryEvidenceInput = {
  available: boolean;
  lanes: number;
  productionAllowedNow: boolean;
  promotedNow: number;
};

export type AnalyticsRecoveryEvidenceStatus = {
  status: "available_current" | "backfill_disabled_by_policy" | "source_ready_no_sample_loaded";
  isFailure: boolean;
  displayAsLive: boolean;
  nextAction: string;
};

export function classifyAnalyticsRecoveryEvidence(input: AnalyticsRecoveryEvidenceInput): AnalyticsRecoveryEvidenceStatus {
  if (!input.available && !input.productionAllowedNow) {
    return {
      status: "backfill_disabled_by_policy",
      isFailure: false,
      displayAsLive: false,
      nextAction: "Keep analytics recovery collapsed until a policy-approved debug-first recovery lane is enabled.",
    };
  }
  if (!input.available) {
    return {
      status: "source_ready_no_sample_loaded",
      isFailure: false,
      displayAsLive: false,
      nextAction: "Load recovery evidence before marking analytics recovery live.",
    };
  }
  return {
    status: "available_current",
    isFailure: false,
    displayAsLive: true,
    nextAction: input.promotedNow > 0 ? "Review promoted recovery lanes." : "No recovery lanes promoted in current evidence.",
  };
}

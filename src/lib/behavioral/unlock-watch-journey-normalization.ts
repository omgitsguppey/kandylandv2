export interface UnlockWatchJourneyNormalizationInput {
  unlockTransactionCount: number;
  serverUnlockTelemetryCount: number;
  viewerStartEventCount: number;
  watchSessionCount: number;
  uniqueJourneyKeys: string[];
  rawPrivateContentFields: string[];
}

export function classifyUnlockWatchJourneyNormalization(input: UnlockWatchJourneyNormalizationInput) {
  const uniqueJourneyStepCount = new Set(input.uniqueJourneyKeys.filter(Boolean)).size;
  const attributionGaps: Array<"missing_server_unlock_telemetry" | "missing_viewer_start"> = [];
  if (input.unlockTransactionCount > 0 && input.serverUnlockTelemetryCount <= 0) {
    attributionGaps.push("missing_server_unlock_telemetry");
  }
  if (input.watchSessionCount > 0 && input.viewerStartEventCount <= 0) {
    attributionGaps.push("missing_viewer_start");
  }
  const rawPrivateContentExposed = input.rawPrivateContentFields.length > 0;
  const doubleCountRisk = uniqueJourneyStepCount < input.uniqueJourneyKeys.filter(Boolean).length;
  const state = rawPrivateContentExposed || attributionGaps.includes("missing_server_unlock_telemetry")
    ? "fail" as const
    : attributionGaps.length > 0 || doubleCountRisk
      ? "review" as const
      : "pass" as const;

  return {
    state,
    journeySteps: {
      dropViewed: "optional_client_context",
      unlockAttempted: "client_supporting",
      unlockCompleted: "server_unlock_telemetry",
      contentViewerStarted: "viewer_start_telemetry",
      watchSessionStarted: "watch_session_rollup",
      watchProgress: "watch_session_observation",
      watchCompletedOrAbandoned: "watch_session_closeout",
    },
    uniqueJourneyStepCount,
    attributionGaps,
    watchSessionsDropped: false,
    doubleCountRisk,
    rawPrivateContentExposed,
    nextAction: rawPrivateContentExposed
      ? "Remove raw private content fields from journey facts."
      : attributionGaps.length > 0
        ? "Keep watch sessions counted and surface missing unlock/viewer telemetry as attribution gaps."
        : "No action required.",
  };
}

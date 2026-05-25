export interface WatchCaptureQualityInput {
  watchSessions: number;
  fullCaptures: number;
  degradedCaptures: number;
  replayRecoveredSessions: number;
  closeMissingSessions: number;
}

export function classifyWatchCaptureQuality(input: WatchCaptureQualityInput) {
  const watchSessions = Math.max(0, Math.round(input.watchSessions));
  const fullCaptures = Math.max(0, Math.round(input.fullCaptures));
  const degradedCaptures = Math.max(0, Math.round(input.degradedCaptures));
  const replayRecoveredSessions = Math.max(0, Math.round(input.replayRecoveredSessions));
  const closeMissingSessions = Math.max(0, Math.round(input.closeMissingSessions));
  const replayRecoveryRate = watchSessions > 0 ? Number(((replayRecoveredSessions / watchSessions) * 100).toFixed(2)) : 0;
  const degradedCaptureRate = watchSessions > 0 ? Number(((degradedCaptures / watchSessions) * 100).toFixed(2)) : 0;
  const missingCloseoutRate = watchSessions > 0 ? Number(((closeMissingSessions / watchSessions) * 100).toFixed(2)) : 0;
  const state = watchSessions <= 0
    ? "review" as const
    : replayRecoveryRate > 25 || missingCloseoutRate > 0
      ? "fail" as const
      : replayRecoveryRate > 10 || degradedCaptureRate > 0
        ? "review" as const
        : "pass" as const;
  const blockedReason = replayRecoveryRate > 25
    ? "replay_recovery_rate_high" as const
    : missingCloseoutRate > 0
      ? "closeout_missing" as const
      : degradedCaptureRate > 0
        ? "degraded_capture_present" as const
        : null;

  return {
    watchSessions,
    fullCaptures,
    degradedCaptures,
    replayRecoveredSessions,
    closeMissingSessions,
    replayRecoveryRate,
    degradedCaptureRate,
    missingCloseoutRate,
    confidence: state === "pass" ? 100 : Math.max(0, Math.round(100 - replayRecoveryRate - degradedCaptureRate - missingCloseoutRate)),
    state,
    passAllowed: state === "pass",
    blockedReason,
    nextAction: state === "pass"
      ? "No action required."
      : replayRecoveryRate > 25
        ? "Investigate viewer close/flush reliability; replay recovery is above the 25% failure threshold."
        : "Review degraded, replay-recovered, or close-missing watch capture before promoting viewer funnel quality.",
  };
}

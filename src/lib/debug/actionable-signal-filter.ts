import {
  classifyFutureActivitySignal,
  type FutureActivitySignalClassificationResult,
  type FutureActivitySignalInput,
} from "@/lib/debug/future-activity-classifier";

export type ActionableActivitySignalSummary = {
  totalSignalCount: number;
  actionableActivitySignalCount: number;
  quietFutureActivityCount: number;
  brokenActivityPathCount: number;
  scoreDragActivityCount: number;
  evidenceGateOnlyCount: number;
  classifiedSignals: FutureActivitySignalClassificationResult[];
  actionableSignals: FutureActivitySignalClassificationResult[];
  quietFutureCatalog: FutureActivitySignalClassificationResult[];
};

const BROKEN_ACTIVITY_PATH_CLASSIFICATIONS = new Set([
  "missing_producer",
  "missing_bridge",
  "missing_materializer",
  "missing_metric_consumer",
  "broken_debug_mapping",
  "unsafe_unknown",
]);

const QUIET_FUTURE_CLASSIFICATIONS = new Set([
  "future_activity_placeholder",
  "source_ready_waiting_for_real_user_event",
  "source_ready_no_score_impact",
]);

export function filterActionableActivitySignals(
  signals: readonly (FutureActivitySignalInput | FutureActivitySignalClassificationResult)[],
) {
  return signals
    .map((signal) => "classification" in signal
      ? signal as FutureActivitySignalClassificationResult
      : classifyFutureActivitySignal(signal))
    .filter((signal) => signal.actionable);
}

export function summarizeActionableActivitySignals(
  signals: readonly FutureActivitySignalInput[],
): ActionableActivitySignalSummary {
  const classifiedSignals = signals.map((signal) => classifyFutureActivitySignal(signal));
  const actionableSignals = filterActionableActivitySignals(classifiedSignals);
  const quietFutureCatalog = classifiedSignals.filter((signal) =>
    signal.quiet && QUIET_FUTURE_CLASSIFICATIONS.has(signal.classification));

  return {
    totalSignalCount: classifiedSignals.length,
    actionableActivitySignalCount: actionableSignals.length,
    quietFutureActivityCount: quietFutureCatalog.length,
    brokenActivityPathCount: classifiedSignals.filter((signal) =>
      BROKEN_ACTIVITY_PATH_CLASSIFICATIONS.has(signal.classification)).length,
    scoreDragActivityCount: classifiedSignals.filter((signal) => signal.scoreImpact && !signal.evidenceGateOnly).length,
    evidenceGateOnlyCount: classifiedSignals.filter((signal) => signal.evidenceGateOnly).length,
    classifiedSignals,
    actionableSignals,
    quietFutureCatalog,
  };
}

export function isActionableActivitySignal(input: FutureActivitySignalInput) {
  return classifyFutureActivitySignal(input).actionable;
}

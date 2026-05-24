export type RegressionRiskScoreDimension =
  | "sourceHealth"
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk"
  | "overallHealthScore";

export type RegressionRiskScoreDimensions = Record<RegressionRiskScoreDimension, number>;

export type RegressionRiskLaneStatus =
  | "pass"
  | "fail"
  | "missing_script"
  | "missing_artifact"
  | "stale"
  | "landed_artifact_reused"
  | "in_flight";

export type RegressionRiskLaneResult = {
  laneId: string;
  command: string;
  artifactPath: string;
  status: RegressionRiskLaneStatus;
  currentHead?: string;
  sourceCommit?: string;
  generatedAtUtc?: string;
  scoreDimensionsAffected: RegressionRiskScoreDimension[];
  nextAction: string;
  blocker?: string;
  changedSinceEvidence?: boolean;
};

export type RegressionRiskRefreshReport = {
  generatedAtUtc: string;
  reportKey: "regression-risk-high-blast-refresh";
  currentHead: string;
  scoreBefore: RegressionRiskScoreDimensions;
  scoreAfter: RegressionRiskScoreDimensions;
  highBlastLanes: string[];
  highBlastCoverageCurrent: boolean;
  staleTargetedBehaviorEvidenceRetired: boolean;
  targetedBehaviorEvidenceCurrent: boolean;
  laneResults: RegressionRiskLaneResult[];
  refreshedLanes: RegressionRiskLaneResult[];
  failedLanes: RegressionRiskLaneResult[];
  inFlightLanes: RegressionRiskLaneResult[];
  missingLanes: RegressionRiskLaneResult[];
  staleLanes: RegressionRiskLaneResult[];
  dirtyFilesClassified: Array<{
    path: string;
    classification: "in_flight_event_liveness" | "current_generated_artifact_to_commit" | "release_artifact_expected" | "real_source_change_needs_review" | "unrelated_agent_context_file_to_ignore" | "unsafe_unknown";
  }>;
  staleArtifactsRetired: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
};

export const HIGH_BLAST_REGRESSION_LANES = [
  "event-translation-bridge",
  "person-metrics-hydration",
  "debug-signal-grouping",
  "chat-functionality-score-lock",
  "daily-task-debug-score-lock",
  "settings-connection-parity",
  "wallet-modal-telemetry-cleanup",
  "user-management-refactor",
  "formal-evidence-bridge",
  "cost-risk-owner-review-closure",
  "event-liveness-audit",
] as const;

const WEIGHTS: Record<RegressionRiskScoreDimension, number> = {
  sourceHealth: 25,
  runtimeHealth: 20,
  evidenceCompleteness: 20,
  freshness: 15,
  costRisk: 10,
  regressionRisk: 10,
  overallHealthScore: 0,
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, roundScore(value)));
}

function weightedOverall(metrics: RegressionRiskScoreDimensions) {
  const totalWeight = Object.entries(WEIGHTS)
    .filter(([dimension]) => dimension !== "overallHealthScore")
    .reduce((sum, [, weight]) => sum + weight, 0);
  const weighted = Object.entries(WEIGHTS)
    .filter(([dimension]) => dimension !== "overallHealthScore")
    .reduce((sum, [dimension, weight]) => sum + metrics[dimension as RegressionRiskScoreDimension] * weight, 0);
  return roundScore(weighted / Math.max(1, totalWeight));
}

function isCurrent(result: RegressionRiskLaneResult, currentHead: string) {
  return (result.status === "pass" || result.status === "landed_artifact_reused")
    && (result.currentHead === currentHead || result.sourceCommit === currentHead);
}

function isMissing(result: RegressionRiskLaneResult) {
  return result.status === "missing_artifact" || result.status === "missing_script";
}

function classifyDirtyFile(path: string): RegressionRiskRefreshReport["dirtyFilesClassified"][number] {
  if (/event-liveness-audit|event-liveness-(contract|engine)|debug-panel-tracking-summary|admin-debug\/summary|api\/admin\/debug\/route/u.test(path)) {
    return { path, classification: "in_flight_event_liveness" };
  }
  if (/^agent\/context\/optimized-task-context\.generated\.json$/u.test(path)) {
    return { path, classification: "unrelated_agent_context_file_to_ignore" };
  }
  if (/^agent\/state\/regression-risk-high-blast-refresh\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit" };
  }
  if (/^agent\/state\/public-beta-score\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit" };
  }
  if (/^agent\/state\/(event-translation-bridge|person-metrics-hydration|debug-signal-grouping|chat-functionality-score-lock|daily-task-debug-score-lock|settings-connection-parity|user-management-refactor|formal-evidence-bridge|cost-risk-owner-review-closure|event-envelope-normalization|telemetry-trigger-test-matrix|chat-realtime-cost-control|chat-gating-moderation|chat-telemetry-admin-truth|daily-task-reset-truth|daily-task-lifecycle-telemetry|daily-task-reward-ledger|daily-task-guidance-route-audit|feature-registration-gate|debug-signal-actionability|user-profile-api-contract)\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit" };
  }
  if (/^docs\/agent-truth\/regression-risk-high-blast-refresh\.md$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^docs\/agent-truth\/(event-translation-bridge|person-metrics-hydration|debug-signal-grouping|chat-functionality-score-lock|daily-task-debug-score-lock|settings-connection-parity|user-management-refactor|formal-evidence-bridge|cost-risk-owner-review-closure|event-envelope-normalization|telemetry-trigger-test-matrix|chat-realtime-cost-control|chat-gating-moderation|chat-telemetry-admin-truth|daily-task-reset-truth|daily-task-lifecycle-telemetry|daily-task-reward-ledger|daily-task-guidance-route-audit|feature-registration-gate|debug-signal-actionability|user-profile-api-contract)\.md$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^agent\/state\/targeted-behavior-evidence\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit" };
  }
  if (/^docs\/agent-truth\/targeted-behavior-evidence\.md$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^(CHANGELOG\.md|public\/kandydrops-release-notes\.json)$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^package\.json$/u.test(path)) {
    return { path, classification: "real_source_change_needs_review" };
  }
  if (/^(src|scripts|tests)\//u.test(path)) {
    return { path, classification: "real_source_change_needs_review" };
  }
  return { path, classification: "unsafe_unknown" };
}

export function buildRegressionRiskRefreshPlan(input: {
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: RegressionRiskScoreDimensions;
  laneResults: RegressionRiskLaneResult[];
  dirtyFiles: string[];
  previousTargetedBehaviorEvidence?: {
    currentHead?: string;
    sourceCommit?: string;
    status?: string;
  } | null;
}): RegressionRiskRefreshReport {
  const resultById = new Map(input.laneResults.map((result) => [result.laneId, result]));
  const requiredLaneResults = HIGH_BLAST_REGRESSION_LANES.map((laneId) => resultById.get(laneId) ?? {
    laneId,
    command: `npm run check:${laneId}`,
    artifactPath: `agent/state/${laneId}.generated.json`,
    status: "missing_artifact" as const,
    scoreDimensionsAffected: ["regressionRisk" as const],
    nextAction: `Run npm run check:${laneId} or classify why the lane is unavailable.`,
    blocker: "No validator result was supplied for this high-blast lane.",
  });
  const allResults = [
    ...requiredLaneResults,
    ...input.laneResults.filter((result) => !HIGH_BLAST_REGRESSION_LANES.includes(result.laneId as never)),
  ];
  const refreshedLanes = allResults.filter((result) => isCurrent(result, input.currentHead));
  const inFlightLanes = allResults.filter((result) => result.status === "in_flight");
  const failedLanes = allResults.filter((result) => result.status === "fail");
  const missingLanes = allResults.filter(isMissing);
  const staleLanes = allResults.filter((result) => result.status === "stale");
  const highBlastCoverageCurrent = requiredLaneResults.every((result) =>
    isCurrent(result, input.currentHead) || result.status === "in_flight" || result.changedSinceEvidence === false
  );
  const targetedBehaviorEvidenceCurrent = input.previousTargetedBehaviorEvidence?.currentHead === input.currentHead
    || input.previousTargetedBehaviorEvidence?.sourceCommit === input.currentHead;
  const staleTargetedBehaviorEvidenceRetired = !targetedBehaviorEvidenceCurrent;
  const gapCount = failedLanes.length + missingLanes.length + staleLanes.length;
  const inFlightPenalty = Math.min(8, inFlightLanes.length * 2);
  const gapPenalty = Math.min(60, gapCount * 8);
  const coverageBonus = highBlastCoverageCurrent ? 88 : Math.max(25, 82 - gapPenalty - inFlightPenalty);
  const regressionRisk = clampScore(coverageBonus);
  const freshness = highBlastCoverageCurrent
    ? clampScore(Math.max(input.scoreBefore.freshness, 82 - inFlightPenalty))
    : input.scoreBefore.freshness;
  const scoreAfter: RegressionRiskScoreDimensions = {
    ...input.scoreBefore,
    freshness,
    regressionRisk,
    overallHealthScore: 0,
  };
  scoreAfter.overallHealthScore = weightedOverall(scoreAfter);
  const dirtyFilesClassified = input.dirtyFiles.map(classifyDirtyFile);
  const remainingGaps = [
    ...failedLanes.map((lane) => `${lane.laneId}: ${lane.blocker ?? lane.nextAction}`),
    ...missingLanes.map((lane) => `${lane.laneId}: ${lane.blocker ?? lane.nextAction}`),
    ...staleLanes.map((lane) => `${lane.laneId}: ${lane.blocker ?? lane.nextAction}`),
    ...inFlightLanes.map((lane) => `${lane.laneId}: in-flight lane kept separate from stale regression drag.`),
  ];
  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "regression-risk-high-blast-refresh",
    currentHead: input.currentHead,
    scoreBefore: input.scoreBefore,
    scoreAfter,
    highBlastLanes: [...HIGH_BLAST_REGRESSION_LANES],
    highBlastCoverageCurrent,
    staleTargetedBehaviorEvidenceRetired,
    targetedBehaviorEvidenceCurrent,
    laneResults: allResults,
    refreshedLanes,
    failedLanes,
    inFlightLanes,
    missingLanes,
    staleLanes,
    dirtyFilesClassified,
    staleArtifactsRetired: staleTargetedBehaviorEvidenceRetired ? ["agent/state/targeted-behavior-evidence.generated.json"] : [],
    remainingGaps,
    nextExactSteps: regressionRisk >= 80
      ? ["Keep high-blast regression validators current after analytics, debug, chat, task, settings, wallet, admin, score, or cost changes."]
      : remainingGaps.map((gap) => `Refresh or classify ${gap}`),
  };
}

export function validateRegressionRiskRefreshPlan(report: RegressionRiskRefreshReport) {
  const failures: string[] = [];
  if (report.reportKey !== "regression-risk-high-blast-refresh") failures.push("reportKey must be regression-risk-high-blast-refresh.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.currentHead) failures.push("currentHead is required.");
  for (const laneId of HIGH_BLAST_REGRESSION_LANES) {
    const lane = report.laneResults.find((result) => result.laneId === laneId);
    if (!lane || (!isCurrent(lane, report.currentHead) && lane.status !== "in_flight")) {
      if (lane?.changedSinceEvidence !== false) {
        failures.push(`high-blast lane ${laneId} lacks current validator result.`);
      }
    }
  }
  for (const lane of report.inFlightLanes) {
    if (!lane.nextAction || (lane.status !== "in_flight")) {
      failures.push(`in-flight lane ${lane.laneId} must be classified separately with a next action.`);
    }
  }
  if (report.staleTargetedBehaviorEvidenceRetired !== true && !report.targetedBehaviorEvidenceCurrent) {
    failures.push("stale targeted behavior evidence must be retired or replaced.");
  }
  if (report.scoreAfter.regressionRisk < 80 && report.nextExactSteps.length === 0) {
    failures.push("regressionRisk below 80 lacks exact next action.");
  }
  for (const dimension of Object.keys(WEIGHTS) as RegressionRiskScoreDimension[]) {
    if (typeof report.scoreBefore[dimension] !== "number" || typeof report.scoreAfter[dimension] !== "number") {
      failures.push(`score dimension ${dimension} before/after is missing.`);
    }
  }
  return failures;
}

export type ScoreDimensionName =
  | "sourceHealth"
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk"
  | "overallHealthScore";

export type ScoreDimensionValues = Record<ScoreDimensionName, number>;

export type ScoreDimensionDetail = {
  before: number;
  after: number;
  target: 80;
  status: "at_or_above_80" | "below_80";
  rootCause: string;
  nextAction: string;
};

export type Below80RootCause = {
  rootCause:
    | "formal_evidence_gate_required"
    | "stale_score_artifact"
    | "cost_external_review_required"
    | "regression_evidence_required"
    | "unsafe_unknown";
  nextAction: string;
};

export type ScoreDimensionStaleArtifact = {
  artifactPath: string;
  status: string;
  refreshCommand?: string | null;
  nextAction?: string;
  classification?: "formal_gate_required" | "external_review_required" | "in_flight" | "current_warning" | "stale_removed";
};

export type ScoreDimensionCostLane = {
  laneId: string;
  status: string;
  nextAction: string;
};

export type ScoreDimensionRegressionLane = {
  laneId: string;
  status: string;
  nextAction: string;
};

export type ScoreDimensionDirtyFile = {
  path: string;
  classification:
    | "current_generated_artifact_to_commit"
    | "release_artifact_expected"
    | "real_source_change_needs_review"
    | "validator_artifact_expected"
    | "test_artifact_expected"
    | "in_flight"
    | "unrelated_agent_context_file_to_ignore"
    | "unsafe_unknown";
};

export type ScoreDimensionOpenPrClassification = {
  number: number;
  title: string;
  url: string;
  classification:
    | "external_evidence_required"
    | "external_open_pr_not_touched_score_lock"
    | "relevant_score_pr_review_required"
    | "unsafe_unknown";
};

export type ScoreDimension80LockInput = {
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: ScoreDimensionValues;
  scoreAfter: ScoreDimensionValues;
  formalGatesRemaining: string[];
  staleArtifacts: ScoreDimensionStaleArtifact[];
  costOwnerReviewRemaining: ScoreDimensionCostLane[];
  regressionEvidenceRemaining: ScoreDimensionRegressionLane[];
  inFlightLanes: ScoreDimensionRegressionLane[];
  nonEventScorePenaltyCount: number;
  futureActivityPenaltyCount: number;
  dirtyFilesClassified: ScoreDimensionDirtyFile[];
  openPrClassifications: ScoreDimensionOpenPrClassification[];
};

export type ScoreDimension80LockReport = {
  generatedAtUtc: string;
  reportKey: "score-dimension-80-lock";
  currentHead: string;
  scoreBefore: ScoreDimensionValues;
  scoreAfter: ScoreDimensionValues;
  dimensions: Record<ScoreDimensionName, ScoreDimensionDetail>;
  dimensionsAtOrAbove80: ScoreDimensionName[];
  dimensionsBelow80: ScoreDimensionName[];
  below80RootCauses: Partial<Record<ScoreDimensionName, Below80RootCause>>;
  formalGatesRemaining: string[];
  staleArtifactsRemaining: ScoreDimensionStaleArtifact[];
  costOwnerReviewRemaining: ScoreDimensionCostLane[];
  regressionEvidenceRemaining: ScoreDimensionRegressionLane[];
  inFlightLanes: ScoreDimensionRegressionLane[];
  nonEventScorePenaltyCount: number;
  futureActivityPenaltyCount: number;
  dirtyFilesClassified: ScoreDimensionDirtyFile[];
  openPrClassifications: ScoreDimensionOpenPrClassification[];
  nextExactSteps: string[];
};

const DIMENSIONS: ScoreDimensionName[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
];

function rootCauseFor(
  dimension: ScoreDimensionName,
  input: ScoreDimension80LockInput,
): Below80RootCause {
  if (dimension === "evidenceCompleteness" || dimension === "runtimeHealth" || dimension === "overallHealthScore") {
    return {
      rootCause: "formal_evidence_gate_required",
      nextAction: `Attach formal provider, deployed runtime, and production admin truth evidence before clearing beta gates. Remaining gates: ${input.formalGatesRemaining.join(", ") || "none listed"}.`,
    };
  }
  if (dimension === "freshness") {
    const first = input.staleArtifacts[0];
    return {
      rootCause: "stale_score_artifact",
      nextAction: first?.refreshCommand
        ? `Refresh ${first.artifactPath} with ${first.refreshCommand}.`
        : "Refresh stale score-impacting artifacts or classify them as in-flight.",
    };
  }
  if (dimension === "costRisk") {
    const first = input.costOwnerReviewRemaining[0];
    return {
      rootCause: "cost_external_review_required",
      nextAction: first?.nextAction ?? "Attach external owner-reviewed cost evidence before claiming full cost closure.",
    };
  }
  if (dimension === "regressionRisk") {
    const first = input.regressionEvidenceRemaining[0] ?? input.inFlightLanes[0];
    return {
      rootCause: "regression_evidence_required",
      nextAction: first?.nextAction ?? "Refresh targeted regression evidence for score-impacting changed lanes.",
    };
  }
  return {
    rootCause: "unsafe_unknown",
    nextAction: `Investigate ${dimension} and add an exact root cause before claiming this score lock.`,
  };
}

export function buildScoreDimension80LockReport(input: ScoreDimension80LockInput): ScoreDimension80LockReport {
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => {
    const before = input.scoreBefore[dimension];
    const after = input.scoreAfter[dimension];
    const below = after < 80;
    const cause = below ? rootCauseFor(dimension, input) : undefined;
    return [dimension, {
      before,
      after,
      target: 80,
      status: below ? "below_80" : "at_or_above_80",
      rootCause: cause?.rootCause ?? "meets_target",
      nextAction: cause?.nextAction ?? "No score action needed for this dimension.",
    } satisfies ScoreDimensionDetail];
  })) as Record<ScoreDimensionName, ScoreDimensionDetail>;

  const dimensionsBelow80 = DIMENSIONS.filter((dimension) => input.scoreAfter[dimension] < 80);
  const dimensionsAtOrAbove80 = DIMENSIONS.filter((dimension) => input.scoreAfter[dimension] >= 80);
  const below80RootCauses = Object.fromEntries(dimensionsBelow80.map((dimension) => [
    dimension,
    rootCauseFor(dimension, input),
  ])) as Partial<Record<ScoreDimensionName, Below80RootCause>>;

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "score-dimension-80-lock",
    currentHead: input.currentHead,
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    dimensions,
    dimensionsAtOrAbove80,
    dimensionsBelow80,
    below80RootCauses,
    formalGatesRemaining: input.formalGatesRemaining,
    staleArtifactsRemaining: input.staleArtifacts,
    costOwnerReviewRemaining: input.costOwnerReviewRemaining,
    regressionEvidenceRemaining: input.regressionEvidenceRemaining,
    inFlightLanes: input.inFlightLanes,
    nonEventScorePenaltyCount: input.nonEventScorePenaltyCount,
    futureActivityPenaltyCount: input.futureActivityPenaltyCount,
    dirtyFilesClassified: input.dirtyFilesClassified,
    openPrClassifications: input.openPrClassifications,
    nextExactSteps: [
      ...dimensionsBelow80.map((dimension) => `${dimension}: ${below80RootCauses[dimension]?.nextAction ?? "Add exact next action."}`),
      ...input.staleArtifacts.map((artifact) => `${artifact.artifactPath}: ${artifact.nextAction ?? artifact.refreshCommand ?? "Classify stale artifact."}`),
      ...input.inFlightLanes.map((lane) => `${lane.laneId}: ${lane.nextAction}`),
    ],
  };
}

export function validateScoreDimension80LockReport(report: ScoreDimension80LockReport) {
  const failures: string[] = [];
  if (report.reportKey !== "score-dimension-80-lock") failures.push("reportKey must be score-dimension-80-lock.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable.");
  if (!report.currentHead) failures.push("currentHead is required.");
  for (const dimension of DIMENSIONS) {
    const detail = report.dimensions[dimension];
    if (!detail || typeof detail.before !== "number" || typeof detail.after !== "number" || detail.target !== 80) {
      failures.push(`${dimension} dimension is missing.`);
    }
    if (report.scoreAfter[dimension] < 80) {
      const rootCause = report.below80RootCauses[dimension];
      if (!rootCause?.rootCause || !rootCause.nextAction) {
        failures.push(`${dimension} is below 80 without root cause and next action.`);
      }
    }
  }
  if (report.nonEventScorePenaltyCount > 0 || report.futureActivityPenaltyCount > 0) {
    failures.push("future activity or non-event penalties returned.");
  }
  for (const artifact of report.staleArtifactsRemaining) {
    if (artifact.classification === "in_flight") continue;
    if (!artifact.refreshCommand || !artifact.nextAction) {
      failures.push(`${artifact.artifactPath} stale artifact lacks refresh command or next action.`);
    }
  }
  if (report.formalGatesRemaining.length === 0 && report.dimensions.evidenceCompleteness.after < 100) {
    failures.push("formal gates appear falsely cleared while evidence completeness is incomplete.");
  }
  if (report.dirtyFilesClassified.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files are unclassified.");
  }
  if (report.openPrClassifications.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("open PRs are unclassified.");
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  return failures;
}

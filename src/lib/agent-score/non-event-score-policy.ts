import type {
  DebugSignalActionability,
  ScoreDimensionImpact,
} from "../debug/debug-backlog-contract";

export type NonEventScoreClassification =
  | "quiet_future_activity"
  | "source_ready_waiting_for_real_user_event"
  | "source_ready_no_score_impact"
  | "missing_producer"
  | "missing_bridge"
  | "missing_materializer"
  | "missing_metric_consumer"
  | "stale_artifact"
  | "blocked_formal_evidence"
  | "cost_owner_review"
  | "visual_operator_final"
  | "unsafe_unknown";

export type NonEventBlockerType =
  | "non_event"
  | "source_connectivity"
  | "bridge_connectivity"
  | "materializer_connectivity"
  | "metric_consumer_connectivity"
  | "stale_score_evidence"
  | "formal_runtime_evidence"
  | "cost_owner_review"
  | "outside_codex_score"
  | "unsafe_unknown";

export type ScoreReportDimension = ScoreDimensionImpact | "overallHealthScore";

export type NonEventScoreImpactInput = {
  signalId: string;
  classification: NonEventScoreClassification;
  rawCount?: number;
};

export type NonEventScoreImpact = {
  signalId: string;
  classification: NonEventScoreClassification;
  blockerType: NonEventBlockerType;
  scoreDimensionsAffected: ScoreDimensionImpact[];
  scorePenalty: number;
  countsAsRegression: boolean;
  reason: string;
  nextAction: string;
};

export type NonEventScoreGroupInput = {
  groupId: string;
  actionability: DebugSignalActionability;
  count: number;
  estimatedPointImpact?: number;
  scoreDimensionsAffected?: string[];
  rootCause?: string;
};

export type NonEventScorePolicySummary = {
  quietFutureActivityCount: number;
  actionableSignalGroupCount: number;
  scoreDragSignalGroupCount: number;
  nonEventScorePenaltyCount: number;
  usesActionableGroups: boolean;
};

export type ScoreDimensionExplanation = {
  before?: number;
  after: number;
  target: 80;
  status: "meets_target" | "below_target";
  blockerType: NonEventBlockerType;
  reason: string;
  nextExactAction: string;
};

const SCORE_DIMENSIONS = new Set<ScoreDimensionImpact>([
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
]);

function normalizeDimension(value: unknown): ScoreDimensionImpact | undefined {
  const normalized = String(value ?? "").replace(/[^a-z]/giu, "").toLowerCase();
  if (normalized === "sourcehealth") return "sourceHealth";
  if (normalized === "runtimehealth") return "runtimeHealth";
  if (normalized === "evidencecompleteness") return "evidenceCompleteness";
  if (normalized === "freshness") return "freshness";
  if (normalized === "costrisk") return "costRisk";
  if (normalized === "regressionrisk") return "regressionRisk";
  return undefined;
}

function normalizeDimensions(values?: readonly string[]) {
  const output: ScoreDimensionImpact[] = [];
  for (const value of values ?? []) {
    const dimension = normalizeDimension(value);
    if (dimension && SCORE_DIMENSIONS.has(dimension) && !output.includes(dimension)) {
      output.push(dimension);
    }
  }
  return output;
}

export function classifyNonEventScoreImpact(input: NonEventScoreImpactInput): NonEventScoreImpact {
  switch (input.classification) {
    case "quiet_future_activity":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "non_event",
        scoreDimensionsAffected: [],
        scorePenalty: 0,
        countsAsRegression: false,
        reason: "Future activity has not occurred yet; absence of a real user event is not evidence failure.",
        nextAction: "Keep in the collapsed future activity catalog until real user activity exists.",
      };
    case "source_ready_waiting_for_real_user_event":
    case "source_ready_no_score_impact":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "non_event",
        scoreDimensionsAffected: [],
        scorePenalty: 0,
        countsAsRegression: false,
        reason: "The source path is wired and is only awaiting first real activity.",
        nextAction: "No score action. Continue collecting real activity without synthesizing events.",
      };
    case "missing_producer":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "source_connectivity",
        scoreDimensionsAffected: ["sourceHealth", "evidenceCompleteness"],
        scorePenalty: 6,
        countsAsRegression: true,
        reason: "A required event producer is absent, so source and evidence coverage are incomplete.",
        nextAction: "Add or reconnect the missing producer before classifying this lane as future activity.",
      };
    case "missing_bridge":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "bridge_connectivity",
        scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
        scorePenalty: 5,
        countsAsRegression: true,
        reason: "A producer exists but the canonical bridge is missing.",
        nextAction: "Wire the canonical bridge from producer event to envelope and downstream consumers.",
      };
    case "missing_materializer":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "materializer_connectivity",
        scoreDimensionsAffected: ["evidenceCompleteness", "runtimeHealth"],
        scorePenalty: 4,
        countsAsRegression: true,
        reason: "The envelope exists but the materializer lane is not mapped.",
        nextAction: "Map the materializer or archive the lane with a non-score-impacting classification.",
      };
    case "missing_metric_consumer":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "metric_consumer_connectivity",
        scoreDimensionsAffected: ["evidenceCompleteness", "runtimeHealth"],
        scorePenalty: 4,
        countsAsRegression: true,
        reason: "A translated event has no metric consumer.",
        nextAction: "Connect the person/global metric consumer or mark the metric intentionally unavailable.",
      };
    case "stale_artifact":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "stale_score_evidence",
        scoreDimensionsAffected: ["freshness", "regressionRisk"],
        scorePenalty: 3,
        countsAsRegression: true,
        reason: "Score-impacting evidence is stale relative to the current code.",
        nextAction: "Refresh the stale score-impacting artifact with the targeted validator.",
      };
    case "blocked_formal_evidence":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "formal_runtime_evidence",
        scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"],
        scorePenalty: 0,
        countsAsRegression: false,
        reason: "A formal provider, runtime, or admin gate still needs real evidence; it is not missing activity.",
        nextAction: "Attach the required formal evidence through the approved non-production-read lane.",
      };
    case "cost_owner_review":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "cost_owner_review",
        scoreDimensionsAffected: ["costRisk"],
        scorePenalty: 0,
        countsAsRegression: false,
        reason: "Cost risk is waiting on owner review, not event activity.",
        nextAction: "Complete the cost owner-review lane without mutating runtime cost surfaces.",
      };
    case "visual_operator_final":
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "outside_codex_score",
        scoreDimensionsAffected: [],
        scorePenalty: 0,
        countsAsRegression: false,
        reason: "Operator visual checks remain outside the Codex score stack.",
        nextAction: "Track visual confirmation separately from beta score penalties.",
      };
    default:
      return {
        signalId: input.signalId,
        classification: input.classification,
        blockerType: "unsafe_unknown",
        scoreDimensionsAffected: ["evidenceCompleteness"],
        scorePenalty: 2,
        countsAsRegression: true,
        reason: "Signal classification is unknown and cannot be made score-neutral safely.",
        nextAction: "Classify the signal before score impact is adjusted.",
      };
  }
}

function classificationForGroup(group: NonEventScoreGroupInput): NonEventScoreClassification {
  const rootCause = String(group.rootCause ?? group.groupId).toLowerCase();
  if (group.actionability === "quiet_future_activity" || rootCause.includes("future_activity")) return "quiet_future_activity";
  if (rootCause.includes("missing_producer")) return "missing_producer";
  if (rootCause.includes("missing_bridge")) return "missing_bridge";
  if (rootCause.includes("missing_materializer")) return "missing_materializer";
  if (rootCause.includes("missing_metric")) return "missing_metric_consumer";
  if (rootCause.includes("stale")) return "stale_artifact";
  if (group.actionability === "formal_gate" || rootCause.includes("formal") || rootCause.includes("blocked_formal")) return "blocked_formal_evidence";
  return "unsafe_unknown";
}

export function summarizeNonEventScorePolicy(input: { groups?: readonly NonEventScoreGroupInput[] } = {}): NonEventScorePolicySummary {
  const groups = input.groups ?? [];
  const quietFutureActivityCount = groups
    .filter((group) => classificationForGroup(group) === "quiet_future_activity")
    .reduce((total, group) => total + Math.max(0, group.count), 0);
  const actionableGroups = groups.filter((group) =>
    ["fix_now", "score_impacting", "evidence_required", "formal_gate"].includes(group.actionability));
  const scoreDragGroups = actionableGroups.filter((group) =>
    (group.estimatedPointImpact ?? 0) > 0 || normalizeDimensions(group.scoreDimensionsAffected).length > 0);
  const nonEventScorePenaltyCount = groups.filter((group) => {
    const impact = classifyNonEventScoreImpact({
      signalId: group.groupId,
      classification: classificationForGroup(group),
    });
    return impact.blockerType === "non_event"
      && ((group.estimatedPointImpact ?? 0) > 0 || normalizeDimensions(group.scoreDimensionsAffected).length > 0);
  }).length;

  return {
    quietFutureActivityCount,
    actionableSignalGroupCount: actionableGroups.length,
    scoreDragSignalGroupCount: scoreDragGroups.length,
    nonEventScorePenaltyCount,
    usesActionableGroups: true,
  };
}

const DIMENSION_REASONS: Record<ScoreReportDimension, Omit<ScoreDimensionExplanation, "before" | "after" | "status">> = {
  sourceHealth: {
    target: 80,
    blockerType: "source_connectivity",
    reason: "Source health is limited only by source scanner or missing producer connectivity issues.",
    nextExactAction: "Reconnect missing producers or resolve source scanner findings for affected paths.",
  },
  runtimeHealth: {
    target: 80,
    blockerType: "formal_runtime_evidence",
    reason: "Runtime health is below target because formal runtime/admin evidence remains incomplete, not because future activity is absent.",
    nextExactAction: "Attach approved runtime/provider/admin evidence without promoting local validators to deployed proof.",
  },
  evidenceCompleteness: {
    target: 80,
    blockerType: "formal_runtime_evidence",
    reason: "Evidence completeness is below target because required formal evidence gates are incomplete, not because activity is missing.",
    nextExactAction: "Complete the exact formal evidence gates listed in the beta score report.",
  },
  freshness: {
    target: 80,
    blockerType: "stale_score_evidence",
    reason: "Freshness is below target because score-impacting evidence artifacts are stale or head-mismatched.",
    nextExactAction: "Refresh the stale score-impacting artifacts with targeted validators.",
  },
  costRisk: {
    target: 80,
    blockerType: "cost_owner_review",
    reason: "Cost risk is below target because owner-review cost lanes remain open.",
    nextExactAction: "Resolve owner-review cost lanes without touching payment or GumDrop runtime math.",
  },
  regressionRisk: {
    target: 80,
    blockerType: "stale_score_evidence",
    reason: "Regression risk is below target because stale artifacts or high-blast source changes need refreshed evidence.",
    nextExactAction: "Refresh targeted evidence for changed high-blast files and rerun the score validator.",
  },
  overallHealthScore: {
    target: 80,
    blockerType: "formal_runtime_evidence",
    reason: "Overall health follows the weighted component dimensions and launch cap.",
    nextExactAction: "Raise the below-target component dimensions before treating overall health as solved.",
  },
};

export function buildBelowTargetDimensionExplanations(input: {
  metrics: Record<ScoreReportDimension, number>;
  previousMetrics?: Partial<Record<ScoreReportDimension, number>>;
  target?: number;
}): Record<ScoreReportDimension, ScoreDimensionExplanation> {
  const target = input.target ?? 80;
  const result = {} as Record<ScoreReportDimension, ScoreDimensionExplanation>;
  for (const dimension of Object.keys(DIMENSION_REASONS) as ScoreReportDimension[]) {
    const after = input.metrics[dimension];
    const template = DIMENSION_REASONS[dimension];
    result[dimension] = {
      before: input.previousMetrics?.[dimension],
      after,
      target: target as 80,
      status: after >= target ? "meets_target" : "below_target",
      blockerType: template.blockerType,
      reason: after >= target ? "Dimension meets target." : template.reason,
      nextExactAction: after >= target ? "No score action needed for this dimension." : template.nextExactAction,
    };
  }
  return result;
}

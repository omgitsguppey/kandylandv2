import type { PublicBetaCostReadiness } from "../agent-score/core";
import { scoreCostReadiness } from "../agent-score/evidence-quality";
import {
  classifyCostOwnerReviewLanes,
  costOwnerReviewLanesToScoreInput,
  type CostOwnerReviewLane,
  type CostOwnerReviewLaneMap,
  type CostOwnerReviewSourceInput,
  type CostOwnerReviewStatus,
} from "./cost-owner-review-classifier";

export type CostRiskEvidenceStatus =
  | CostOwnerReviewStatus
  | "source_ready_retry_storm_guarded"
  | "source_ready_batched_or_cached";

export type CostRiskLaneId =
  | "cloudRun"
  | "cloudSqlDataConnect"
  | "geminiCloudAssistVertex"
  | "route4xx"
  | "bigQuery"
  | "analyticsIngestRetryStorms"
  | "scheduledRuntimeJobs"
  | "adminAnalyticsDebugDefaultLoad";

export type CostRiskEvidenceLane = CostOwnerReviewLane & {
  status: CostRiskEvidenceStatus;
  scoreDimension: "costRisk";
  scoreImpact: "source_credit" | "external_review_remaining" | "action_required";
};

export type CostRiskEvidenceLaneMap = Record<CostRiskLaneId, CostRiskEvidenceLane>;

export type CostRiskScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

export type CostRiskEvidenceReport = {
  generatedAtUtc: string;
  reportKey: "cost-risk-owner-review-closure";
  currentHead: string;
  status: "pass" | "fail";
  lanes: CostRiskEvidenceLaneMap;
  costReadiness: PublicBetaCostReadiness;
  costRiskScore: number;
  costRiskExplanation: string;
  externalBillingReviewed: false;
  externalBillingRemaining: string[];
  sourceGuardedLaneCount: number;
  ownerReviewLaneCount: number;
  scoreBefore: CostRiskScoreDimensions;
  scoreAfter: CostRiskScoreDimensions;
  dirtyFilesClassification: Array<{
    path: string;
    status: string;
    classification: string;
  }>;
  staleLogicClassification: Array<{
    reference: string;
    classification: "external_billing_required" | "source_guarded" | "obsolete_removed" | "still_required" | "unsafe_unknown";
    reason: string;
  }>;
  nextExactSteps: string[];
  validationFailures: string[];
};

function withScoreImpact(lane: CostOwnerReviewLane): CostRiskEvidenceLane {
  const scoreImpact = lane.status === "cost_review_required" || lane.status === "blocked" || lane.status === "unknown"
    ? "action_required"
    : lane.externalReviewRequired
      ? "external_review_remaining"
      : "source_credit";
  return {
    ...lane,
    status: lane.status as CostRiskEvidenceStatus,
    scoreDimension: "costRisk",
    scoreImpact,
  };
}

function mapLanes(lanes: CostOwnerReviewLaneMap): CostRiskEvidenceLaneMap {
  return {
    cloudRun: withScoreImpact(lanes.cloudRun),
    cloudSqlDataConnect: withScoreImpact(lanes.cloudSqlDataConnect),
    geminiCloudAssistVertex: withScoreImpact(lanes.geminiCloudAssistVertex),
    route4xx: withScoreImpact(lanes.route4xx),
    bigQuery: withScoreImpact(lanes.bigQuery),
    analyticsIngestRetryStorms: withScoreImpact(lanes.analyticsIngestRetryStorms),
    scheduledRuntimeJobs: withScoreImpact(lanes.scheduledRuntimeJobs),
    adminAnalyticsDebugDefaultLoad: withScoreImpact(lanes.adminAnalyticsDebugDefaultLoad),
  };
}

function cloneDimensions(input?: Partial<CostRiskScoreDimensions>): CostRiskScoreDimensions {
  return {
    sourceHealth: input?.sourceHealth ?? 0,
    runtimeHealth: input?.runtimeHealth ?? 0,
    evidenceCompleteness: input?.evidenceCompleteness ?? 0,
    freshness: input?.freshness ?? 0,
    costRisk: input?.costRisk ?? 0,
    regressionRisk: input?.regressionRisk ?? 0,
    overallHealthScore: input?.overallHealthScore ?? 0,
  };
}

function estimateOverallAfter(before: CostRiskScoreDimensions, afterCostRisk: number) {
  const delta = afterCostRisk - before.costRisk;
  return Math.round((before.overallHealthScore + (delta / 7)) * 100) / 100;
}

export function classifyCostRiskEvidence(input: CostOwnerReviewSourceInput) {
  const ownerReviewLanes = classifyCostOwnerReviewLanes(input);
  const lanes = mapLanes(ownerReviewLanes);
  const costReadiness = costOwnerReviewLanesToScoreInput(ownerReviewLanes);
  const score = scoreCostReadiness(costReadiness);
  return { lanes, costReadiness, score };
}

export function buildCostRiskEvidenceReport(input: {
  generatedAtUtc: string;
  currentHead: string;
  costInput: CostOwnerReviewSourceInput;
  scoreBefore?: Partial<CostRiskScoreDimensions>;
  dirtyFilesClassification?: CostRiskEvidenceReport["dirtyFilesClassification"];
}): CostRiskEvidenceReport {
  const { lanes, costReadiness, score } = classifyCostRiskEvidence(input.costInput);
  const laneValues = Object.values(lanes);
  const before = cloneDimensions(input.scoreBefore);
  const after = cloneDimensions({
    ...before,
    costRisk: score.score,
    overallHealthScore: estimateOverallAfter(before, score.score),
  });
  const externalBillingRemaining = laneValues
    .filter((lane) => lane.externalReviewRequired)
    .map((lane) => lane.id);
  const report: CostRiskEvidenceReport = {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "cost-risk-owner-review-closure",
    currentHead: input.currentHead,
    status: "pass",
    lanes,
    costReadiness,
    costRiskScore: score.score,
    costRiskExplanation: `Cost risk score ${score.score} uses source guard evidence for guarded lanes, keeps external billing review separate, and does not claim provider billing proof or dollar savings.`,
    externalBillingReviewed: false,
    externalBillingRemaining,
    sourceGuardedLaneCount: laneValues.filter((lane) => lane.sourceGuarded).length,
    ownerReviewLaneCount: externalBillingRemaining.length,
    scoreBefore: before,
    scoreAfter: after,
    dirtyFilesClassification: input.dirtyFilesClassification ?? [],
    staleLogicClassification: [
      {
        reference: "cost_review_required",
        classification: "still_required",
        reason: "Used only when source guards are missing or stale.",
      },
      {
        reference: "owner_review_external_billing_required",
        classification: "external_billing_required",
        reason: "External provider billing review remains outside source-only validation.",
      },
      {
        reference: "source_guarded_external_review_remaining",
        classification: "source_guarded",
        reason: "Source guards are present but provider billing proof is not claimed.",
      },
    ],
    nextExactSteps: externalBillingRemaining.map((laneId) => `${laneId}: attach external billing/provider evidence before claiming full cost closure.`),
    validationFailures: [],
  };
  if (report.nextExactSteps.length === 0) {
    report.nextExactSteps = ["Keep source cost guards current and rerun score:beta after future cost-sensitive code changes."];
  }
  report.validationFailures = validateCostRiskEvidenceReport(report);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateCostRiskEvidenceReport(report: CostRiskEvidenceReport) {
  const failures: string[] = [];
  const lanes = Object.values(report.lanes);
  const evidence = lanes.flatMap((lane) => lane.evidence).join("\n");
  if (report.reportKey !== "cost-risk-owner-review-closure") failures.push("reportKey must be cost-risk-owner-review-closure.");
  if (!report.currentHead) failures.push("currentHead missing.");
  if (report.externalBillingReviewed !== false) failures.push("external billing is marked reviewed without an evidence artifact.");
  if (/externalBillingReviewed=true|dollar savings|savings claimed/iu.test(evidence)) {
    failures.push("external billing review or dollar savings are claimed from source evidence.");
  }
  for (const lane of lanes) {
    if (lane.sourceGuarded && lane.status === "cost_review_required") {
      failures.push(`${lane.id} remains generic cost_review_required despite source guard evidence.`);
    }
    if (!lane.reason || !lane.nextAction) {
      failures.push(`${lane.id} lacks costRisk reason or next action.`);
    }
  }
  const cloudSql = report.lanes.cloudSqlDataConnect;
  if (cloudSql.sourceGuarded && cloudSql.status !== "source_ready_no_runtime_usage_detected") {
    failures.push("Cloud SQL/Data Connect source guard must remain no-runtime-usage, not a full pass.");
  }
  if (!report.lanes.route4xx.evidence.some((entry) => /retry4xxClassified=true/iu.test(entry))) {
    failures.push("Route 4xx lane ignores retry-storm diagnostics.");
  }
  if (!report.lanes.bigQuery.evidence.some((entry) => /watermarkDefined=true/iu.test(entry))
    || !report.lanes.bigQuery.evidence.some((entry) => /queryCostGuardDefined=true/iu.test(entry))) {
    failures.push("BigQuery guardrails are not represented.");
  }
  if (!report.costRiskExplanation.includes("external billing review separate")) {
    failures.push("costRisk explanation does not separate external billing review.");
  }
  if (!report.scoreBefore || !report.scoreAfter || typeof report.scoreAfter.costRisk !== "number") {
    failures.push("score dimension before/after is missing.");
  }
  if (report.dirtyFilesClassification.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files include unsafe_unknown classifications.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) {
    failures.push("nextExactSteps missing.");
  }
  return failures;
}

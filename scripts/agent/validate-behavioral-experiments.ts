import fs from "node:fs";
import path from "node:path";

import {
  BEHAVIORAL_EXPERIMENT_METRICS,
  DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE,
  DEFAULT_RISKY_RANKING_CONTROL_TRAFFIC_PERCENT,
  DEFAULT_RISKY_RANKING_VARIANT_TRAFFIC_PERCENT,
  computeBehavioralExperimentLift,
  evaluateBehavioralExperiment,
  normalizeBehavioralExperimentConfig,
  validateBehavioralExperimentConfig,
  validateNoFutureEventsInTraining,
} from "../../src/lib/features/experiments/behavioral-experiment-contract";
import {
  assignBehavioralExperiment,
  resolveBehavioralExperimentUnit,
} from "../../src/lib/features/experiments/experiment-assignment";

const repoRoot = process.cwd();

type Check = {
  label: string;
  pass: boolean;
  detail: string;
};

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function check(label: string, pass: boolean, detail: string): Check {
  return { label, pass, detail };
}

function main() {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const contractSource = read("src/lib/features/experiments/behavioral-experiment-contract.ts");
  const assignmentSource = read("src/lib/features/experiments/experiment-assignment.ts");
  const docs = read("docs/agent-truth/behavioral-experiments.md");
  const calibrationDocs = read("docs/agent-truth/behavioral-math-calibration.md");
  const rankingDocs = read("docs/agent-truth/recommendation-ranking.md");
  const validatorMap = read("agent/context/validator-map.json");
  const behavioralDoctrine = read("docs/doctrine/surfaces/behavioral-intelligence.md");
  const requiredMetrics = [
    "purchase_7d",
    "unlock_24h",
    "watch_completion",
    "return_7d",
    "negative_feedback",
    "support_complaints",
  ] as const;

  const assignedA = assignBehavioralExperiment({
    experimentId: "ranking_holdout_v1",
    userId: "user_123",
    anonymousVisitorId: "anon_ignored",
    sessionId: "session_ignored",
  });
  const assignedB = assignBehavioralExperiment({
    experimentId: "ranking_holdout_v1",
    userId: "user_123",
    anonymousVisitorId: "different",
    sessionId: "different",
  });
  const guestUnit = resolveBehavioralExperimentUnit({
    anonymousVisitorId: "anon_123",
    sessionId: "session_123",
  });
  const sessionUnit = resolveBehavioralExperimentUnit({
    sessionId: "session_123",
  });
  const riskyConfig = normalizeBehavioralExperimentConfig({
    experimentId: "ranking_holdout_v1",
    name: "Ranking Holdout",
    owner: "behavioral-intelligence",
    riskyRankingChange: true,
    successMetric: "purchase_7d",
    rollbackRule: "Rollback if guardrail metrics worsen.",
  });
  const invalidConfig = validateBehavioralExperimentConfig({
    experimentId: "missing_success",
    name: "Missing Success",
    owner: "behavioral-intelligence",
  });
  const lift = computeBehavioralExperimentLift(0.12, 0.10);
  const lowSample = evaluateBehavioralExperiment({
    config: {
      experimentId: "low_sample",
      name: "Low Sample",
      owner: "behavioral-intelligence",
      successMetric: "unlock_24h",
      rollbackRule: "Rollback on worsened guardrails.",
    },
    control: {
      sampleSize: 90,
      rates: {
        unlock_24h: 0.10,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    variant: {
      sampleSize: 90,
      rates: {
        unlock_24h: 0.14,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
  });
  const activatable = evaluateBehavioralExperiment({
    config: {
      experimentId: "good_lift",
      name: "Good Lift",
      owner: "behavioral-intelligence",
      successMetric: "purchase_7d",
      minimumLift: 0.05,
      rollbackRule: "Rollback if negative feedback or support complaints worsen.",
    },
    control: {
      sampleSize: 180,
      rates: {
        purchase_7d: 0.10,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    variant: {
      sampleSize: 40,
      rates: {
        purchase_7d: 0.12,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    confidenceInterval: {
      metric: "purchase_7d",
      lower: 0.01,
      upper: 0.10,
    },
  });
  const guardrailFailed = evaluateBehavioralExperiment({
    config: {
      experimentId: "bad_guardrail",
      name: "Bad Guardrail",
      owner: "behavioral-intelligence",
      successMetric: "purchase_7d",
      rollbackRule: "Rollback on worsened support complaints.",
    },
    control: {
      sampleSize: 180,
      rates: {
        purchase_7d: 0.10,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    variant: {
      sampleSize: 40,
      rates: {
        purchase_7d: 0.14,
        negative_feedback: 0.03,
        support_complaints: 0.02,
      },
    },
  });
  const futureLeak = validateNoFutureEventsInTraining({
    trainingCutoffMs: 1_700_000_000_000,
    trainingEventTimestampsMs: [1_699_999_999_999, 1_700_000_000_001],
  });
  const ciFailed = evaluateBehavioralExperiment({
    config: {
      experimentId: "ci_crosses",
      name: "CI Crosses",
      owner: "behavioral-intelligence",
      successMetric: "return_7d",
      rollbackRule: "Rollback if return lift is not significant.",
    },
    control: {
      sampleSize: 180,
      rates: {
        return_7d: 0.20,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    variant: {
      sampleSize: 40,
      rates: {
        return_7d: 0.23,
        negative_feedback: 0.02,
        support_complaints: 0.01,
      },
    },
    confidenceInterval: {
      metric: "return_7d",
      lower: -0.01,
      upper: 0.08,
    },
  });

  const checks: Check[] = [
    check(
      "package script exists",
      packageJson.scripts?.["check:behavioral-experiments"] === "tsx scripts/agent/validate-behavioral-experiments.ts",
      "Package must expose the targeted behavioral experiment validator.",
    ),
    check(
      "created files exist",
      exists("src/lib/features/experiments/behavioral-experiment-contract.ts")
        && exists("src/lib/features/experiments/experiment-assignment.ts")
        && exists("scripts/agent/validate-behavioral-experiments.ts")
        && exists("docs/agent-truth/behavioral-experiments.md"),
      "Experiment contract, assignment helper, validator, and doctrine doc must exist.",
    ),
    check(
      "metrics are complete",
      requiredMetrics.every((metric) => BEHAVIORAL_EXPERIMENT_METRICS.includes(metric) && contractSource.includes(metric)),
      "Experiment metrics must cover purchases, unlocks, watch completion, retention, negative feedback, and support complaints.",
    ),
    check(
      "deterministic assignment formula exists",
      assignmentSource.includes("hashExperimentAssignmentKey(`${unit.unitId}${input.experimentId}`) % 100")
        && assignedA.bucket === assignedB.bucket
        && assignedA.variant === assignedB.variant,
      "Assignment must use hash(userOrSessionId + experimentId) % 100 and remain stable.",
    ),
    check(
      "experiment unit precedence is correct",
      assignedA.unitType === "userId"
        && guestUnit?.unitType === "anonymousVisitorId"
        && sessionUnit?.unitType === "sessionId",
      "Assignment must use userId first, anonymousVisitorId for guests, then sessionId.",
    ),
    check(
      "risky ranking default is 90/10",
      DEFAULT_RISKY_RANKING_CONTROL_TRAFFIC_PERCENT === 90
        && DEFAULT_RISKY_RANKING_VARIANT_TRAFFIC_PERCENT === 10
        && riskyConfig.controlTrafficPercent === 90
        && riskyConfig.variantTrafficPercent === 10
        && assignmentSource.includes("deterministic_baseline_holdout"),
      "Risky ranking changes must default to a 90% deterministic baseline holdout and 10% variant lane.",
    ),
    check(
      "config requires success and rollback",
      invalidConfig.valid === false
        && invalidConfig.errors.some((error) => error.includes("successMetric"))
        && invalidConfig.errors.some((error) => error.includes("rollbackRule")),
      "No experiment may run without success metric and rollback rule.",
    ),
    check(
      "lift formula is exact",
      contractSource.includes("(safeVariant - safeControl) / Math.max(safeControl, epsilon)")
        && Math.abs(lift - 0.2) < 0.000001,
      "Lift must equal (metricVariant - metricControl) / max(metricControl, epsilon).",
    ),
    check(
      "minimum sample is enforced",
      DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE === 200
        && lowSample.canActivate === false
        && lowSample.status === "needs_more_sample",
      "Activation must require at least 200 users or sessions.",
    ),
    check(
      "activation requires lift and clean guardrails",
      activatable.canActivate === true
        && activatable.status === "ready_to_activate"
        && activatable.lift > 0.05,
      "Activation must require lift above threshold with no worsened negative feedback or complaints.",
    ),
    check(
      "negative guardrails block activation",
      guardrailFailed.canActivate === false
        && guardrailFailed.status === "guardrail_failed"
        && guardrailFailed.guardrails.some((guardrail) => guardrail.metric === "negative_feedback" && guardrail.worsened)
        && guardrailFailed.guardrails.some((guardrail) => guardrail.metric === "support_complaints" && guardrail.worsened),
      "Negative feedback and support complaints must not worsen.",
    ),
    check(
      "future-event leakage is blocked",
      futureLeak.valid === false
        && futureLeak.futureEventCount === 1
        && contractSource.includes("timestampMs > cutoffMs"),
      "Training validation must reject future events.",
    ),
    check(
      "confidence interval crossing zero blocks activation",
      ciFailed.canActivate === false
        && ciFailed.status === "ci_crosses_zero"
        && ciFailed.confidenceIntervalCrossesZero,
      "If a confidence interval is provided, activation must fail when it crosses zero.",
    ),
    check(
      "docs and validator map updated",
      docs.includes("Default rollout")
        && docs.includes("90%")
        && docs.includes("10%")
        && docs.includes("Do not use future events")
        && calibrationDocs.includes("Causal Holdout Validation")
        && rankingDocs.includes("Causal holdouts")
        && behavioralDoctrine.includes("check:behavioral-experiments")
        && validatorMap.includes("check:behavioral-experiments"),
      "Docs, behavioral doctrine, and compact validator map must expose causal holdout validation.",
    ),
  ];

  checks.forEach((entry) => {
    console.log(`${entry.pass ? "PASS" : "FAIL"} ${entry.label}: ${entry.detail}`);
  });

  const failures = checks.filter((entry) => !entry.pass);
  if (failures.length > 0) {
    console.error(`Behavioral experiment validation failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Behavioral experiment validation passed.");
  }
}

main();

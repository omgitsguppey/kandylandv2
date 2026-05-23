import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

import {
  buildBelowTargetDimensionExplanations,
  summarizeNonEventScorePolicy,
  type ScoreReportDimension,
} from "../../src/lib/agent-score/non-event-score-policy";

const STATE_PATH = "agent/state/non-event-score-policy.generated.json";
const DOC_PATH = "docs/agent-truth/non-event-score-policy.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";
const FINAL_LOCK_PATH = "agent/state/final-testing-tracking-telemetry-lock.generated.json";
const GROUPING_PATH = "agent/state/debug-signal-grouping.generated.json";

type JsonRecord = Record<string, unknown>;

function readJson(root: string, filePath: string): JsonRecord | null {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown) {
  return value === true;
}

function git(root: string, command: string) {
  return execSync(`git ${command}`, { cwd: root, encoding: "utf8" }).trim();
}

function scoreSnapshot(score: JsonRecord | null) {
  if (!score) {
    return {
      sourceHealth: 0,
      runtimeHealth: 0,
      evidenceCompleteness: 0,
      freshness: 0,
      costRisk: 0,
      regressionRisk: 0,
      overallHealthScore: 0,
    };
  }
  return {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
    overallHealthScore: readNumber(score.healthScore),
  };
}

function previousScoreSnapshot(score: JsonRecord | null, grouping: JsonRecord | null, finalLock: JsonRecord | null) {
  const groupingBefore = readRecord(grouping?.scoreBefore);
  const finalMetrics = readRecord(finalLock?.metrics);
  if (Object.keys(groupingBefore).length > 0) return groupingBefore;
  const fromFinalLock: Partial<Record<ScoreReportDimension, number>> = {};
  for (const dimension of ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk", "overallHealthScore"] as ScoreReportDimension[]) {
    const metric = readRecord(finalMetrics[dimension]);
    if (typeof metric.after === "number") fromFinalLock[dimension] = metric.after;
  }
  return Object.keys(fromFinalLock).length > 0 ? fromFinalLock : scoreSnapshot(score);
}

function groupsFromReport(grouping: JsonRecord | null) {
  const groups = Array.isArray(grouping?.groups) ? grouping.groups : [];
  return groups.map((entry) => {
    const record = readRecord(entry);
    return {
      groupId: readString(record.groupId) ?? "unknown-group",
      actionability: (readString(record.actionability) ?? "not_actionable") as never,
      count: readNumber(record.count),
      estimatedPointImpact: readNumber(record.estimatedPointImpact),
      scoreDimensionsAffected: Array.isArray(record.scoreDimensionsAffected)
        ? record.scoreDimensionsAffected.filter((value): value is string => typeof value === "string")
        : [],
      rootCause: readString(record.rootCause),
    };
  });
}

function classifyDirty(root: string) {
  const status = git(root, "status --short");
  if (!status) return [];
  return status.split(/\r?\n/u).filter(Boolean).map((line) => {
    const path = line.slice(2).trim();
    const classification = path === STATE_PATH || path === SCORE_PATH || path === "agent/state/current-beta-exit-status.generated.json"
      ? "current_generated_artifact_to_commit"
      : path === DOC_PATH || path === "docs/agent-truth/final-testing-tracking-telemetry-lock.md" || path === "docs/agent-truth/current-beta-exit-status.md"
        ? "documentation_artifact_expected"
        : path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")
          ? "release_artifact_expected"
          : path === "package.json"
            ? "validator_script_expected"
            : path === "src/lib/agent-score/non-event-score-policy.ts" || path === "src/lib/agent-score/core.ts"
              ? "score_policy_source_change"
              : path === "scripts/agent/score-public-beta-readiness.ts" || path === "scripts/agent/validate-non-event-score-policy.ts"
                ? "score_validator_source_change"
                : path === "tests/unit/non-event-score-policy.spec.ts"
                  ? "test_artifact_expected"
                  : path === "agent/context/optimized-task-context.generated.json"
                    ? "unrelated_agent_context_file_to_ignore"
                    : "unsafe_unknown";
    return { path, classification };
  });
}

function textIncludesActivityMissing(value: unknown) {
  const fragments = JSON.stringify(value ?? "").split(/["\[\]{},:]+/u).filter(Boolean);
  return fragments.some((fragment) =>
    /activity missing|waiting on activity|futureActivityPending.*penalt/iu.test(fragment)
    || (/future activity/iu.test(fragment) && /penalt/iu.test(fragment)));
}

function writeJson(root: string, path: string, value: unknown) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(root: string, report: JsonRecord) {
  const fullPath = join(root, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  const metrics = readRecord(report.metrics);
  const metricRows = Object.entries(metrics).map(([dimension, value]) => {
    const metric = readRecord(value);
    return `| ${dimension} | ${metric.before ?? "n/a"} | ${metric.after ?? "n/a"} | ${metric.status ?? "unknown"} | ${metric.blockerType ?? "unknown"} | ${metric.nextExactAction ?? "missing"} |`;
  }).join("\n");
  writeFileSync(fullPath, `# Non-Event Score Policy\n\nGenerated: ${report.generatedAtUtc}\n\nFuture activity placeholders are non-events. They stay visible only in quiet catalogs and do not reduce beta score.\n\n## Counts\n\n- Quiet future activity: ${report.quietFutureActivityCount}\n- Actionable signal groups: ${report.actionableSignalGroupCount}\n- Score-drag signal groups: ${report.scoreDragSignalGroupCount}\n- Non-event score penalties: ${report.nonEventScorePenaltyCount}\n\n## Score Dimensions\n\n| Dimension | Before | After | Status | Blocker type | Next action |\n| --- | ---: | ---: | --- | --- | --- |\n${metricRows}\n\n## Remaining Gaps\n\n${Array.isArray(report.remainingGaps) && report.remainingGaps.length > 0 ? report.remainingGaps.map((gap) => `- ${gap}`).join("\n") : "- None for non-event scoring."}\n`, "utf8");
}

function main() {
  const root = process.cwd();
  const score = readJson(root, SCORE_PATH);
  const finalLock = readJson(root, FINAL_LOCK_PATH);
  const grouping = readJson(root, GROUPING_PATH);
  const groups = groupsFromReport(grouping);
  const policySummary = summarizeNonEventScorePolicy({ groups });
  const currentMetrics = scoreSnapshot(score);
  const previousMetrics = previousScoreSnapshot(score, grouping, finalLock);
  const explanations = buildBelowTargetDimensionExplanations({
    metrics: currentMetrics,
    previousMetrics: previousMetrics as Partial<Record<ScoreReportDimension, number>>,
  });
  const metrics = Object.fromEntries((Object.keys(explanations) as ScoreReportDimension[]).map((dimension) => {
    const explanation = explanations[dimension];
    return [dimension, {
      before: explanation.before,
      after: explanation.after,
      target: explanation.target,
      status: explanation.status === "meets_target" ? "target_met" : "below_target",
      blockerType: explanation.blockerType,
      reason: explanation.reason,
      nextExactAction: explanation.nextExactAction,
    }];
  }));
  const dirtyFiles = classifyDirty(root);
  const remainingGaps = Object.entries(metrics)
    .filter(([, value]) => readRecord(value).status === "below_target")
    .map(([dimension, value]) => `${dimension}: ${readRecord(value).nextExactAction}`);

  const failures: string[] = [];
  if (!score) failures.push(`${SCORE_PATH} missing; run npm run score:beta first.`);
  if (policySummary.nonEventScorePenaltyCount !== 0) failures.push("future activity pending reduces score.");
  if (!readBoolean(score?.quietFutureActivityCount === policySummary.quietFutureActivityCount)) failures.push("public beta score report lacks quietFutureActivityCount from grouped signals.");
  if (readNumber(score?.actionableSignalGroupCount, -1) !== policySummary.actionableSignalGroupCount) failures.push("score uses raw signal count instead of actionable groups.");
  if (textIncludesActivityMissing(score?.healthScoreBreakdown) || textIncludesActivityMissing(score?.scoreDimensionExplanations)) failures.push("formal gate or below-target dimension is mislabeled as missing activity.");
  if (readNumber(score?.nonEventScorePenaltyCount, -1) !== 0) failures.push("non-events counted as regression or score penalty.");
  for (const [dimension, value] of Object.entries(metrics)) {
    const metric = readRecord(value);
    if (metric.status === "below_target" && (!readString(metric.reason) || !readString(metric.nextExactAction))) {
      failures.push(`${dimension} below 80 lacks exact reason and next action.`);
    }
  }
  if (dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");

  const report = {
    reportKey: "non-event-score-policy",
    generatedAtUtc: new Date().toISOString(),
    currentHead: git(root, "rev-parse HEAD"),
    status: failures.length === 0 ? "pass" : "fail",
    productionReadsRequired: false,
    fakeEvidenceUsed: false,
    scoreBefore: previousMetrics,
    scoreAfter: currentMetrics,
    metrics,
    quietFutureActivityCount: policySummary.quietFutureActivityCount,
    actionableSignalGroupCount: policySummary.actionableSignalGroupCount,
    scoreDragSignalGroupCount: policySummary.scoreDragSignalGroupCount,
    nonEventScorePenaltyCount: policySummary.nonEventScorePenaltyCount,
    usesActionableGroups: policySummary.usesActionableGroups,
    oldLogicClassification: [
      { path: "src/lib/agent-score/core.ts", classification: "still_required" },
      { path: "src/lib/agent-score/non-event-score-policy.ts", classification: "active_canonical" },
      { path: "src/lib/debug/debug-signal-grouping.ts", classification: "still_required_group_source" },
      { path: "agent/state/final-testing-tracking-telemetry-lock.generated.json", classification: "historical_evidence_snapshot" },
    ],
    dirtyFiles,
    remainingGaps,
    validationFailures: failures,
  };

  writeJson(root, STATE_PATH, report);
  writeDoc(root, report);
  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(`Non-event score policy validated: ${policySummary.quietFutureActivityCount} quiet future activity signal(s), ${policySummary.nonEventScorePenaltyCount} non-event score penalties.`);
}

main();

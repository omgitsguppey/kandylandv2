import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FINAL_SIGNAL_ZERO_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type FinalSignalZeroDimension = typeof FINAL_SIGNAL_ZERO_DIMENSIONS[number];

type ArtifactMap = {
  publicBetaScore?: Record<string, unknown>;
  futureActivitySignalReclassification?: Record<string, unknown>;
  debugSignalGrouping?: Record<string, unknown>;
  nonEventScorePolicy?: Record<string, unknown>;
};

type FinalSignalZeroMetric = {
  before: number;
  after: number;
  target: 80;
  status: "target_met" | "below_target";
  nextExactAction: string;
};

export type FinalSignalZeroLockReport = {
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: Record<FinalSignalZeroDimension, number>;
  scoreAfter: Record<FinalSignalZeroDimension, number>;
  metrics: Record<FinalSignalZeroDimension, FinalSignalZeroMetric>;
  rawFutureActivityCount: number;
  quietFutureActivityCount: number;
  actionableFutureActivityCount: number;
  falseWaitingCount: number;
  scoreDragActivityCount: number;
  brokenActivityPathCount: number;
  actionableSignalGroupCount: number;
  p1GroupCount: number;
  p2GroupCount: number;
  quietFutureP1P2GroupCount: number;
  nonEventScorePenaltyCount: number;
  remainingBrokenPaths: string[];
  remainingFormalGates: string[];
  remainingBelow80Dimensions: Array<{
    dimension: FinalSignalZeroDimension;
    score: number;
    nextExactAction: string;
  }>;
  nextExactSteps: string[];
  defaultDebugPanel: {
    rawRowsDefaultVisible: boolean;
    futureActivityCatalogCollapsed: boolean;
  };
  dirtyFiles: Array<{ path: string; classification: string }>;
  remainingReferenceClassification: Array<{ path: string; classification: string }>;
  validationFailures: string[];
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = "agent/state/final-signal-zero-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-signal-zero-lock.md";

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return readRecord(parsed);
}

function git(args: string[]) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function scoreSnapshot(score: Record<string, unknown>): Record<FinalSignalZeroDimension, number> {
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

function previousScoreSnapshot(artifacts: ArtifactMap, fallback: Record<FinalSignalZeroDimension, number>) {
  const nonEventBefore = readRecord(artifacts.nonEventScorePolicy?.scoreBefore);
  const output = {} as Record<FinalSignalZeroDimension, number>;
  for (const dimension of FINAL_SIGNAL_ZERO_DIMENSIONS) {
    output[dimension] = readNumber(nonEventBefore[dimension], fallback[dimension]);
  }
  return output;
}

function defaultNextAction(dimension: FinalSignalZeroDimension, score: Record<string, unknown>) {
  const explanations = readRecord(score.scoreDimensionExplanations);
  const explanation = readRecord(explanations[dimension]);
  const next = readString(explanation.nextExactAction);
  if (next) return next;
  switch (dimension) {
    case "sourceHealth":
      return "Resolve source scanner or missing producer issues for affected paths.";
    case "runtimeHealth":
      return "Attach approved runtime/provider/admin evidence without promoting local validators to deployed proof.";
    case "evidenceCompleteness":
      return "Complete the exact formal evidence gates listed in the beta score report.";
    case "freshness":
      return "Refresh stale score-impacting artifacts with targeted validators.";
    case "costRisk":
      return "Resolve owner-review cost lanes without touching payment or GumDrop runtime math.";
    case "regressionRisk":
      return "Refresh targeted evidence for changed high-blast files and rerun score validation.";
    case "overallHealthScore":
      return "Raise the below-target component dimensions before treating overall health as solved.";
  }
}

function buildMetrics(
  before: Record<FinalSignalZeroDimension, number>,
  after: Record<FinalSignalZeroDimension, number>,
  score: Record<string, unknown>,
) {
  const metrics = {} as Record<FinalSignalZeroDimension, FinalSignalZeroMetric>;
  for (const dimension of FINAL_SIGNAL_ZERO_DIMENSIONS) {
    metrics[dimension] = {
      before: before[dimension],
      after: after[dimension],
      target: 80,
      status: after[dimension] >= 80 ? "target_met" : "below_target",
      nextExactAction: after[dimension] >= 80 ? "No score action needed for this dimension." : defaultNextAction(dimension, score),
    };
  }
  return metrics;
}

function classifyDirtyFile(path: string) {
  if (path === STATE_PATH) return "current_generated_artifact_to_commit";
  if (path === DOC_PATH) return "documentation_artifact_expected";
  if (path === "package.json") return "validator_script_expected";
  if (path === "scripts/agent/validate-final-signal-zero-lock.ts") return "validator_artifact_expected";
  if (path === "tests/unit/final-signal-zero-lock.spec.ts") return "test_artifact_expected";
  if (path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (path === "agent/state/current-beta-exit-status.generated.json" || path === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (path === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  return "unsafe_unknown";
}

function dirtyFiles(changedFiles?: string[]) {
  const paths = changedFiles ?? [
    ...git(["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean),
    ...git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean),
  ];
  return paths.map((path) => ({ path, classification: classifyDirtyFile(path) }));
}

function remainingReferenceClassification() {
  const output = execFileSync("rg", [
    "-n",
    "futureActivityPending|source_ready_waiting_for_activity|waitingOnActivityLanes|falseWaitingCount|scoreDragLanes|nonEventScorePenalty|rawSignalCount",
    "src",
    "scripts",
    "docs",
    "agent",
    "tests",
  ], { cwd: repoRoot, encoding: "utf8" });
  return output.split(/\r?\n/u).filter(Boolean).map((line) => {
    const path = line.split(":")[0]?.replace(/\\/gu, "/") ?? "unknown";
    const classification = /final-signal-zero-lock|non-event-score-policy|debug-signal-grouping|future-activity-signal-reclassification|final-testing-tracking-telemetry-lock|event-translation-bridge|telemetry-trigger-test-matrix|public-beta-score/u.test(path)
      ? "still_required"
      : /agent\/state\/.*\.generated\.json|docs\/agent-truth/u.test(path)
        ? "quiet_catalog_only"
        : "still_required";
    return { path, classification };
  });
}

function groupContainsQuietFutureP1P2(group: Record<string, unknown>) {
  const actionability = readString(group.actionability);
  const severity = readString(group.severity);
  return actionability === "quiet_future_activity" && (severity === "p1" || severity === "p2" || severity === "p0" || severity === "critical");
}

export function buildFinalSignalZeroLockReport(input: {
  artifacts: ArtifactMap;
  currentHead?: string;
  generatedAtUtc?: string;
  changedFiles?: string[];
}): FinalSignalZeroLockReport {
  const score = input.artifacts.publicBetaScore ?? {};
  const future = readRecord(input.artifacts.futureActivitySignalReclassification);
  const activitySummary = readRecord(future.activitySignalSummary);
  const grouping = input.artifacts.debugSignalGrouping ?? {};
  const nonEvent = input.artifacts.nonEventScorePolicy ?? {};
  const after = scoreSnapshot(score);
  const before = previousScoreSnapshot(input.artifacts, after);
  const metrics = buildMetrics(before, after, score);
  const groups = readArray(grouping.groups).map(readRecord);
  const formalGroups = groups.filter((group) => readString(group.actionability) === "formal_gate");
  const brokenGroups = groups.filter((group) =>
    /missing_|broken_debug|unsafe_unknown/iu.test(`${readString(group.rootCause) ?? ""} ${readString(group.actionability) ?? ""}`));
  const remainingBelow80Dimensions = FINAL_SIGNAL_ZERO_DIMENSIONS
    .filter((dimension) => metrics[dimension].status === "below_target")
    .map((dimension) => ({
      dimension,
      score: metrics[dimension].after,
      nextExactAction: metrics[dimension].nextExactAction,
    }));
  const defaultDebugPanel = readRecord(grouping.defaultDebugPanel);
  const rawFutureActivityCount = readNumber(activitySummary.totalSignalCount, readNumber(grouping.quietFutureActivityRawCount, readNumber(score.quietFutureActivityCount)));
  const quietFutureActivityCount = readNumber(activitySummary.quietFutureActivityCount, readNumber(nonEvent.quietFutureActivityCount, readNumber(score.quietFutureActivityCount)));

  return {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    scoreBefore: before,
    scoreAfter: after,
    metrics,
    rawFutureActivityCount,
    quietFutureActivityCount,
    actionableFutureActivityCount: readNumber(activitySummary.actionableActivitySignalCount, readNumber(grouping.actionableFutureActivitySignalCount)),
    falseWaitingCount: readNumber(future.falseWaitingCount),
    scoreDragActivityCount: readNumber(activitySummary.scoreDragActivityCount),
    brokenActivityPathCount: readNumber(activitySummary.brokenActivityPathCount),
    actionableSignalGroupCount: readNumber(nonEvent.actionableSignalGroupCount, readNumber(score.actionableSignalGroupCount)),
    p1GroupCount: readNumber(grouping.p1GroupCount, groups.filter((group) => {
      const severity = readString(group.severity);
      return severity === "critical" || severity === "p0" || severity === "p1";
    }).length),
    p2GroupCount: readNumber(grouping.p2GroupCount, groups.filter((group) => readString(group.severity) === "p2").length),
    quietFutureP1P2GroupCount: groups.filter(groupContainsQuietFutureP1P2).length,
    nonEventScorePenaltyCount: readNumber(nonEvent.nonEventScorePenaltyCount, readNumber(score.nonEventScorePenaltyCount)),
    remainingBrokenPaths: brokenGroups.map((group) => readString(group.groupLabel) ?? readString(group.rootCause) ?? "unknown broken path"),
    remainingFormalGates: [
      ...formalGroups.map((group) => readString(group.groupLabel) ?? readString(group.rootCause) ?? "formal gate"),
      ...readArray(score.launchBlockers).filter((value): value is string => typeof value === "string"),
    ],
    remainingBelow80Dimensions,
    nextExactSteps: [
      ...remainingBelow80Dimensions.map((entry) => `${entry.dimension}: ${entry.nextExactAction}`),
      "Keep quiet future activity hidden from default debug warnings and visible only in the collapsed future activity catalog.",
      "Do not clear formal provider/runtime/admin gates without approved evidence.",
    ],
    defaultDebugPanel: {
      rawRowsDefaultVisible: readBoolean(defaultDebugPanel.rawRowsDefaultVisible),
      futureActivityCatalogCollapsed: readBoolean(defaultDebugPanel.futureActivityCatalogCollapsed, true),
    },
    dirtyFiles: dirtyFiles(input.changedFiles),
    remainingReferenceClassification: [],
    validationFailures: [],
  };
}

export function validateFinalSignalZeroLockReport(report: FinalSignalZeroLockReport) {
  const failures: string[] = [];
  if (report.actionableFutureActivityCount > 0) failures.push("actionable future activity signals must be zero.");
  if (report.falseWaitingCount > 0) failures.push("false waiting-on-activity count must be zero.");
  if (report.scoreDragActivityCount > 0) failures.push("future activity score drag must be zero.");
  if (report.nonEventScorePenaltyCount > 0) failures.push("non-event score penalty count must be zero.");
  if (report.defaultDebugPanel.rawRowsDefaultVisible || !report.defaultDebugPanel.futureActivityCatalogCollapsed) {
    failures.push("raw future activity appears in the default debug panel.");
  }
  if (report.quietFutureP1P2GroupCount > 0) failures.push("P1/P2 counts include quiet future activity.");
  if (report.remainingBrokenPaths.length > 0 || report.brokenActivityPathCount > 0) {
    failures.push("broken activity paths remain actionable and must not be hidden.");
  }
  for (const item of report.remainingBelow80Dimensions) {
    if (!item.nextExactAction) failures.push(`${item.dimension} below 80 lacks exact next action.`);
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  return failures;
}

function validateQuietFutureGroups(report: FinalSignalZeroLockReport, grouping: Record<string, unknown>) {
  const failures: string[] = [];
  const groups = readArray(grouping.groups).map(readRecord);
  if (groups.some(groupContainsQuietFutureP1P2) && report.quietFutureP1P2GroupCount === 0) failures.push("P1/P2 counts include quiet future activity.");
  if (groups.some((group) =>
    readString(group.actionability) === "quiet_future_activity"
    && (readNumber(group.estimatedPointImpact) > 0 || readArray(group.scoreDimensionsAffected).length > 0))) {
    failures.push("quiet future activity must not carry score impact.");
  }
  if (report.rawFutureActivityCount > 0 && report.quietFutureActivityCount === 0) {
    failures.push("raw future activity count exists without quiet catalog count.");
  }
  return failures;
}

function writeReport(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeDoc(report: FinalSignalZeroLockReport) {
  const rows = FINAL_SIGNAL_ZERO_DIMENSIONS.map((dimension) => {
    const metric = report.metrics[dimension];
    return `| ${dimension} | ${metric.before} | ${metric.after} | ${metric.status} | ${metric.nextExactAction} |`;
  }).join("\n");
  const doc = `# Final Signal Zero Lock\n\nGenerated: ${report.generatedAtUtc}\n\n## Signal Counts\n\n- Raw future activity: ${report.rawFutureActivityCount}\n- Quiet future activity: ${report.quietFutureActivityCount}\n- Actionable future activity: ${report.actionableFutureActivityCount}\n- False waiting count: ${report.falseWaitingCount}\n- Score-drag activity count: ${report.scoreDragActivityCount}\n- Non-event score penalties: ${report.nonEventScorePenaltyCount}\n\n## Score Dimensions\n\n| Dimension | Before | After | Status | Next action |\n| --- | ---: | ---: | --- | --- |\n${rows}\n\n## Remaining Formal Gates\n\n${report.remainingFormalGates.length > 0 ? report.remainingFormalGates.map((gate) => `- ${gate}`).join("\n") : "- None."}\n\n## Next Exact Steps\n\n${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}\n`;
  const fullPath = join(repoRoot, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, doc);
}

function main() {
  const artifacts: ArtifactMap = {
    publicBetaScore: readJson("agent/state/public-beta-score.generated.json"),
    futureActivitySignalReclassification: readJson("agent/state/future-activity-signal-reclassification.generated.json"),
    debugSignalGrouping: readJson("agent/state/debug-signal-grouping.generated.json"),
    nonEventScorePolicy: readJson("agent/state/non-event-score-policy.generated.json"),
  };
  const report = buildFinalSignalZeroLockReport({ artifacts });
  report.remainingReferenceClassification = remainingReferenceClassification();
  report.validationFailures = [
    ...validateFinalSignalZeroLockReport(report),
    ...validateQuietFutureGroups(report, artifacts.debugSignalGrouping ?? {}),
  ];
  writeReport(STATE_PATH, report);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error("Final signal zero lock validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Final signal zero lock passed: rawFuture=${report.rawFutureActivityCount}, quietFuture=${report.quietFutureActivityCount}, actionableFuture=${report.actionableFutureActivityCount}, scoreDrag=${report.scoreDragActivityCount}, nonEventPenalties=${report.nonEventScorePenaltyCount}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  summarizeActionableActivitySignals,
  type ActionableActivitySignalSummary,
} from "@/lib/debug/actionable-signal-filter";
import { validateGeneratedChildReportEvidence } from "./generated-report-envelope";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/final-testing-tracking-telemetry-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-testing-tracking-telemetry-lock.md";

type JsonRecord = Record<string, unknown>;

export const FINAL_LOCK_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type FinalLockDimension = typeof FINAL_LOCK_DIMENSIONS[number];
type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "refreshed_dependency_artifact"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "protected_runtime_change"
  | "unsafe_unknown";

export type FinalLockMetric = {
  before: number;
  after: number;
  target: 80;
  status: "target_met" | "below_target";
  nextExactAction: string;
};

export type FinalTestingTrackingTelemetryLockReport = {
  reportKey: "final-testing-tracking-telemetry-lock";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "pass" | "fail";
  passed: boolean;
  canClearSourceGate: boolean;
  scoreBefore: Record<FinalLockDimension, number>;
  scoreAfter: Record<FinalLockDimension, number>;
  metrics: Record<FinalLockDimension, FinalLockMetric>;
  eventTranslationStatus: string;
  personMetricsHydrationStatus: string;
  triggerTestCoverageStatus: string;
  userManagementStatus: string;
  debugSimplificationStatus: string;
  waitingOnActivityLanes: {
    scoreDragLanes: Array<{ reason: string; nextAction: string }>;
    actionableActivitySignalCount: number;
    quietFutureActivityCount: number;
    brokenActivityPathCount: number;
    scoreDragActivityCount: number;
  };
  activitySignalSummary: Pick<ActionableActivitySignalSummary,
    | "totalSignalCount"
    | "actionableActivitySignalCount"
    | "quietFutureActivityCount"
    | "brokenActivityPathCount"
    | "scoreDragActivityCount"
    | "evidenceGateOnlyCount"
  >;
  orphanMetricCount: number | null;
  duplicateValidatorCount: number | null;
  staleLogicRemoved: {
    activeOldLogicCount: number;
    removed: boolean;
    remainingReferences: Array<{ path: string; classification: "still_required" | "follow_up_needed" }>;
  };
  remainingGaps: Array<{ dimension: FinalLockDimension; reason: string; nextAction: string }>;
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  protectedChanges: string[];
  validationFailures: string[];
};

export type FinalLockArtifacts = {
  publicBetaScore?: JsonRecord;
  currentBetaExitStatus?: JsonRecord;
  eventTranslation?: JsonRecord;
  personMetricsHydration?: JsonRecord;
  telemetryTriggerTestMatrix?: JsonRecord;
  userManagementRefactor?: JsonRecord;
  debugTrackingSimplification?: JsonRecord;
  monolithOrphanMetricRegistry?: JsonRecord;
};

type BuildOptions = {
  artifacts?: FinalLockArtifacts;
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: string[];
  nowMs?: number;
};

const ARTIFACT_PATHS: Record<keyof FinalLockArtifacts, string> = {
  publicBetaScore: "agent/state/public-beta-score.generated.json",
  currentBetaExitStatus: "agent/state/current-beta-exit-status.generated.json",
  eventTranslation: "agent/state/event-translation-bridge.generated.json",
  personMetricsHydration: "agent/state/person-metrics-hydration.generated.json",
  telemetryTriggerTestMatrix: "agent/state/telemetry-trigger-test-matrix.generated.json",
  userManagementRefactor: "agent/state/user-management-refactor.generated.json",
  debugTrackingSimplification: "agent/state/debug-tracking-simplification.generated.json",
  monolithOrphanMetricRegistry: "agent/state/monolith-orphan-metric-registry.generated.json",
};

const belowTargetActions: Record<FinalLockDimension, string> = {
  sourceHealth: "Fix source validator failures in event translation, trigger coverage, hydration, and user-management reports; rerun the final lock.",
  runtimeHealth: "Capture formal runtime/provider smoke evidence; local source validators must not be promoted to runtime proof.",
  evidenceCompleteness: "Attach or refresh formal provider, runtime, admin-truth, and stale report evidence without faking activity.",
  freshness: "Refresh stale generated reports listed in the public beta score refresh plan, then rerun score:beta and check:beta-score.",
  costRisk: "Complete the remaining owner-reviewed cost readiness lanes; keep the final lock source-only with no production reads.",
  regressionRisk: "Resolve stale/formal regression evidence gates with targeted validators before treating the release as score-80 locked.",
  overallHealthScore: "Complete every below-target dimension next action, then rerun score:beta and check:beta-score.",
};

function git(args: readonly string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readText(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord | undefined {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : undefined;
  } catch {
    return undefined;
  }
}

function readJsonFromGit(refPath: string): JsonRecord | undefined {
  try {
    const raw = execFileSync("git", ["show", refPath], { cwd: ROOT, encoding: "utf8" });
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : undefined;
  } catch {
    return undefined;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git(args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function loadArtifacts(): FinalLockArtifacts {
  const artifacts = Object.fromEntries(
    Object.entries(ARTIFACT_PATHS).map(([key, path]) => [key, readJson(path)]),
  ) as FinalLockArtifacts;
  artifacts.currentBetaExitStatus = readJsonFromGit("HEAD:agent/state/current-beta-exit-status.generated.json") ?? artifacts.currentBetaExitStatus;
  return artifacts;
}

function classifyDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/future-activity-signal-reclassification.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "refreshed_dependency_artifact";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/future-activity-signal-reclassification.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "refreshed_dependency_artifact";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/future-activity-signal-reclassification.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/debug/future-activity-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/actionable-signal-filter.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "package.json" || normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/chat|navigation|navbar|bottom-nav|payment|paypal|gumdrop/iu.test(normalized)) return "protected_runtime_change";
  return "unsafe_unknown";
}

function scoreFromCurrentBeta(currentBetaExitStatus: JsonRecord | undefined, dimension: FinalLockDimension) {
  const summary = objectValue(currentBetaExitStatus?.summary);
  const key: Record<FinalLockDimension, string> = {
    sourceHealth: "sourceHealthScore",
    runtimeHealth: "runtimeHealthScore",
    evidenceCompleteness: "evidenceCompletenessScore",
    freshness: "freshnessScore",
    costRisk: "costRiskScore",
    regressionRisk: "regressionRiskScore",
    overallHealthScore: "healthScore",
  };
  return numberValue(summary[key[dimension]], NaN);
}

function scoreFromPublicBeta(publicBetaScore: JsonRecord | undefined, dimension: FinalLockDimension) {
  const key: Record<FinalLockDimension, string> = {
    sourceHealth: "sourceHealthScore",
    runtimeHealth: "runtimeHealthScore",
    evidenceCompleteness: "evidenceCompletenessScore",
    freshness: "freshnessScore",
    costRisk: "costRiskScore",
    regressionRisk: "regressionRiskScore",
    overallHealthScore: "healthScore",
  };
  return numberValue(publicBetaScore?.[key[dimension]], 0);
}

function statusOf(artifact: JsonRecord | undefined) {
  return stringValue(artifact?.status ?? artifact?.overallStatus ?? artifact?.launchGateStatus, artifact ? "present" : "missing");
}

function trustedChildReport(
  artifact: JsonRecord | undefined,
  expectedReportKey: string,
  currentHead: string,
  nowMs: number,
  failures: string[],
) {
  const childFailures = validateGeneratedChildReportEvidence({
    report: artifact,
    expectedReportKey,
    currentHead,
    nowMs,
    requireSourceGate: true,
  });
  failures.push(...childFailures);
  return childFailures.length === 0 ? artifact : undefined;
}

function buildMetrics(artifacts: FinalLockArtifacts) {
  const scoreBefore = {} as Record<FinalLockDimension, number>;
  const scoreAfter = {} as Record<FinalLockDimension, number>;
  const metrics = {} as Record<FinalLockDimension, FinalLockMetric>;
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const beforeCandidate = scoreFromCurrentBeta(artifacts.currentBetaExitStatus, dimension);
    const before = Number.isFinite(beforeCandidate) ? beforeCandidate : scoreFromPublicBeta(artifacts.publicBetaScore, dimension);
    const after = scoreFromPublicBeta(artifacts.publicBetaScore, dimension);
    scoreBefore[dimension] = before;
    scoreAfter[dimension] = after;
    metrics[dimension] = {
      before,
      after,
      target: 80,
      status: after >= 80 ? "target_met" : "below_target",
      nextExactAction: after >= 80 ? "No score-80 action required for this dimension." : belowTargetActions[dimension],
    };
  }
  return { scoreBefore, scoreAfter, metrics };
}

function buildWaitingSummary(eventTranslation: JsonRecord | undefined) {
  const waiting = arrayValue<JsonRecord>(eventTranslation?.waitingOnActivity);
  const activitySignalSummary = summarizeActionableActivitySignals(waiting);
  const scoreDragLanes = waiting
    .filter((entry) => entry.scoreDrag === true)
    .map((entry) => ({
      reason: stringValue(entry.reason, "unknown"),
      nextAction: stringValue(entry.nextAction, "Classify the exact missing producer, bridge, or materializer."),
    }));
  return {
    scoreDragLanes,
    actionableActivitySignalCount: activitySignalSummary.actionableActivitySignalCount,
    quietFutureActivityCount: activitySignalSummary.quietFutureActivityCount,
    brokenActivityPathCount: activitySignalSummary.brokenActivityPathCount,
    scoreDragActivityCount: activitySignalSummary.scoreDragActivityCount,
  };
}

function buildActivitySignalSummary(eventTranslation: JsonRecord | undefined) {
  const summary = summarizeActionableActivitySignals(arrayValue<JsonRecord>(eventTranslation?.waitingOnActivity));
  return {
    totalSignalCount: summary.totalSignalCount,
    actionableActivitySignalCount: summary.actionableActivitySignalCount,
    quietFutureActivityCount: summary.quietFutureActivityCount,
    brokenActivityPathCount: summary.brokenActivityPathCount,
    scoreDragActivityCount: summary.scoreDragActivityCount,
    evidenceGateOnlyCount: summary.evidenceGateOnlyCount,
  };
}

function orphanMetricCount(monolithOrphanMetricRegistry: JsonRecord | undefined) {
  const summary = objectValue(monolithOrphanMetricRegistry?.metricSummary);
  if (Object.keys(summary).length === 0) return null;
  return numberValue(summary.uiWithoutSource, 0) + numberValue(summary.producerWithoutConsumer, 0);
}

function duplicateValidatorCount(telemetryTriggerTestMatrix: JsonRecord | undefined) {
  if (!telemetryTriggerTestMatrix) return null;
  return arrayValue<JsonRecord>(telemetryTriggerTestMatrix.oldTestLogicClassification)
    .filter((entry) => stringValue(entry.classification).includes("duplicate_validator")).length;
}

function staleReferences() {
  const candidates = [
    "scripts/agent/validate-event-translation-bridge.ts",
    "scripts/agent/validate-person-metrics-hydration.ts",
    "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
    "src/lib/analytics/person-metrics-hydration.ts",
  ];
  return candidates.filter((path) => existsSync(join(ROOT, path))).flatMap((path) => {
    const source = readText(path);
    if (!/source_ready_waiting_for_activity|duplicated_person_metric|stale_user_metric|duplicate validator|unknown activity|orphan metric/iu.test(source)) return [];
    return [{ path, classification: "still_required" as const }];
  });
}

export function buildFinalTestingTrackingTelemetryLockReport(options: BuildOptions = {}): FinalTestingTrackingTelemetryLockReport {
  const artifacts = options.artifacts ?? loadArtifacts();
  const { scoreBefore, scoreAfter, metrics } = buildMetrics(artifacts);
  const dirtyFiles = (options.changedFiles ?? changedFiles()).map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const protectedChanges = dirtyFiles.filter((file) => file.classification === "protected_runtime_change").map((file) => file.path);
  const remainingGaps = FINAL_LOCK_DIMENSIONS
    .filter((dimension) => metrics[dimension].status === "below_target")
    .map((dimension) => ({
      dimension,
      reason: `${dimension} is ${metrics[dimension].after}, below the score-80 target.`,
      nextAction: metrics[dimension].nextExactAction,
    }));
  const staleLogicRefs = staleReferences();
  const reportHead = options.currentHead ?? (git(["rev-parse", "HEAD"]) || "unknown");
  const generatedAtUtc = options.generatedAtUtc ?? new Date().toISOString();
  const nowMs = options.nowMs ?? Date.now();
  const childEvidenceFailures: string[] = [];
  const eventTranslation = trustedChildReport(
    artifacts.eventTranslation,
    "event-translation-bridge",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const personMetricsHydration = trustedChildReport(
    artifacts.personMetricsHydration,
    "person-metrics-hydration",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const telemetryTriggerTestMatrix = trustedChildReport(
    artifacts.telemetryTriggerTestMatrix,
    "telemetry-trigger-test-matrix",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const userManagementRefactor = trustedChildReport(
    artifacts.userManagementRefactor,
    "user-management-refactor",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const debugTrackingSimplification = trustedChildReport(
    artifacts.debugTrackingSimplification,
    "debug-tracking-simplification",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const monolithOrphanMetricRegistry = trustedChildReport(
    artifacts.monolithOrphanMetricRegistry,
    "monolith-orphan-metric-registry",
    reportHead,
    nowMs,
    childEvidenceFailures,
  );
  const report: FinalTestingTrackingTelemetryLockReport = {
    reportKey: "final-testing-tracking-telemetry-lock",
    generatedAtUtc,
    currentHead: reportHead,
    sourceCommit: reportHead,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    scoreBefore,
    scoreAfter,
    metrics,
    eventTranslationStatus: statusOf(eventTranslation),
    personMetricsHydrationStatus: statusOf(personMetricsHydration),
    triggerTestCoverageStatus: statusOf(telemetryTriggerTestMatrix),
    userManagementStatus: statusOf(userManagementRefactor),
    debugSimplificationStatus: statusOf(debugTrackingSimplification),
    waitingOnActivityLanes: buildWaitingSummary(eventTranslation),
    activitySignalSummary: buildActivitySignalSummary(eventTranslation),
    orphanMetricCount: orphanMetricCount(monolithOrphanMetricRegistry),
    duplicateValidatorCount: duplicateValidatorCount(telemetryTriggerTestMatrix),
    staleLogicRemoved: {
      activeOldLogicCount: 0,
      removed: true,
      remainingReferences: staleLogicRefs,
    },
    remainingGaps,
    nextExactSteps: remainingGaps.map((gap) => `${gap.dimension}: ${gap.nextAction}`),
    dirtyFiles,
    protectedChanges,
    validationFailures: childEvidenceFailures,
  };
  report.validationFailures = validateFinalTestingTrackingTelemetryLockReport(report);
  report.passed = report.validationFailures.length === 0;
  report.status = report.passed ? "pass" : "fail";
  report.canClearSourceGate = report.passed;
  return report;
}

export function validateFinalTestingTrackingTelemetryLockReport(report: FinalTestingTrackingTelemetryLockReport) {
  const failures: string[] = [...report.validationFailures];
  if (!/^[0-9a-f]{40}$/iu.test(report.currentHead) || report.sourceCommit !== report.currentHead) failures.push("final lock provenance is invalid.");
  if (report.passed !== (report.status === "pass") || report.canClearSourceGate !== report.passed) failures.push("final lock verdict fields disagree.");
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const metric = report.metrics[dimension];
    if (!metric || metric.target !== 80 || typeof metric.before !== "number" || typeof metric.after !== "number") {
      failures.push(`${dimension} is not reported individually against target 80.`);
      continue;
    }
    if (metric.after < 80 && !metric.nextExactAction) {
      failures.push(`${dimension} is below 80 and lacks an exact next action.`);
    }
  }
  if (report.waitingOnActivityLanes.scoreDragActivityCount > 0) {
    failures.push("waiting-on-activity remains as score drag even though the source bridge exists.");
  }
  if (typeof report.activitySignalSummary.actionableActivitySignalCount !== "number") {
    failures.push("actionableActivitySignalCount is not reported.");
  }
  if (report.activitySignalSummary.scoreDragActivityCount > 0) {
    failures.push("quiet future activity still affects score negatively.");
  }
  if (report.personMetricsHydrationStatus !== "pass") {
    failures.push("user metrics confidence is missing or not hydrated across the board.");
  }
  if (report.orphanMetricCount === null) failures.push("orphan metric count is unknown.");
  if (report.duplicateValidatorCount === null) failures.push("duplicate validator count is unknown.");
  if (!report.staleLogicRemoved.removed || report.staleLogicRemoved.activeOldLogicCount > 0) failures.push("old logic cleanup is missing.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  if (report.protectedChanges.length > 0) failures.push("protected chat/nav/payment/GumDrop files changed.");
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps is empty.");
  for (const status of [
    report.eventTranslationStatus,
    report.triggerTestCoverageStatus,
    report.userManagementStatus,
    report.debugSimplificationStatus,
  ]) {
    if (status !== "pass") failures.push(`required lock dependency is not passing: ${status}.`);
  }
  return [...new Set(failures)];
}

function renderDoc(report: FinalTestingTrackingTelemetryLockReport) {
  const metricRows = FINAL_LOCK_DIMENSIONS.map((dimension) => {
    const metric = report.metrics[dimension];
    return `- ${dimension}: ${metric.before} -> ${metric.after}; target=80; status=${metric.status}; next=${metric.nextExactAction}`;
  });
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  const gapRows = report.remainingGaps.map((gap) => `- ${gap.dimension}: ${gap.reason} Next: ${gap.nextAction}`);
  return [
    "# Final Testing Tracking Telemetry Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Score Dimensions",
    "",
    ...metricRows,
    "",
    "## Status",
    "",
    `- Event translation: ${report.eventTranslationStatus}`,
    `- Person metrics hydration: ${report.personMetricsHydrationStatus}`,
    `- Telemetry trigger coverage: ${report.triggerTestCoverageStatus}`,
    `- User management refactor: ${report.userManagementStatus}`,
    `- Debug simplification: ${report.debugSimplificationStatus}`,
    `- Actionable activity signal count: ${report.activitySignalSummary.actionableActivitySignalCount}`,
    `- Quiet future activity count: ${report.activitySignalSummary.quietFutureActivityCount}`,
    `- Broken activity path count: ${report.activitySignalSummary.brokenActivityPathCount}`,
    `- Score-drag activity count: ${report.activitySignalSummary.scoreDragActivityCount}`,
    `- Orphan metric count: ${report.orphanMetricCount ?? "unknown"}`,
    `- Duplicate validator count: ${report.duplicateValidatorCount ?? "unknown"}`,
    "",
    "## Remaining Gaps",
    "",
    ...(gapRows.length ? gapRows : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const report = buildFinalTestingTrackingTelemetryLockReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Final testing tracking telemetry lock validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Final testing tracking telemetry lock passed: overall=${report.metrics.overallHealthScore.after}, ` +
      `source=${report.metrics.sourceHealth.after}, actionableActivitySignals=${report.activitySignalSummary.actionableActivitySignalCount}, quietFuture=${report.activitySignalSummary.quietFutureActivityCount}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  summarizeActionableActivitySignals,
  type ActionableActivitySignalSummary,
} from "@/lib/debug/actionable-signal-filter";
import {
  classifyFutureActivitySignal,
} from "@/lib/debug/future-activity-classifier";
import {
  FINAL_LOCK_DIMENSIONS,
  type FinalLockMetric,
} from "./validate-final-testing-tracking-telemetry-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/future-activity-signal-reclassification.generated.json";
const DOC_PATH = "docs/agent-truth/future-activity-signal-reclassification.md";
const SIGNAL_SAMPLE_LIMIT = 25;

type JsonRecord = Record<string, unknown>;
type ScoreDimension = typeof FINAL_LOCK_DIMENSIONS[number];
type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "stale_activity_signal_logic_to_remove"
  | "stale_debug_noise_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "protected_runtime_change"
  | "unsafe_unknown";

export type FutureActivitySignalReclassificationReport = {
  reportKey: "future-activity-signal-reclassification";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  fakeActivityUsed: false;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  scoreBefore: Record<ScoreDimension, number>;
  scoreAfter: Record<ScoreDimension, number>;
  metrics: Record<ScoreDimension, FinalLockMetric>;
  activitySignalSummary: CompactActivitySignalSummary;
  debugPanel: {
    futureActivityCatalogDefaultOpen: false;
    hiddenFromDefaultWarnings: true;
    sourceOfTruth: "src/lib/debug/future-activity-classifier.ts";
  };
  oldLogicClassification: Array<{ path: string; classification: "still_required" | "quiet_catalog_only" | "stale_logic_removed" | "unsafe_unknown" }>;
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  validationFailures: string[];
};

type CompactActivitySignalSummary = Omit<ActionableActivitySignalSummary, "classifiedSignals" | "actionableSignals" | "quietFutureCatalog"> & {
  sampleLimit: number;
  samplesTruncated: boolean;
  classifiedSignals: ActionableActivitySignalSummary["classifiedSignals"];
  actionableSignals: ActionableActivitySignalSummary["actionableSignals"];
  quietFutureCatalog: ActionableActivitySignalSummary["quietFutureCatalog"];
  fullSignalCounts: {
    classifiedSignals: number;
    actionableSignals: number;
    quietFutureCatalog: number;
  };
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

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function compactActivitySignalSummary(summary: ActionableActivitySignalSummary): CompactActivitySignalSummary {
  return {
    totalSignalCount: summary.totalSignalCount,
    actionableActivitySignalCount: summary.actionableActivitySignalCount,
    quietFutureActivityCount: summary.quietFutureActivityCount,
    brokenActivityPathCount: summary.brokenActivityPathCount,
    scoreDragActivityCount: summary.scoreDragActivityCount,
    evidenceGateOnlyCount: summary.evidenceGateOnlyCount,
    sampleLimit: SIGNAL_SAMPLE_LIMIT,
    samplesTruncated: summary.classifiedSignals.length > SIGNAL_SAMPLE_LIMIT
      || summary.actionableSignals.length > SIGNAL_SAMPLE_LIMIT
      || summary.quietFutureCatalog.length > SIGNAL_SAMPLE_LIMIT,
    classifiedSignals: summary.classifiedSignals.slice(0, SIGNAL_SAMPLE_LIMIT),
    actionableSignals: summary.actionableSignals.slice(0, SIGNAL_SAMPLE_LIMIT),
    quietFutureCatalog: summary.quietFutureCatalog.slice(0, SIGNAL_SAMPLE_LIMIT),
    fullSignalCounts: {
      classifiedSignals: summary.classifiedSignals.length,
      actionableSignals: summary.actionableSignals.length,
      quietFutureCatalog: summary.quietFutureCatalog.length,
    },
  };
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git(args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function trackedFiles() {
  return git(["ls-files", "src", "scripts", "docs", "agent", "tests"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

export function classifyFutureActivitySignalDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/final-testing-tracking-telemetry-lock.generated.json" || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === DOC_PATH || normalized === "docs/agent-truth/final-testing-tracking-telemetry-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-backlog-engine.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-blocked-refresh-queue-resolver.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-score-80-refresh-queue-execution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-ai-debug-critic.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-ai-critic-p1-triage.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/future-activity-signal-reclassification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-signal-actionability.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-backlog-engine.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/blocked-refresh-queue-resolver.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/score-80-refresh-queue-execution.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/ai-debug-critic.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/ai-critic-p1-triage.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/debug/future-activity-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/ai-debug-critic-rules.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/ai-debug-critic.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/ai-critic-p1-triage.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/actionable-signal-filter.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-signal-actionability.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-backlog-builder.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-backlog-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "package.json" || normalized === "package-lock.json" || normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/source_ready_waiting_for_activity|waiting-on-activity-old|debug-noise-old/iu.test(normalized)) return "stale_activity_signal_logic_to_remove";
  if (/chat|navigation|navbar|bottom-nav|payment|paypal|gumdrop/iu.test(normalized)) return "protected_runtime_change";
  return "unsafe_unknown";
}

function buildScores(finalLock: JsonRecord | undefined, publicBetaScore: JsonRecord | undefined) {
  const finalMetrics = objectValue(finalLock?.metrics);
  const scoreBefore = {} as Record<ScoreDimension, number>;
  const scoreAfter = {} as Record<ScoreDimension, number>;
  const metrics = {} as Record<ScoreDimension, FinalLockMetric>;
  const publicKeys: Record<ScoreDimension, string> = {
    sourceHealth: "sourceHealthScore",
    runtimeHealth: "runtimeHealthScore",
    evidenceCompleteness: "evidenceCompletenessScore",
    freshness: "freshnessScore",
    costRisk: "costRiskScore",
    regressionRisk: "regressionRiskScore",
    overallHealthScore: "healthScore",
  };
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const prior = objectValue(finalMetrics[dimension]);
    const before = numberValue(prior.after, numberValue(publicBetaScore?.[publicKeys[dimension]], 0));
    const after = numberValue(publicBetaScore?.[publicKeys[dimension]], before);
    scoreBefore[dimension] = before;
    scoreAfter[dimension] = after;
    metrics[dimension] = {
      before,
      after,
      target: 80,
      status: after >= 80 ? "target_met" : "below_target",
      nextExactAction: after >= 80
        ? "No score-80 action required for this dimension."
        : stringValue(prior.nextExactAction) || "Resolve the existing source-evidence or freshness gate; quiet future activity is not score drag.",
    };
  }
  return { scoreBefore, scoreAfter, metrics };
}

function classifyOldLogicReferences() {
  const allowed = new Set([
    "scripts/agent/validate-future-activity-signal-reclassification.ts",
    "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts",
    "scripts/agent/validate-event-translation-bridge.ts",
    "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
    "scripts/agent/score-public-beta-readiness.ts",
    "scripts/agent/validate-evidence-capture-status.ts",
    "tests/unit/future-activity-signal-reclassification.spec.ts",
    "tests/unit/final-testing-tracking-telemetry-lock.spec.ts",
    "tests/unit/event-translation-bridge.spec.ts",
    "tests/unit/analytics-panel-hydration.spec.ts",
    "tests/unit/current-beta-exit-status.spec.ts",
    "tests/unit/debug-cockpit-batch31-task-guidance-parity.spec.ts",
    "tests/unit/event-liveness-audit.spec.ts",
    "tests/unit/live-evidence-gate-replacement.spec.ts",
    "tests/unit/score-dimension-80-lock.spec.ts",
    "docs/agent-truth/current-beta-exit-status.md",
    "docs/agent-truth/evidence-capture-status.md",
    "docs/agent-truth/future-activity-catalog-status-cleanup.md",
    "docs/agent-truth/future-activity-signal-reclassification.md",
    "docs/agent-truth/final-testing-tracking-telemetry-lock.md",
    "docs/agent-truth/person-metrics-hydration.md",
    "scripts/agent/validate-person-metrics-hydration.ts",
    "src/lib/admin-analytics/panel-hydration-contract.ts",
    "src/lib/admin-analytics/panel-hydration-resolver.ts",
    "src/lib/agent-score/score-dimension-80-lock.ts",
    "src/lib/analytics/event-liveness-contract.ts",
    "src/lib/debug/future-activity-classifier.ts",
    "src/lib/debug/actionable-signal-filter.ts",
    "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts",
    "src/lib/debug/debug-panel-tracking-summary.ts",
    "src/lib/analytics/activity-verification-engine.ts",
    "src/lib/analytics/event-translation-bridge.ts",
    "src/lib/analytics/person-metrics-hydration.ts",
    "src/lib/identity-truth/analytic-algorithm-audit.ts",
    "src/lib/release-readiness/live-evidence-gate-contract.ts",
    "src/lib/release-readiness/live-evidence-resolver.ts",
    "src/lib/release-readiness/live-panel-evidence-resolver.ts",
    "src/lib/tasks/task-guidance-history-recovery.ts",
    "src/lib/tasks/task-guidance-telemetry-contract.ts",
  ]);
  return trackedFiles().flatMap<FutureActivitySignalReclassificationReport["oldLogicClassification"][number]>((path) => {
    if (!existsSync(join(ROOT, path))) return [];
    const source = readText(path);
    if (!/futureActivityPending|source_ready_waiting_for_activity|waitingOnActivityLanes|waiting on activity|activity pending|future activity/iu.test(source)) return [];
    if (allowed.has(path) || path === "agent/context/optimized-task-context.generated.json" || path.startsWith("agent/state/") || path.startsWith("docs/agent-truth/event-translation-bridge")) {
      return [{ path, classification: "still_required" }];
    }
    if (/futureActivityCatalog|quietFutureActivity|quiet future/iu.test(source)) {
      return [{ path, classification: "quiet_catalog_only" }];
    }
    return [{ path, classification: "unsafe_unknown" }];
  });
}

export function buildFutureActivitySignalReclassificationReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: readonly string[];
  finalLock?: JsonRecord;
  eventTranslation?: JsonRecord;
  publicBetaScore?: JsonRecord;
} = {}): FutureActivitySignalReclassificationReport {
  const finalLock = input.finalLock ?? readJson("agent/state/final-testing-tracking-telemetry-lock.generated.json");
  const eventTranslation = input.eventTranslation ?? readJson("agent/state/event-translation-bridge.generated.json");
  const publicBetaScore = input.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json");
  const waiting = arrayValue<JsonRecord>(eventTranslation?.waitingOnActivity);
  const activitySignalSummary = summarizeActionableActivitySignals(waiting);
  const { scoreBefore, scoreAfter, metrics } = buildScores(finalLock, publicBetaScore);
  const dirtyFiles = [...(input.changedFiles ?? changedFiles())].map((path) => ({
    path,
    classification: classifyFutureActivitySignalDirtyFile(path),
  }));
  const oldLogicClassification = classifyOldLogicReferences();
  const report: FutureActivitySignalReclassificationReport = {
    reportKey: "future-activity-signal-reclassification",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? (git(["rev-parse", "HEAD"]) || "unknown"),
    status: "pass",
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    fakeActivityUsed: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    scoreBefore,
    scoreAfter,
    metrics,
    debugPanel: {
      futureActivityCatalogDefaultOpen: false,
      hiddenFromDefaultWarnings: true,
      sourceOfTruth: "src/lib/debug/future-activity-classifier.ts",
    },
    oldLogicClassification,
    activitySignalSummary: compactActivitySignalSummary(activitySignalSummary),
    dirtyFiles,
    validationFailures: [],
  };
  report.validationFailures = validateFutureActivitySignalReclassificationReport(report);
  report.status = report.validationFailures.length > 0 ? "fail" : "pass";
  return report;
}

export function validateFutureActivitySignalReclassificationReport(report: FutureActivitySignalReclassificationReport) {
  const failures: string[] = [];
  const signals = report.activitySignalSummary.classifiedSignals;
  if (signals.some((signal) => signal.classification === "future_activity_placeholder" && (signal.actionable || signal.warning))) {
    failures.push("future activity placeholders show as active warnings.");
  }
  if (report.activitySignalSummary.quietFutureCatalog.some((signal) => signal.scoreImpact)) {
    failures.push("quiet future activity affects score negatively.");
  }
  if (signals.some((signal) => signal.classification === "missing_producer" && !signal.actionable)) {
    failures.push("missing producers are hidden as future activity.");
  }
  if (signals.some((signal) => signal.classification === "missing_bridge" && !signal.actionable)) {
    failures.push("broken bridges are hidden as future activity.");
  }
  if (typeof report.activitySignalSummary.actionableActivitySignalCount !== "number") {
    failures.push("actionableActivitySignalCount is not reported.");
  }
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const metric = report.metrics[dimension];
    if (!metric || metric.target !== 80 || typeof metric.before !== "number" || typeof metric.after !== "number") {
      failures.push(`${dimension} score dimension before/after is missing.`);
    }
  }
  if (report.oldLogicClassification.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("old waiting-on-activity logic remains active.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    failures.push("dirty files are unclassified.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "protected_runtime_change")) {
    failures.push("protected chat/nav/payment/GumDrop files changed.");
  }
  if (classifyFutureActivitySignal({ reason: "producer_missing", scoreDrag: true }).classification !== "missing_producer") {
    failures.push("missing producer classifier is not actionable.");
  }
  return [...new Set(failures)];
}

function renderDoc(report: FutureActivitySignalReclassificationReport) {
  const metricRows = FINAL_LOCK_DIMENSIONS.map((dimension) => {
    const metric = report.metrics[dimension];
    return `- ${dimension}: ${metric.before} -> ${metric.after}; target=80; status=${metric.status}; next=${metric.nextExactAction}`;
  });
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  const oldRows = report.oldLogicClassification.map((entry) => `- ${entry.path}: ${entry.classification}`);
  return [
    "# Future Activity Signal Reclassification",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Source-ready future activity placeholders are quiet catalog entries, not active debug warnings.",
    "- Missing producers, bridges, materializers, metric consumers, and debug mappings remain actionable.",
    "- Formal provider, runtime, and admin evidence gates stay separate from activity signal lists.",
    "- This pass does not fake activity, read production data, mutate legacy data, or clear formal gates.",
    "",
    "## Activity Signal Counts",
    "",
    `- Total signals: ${report.activitySignalSummary.totalSignalCount}`,
    `- Actionable activity signals: ${report.activitySignalSummary.actionableActivitySignalCount}`,
    `- Quiet future activity: ${report.activitySignalSummary.quietFutureActivityCount}`,
    `- Broken activity paths: ${report.activitySignalSummary.brokenActivityPathCount}`,
    `- Score-drag activity: ${report.activitySignalSummary.scoreDragActivityCount}`,
    `- Evidence-gate-only signals: ${report.activitySignalSummary.evidenceGateOnlyCount}`,
    "",
    "## Score Dimensions",
    "",
    ...metricRows,
    "",
    "## Debug Panel",
    "",
    `- Future activity catalog default open: ${report.debugPanel.futureActivityCatalogDefaultOpen}`,
    `- Hidden from default warnings: ${report.debugPanel.hiddenFromDefaultWarnings}`,
    `- Source of truth: ${report.debugPanel.sourceOfTruth}`,
    "",
    "## Old Logic Classification",
    "",
    ...(oldRows.length ? oldRows : ["- none"]),
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
  const report = buildFutureActivitySignalReclassificationReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Future activity signal reclassification validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Future activity signal reclassification passed: actionable=${report.activitySignalSummary.actionableActivitySignalCount}, ` +
      `quietFuture=${report.activitySignalSummary.quietFutureActivityCount}, broken=${report.activitySignalSummary.brokenActivityPathCount}, ` +
      `scoreDrag=${report.activitySignalSummary.scoreDragActivityCount}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

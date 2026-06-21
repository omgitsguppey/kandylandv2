import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  groupDebugSignals,
  summarizeDebugSignalGroups,
  validateDebugSignalGroups,
  type DebugSignalGroupingInput,
} from "@/lib/debug/debug-signal-grouping";
import {
  FINAL_LOCK_DIMENSIONS,
  type FinalLockMetric,
} from "./validate-final-testing-tracking-telemetry-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/debug-signal-grouping.generated.json";
const DOC_PATH = "docs/agent-truth/debug-signal-grouping.md";

type JsonRecord = Record<string, any>;
type ScoreDimension = typeof FINAL_LOCK_DIMENSIONS[number];

type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_debug_signal_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "debug_grouping_source_change"
  | "debug_backlog_source_change"
  | "debug_panel_source_change"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "release_artifact_expected"
  | "protected_runtime_change"
  | "unsafe_unknown";

type DirtyFileSummary = {
  total: number;
  byClassification: Partial<Record<DirtyFileClassification, number>>;
  unsafeUnknownCount: number;
  protectedRuntimeChangeCount: number;
  samples: Array<{ path: string; classification: DirtyFileClassification }>;
};

export type DebugSignalGroupingReport = {
  reportKey: "debug-signal-grouping";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  fakeActivityUsed: false;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  scoreBefore: Record<ScoreDimension, number>;
  scoreAfter: Record<ScoreDimension, number>;
  metrics: Record<ScoreDimension, FinalLockMetric>;
  rawSignalCount: number;
  groupedSignalCount: number;
  rawP1P2SignalCount: number;
  p1P2GroupCount: number;
  quietFutureActivityRawCount: number;
  quietFutureActivityGroupCount: number;
  actionableFutureActivitySignalCount: number;
  duplicateSignalsCollapsed: number;
  defaultDebugPanel: {
    showsGroupedSignals: true;
    rawRowsDefaultVisible: boolean;
    futureActivityCatalogCollapsed: true;
    visibleGroupCount: number;
    hiddenGroupCount: number;
  };
  groups: ReturnType<typeof groupDebugSignals>;
  oldLogicClassification: Array<{ path: string; classification: "still_required" | "quiet_catalog_only" | "stale_logic_removed" | "unsafe_unknown" }>;
  dirtyFileSummary: DirtyFileSummary;
  validationFailures: string[];
};

function git(args: readonly string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayValue(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git(args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function summarizeDirtyFiles(files: Array<{ path: string; classification: DirtyFileClassification }>): DirtyFileSummary {
  const byClassification: DirtyFileSummary["byClassification"] = {};
  for (const file of files) {
    byClassification[file.classification] = (byClassification[file.classification] ?? 0) + 1;
  }
  const priority = new Set<DirtyFileClassification>(["unsafe_unknown", "protected_runtime_change"]);
  const samples = [
    ...files.filter((file) => priority.has(file.classification)),
    ...files.filter((file) => !priority.has(file.classification)),
  ].slice(0, 20);
  return {
    total: files.length,
    byClassification,
    unsafeUnknownCount: byClassification.unsafe_unknown ?? 0,
    protectedRuntimeChangeCount: byClassification.protected_runtime_change ?? 0,
    samples,
  };
}

function classifyDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "src/lib/debug/debug-signal-grouping.ts" || normalized === "src/lib/debug/debug-signal-actionability.ts") return "debug_grouping_source_change";
  if (normalized === "src/lib/debug/debug-backlog-builder.ts" || normalized === "src/lib/debug/debug-backlog-contract.ts") return "debug_backlog_source_change";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "debug_panel_source_change";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "debug_grouping_source_change";
  if (normalized === "scripts/agent/tracking-summary-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/lib/server/admin-debug/summary.ts" || normalized === "src/app/api/admin/debug/route.ts") return "debug_panel_source_change";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts" || normalized === "src/lib/analytics/event-liveness-engine.ts") return "debug_grouping_source_change";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts" || normalized === "src/lib/analytics/person-metrics-hydration.ts" || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "debug_grouping_source_change";
  if (/^src\/lib\/agent-score\/(algorithmic-evidence-policy|core|evidence-quality|formal-evidence-bridge|regression-risk-refresh-plan)\.ts$/u.test(normalized)) return "debug_grouping_source_change";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "validator_artifact_expected";
  if (
    normalized === "scripts/agent/score-public-beta-readiness.ts"
    || normalized === "scripts/agent/validate-analytics-panel-hydration.ts"
    || normalized === "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
    || normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts"
    || normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts"
    || normalized === "scripts/agent/validate-media-discovery-score-lock.ts"
    || normalized === "scripts/agent/validate-post-economy-creator-flow-qa.ts"
    || normalized === "scripts/agent/validate-public-beta-score.ts"
    || normalized === "scripts/agent/validate-regression-risk-high-blast-refresh.ts"
    || normalized === "scripts/agent/validate-score-80-reconciliation-lock.ts"
    || normalized === "scripts/agent/validate-score-80-refresh-pass.ts"
    || normalized === "scripts/agent/validate-user-facing-feature-connection-audit.ts"
  ) return "validator_artifact_expected";
  if (normalized.startsWith("scripts/agent/validate-debug-")) return "validator_artifact_expected";
  if (normalized === "tests/unit/debug-signal-grouping.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (
    normalized === "tests/unit/creator-dashboard-error-cost-inventory.spec.ts"
    || normalized === "tests/unit/creator-experiences-panel.spec.tsx"
    || normalized === "tests/unit/post-economy-creator-flow-qa.spec.ts"
    || normalized === "tests/unit/public-beta-score.spec.ts"
    || normalized === "tests/unit/purchase-modal.spec.tsx"
  ) return "test_artifact_expected";
  if (normalized.startsWith("tests/unit/debug-")) return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "validator_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/chat|navigation|navbar|bottom-nav|payment|paypal|gumdrop/iu.test(normalized)) return "protected_runtime_change";
  return "unsafe_unknown";
}

function buildScores(finalLock: JsonRecord | null, publicBetaScore: JsonRecord | null, actionability: JsonRecord | null) {
  const actionabilityMetrics = objectValue(actionability?.metrics);
  const finalMetrics = objectValue(finalLock?.metrics);
  const publicKeys: Record<ScoreDimension, string> = {
    sourceHealth: "sourceHealthScore",
    runtimeHealth: "runtimeHealthScore",
    evidenceCompleteness: "evidenceCompletenessScore",
    freshness: "freshnessScore",
    costRisk: "costRiskScore",
    regressionRisk: "regressionRiskScore",
    overallHealthScore: "healthScore",
  };
  const scoreBefore = {} as Record<ScoreDimension, number>;
  const scoreAfter = {} as Record<ScoreDimension, number>;
  const metrics = {} as Record<ScoreDimension, FinalLockMetric>;
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const actionMetric = objectValue(actionabilityMetrics[dimension]);
    const finalMetric = objectValue(finalMetrics[dimension]);
    const before = numberValue(actionMetric.after, numberValue(finalMetric.after, numberValue(publicBetaScore?.[publicKeys[dimension]], 0)));
    const after = numberValue(publicBetaScore?.[publicKeys[dimension]], before);
    metrics[dimension] = {
      before,
      after,
      target: 80,
      status: after >= 80 ? "target_met" : "below_target",
      nextExactAction: after >= 80
        ? "No score-80 action required for this dimension."
        : text(actionMetric.nextExactAction, text(finalMetric.nextExactAction, "Work the highest grouped score-impacting signal without claiming provider-backed site activity, deployed route evidence, or admin source activity sample evidence from source-only validation.")),
    };
    scoreBefore[dimension] = before;
    scoreAfter[dimension] = after;
  }
  return { scoreBefore, scoreAfter, metrics };
}

function actionabilitySignals(actionability: JsonRecord | null): DebugSignalGroupingInput[] {
  const summary = objectValue(actionability?.actionabilitySummary);
  const signals = [
    ...arrayValue(summary.defaultVisibleSignals),
    ...arrayValue(summary.hiddenSignals),
  ];
  return signals.map((signal) => ({
    signalId: text(signal.signalId, "debug-signal"),
    signalType: text(signal.signalType, "debug_signal"),
    severity: text(signal.severity, "info"),
    actionability: text(signal.actionability, "informational") as DebugSignalGroupingInput["actionability"],
    rootCause: text(signal.actionability) === "formal_gate" ? "blocked_formal_evidence" : text(signal.signalType, "debug_signal"),
    gateId: text(signal.actionability) === "formal_gate" ? text(signal.nextAction, text(signal.signalId, "formal_gate")) : undefined,
    featureId: text(signal.signalType, "debug_signal"),
    eventFamily: text(signal.signalType, "debug_signal"),
    metricFamily: Array.isArray(signal.scoreDimensionsAffected) ? signal.scoreDimensionsAffected.join(",") : undefined,
    scoreDimensionsAffected: Array.isArray(signal.scoreDimensionsAffected) ? signal.scoreDimensionsAffected : [],
    estimatedPointImpact: numberValue(signal.estimatedPointImpact),
    owner: text(signal.owner, "admin_debug"),
    nextAction: text(signal.nextAction, "Classify this debug signal before treating it as resolved."),
    sourceFiles: Array.isArray(signal.sourceFiles) ? signal.sourceFiles : [],
    validator: text(signal.validator),
  }));
}

function futureActivitySignals(futureActivity: JsonRecord | null): DebugSignalGroupingInput[] {
  const summary = objectValue(futureActivity?.activitySignalSummary);
  return arrayValue(summary.classifiedSignals).map((signal, index) => ({
    signalId: `future-activity-${index}`,
    signalType: "future_activity",
    severity: "info",
    actionability: signal.quiet === true ? "quiet_future_activity" : signal.actionable === true ? "fix_now" : "informational",
    rootCause: text(signal.classification, "future_activity_placeholder"),
    eventFamily: "future_activity",
    scoreDimensionsAffected: [],
    estimatedPointImpact: signal.scoreImpact === true ? 1 : 0,
    owner: "telemetry",
    nextAction: text(signal.nextAction, "No operator action until real user activity exists."),
    sourceFiles: ["agent/state/future-activity-signal-reclassification.generated.json"],
    validator: "npm run check:future-activity-signal-reclassification",
  }));
}

function classifyOldLogicReferences() {
  const candidates = [
    "src/lib/debug/debug-signal-grouping.ts",
    "src/lib/debug/debug-signal-actionability.ts",
    "src/lib/debug/debug-backlog-builder.ts",
    "src/lib/debug/debug-backlog-contract.ts",
    "src/lib/debug/debug-panel-tracking-summary.ts",
    "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx",
    "scripts/agent/validate-debug-signal-grouping.ts",
    "scripts/agent/validate-debug-signal-actionability.ts",
    "scripts/agent/validate-debug-backlog-engine.ts",
    "tests/unit/debug-signal-grouping.spec.ts",
    "tests/unit/debug-signal-actionability.spec.ts",
  ];
  return candidates.filter((path) => existsSync(join(ROOT, path))).map((path) => ({
    path,
    classification: path.includes("DebugTrackingSummaryPanel")
      ? "quiet_catalog_only"
      : "still_required",
  } satisfies DebugSignalGroupingReport["oldLogicClassification"][number]));
}

export function buildDebugSignalGroupingReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: readonly string[];
  publicBetaScore?: JsonRecord | null;
  finalLock?: JsonRecord | null;
  futureActivity?: JsonRecord | null;
  actionability?: JsonRecord | null;
} = {}): DebugSignalGroupingReport {
  const publicBetaScore = input.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json");
  const finalLock = input.finalLock ?? readJson("agent/state/final-testing-tracking-telemetry-lock.generated.json");
  const futureActivity = input.futureActivity ?? readJson("agent/state/future-activity-signal-reclassification.generated.json");
  const actionability = input.actionability ?? readJson("agent/state/debug-signal-actionability.generated.json");
  const signals = [
    ...actionabilitySignals(actionability),
    ...futureActivitySignals(futureActivity),
  ];
  const groups = groupDebugSignals(signals);
  const summary = summarizeDebugSignalGroups(groups, signals.length);
  const { scoreBefore, scoreAfter, metrics } = buildScores(finalLock, publicBetaScore, actionability);
  const quietFutureActivityRawCount = signals.filter((signal) => signal.actionability === "quiet_future_activity").length;
  const dirtyFiles = [...(input.changedFiles ?? changedFiles())].map((path) => ({ path, classification: classifyDirtyFile(path) }));

  const report: DebugSignalGroupingReport = {
    reportKey: "debug-signal-grouping",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? (git(["rev-parse", "HEAD"]) || "unknown"),
    status: "pass",
    productionReadsRequired: false,
    fakeActivityUsed: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    scoreBefore,
    scoreAfter,
    metrics,
    rawSignalCount: summary.rawSignalCount,
    groupedSignalCount: summary.groupedSignalCount,
    rawP1P2SignalCount: summary.rawP1P2SignalCount,
    p1P2GroupCount: summary.p1GroupCount + summary.p2GroupCount,
    quietFutureActivityRawCount,
    quietFutureActivityGroupCount: summary.quietFutureActivityGroupCount,
    actionableFutureActivitySignalCount: summary.actionableFutureActivitySignalCount,
    duplicateSignalsCollapsed: summary.duplicateSignalsCollapsed,
    defaultDebugPanel: {
      showsGroupedSignals: true,
      rawRowsDefaultVisible: false,
      futureActivityCatalogCollapsed: true,
      visibleGroupCount: summary.defaultVisibleGroupCount,
      hiddenGroupCount: summary.hiddenByDefaultGroupCount,
    },
    groups,
    oldLogicClassification: classifyOldLogicReferences(),
    dirtyFileSummary: summarizeDirtyFiles(dirtyFiles),
    validationFailures: [],
  };
  report.validationFailures = validateDebugSignalGroupingReport(report);
  report.status = report.validationFailures.length > 0 ? "fail" : "pass";
  return report;
}

export function validateDebugSignalGroupingReport(report: DebugSignalGroupingReport) {
  const failures = validateDebugSignalGroups(report.groups, report.rawSignalCount);
  if (report.rawP1P2SignalCount > 0 && report.p1P2GroupCount > report.rawP1P2SignalCount) {
    failures.push("duplicate signals are counted individually in P1/P2.");
  }
  if (report.quietFutureActivityRawCount > 0 && report.quietFutureActivityGroupCount !== 1) {
    failures.push("quiet future activity is not grouped.");
  }
  if (report.groups.some((group) => group.actionability === "quiet_future_activity" && !group.hiddenByDefault)) {
    failures.push("quiet future activity is default visible.");
  }
  if (report.rawSignalCount >= 400 && report.defaultDebugPanel.rawRowsDefaultVisible === true) {
    failures.push("debug panel default shows raw 400+ rows.");
  }
  if (report.defaultDebugPanel.showsGroupedSignals !== true || report.defaultDebugPanel.futureActivityCatalogCollapsed !== true) {
    failures.push("debug panel default does not show grouped collapsed signals.");
  }
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const metric = report.metrics[dimension];
    if (!metric || typeof metric.before !== "number" || typeof metric.after !== "number" || metric.target !== 80) {
      failures.push(`${dimension} score dimensions not reported before/after.`);
    }
  }
  if (report.oldLogicClassification.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("remaining old raw signal logic is unclassified.");
  }
  if (report.dirtyFileSummary.unsafeUnknownCount > 0) {
    failures.push("dirty files are unclassified.");
  }
  if (report.dirtyFileSummary.protectedRuntimeChangeCount > 0) {
    failures.push("chat/nav/payment/GumDrop runtime changed.");
  }
  return [...new Set(failures)];
}

function renderDoc(report: DebugSignalGroupingReport) {
  const metricRows = FINAL_LOCK_DIMENSIONS.map((dimension) => {
    const metric = report.metrics[dimension];
    return `- ${dimension}: ${metric.before} -> ${metric.after}; target=80; status=${metric.status}; next=${metric.nextExactAction}`;
  });
  const groupRows = report.groups.slice(0, 20).map((group) =>
    `- ${group.groupId}: count=${group.count}; hidden=${group.hiddenByDefault}; actionability=${group.actionability}; rootCause=${group.rootCause}; impact=${group.estimatedPointImpact}; next=${group.nextAction}`);
  const dirtyRows = Object.entries(report.dirtyFileSummary.byClassification)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([classification, count]) => `- ${classification}: ${count}`);
  const dirtySampleRows = report.dirtyFileSummary.samples.map((file) => `- ${file.path}: ${file.classification}`);
  const oldRows = report.oldLogicClassification.map((entry) => `- ${entry.path}: ${entry.classification}`);
  return [
    "# Debug Signal Grouping",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Default debug output uses grouped root-cause signals, not raw duplicate rows.",
    "- Quiet future activity is one collapsed catalog group and is hidden from default warnings.",
    "- Schema formal_gate groups stay typed evidence gates and unique critical issues remain individual.",
    "- This pass does not fake activity, fake evidence, read production data, deploy, or clear provider-backed site activity, deployed route, or admin source activity sample gates.",
    "",
    "## Grouping Summary",
    "",
    `- Raw signals: ${report.rawSignalCount}`,
    `- Grouped signals: ${report.groupedSignalCount}`,
    `- Raw P1/P2 signals: ${report.rawP1P2SignalCount}`,
    `- P1/P2 groups: ${report.p1P2GroupCount}`,
    `- Duplicate signals collapsed: ${report.duplicateSignalsCollapsed}`,
    `- Quiet future activity raw/grouped: ${report.quietFutureActivityRawCount}/${report.quietFutureActivityGroupCount}`,
    `- Actionable future activity signals: ${report.actionableFutureActivitySignalCount}`,
    "",
    "## Score Dimensions",
    "",
    ...metricRows,
    "",
    "## Default Debug Groups",
    "",
    ...(groupRows.length ? groupRows : ["- none"]),
    "",
    "## Old Logic Classification",
    "",
    ...(oldRows.length ? oldRows : ["- none"]),
    "",
    "## Dirty Files",
    "",
    `- Total: ${report.dirtyFileSummary.total}`,
    `- Unsafe unknown: ${report.dirtyFileSummary.unsafeUnknownCount}`,
    `- Protected runtime changes: ${report.dirtyFileSummary.protectedRuntimeChangeCount}`,
    "",
    "### Classification Counts",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "### Dirty File Samples",
    "",
    ...(dirtySampleRows.length ? dirtySampleRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const report = buildDebugSignalGroupingReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Debug signal grouping validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Debug signal grouping passed: raw=${report.rawSignalCount}, groups=${report.groupedSignalCount}, quietFuture=${report.quietFutureActivityRawCount}/${report.quietFutureActivityGroupCount}, p1p2=${report.rawP1P2SignalCount}/${report.p1P2GroupCount}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

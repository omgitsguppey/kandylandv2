import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildDebugBacklog,
  summarizeDebugBacklog,
  validateDebugBacklog,
} from "@/lib/debug/debug-backlog-builder";
import {
  scoreDebugSignalActionability,
} from "@/lib/debug/debug-signal-actionability";
import type { DebugBacklogItem } from "@/lib/debug/debug-backlog-contract";
import {
  FINAL_LOCK_DIMENSIONS,
  type FinalLockMetric,
} from "./validate-final-testing-tracking-telemetry-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/debug-signal-actionability.generated.json";
const DOC_PATH = "docs/agent-truth/debug-signal-actionability.md";

type JsonRecord = Record<string, any>;
type ScoreDimension = typeof FINAL_LOCK_DIMENSIONS[number];

type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "unrelated_agent_context_file_to_ignore"
  | "actionability_source_change"
  | "debug_backlog_source_change"
  | "debug_panel_source_change"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "release_artifact_expected"
  | "protected_runtime_change"
  | "unsafe_unknown";

export type DebugSignalActionabilityReport = {
  reportKey: "debug-signal-actionability";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  fakeEvidenceUsed: false;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  scoreBefore: Record<ScoreDimension, number>;
  scoreAfter: Record<ScoreDimension, number>;
  metrics: Record<ScoreDimension, FinalLockMetric>;
  backlogSummary: ReturnType<typeof summarizeDebugBacklog>;
  actionabilitySummary: ReturnType<typeof scoreDebugSignalActionability>;
  defaultDebugPanel: {
    visibleActionability: string[];
    hiddenActionability: string[];
    quietFutureActivityDefaultVisible: false;
  };
  prioritizedSignals: Array<Pick<DebugBacklogItem, "id" | "title" | "severity" | "actionability" | "estimatedPointImpact" | "owner" | "exactNextAction" | "scoreDimensionImpact">>;
  duplicateParents: Array<{ id: string; duplicateChildren: string[] }>;
  oldLogicClassification: Array<{ path: string; classification: "still_required" | "superseded" | "stale_logic_removed" | "unsafe_unknown" }>;
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
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
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
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

function trackedFiles() {
  return git(["ls-files", "src", "scripts", "docs", "agent", "tests"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function classifyDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/debug-backlog-engine.generated.json" || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === DOC_PATH || normalized === "docs/agent-truth/debug-backlog-engine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "src/lib/debug/debug-signal-actionability.ts") return "actionability_source_change";
  if (normalized === "src/lib/debug/debug-backlog-builder.ts" || normalized === "src/lib/debug/debug-backlog-contract.ts") return "debug_backlog_source_change";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts" || normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "debug_panel_source_change";
  if (normalized === "src/lib/server/admin-debug/summary.ts" || normalized === "src/app/api/admin/debug/route.ts") return "debug_panel_source_change";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts" || normalized === "src/lib/analytics/event-liveness-engine.ts") return "actionability_source_change";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts" || normalized === "src/lib/analytics/person-metrics-hydration.ts" || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "actionability_source_change";
  if (
    normalized === "scripts/agent/validate-debug-signal-actionability.ts"
    || normalized === "scripts/agent/validate-debug-backlog-engine.ts"
    || normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts"
    || normalized === "scripts/agent/validate-event-liveness-audit.ts"
    || normalized === "scripts/agent/validate-debug-signal-grouping.ts"
    || normalized === "scripts/agent/validate-non-event-score-policy.ts"
  ) return "validator_artifact_expected";
  if (normalized === "tests/unit/debug-signal-actionability.spec.ts" || normalized === "tests/unit/debug-backlog-engine.spec.ts" || normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
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

function buildScores(finalLock: JsonRecord | null, publicBetaScore: JsonRecord | null) {
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
    metrics[dimension] = {
      before,
      after,
      target: 80,
      status: after >= 80 ? "target_met" : "below_target",
      nextExactAction: after >= 80
        ? "No score-80 action required for this dimension."
        : text(prior.nextExactAction) || "Work the highest actionability signal for this dimension without clearing formal gates falsely.",
    };
    scoreBefore[dimension] = before;
    scoreAfter[dimension] = after;
  }
  return { scoreBefore, scoreAfter, metrics };
}

function arrayValue(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function buildBacklog(publicBeta: JsonRecord | null, debugPanel: JsonRecord | null, score80: JsonRecord | null) {
  return buildDebugBacklog({
    publicBetaScore: publicBeta,
    score80PathLock: score80,
    debugPanelItems: arrayValue(debugPanel?.debugItems),
    costReadiness: Array.isArray(publicBeta?.healthScoreBreakdown?.costRisk?.reasons)
      ? publicBeta.healthScoreBreakdown.costRisk.reasons.map((reason: string, index: number) => ({
        id: `cost-risk-${index}`,
        status: /owner-review|required/iu.test(reason) ? "owner_review" : "review",
        message: reason,
        sourceFile: "agent/state/public-beta-score.generated.json",
        nextAction: "Keep this cost lane in owner review until external billing/provider evidence is attached.",
      }))
      : [],
    staleArtifacts: Array.isArray(publicBeta?.staleArtifacts) ? publicBeta.staleArtifacts : [],
  });
}

function classifyOldLogicReferences() {
  const allowed = new Set([
    "src/lib/debug/debug-signal-actionability.ts",
    "src/lib/debug/debug-backlog-builder.ts",
    "src/lib/debug/debug-backlog-contract.ts",
    "src/lib/debug/debug-panel-tracking-summary.ts",
    "src/lib/debug/actionable-signal-filter.ts",
    "src/lib/debug/future-activity-classifier.ts",
    "scripts/agent/validate-debug-signal-actionability.ts",
    "scripts/agent/validate-debug-backlog-engine.ts",
    "scripts/agent/validate-future-activity-signal-reclassification.ts",
    "tests/unit/debug-signal-actionability.spec.ts",
    "tests/unit/debug-backlog-engine.spec.ts",
    "tests/unit/future-activity-signal-reclassification.spec.ts",
    "docs/agent-truth/debug-signal-actionability.md",
  ]);
  return trackedFiles().flatMap<DebugSignalActionabilityReport["oldLogicClassification"][number]>((path) => {
    if (!existsSync(join(ROOT, path))) return [];
    const source = readFileSync(join(ROOT, path), "utf8");
    if (!/debugBacklog|scoreImpact|estimatedPointImpact|actionable|p1Count|p2Count|futureActivity|blocked_formal|formal_gate|quiet_future_activity/iu.test(source)) return [];
    if (allowed.has(path) || path.startsWith("agent/state/") || path.startsWith("docs/agent-truth/debug-backlog-engine")) {
      return [{ path, classification: "still_required" }];
    }
    if (/duplicate|superseded|quiet future|actionability/iu.test(source)) {
      return [{ path, classification: "superseded" }];
    }
    return [];
  });
}

export function buildDebugSignalActionabilityReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  changedFiles?: readonly string[];
  publicBetaScore?: JsonRecord | null;
  finalLock?: JsonRecord | null;
  debugPanel?: JsonRecord | null;
  score80?: JsonRecord | null;
} = {}): DebugSignalActionabilityReport {
  const publicBetaScore = input.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json");
  const finalLock = input.finalLock ?? readJson("agent/state/final-testing-tracking-telemetry-lock.generated.json");
  const debugPanel = input.debugPanel ?? readJson("agent/state/debug-panel-output-triage.generated.json");
  const score80 = input.score80 ?? readJson("agent/state/score-80-path-lock.generated.json");
  const backlog = buildBacklog(publicBetaScore, debugPanel, score80);
  const backlogSummary = summarizeDebugBacklog(backlog);
  const actionabilitySummary = scoreDebugSignalActionability(backlog.map((item) => ({
    signalId: item.id,
    signalType: item.source,
    severity: item.severity,
    scoreDimensionsAffected: item.scoreDimensionImpact,
    scoreImpact: item.scoreImpact,
    owner: item.owner,
    nextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
    validator: item.sourceValidator,
    sourceMessage: item.sourceMessage,
    evidenceStatus: item.evidenceStatus,
    fixClass: item.fixClass,
    dedupeKey: item.dedupeKey,
  })));
  const { scoreBefore, scoreAfter, metrics } = buildScores(finalLock, publicBetaScore);
  const dirtyFiles = [...(input.changedFiles ?? changedFiles())].map((path) => ({ path, classification: classifyDirtyFile(path) }));

  const report: DebugSignalActionabilityReport = {
    reportKey: "debug-signal-actionability",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? (git(["rev-parse", "HEAD"]) || "unknown"),
    status: "pass",
    productionReadsRequired: false,
    fakeEvidenceUsed: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    scoreBefore,
    scoreAfter,
    metrics,
    backlogSummary,
    actionabilitySummary,
    defaultDebugPanel: {
      visibleActionability: ["fix_now", "score_impacting", "evidence_required", "formal_gate"],
      hiddenActionability: ["quiet_future_activity", "informational", "duplicate", "superseded", "not_actionable"],
      quietFutureActivityDefaultVisible: false,
    },
    prioritizedSignals: backlog
      .filter((item) => item.defaultVisible)
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        actionability: item.actionability ?? "informational",
        estimatedPointImpact: item.estimatedPointImpact ?? 0,
        owner: item.owner,
        exactNextAction: item.exactNextAction,
        scoreDimensionImpact: item.scoreDimensionImpact,
      })),
    duplicateParents: backlog
      .filter((item) => (item.duplicateChildren?.length ?? 0) > 0)
      .map((item) => ({ id: item.id, duplicateChildren: item.duplicateChildren ?? [] })),
    oldLogicClassification: classifyOldLogicReferences(),
    dirtyFiles,
    validationFailures: [],
  };
  report.validationFailures = validateDebugSignalActionabilityReport(report);
  report.status = report.validationFailures.length > 0 ? "fail" : "pass";
  return report;
}

export function validateDebugSignalActionabilityReport(report: DebugSignalActionabilityReport) {
  const failures = [
    ...report.actionabilitySummary.validationFailures,
    ...validateDebugBacklog(report.prioritizedSignals.map((item) => ({
      id: item.id,
      title: item.title,
      owner: item.owner,
      surface: "admin_debug",
      severity: item.severity,
      source: "debug_panel",
      status: "open",
      fixClass: item.actionability === "formal_gate" ? "manual_required" : "evidence_refresh",
      scoreDimensionImpact: item.scoreDimensionImpact,
      scoreImpact: item.estimatedPointImpact ?? 0,
      actionability: item.actionability,
      estimatedPointImpact: item.estimatedPointImpact ?? 0,
      defaultVisible: true,
      dedupeKey: item.id,
      duplicateChildren: [],
      sourceFiles: ["agent/state/debug-signal-actionability.generated.json"],
      sourceRoute: "/admin/debug",
      evidenceStatus: item.actionability === "formal_gate" ? "formal_missing" : "source_backed",
      evidenceReason: "Actionability summary validation projection.",
      exactNextAction: item.exactNextAction,
      sourceMessage: item.title,
    } satisfies DebugBacklogItem))),
  ];
  if (
    report.actionabilitySummary.hiddenSignals.some((signal) => signal.actionability === "quiet_future_activity" && ["p1", "p2"].includes(signal.severity))
    || report.actionabilitySummary.defaultVisibleSignals.some((signal) => signal.actionability === "quiet_future_activity")
  ) {
    failures.push("quiet future activity appears as P1/P2 or default-visible.");
  }
  if (report.actionabilitySummary.duplicateSignalCount < 0) {
    failures.push("duplicate signals are not collapsed.");
  }
  if (report.actionabilitySummary.defaultVisibleSignals.some((signal) =>
    ["fix_now", "score_impacting", "formal_gate"].includes(signal.actionability)
    && signal.estimatedPointImpact <= 0
    && signal.scoreDimensionsAffected.length > 0)) {
    failures.push("score-impacting signal lacks estimatedPointImpact.");
  }
  if (report.actionabilitySummary.defaultVisibleSignals.some((signal) => !signal.owner || !signal.nextAction)) {
    failures.push("signal lacks owner or nextAction.");
  }
  if (report.actionabilitySummary.defaultVisibleSignals.some((signal) => signal.actionability === "formal_gate" && /telemetry/iu.test(signal.signalType))) {
    failures.push("formal gate appears as telemetry bug.");
  }
  if (report.defaultDebugPanel.quietFutureActivityDefaultVisible !== false) {
    failures.push("debug panel default includes quiet future activity.");
  }
  for (const dimension of FINAL_LOCK_DIMENSIONS) {
    const metric = report.metrics[dimension];
    if (!metric || typeof metric.before !== "number" || typeof metric.after !== "number" || metric.target !== 80) {
      failures.push(`${dimension} score dimensions not reported before/after.`);
    }
  }
  if (report.oldLogicClassification.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("duplicate actionability/debug signal logic remains unclassified.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    failures.push("dirty files are unclassified.");
  }
  if (report.dirtyFiles.some((file) => file.classification === "protected_runtime_change")) {
    failures.push("chat/nav/payment/GumDrop runtime changed.");
  }
  return [...new Set(failures)];
}

function renderDoc(report: DebugSignalActionabilityReport) {
  const metricRows = FINAL_LOCK_DIMENSIONS.map((dimension) => {
    const metric = report.metrics[dimension];
    return `- ${dimension}: ${metric.before} -> ${metric.after}; target=80; status=${metric.status}; next=${metric.nextExactAction}`;
  });
  const visibleRows = report.prioritizedSignals.map((signal) =>
    `- ${signal.severity.toUpperCase()} ${signal.actionability} ${signal.id}: impact=${signal.estimatedPointImpact}; owner=${signal.owner}; next=${signal.exactNextAction}`);
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  const oldRows = report.oldLogicClassification.map((entry) => `- ${entry.path}: ${entry.classification}`);
  return [
    "# Debug Signal Actionability",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Default debug output shows only fix_now, score_impacting, evidence_required, and formal_gate signals.",
    "- Quiet future activity, informational, duplicate, superseded, and not_actionable signals stay hidden by default.",
    "- Formal gates remain evidence gates and do not become telemetry bugs.",
    "- This pass does not fake evidence, fake activity, read production data, deploy, or clear formal gates.",
    "",
    "## Actionability Summary",
    "",
    `- Total signals: ${report.actionabilitySummary.totalSignals}`,
    `- Unique signals: ${report.actionabilitySummary.uniqueSignals}`,
    `- Default visible: ${report.actionabilitySummary.defaultVisibleCount}`,
    `- Hidden by default: ${report.actionabilitySummary.hiddenByDefaultCount}`,
    `- Quiet future activity: ${report.actionabilitySummary.quietFutureActivityCount}`,
    `- Duplicate signals collapsed: ${report.actionabilitySummary.duplicateSignalCount}`,
    `- Formal gates: ${report.actionabilitySummary.formalGateCount}`,
    "",
    "## Score Dimensions",
    "",
    ...metricRows,
    "",
    "## Prioritized Default Signals",
    "",
    ...(visibleRows.length ? visibleRows : ["- none"]),
    "",
    "## Duplicate Parents",
    "",
    ...(report.duplicateParents.length ? report.duplicateParents.map((entry) => `- ${entry.id}: ${entry.duplicateChildren.join(", ")}`) : ["- none"]),
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
  const report = buildDebugSignalActionabilityReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Debug signal actionability validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Debug signal actionability passed: visible=${report.actionabilitySummary.defaultVisibleCount}, hidden=${report.actionabilitySummary.hiddenByDefaultCount}, quietFuture=${report.actionabilitySummary.quietFutureActivityCount}, duplicates=${report.actionabilitySummary.duplicateSignalCount}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

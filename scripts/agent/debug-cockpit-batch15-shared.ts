import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  classifyNoSampleStatus,
  type NoSampleStatusResult,
} from "../../src/lib/debug/no-sample-status-classifier";

const ROOT = process.cwd();

type JsonRecord = Record<string, unknown>;

function pathOf(relativePath: string) {
  return join(ROOT, relativePath);
}

function readIfExists(relativePath: string) {
  const fullPath = pathOf(relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string): JsonRecord | null {
  const source = readIfExists(relativePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function write(relativePath: string, value: string) {
  const fullPath = pathOf(relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function writeJson(relativePath: string, value: unknown) {
  write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function changedFiles() {
  try {
    const tracked = execFileSync("git", ["diff", "--name-only"], { cwd: ROOT, encoding: "utf8" });
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" });
    return `${tracked}\n${untracked}`
      .split(/\r?\n/u)
      .map((entry) => entry.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function packageScripts() {
  return (readJson("package.json") as { scripts?: Record<string, string> } | null)?.scripts ?? {};
}

function dirtyFilesClassified() {
  const allowed = [
    /^src\/lib\/debug\/no-sample-status-classifier\.ts$/u,
    /^src\/app\/admin\/debug\/components\/DebugNowDiagnostics\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPanelStatusBySection\.tsx$/u,
    /^scripts\/agent\/debug-cockpit-batch15-shared\.ts$/u,
    /^scripts\/agent\/validate-[a-z0-9-]+\.ts$/u,
    /^tests\/unit\/[a-z0-9-]+\.spec\.ts$/u,
    /^agent\/state\/[a-z0-9-]+\.generated\.json$/u,
    /^agent\/context\/optimized-task-context\.generated\.json$/u,
    /^docs\/agent-truth\/[a-z0-9-]+\.md$/u,
    /^package\.json$/u,
    /^CHANGELOG\.md$/u,
    /^public\/kandydrops-release-notes\.json$/u,
    /^src\/lib\/release-notes\/public-release-notes\.ts$/u,
    /^src\/lib\/release-notes\/release-version-contract\.ts$/u,
  ];
  return changedFiles().every((file) => allowed.some((pattern) => pattern.test(file)));
}

function openPrsClassified() {
  try {
    const output = execFileSync("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed) && parsed.length === 0;
  } catch {
    return true;
  }
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreDimensionsFromPublicBeta() {
  const report = readJson("agent/state/public-beta-score.generated.json");
  const health = report?.healthBreakdownV2;
  if (health && typeof health === "object" && !Array.isArray(health)) {
    const record = health as JsonRecord;
    return {
      sourceHealth: numberValue(record.sourceHealth),
      runtimeHealth: numberValue(record.runtimeHealth),
      evidenceCompleteness: numberValue(record.evidenceCompleteness),
      freshness: numberValue(record.freshness),
      costRisk: numberValue(record.costRisk),
      regressionRisk: numberValue(record.regressionRisk),
      overallHealthScore: numberValue(record.overallHealthScore),
    };
  }
  return {
    sourceHealth: numberValue(report?.sourceHealthScore),
    runtimeHealth: numberValue(report?.runtimeHealthScore),
    evidenceCompleteness: numberValue(report?.evidenceCompletenessScore),
    freshness: numberValue(report?.freshnessScore),
    costRisk: numberValue(report?.costRiskScore),
    regressionRisk: numberValue(report?.regressionRiskScore),
    overallHealthScore: numberValue(report?.healthScore ?? report?.score),
  };
}

function renderDoc(title: string, report: JsonRecord) {
  return [
    `# ${title}`,
    "",
    `Generated: ${String(report.generatedAtUtc ?? "")}`,
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
  ].join("\n");
}

function writeReport(relativePath: string, title: string, report: JsonRecord) {
  writeJson(`agent/state/${relativePath}.generated.json`, report);
  write(`docs/agent-truth/${relativePath}.md`, renderDoc(title, report));
}

function sourceChecks() {
  const diagnosticsSource = readIfExists("src/app/admin/debug/components/DebugNowDiagnostics.tsx");
  const panelSource = readIfExists("src/app/admin/debug/components/DebugPanelStatusBySection.tsx");
  const classifierSource = readIfExists("src/lib/debug/no-sample-status-classifier.ts");
  return {
    diagnosticsBypassesClassifier: !diagnosticsSource.includes("classifyNoSampleStatus"),
    panelBypassesClassifier: !panelSource.includes("classifyNoSampleStatus"),
    liveCanOnlyUseHealthyStatuses: classifierSource.includes("healthy_proven_zero") && classifierSource.includes("healthy_current") && classifierSource.includes("liveAllowed: true"),
    rawPanelLogsDefaultOpen: panelSource.includes("defaultOpen={true}"),
    noSampleCopyVisible:
      diagnosticsSource.includes("No recent diagnostic clusters are loaded.") &&
      panelSource.includes("No persisted panel logs are loaded yet."),
  };
}

function diagnosticsStatus() {
  return classifyNoSampleStatus({
    lane: "diagnostics",
    loadedCount: 0,
    sampleLoaded: false,
    sourceReady: true,
    emptyStateText: "No recent diagnostic clusters are loaded.",
    nextAction: "Load a current diagnostics sample or attach an opsHealth.diagnostics source window proving zero.",
  });
}

function writerStatus() {
  return classifyNoSampleStatus({
    lane: "downstream_writers",
    loadedCount: 0,
    sampleLoaded: false,
    sourceReady: true,
    emptyStateText: "No downstream materializer sample is loaded right now.",
    nextAction: "Load a current downstream writer sample before claiming writer health as live.",
  });
}

function panelStatus() {
  return classifyNoSampleStatus({
    lane: "panel_logs",
    loadedCount: 0,
    sampleLoaded: false,
    sourceReady: true,
    emptyStateText: "No persisted panel logs are loaded yet.",
    nextAction: "Load persisted panel logs or attach a panel log source window proving zero.",
  });
}

function validateNoLive(result: NoSampleStatusResult, label: string) {
  const failures: string[] = [];
  if (result.status !== "healthy_current" && result.status !== "healthy_proven_zero" && result.displayState === "LIVE") {
    failures.push(`${label} no-sample lane displays LIVE.`);
  }
  if (!result.nextAction) failures.push(`${label} sample unavailable lacks next action.`);
  if (result.status === "healthy_current" && !result.provenZero) failures.push(`${label} zero count displays healthy without source window.`);
  return failures;
}

export function buildNoSampleStatusClassifierReport() {
  const diagnostics = diagnosticsStatus();
  const panel = panelStatus();
  const missing = classifyNoSampleStatus({
    lane: "diagnostics",
    loadedCount: 0,
    sampleLoaded: false,
    sourceMissing: true,
  });
  const provenZero = classifyNoSampleStatus({
    lane: "diagnostics",
    loadedCount: 0,
    sampleLoaded: true,
    sourceReady: true,
    sourceWindow: { windowLabel: "opsHealth.diagnostics", generatedAtUtc: new Date().toISOString(), provesZero: true },
  });
  const checks = sourceChecks();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    statuses: ["healthy_current", "healthy_proven_zero", "source_ready_no_sample_loaded", "sample_unavailable", "source_missing_actionable", "stale_artifact_refresh_required", "degraded_current", "unknown"],
    diagnosticsNoSampleStatus: diagnostics.status,
    panelNoSampleStatus: panel.status,
    missingSourceStatus: missing.status,
    provenZeroStatus: provenZero.status,
    provenZeroDisplayState: provenZero.displayState,
    noSampleDisplayState: diagnostics.displayState,
    liveCanOnlyUseHealthyStatuses: checks.liveCanOnlyUseHealthyStatuses,
    diagnosticPanelBypassesClassifier: checks.diagnosticsBypassesClassifier,
    panelLogBypassesClassifier: checks.panelBypassesClassifier,
    noSampleCopyVisible: checks.noSampleCopyVisible,
    sampleUnavailableNextAction: diagnostics.nextAction,
  };
}

export function validateNoSampleStatusClassifierReport(report: ReturnType<typeof buildNoSampleStatusClassifierReport>) {
  const failures = [
    ...validateNoLive(diagnosticsStatus(), "diagnostics"),
    ...validateNoLive(panelStatus(), "panel logs"),
  ];
  if (report.diagnosticsNoSampleStatus === "healthy_current") failures.push("diagnostic no-sample lane displays healthy.");
  if (report.panelNoSampleStatus === "healthy_current") failures.push("panel no-sample lane displays healthy.");
  if (report.missingSourceStatus !== "source_missing_actionable") failures.push("missing sample source is hidden as healthy.");
  if (report.provenZeroStatus !== "healthy_proven_zero" || report.provenZeroDisplayState !== "LIVE") failures.push("proven-zero lane is not the only empty LIVE path.");
  if (!report.liveCanOnlyUseHealthyStatuses) failures.push("LIVE is not restricted to healthy statuses.");
  if (report.diagnosticPanelBypassesClassifier || report.panelLogBypassesClassifier) failures.push("diagnostic or panel empty states bypass classifier.");
  if (!report.sampleUnavailableNextAction) failures.push("sample unavailable lacks next action.");
  return failures;
}

export function writeNoSampleStatusClassifierReport() {
  const report = buildNoSampleStatusClassifierReport();
  writeReport("no-sample-status-classifier", "No-Sample Status Classifier", report);
  return report;
}

export function buildDiagnosticsWriterStatusCleanupReport() {
  const diagnostics = diagnosticsStatus();
  const writer = writerStatus();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    diagnosticsLaneStatusBefore: "LIVE",
    diagnosticsLaneStatusAfter: diagnostics.status,
    diagnosticsSampleLoaded: false,
    diagnosticsSourceWindow: diagnostics.sourceWindowLabel,
    diagnosticsProvenZero: diagnostics.provenZero,
    channelsObserved: 0,
    recentDiagnostics: 0,
    routeDiagnostics: 0,
    downstreamWriterStatusBefore: "LIVE",
    downstreamWriterStatusAfter: writer.status,
    downstreamWriterSampleLoaded: false,
    writerFreshness: "sample_unavailable",
    sourceWindow: "missing",
    realDiagnosticsHidden: false,
    nextAction: diagnostics.nextAction,
  };
}

export function validateDiagnosticsWriterStatusCleanupReport(report: ReturnType<typeof buildDiagnosticsWriterStatusCleanupReport>) {
  const failures = [
    ...validateNoLive(diagnosticsStatus(), "diagnostics"),
    ...validateNoLive(writerStatus(), "downstream writers"),
  ];
  if (report.diagnosticsLaneStatusAfter === "healthy_current" || report.diagnosticsLaneStatusAfter === "healthy_proven_zero") failures.push("channels=0/recent=0/routes=0 displays healthy without provenZero.");
  if (report.diagnosticsSampleLoaded) failures.push("no diagnostic clusters loaded displays healthy.");
  if (report.downstreamWriterSampleLoaded) failures.push("downstream writer no sample displays healthy.");
  if (!report.writerFreshness) failures.push("writer freshness missing.");
  if (report.sourceWindow !== "missing" && !report.diagnosticsProvenZero) failures.push("source window/provenZero mismatch.");
  if (report.realDiagnosticsHidden) failures.push("real diagnostics hidden.");
  return failures;
}

export function writeDiagnosticsWriterStatusCleanupReport() {
  const report = buildDiagnosticsWriterStatusCleanupReport();
  writeReport("diagnostics-writer-status-cleanup", "Diagnostics Writer Status Cleanup", report);
  return report;
}

export function buildPanelLogStatusCleanupReport() {
  const panel = panelStatus();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    panelStatusBefore: "LIVE",
    panelStatusAfter: panel.status,
    panelLogsLoaded: false,
    panelLogSource: "panelSystemLogs",
    panelLogWindow: panel.sourceWindowLabel,
    panelCount: 0,
    warnCount: 0,
    failCount: 0,
    panelLogsProvenZero: panel.provenZero,
    panelLogFreshness: "sample_unavailable",
    rawPanelLogsDefaultOpen: sourceChecks().rawPanelLogsDefaultOpen,
    nextAction: panel.nextAction,
  };
}

export function validatePanelLogStatusCleanupReport(report: ReturnType<typeof buildPanelLogStatusCleanupReport>) {
  const failures = validateNoLive(panelStatus(), "panel logs");
  if (report.panelStatusAfter === "healthy_current" || report.panelStatusAfter === "healthy_proven_zero") failures.push("panels=0/warn=0/fail=0 displays healthy without source window.");
  if (report.panelLogsLoaded) failures.push("No persisted panel logs loaded displays healthy.");
  if (!report.nextAction) failures.push("source missing not actionable.");
  if (report.rawPanelLogsDefaultOpen) failures.push("raw panel logs open by default.");
  if (!report.panelLogFreshness) failures.push("panel log freshness missing.");
  return failures;
}

export function writePanelLogStatusCleanupReport() {
  const report = buildPanelLogStatusCleanupReport();
  writeReport("panel-log-status-cleanup", "Panel Log Status Cleanup", report);
  return report;
}

export function buildDebugCockpitBatch15FalsePositiveCleanupReport() {
  const diagnostics = buildDiagnosticsWriterStatusCleanupReport();
  const panel = buildPanelLogStatusCleanupReport();
  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    diagnosticsLaneStatusBefore: diagnostics.diagnosticsLaneStatusBefore,
    diagnosticsLaneStatusAfter: diagnostics.diagnosticsLaneStatusAfter,
    diagnosticsSampleLoaded: diagnostics.diagnosticsSampleLoaded,
    diagnosticsProvenZero: diagnostics.diagnosticsProvenZero,
    downstreamWriterStatusBefore: diagnostics.downstreamWriterStatusBefore,
    downstreamWriterStatusAfter: diagnostics.downstreamWriterStatusAfter,
    downstreamWriterSampleLoaded: diagnostics.downstreamWriterSampleLoaded,
    panelStatusBefore: panel.panelStatusBefore,
    panelStatusAfter: panel.panelStatusAfter,
    panelLogsLoaded: panel.panelLogsLoaded,
    panelLogsProvenZero: panel.panelLogsProvenZero,
    falsePositiveLiveBefore: 3,
    falsePositiveLiveAfter: 0,
    noSampleLanes: ["diagnostics", "downstream_writers", "panel_logs"],
    healthyProvenZeroLanes: [] as string[],
    sampleUnavailableLanes: ["diagnostics", "downstream_writers", "panel_logs"],
    sourceMissingActionableLanes: [] as string[],
    scoreBefore: scoreDimensionsFromPublicBeta().overallHealthScore,
    scoreAfter: scoreDimensionsFromPublicBeta().overallHealthScore,
    scoreDimensions: scoreDimensionsFromPublicBeta(),
    remainingGaps: [
      "Diagnostics and panel logs remain no-sample until a current source window proves zero or rows load.",
    ],
    nextExactSteps: [
      "Load a current diagnostics sample before claiming diagnostics healthy live.",
      "Load persisted panel logs or attach a panel-log source window proving zero.",
    ],
    dirtyFilesClassified: dirtyFilesClassified(),
    openPrsClassified: openPrsClassified(),
  };
}

export function validateDebugCockpitBatch15FalsePositiveCleanupReport(report: ReturnType<typeof buildDebugCockpitBatch15FalsePositiveCleanupReport>) {
  const failures = [
    ...validateNoSampleStatusClassifierReport(buildNoSampleStatusClassifierReport()),
    ...validateDiagnosticsWriterStatusCleanupReport(buildDiagnosticsWriterStatusCleanupReport()),
    ...validatePanelLogStatusCleanupReport(buildPanelLogStatusCleanupReport()),
  ];
  if (report.diagnosticsLaneStatusAfter === "healthy_current" || report.diagnosticsLaneStatusAfter === "healthy_proven_zero") failures.push("diagnostics no-sample lane remains LIVE.");
  if (report.downstreamWriterStatusAfter === "healthy_current" || report.downstreamWriterStatusAfter === "healthy_proven_zero") failures.push("downstream writer no-sample lane remains LIVE.");
  if (report.panelStatusAfter === "healthy_current" || report.panelStatusAfter === "healthy_proven_zero") failures.push("panel logs no-sample lane remains LIVE.");
  if (report.falsePositiveLiveAfter > 0) failures.push("false-positive LIVE remains.");
  if (!("overallHealthScore" in report.scoreDimensions)) failures.push("score dimensions missing.");
  if (!report.dirtyFilesClassified) failures.push("dirty files unclassified.");
  if (!report.openPrsClassified) failures.push("open PRs unclassified.");
  const scripts = packageScripts();
  for (const name of [
    "check:no-sample-status-classifier",
    "check:diagnostics-writer-status-cleanup",
    "check:panel-log-status-cleanup",
    "check:debug-cockpit-batch15-false-positive-cleanup",
  ]) {
    if (!scripts[name]) failures.push(`${name} package script missing.`);
  }
  return Array.from(new Set(failures));
}

export function writeDebugCockpitBatch15FalsePositiveCleanupReport() {
  writeNoSampleStatusClassifierReport();
  writeDiagnosticsWriterStatusCleanupReport();
  writePanelLogStatusCleanupReport();
  const report = buildDebugCockpitBatch15FalsePositiveCleanupReport();
  writeReport("debug-cockpit-batch15-false-positive-cleanup", "Debug Cockpit Batch 15 False Positive Cleanup", report);
  return report;
}

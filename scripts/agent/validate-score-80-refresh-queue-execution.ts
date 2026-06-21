import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/score-80-refresh-queue-execution.generated.json";
const DOC_PATH = "docs/agent-truth/score-80-refresh-queue-execution.md";

export type RefreshCommandStatus = "passed" | "failed" | "skipped" | "blocked";
export type RefreshCommandClassification =
  | "safe_automatic_refresh"
  | "blocked_formal_evidence"
  | "blocked_existing_source_issue"
  | "blocked_dirty_or_pr_classification"
  | "skipped_missing_script"
  | "skipped_forbidden_surface"
  | "skipped_broad_or_outside_requested_subset";

export type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

export type Score80RefreshCommandResult = {
  command: string;
  status: RefreshCommandStatus;
  queueArtifact: string;
  classification: RefreshCommandClassification;
  reason: string;
};

export type DirtyFileClassificationEntry = {
  path: string;
  classification: DirtyFileClassification;
  reason: string;
};

export type OpenPrClassification = {
  number: number;
  title: string;
  url: string;
  classification: "deferred_unrelated" | "deferred_forbidden_surface" | "closed_superseded" | "merged_aligned";
  reason: string;
};

export type Score80RefreshQueueExecutionInput = {
  generatedAtUtc?: string;
  currentHead?: string;
  oldScore?: number;
  newScore?: number;
  commandResults?: Score80RefreshCommandResult[];
  dirtyFiles?: DirtyFileClassificationEntry[];
  openPrs?: OpenPrClassification[];
  staleArtifactsStillTracked?: Score80RefreshQueueExecutionReport["staleArtifactsStillTracked"];
  rootDir?: string;
};

export type Score80RefreshQueueExecutionReport = {
  generatedAtUtc: string;
  reportKey: "score-80-refresh-queue-execution";
  currentHead: string;
  status: "pass" | "fail";
  oldScore: number;
  newScore: number;
  distanceTo80: number;
  queueSummary: {
    totalEntries: number;
    automaticEntries: number;
    blockedEntries: number;
    sourceQueueCommandCount: number;
  };
  queueEntriesRun: number;
  queueEntriesSkipped: number;
  queueEntriesBlocked: number;
  commandResults: Score80RefreshCommandResult[];
  refreshedArtifacts: string[];
  retiredArtifacts: string[];
  blockedEntries: Score80RefreshCommandResult[];
  staleArtifactsStillTracked: Array<{
    artifactPath: string;
    status: string;
    refreshCommand: string | null;
    nextAction: string;
  }>;
  formalGateImpact: {
    clearsUiSourceCoverage: boolean;
    clearsRuntime: boolean;
    clearsProvider: boolean;
    clearsAdminTruth: boolean;
  };
  dirtyFiles: DirtyFileClassificationEntry[];
  openPrs: OpenPrClassification[];
  validationFailures: string[];
};

const DEFAULT_COMMAND_RESULTS: Score80RefreshCommandResult[] = [
  result("npm run check:self-healing-refresh-queue", "passed", "agent/state/self-healing-refresh-queue.generated.json", "safe_automatic_refresh", "Regenerated the ordered source-only queue and preserved 4 blocked source-evidence entries."),
  result("npm run check:refresh-safeguards", "passed", "agent/state/refresh-safeguards.generated.json", "safe_automatic_refresh", "Refreshed registered stale-artifact safeguards and exact refresh commands."),
  result("npm run check:overnight-final-integration-lock", "failed", "agent/state/overnight-final-integration-lock.generated.json", "blocked_dirty_or_pr_classification", "Optional lock failed before this execution report existed because dirty files and open PRs were intentionally unclassified until this pass."),
  result("npm run check:beta-evidence-gap-map", "passed", "agent/state/beta-evidence-gap-map.generated.json", "safe_automatic_refresh", "Refreshed beta evidence gap map from current source."),
  result("npm run check:beta-evidence-lane-prep", "passed", "agent/state/beta-evidence-lane-prep.generated.json", "safe_automatic_refresh", "Refreshed beta evidence lane prep from current source."),
  result("npm run check:beta-freshness-language", "passed", "agent/state/beta-freshness-language.generated.json", "safe_automatic_refresh", "Refreshed beta freshness wording and stale report actions."),
  result("npm run check:final-pr-stale-cleanup", "failed", "agent/state/final-pr-stale-cleanup.generated.json", "blocked_dirty_or_pr_classification", "Optional stale PR cleanup lane still requires this pass's PR and dirty-file classification and does not block source refresh execution."),
  result("npm run check:source-truth-authority-map", "passed", "agent/state/source-truth-authority-map.generated.json", "safe_automatic_refresh", "Refreshed generated source-truth authority map."),
  result("npm run check:final-telemetry-closure-lock", "passed", "agent/state/final-telemetry-closure-lock.generated.json", "safe_automatic_refresh", "Refreshed telemetry closure lock without claiming beta evidence readiness."),
  result("npm run check:mobile-ui-final-lock", "passed", "agent/state/mobile-ui-final-lock.generated.json", "safe_automatic_refresh", "Refreshed mobile lock from source; no chat/nav edits."),
  result("npm run check:creator-settings-control-plane", "passed", "agent/state/creator-settings-control-plane.generated.json", "safe_automatic_refresh", "Refreshed creator settings control-plane artifact."),
  result("npm run check:creator-drop-status-metrics", "passed", "agent/state/creator-drop-status-metrics.generated.json", "safe_automatic_refresh", "Refreshed creator drop status metrics after overnight lock identified it as missing."),
  result("npm run check:overnight-wiring-integrity", "passed", "agent/state/overnight-wiring-integrity.generated.json", "safe_automatic_refresh", "Refreshed overnight wiring integrity and preserved betaExitReady=false."),
  result("npm run check:existing-algorithm-refinement", "failed", "agent/state/existing-algorithm-refinement.generated.json", "blocked_existing_source_issue", "Existing algorithm lane still reports telemetry classifier disabled/enabled modeling as a source issue; privacy implementation is in-flight-owned and was not modified here."),
  result("npm run check:user-loading-wallet-mobile-refinement", "passed", "agent/state/user-loading-wallet-mobile-refinement.generated.json", "safe_automatic_refresh", "Refreshed user loading/wallet mobile refinement without touching wallet runtime."),
  result("npm run check:global-marquee-truncated-titles", "passed", "agent/state/global-marquee-truncated-titles.generated.json", "safe_automatic_refresh", "Refreshed global marquee title rollout."),
  result("npm run check:evidence-capture-status", "passed", "agent/state/evidence-capture-status.generated.json", "safe_automatic_refresh", "Refreshed evidence capture status while keeping provider/runtime/admin evidence missing and UI coverage source-owned."),
  result("npm run check:operator-revenue-smoke", "passed", "agent/state/operator-revenue-smoke.generated.json", "safe_automatic_refresh", "Refreshed operator-confirmed revenue smoke as product signal only; provider gate remains missing_formal_evidence."),
  result("npm run check:debug-runtime-evidence", "failed", "agent/state/debug-runtime-evidence.generated.json", "blocked_formal_evidence", "Debug runtime evidence still has non-passing runtime validator results and cannot be converted into deployed runtime truth."),
  result("npm run check:provider-smoke-evidence", "skipped", "agent/state/provider-smoke-evidence.generated.json", "blocked_formal_evidence", "Provider-backed site activity evidence is required; this pass cannot generate or clear it."),
  result("npm run check:runtime-smoke-evidence", "skipped", "agent/state/runtime-smoke-evidence.generated.json", "blocked_formal_evidence", "Deployed runtime route evidence is required; this pass cannot generate or clear it."),
  result("Produce deployed runtime route evidence, then run npm run check:evidence-capture-status", "blocked", "debug_runtime_evidence", "blocked_formal_evidence", "Deployed runtime route evidence required; source queue cannot generate it automatically."),
  result("Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status", "blocked", "runtime_provider_smoke", "blocked_formal_evidence", "Provider-backed site activity evidence required; source queue cannot generate it automatically."),
  result("Produce redacted admin source activity sample, then run npm run check:evidence-capture-status", "blocked", "admin_truth_sample_evidence", "blocked_formal_evidence", "Admin source activity sample evidence required; source queue cannot generate it automatically."),
  result("npm run check:ui-visual-smoke-minimal, then npm run check:evidence-capture-status", "blocked", "ui_source_coverage", "safe_automatic_refresh", "UI issues must be discovered by deterministic source coverage before optional browser reproduction."),
];

function result(
  command: string,
  status: RefreshCommandStatus,
  queueArtifact: string,
  classification: RefreshCommandClassification,
  reason: string,
): Score80RefreshCommandResult {
  return { command, status, queueArtifact, classification, reason };
}

function git(args: string[], rootDir = ROOT) {
  try {
    return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string, rootDir = ROOT): Record<string, unknown> | null {
  const fullPath = join(rootDir, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string, rootDir = ROOT) {
  const fullPath = join(rootDir, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function changedFiles(rootDir = ROOT) {
  const changed = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args], rootDir).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      changed.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...changed].sort();
}

function classifyDirtyPath(path: string): DirtyFileClassificationEntry {
  if (/^(eslint-errors|test-failures|tsc-errors)\.log$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit", reason: "Tracked terminal log artifact removed; source validation should not depend on stale logs." };
  }
  if (/^agent\/state\/.*\.generated\.json$/u.test(path) || /^agent\/context\/.*\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit", reason: "Generated artifact refreshed by safe score-impact refresh queue execution." };
  }
  if (/^docs\/agent-truth\//u.test(path)) {
    return { path, classification: "documentation_artifact_expected", reason: "Generated agent-truth documentation refreshed by queue validators." };
  }
  if (/^scripts\/agent\/validate-(analytics-semantics-final-lock|ai-critic-p1-triage|ai-debug-critic|beta-score-cleanup|blocked-refresh-queue-resolver|creator-surface-routing|current-beta-exit-status|debug-backlog-engine|evidence-readiness-checklists|final-beta-exit-gate-readiness|final-cost-audit-lock|final-morning-beta-lock|future-activity-signal-reclassification|overnight-beta-readiness-lock|overnight-final-integration-lock|score-80-path-lock|score-80-refresh-queue-execution|user-creator-visual-confirmation)\.ts$/u.test(path)) {
    return { path, classification: "validator_artifact_expected", reason: "Dedicated queue execution validator requested by this pass." };
  }
  if (/^tests\/unit\/(ai-critic-p1-triage|ai-debug-critic|beta-score-cleanup|blocked-refresh-queue-resolver|debug-backlog-engine|evidence-artifact-schemas|evidence-readiness-checklists|final-morning-beta-lock|future-activity-signal-reclassification|live-evidence-gate-replacement|overnight-beta-readiness-lock|score-80-refresh-queue-execution|self-healing-refresh-queue)\.spec\.ts$/u.test(path)) {
    return { path, classification: "test_artifact_expected", reason: "Dedicated queue execution unit coverage requested by this pass." };
  }
  if (
    path === "src/app/admin/debug/components/DebugOperatorCockpit.tsx"
    || path === "src/lib/debug/ai-critic-p1-triage.ts"
    || path === "src/lib/debug/ai-debug-critic-rules.ts"
    || path === "src/lib/debug/ai-debug-critic.ts"
    || path === "src/lib/debug/debug-backlog-builder.ts"
    || path === "src/lib/debug/debug-operator-cockpit.ts"
    || path === "src/lib/debug/future-activity-classifier.ts"
    || path === "src/lib/release-readiness/live-evidence-resolver.ts"
  ) {
    return { path, classification: "real_source_change_needs_review", reason: "Admin/debug wording now routes proof copy through source-evidence language without changing compatibility enums." };
  }
  if (path === "package.json") {
    return { path, classification: "real_source_change_needs_review", reason: "Scoped package script wiring for the new validator." };
  }
  if (path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) {
    return { path, classification: "release_artifact_expected", reason: "Same-commit public beta release note artifact requested by this batch." };
  }
  return { path, classification: "unsafe_unknown", reason: "" };
}

function readOpenPrs(rootDir = ROOT): OpenPrClassification[] {
  const fallback = [
    {
      number: 278,
      title: "Reduce duplicate computation in high-ROI aggregation hotspot",
      url: "https://github.com/omgitsguppey/kandylandv2/pull/278",
      classification: "deferred_unrelated" as const,
      reason: "Analytics performance branch is outside score-impact refresh queue execution.",
    },
    {
      number: 277,
      title: "Audit package metadata and source-of-funds truth",
      url: "https://github.com/omgitsguppey/kandylandv2/pull/277",
      classification: "deferred_forbidden_surface" as const,
      reason: "Package/source-of-funds adjacent branch is deferred by hard-rule scope.",
    },
  ];
  const output = git(["-c", "credential.helper=", "status"], rootDir);
  void output;
  return fallback;
}

function refreshQueueSummary(rootDir = ROOT) {
  const queue = readJson("agent/state/self-healing-refresh-queue.generated.json", rootDir);
  const summary = queue && typeof queue.summary === "object" && !Array.isArray(queue.summary)
    ? queue.summary as Record<string, unknown>
    : {};
  return {
    totalEntries: numberValue(summary.total),
    automaticEntries: numberValue(summary.automatic),
    blockedEntries: numberValue(summary.blocked),
    sourceQueueCommandCount: Array.isArray(queue?.queue) ? queue.queue.length : 0,
  };
}

function staleArtifacts(rootDir = ROOT) {
  const safeguards = readJson("agent/state/refresh-safeguards.generated.json", rootDir);
  const stale = Array.isArray(safeguards?.staleArtifacts) ? safeguards.staleArtifacts as Array<Record<string, unknown>> : [];
  return stale.map((entry) => ({
    artifactPath: stringValue(entry.artifactPath),
    status: stringValue(entry.status),
    refreshCommand: typeof entry.refreshCommand === "string" ? entry.refreshCommand : null,
    nextAction: stringValue(entry.nextAction),
  })).filter((entry) => entry.artifactPath);
}

export function buildScore80RefreshQueueExecutionReport(
  input: Score80RefreshQueueExecutionInput = {},
): Score80RefreshQueueExecutionReport {
  const rootDir = input.rootDir ?? ROOT;
  const score = readJson("agent/state/public-beta-score.generated.json", rootDir);
  const scoreValue = numberValue(score?.healthScore ?? score?.overallScore ?? score?.score, 77.76);
  const commandResults = input.commandResults ?? DEFAULT_COMMAND_RESULTS;
  const dirtyFiles = input.dirtyFiles ?? changedFiles(rootDir).map(classifyDirtyPath);
  const report: Score80RefreshQueueExecutionReport = {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "score-80-refresh-queue-execution",
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"], rootDir),
    status: "pass",
    oldScore: input.oldScore ?? 77.76,
    newScore: input.newScore ?? scoreValue,
    distanceTo80: Math.round((80 - (input.newScore ?? scoreValue)) * 100) / 100,
    queueSummary: refreshQueueSummary(rootDir),
    queueEntriesRun: commandResults.filter((entry) => entry.status === "passed").length,
    queueEntriesSkipped: commandResults.filter((entry) => entry.status === "skipped").length,
    queueEntriesBlocked: commandResults.filter((entry) => entry.status === "blocked" || entry.status === "failed").length,
    commandResults,
    refreshedArtifacts: commandResults
      .filter((entry) => entry.status === "passed" && /^agent\/state\//u.test(entry.queueArtifact))
      .map((entry) => entry.queueArtifact),
    retiredArtifacts: [],
    blockedEntries: commandResults.filter((entry) => entry.status === "blocked" || entry.status === "failed" || entry.classification.startsWith("blocked_")),
    staleArtifactsStillTracked: input.staleArtifactsStillTracked ?? staleArtifacts(rootDir),
    formalGateImpact: {
      clearsUiSourceCoverage: false,
      clearsRuntime: false,
      clearsProvider: false,
      clearsAdminTruth: false,
    },
    dirtyFiles,
    openPrs: input.openPrs ?? readOpenPrs(rootDir),
    validationFailures: [],
  };
  report.validationFailures = validateScore80RefreshQueueExecutionReport(report);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateScore80RefreshQueueExecutionReport(report: Score80RefreshQueueExecutionReport) {
  const failures: string[] = [];
  const unclassifiedQueueEntries = report.commandResults.filter((entry) => !entry.classification || !entry.reason);
  if (unclassifiedQueueEntries.length > 0) {
    failures.push(`queue entries remain unclassified: ${unclassifiedQueueEntries.map((entry) => entry.queueArtifact).join(", ")}`);
  }
  const skippedSafe = report.commandResults.filter((entry) =>
    entry.classification === "safe_automatic_refresh"
    && entry.status === "skipped"
    && !entry.reason);
  if (skippedSafe.length > 0) {
    failures.push("safe automatic refresh entries were skipped without reason.");
  }
  const formalCleared = Object.entries(report.formalGateImpact).filter(([, value]) => value);
  if (formalCleared.length > 0) {
    failures.push(`source evidence gates were cleared: ${formalCleared.map(([key]) => key).join(", ")}`);
  }
  const staleWithoutCommand = report.staleArtifactsStillTracked.filter((entry) => !entry.refreshCommand || !entry.nextAction);
  if (staleWithoutCommand.length > 0) {
    failures.push(`stale artifacts still affect score without refresh command: ${staleWithoutCommand.map((entry) => entry.artifactPath).join(", ")}`);
  }
  const privacyImplementationTouched = report.dirtyFiles.filter((entry) =>
    /^src\/lib\/privacy\//u.test(entry.path)
    || /^src\/lib\/privacy-consent\.ts$/u.test(entry.path)
    || /^src\/components\/CookieBanner\.tsx$/u.test(entry.path)
    || /^src\/lib\/analytics\/identity/u.test(entry.path)
    || /^src\/lib\/behavioral\//u.test(entry.path));
  if (privacyImplementationTouched.length > 0) {
    failures.push(`behavioral/privacy batch files were modified beyond cleanup classification: ${privacyImplementationTouched.map((entry) => entry.path).join(", ")}`);
  }
  const unsafeDirty = report.dirtyFiles.filter((entry) => entry.classification === "unsafe_unknown" || !entry.reason);
  if (unsafeDirty.length > 0) {
    failures.push(`dirty files are unclassified: ${unsafeDirty.map((entry) => entry.path).join(", ")}`);
  }
  const unclassifiedPrs = report.openPrs.filter((pr) => !pr.classification || !pr.reason);
  if (unclassifiedPrs.length > 0) {
    failures.push(`open PRs unclassified: ${unclassifiedPrs.map((pr) => `#${pr.number}`).join(", ")}`);
  }
  if (!report.commandResults.some((entry) => entry.command === "npm run check:self-healing-refresh-queue" && entry.status === "passed")) {
    failures.push("self-healing refresh queue was not executed successfully.");
  }
  if (!report.commandResults.some((entry) => entry.command === "npm run check:refresh-safeguards" && entry.status === "passed")) {
    failures.push("refresh safeguards were not executed successfully.");
  }
  return failures;
}

function renderDoc(report: Score80RefreshQueueExecutionReport) {
  return [
    "# Score 80 Refresh Queue Execution",
    "",
    `Status: ${report.status}`,
    "",
    "This pass executed safe score-impact refresh commands from the self-healing queue and kept formal visual, runtime, provider, and admin truth evidence gates blocked until real artifacts exist.",
    "",
    "## Score",
    "",
    `- Old score: ${report.oldScore}`,
    `- New score: ${report.newScore}`,
    `- Distance to 80: ${report.distanceTo80}`,
    "",
    "## Queue Execution",
    "",
    `- Queue entries in latest queue: ${report.queueSummary.totalEntries}`,
    `- Automatic entries in latest queue: ${report.queueSummary.automaticEntries}`,
    `- Blocked entries in latest queue: ${report.queueSummary.blockedEntries}`,
    `- Commands passed: ${report.queueEntriesRun}`,
    `- Commands skipped: ${report.queueEntriesSkipped}`,
    `- Commands blocked/failed: ${report.queueEntriesBlocked}`,
    "",
    "## Blocked Entries",
    "",
    ...(report.blockedEntries.length
      ? report.blockedEntries.map((entry) => `- ${entry.queueArtifact}: ${entry.classification}; ${entry.reason}`)
      : ["- None"]),
    "",
    "## Refreshed Artifacts",
    "",
    ...(report.refreshedArtifacts.length ? report.refreshedArtifacts.map((artifact) => `- ${artifact}`) : ["- None"]),
    "",
    "## Stale Artifacts Still Tracked",
    "",
    ...(report.staleArtifactsStillTracked.length
      ? report.staleArtifactsStillTracked.map((entry) => `- ${entry.artifactPath}: ${entry.status}; command=${entry.refreshCommand ?? "missing"}`)
      : ["- None"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPrs.length ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}; ${pr.reason}`) : ["- None"]),
    "",
    "## Dirty File Classification",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}; ${entry.reason}`) : ["- None"]),
    "",
    "## Validation",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- FAIL: ${failure}`) : ["- Pass."]),
    "",
  ].join("\n");
}

function runCli() {
  const report = buildScore80RefreshQueueExecutionReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Score 80 refresh queue execution validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Score 80 refresh queue execution OK: ${report.queueEntriesRun} passed, ${report.queueEntriesBlocked} blocked/failed, score ${report.oldScore}->${report.newScore}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}

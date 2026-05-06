import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildAdminDebugSystemHealthNowModel } from "../../src/lib/admin-debug-summary-cards";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

function requireRegex(source: string, pattern: RegExp, label: string) {
  if (!pattern.test(source)) {
    fail(`${label} must match ${pattern}.`);
  }
}

function lineCount(source: string) {
  return source.split(/\r?\n/u).length;
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const helper = readRequired("src/lib/admin-debug-control-tower.ts");
const apiRoute = readRequired("src/app/api/admin/debug/control-tower/route.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const runtimeHealth = readRequired("src/lib/route-runtime-health.ts");
const adminOpsHealth = readRequired("src/lib/server/admin-ops-health.ts");
const adminOpsHealthContract = readRequired("src/lib/admin-ops-health.ts");
const adminOrchestration = readRequired("src/lib/server/admin-orchestration.ts");
const adminOrchestrationRepairs = readRequired("src/lib/server/admin-orchestration-repairs.ts");
const debugTabNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const debugTabActions = readRequired("src/app/admin/debug/components/DebugTabActions.tsx");
const debugBugIntakePanel = readRequired("src/app/admin/debug/components/DebugBugIntakePanel.tsx");
const debugNowDiagnostics = readRequired("src/app/admin/debug/components/DebugNowDiagnostics.tsx");
const debugPanelStatus = readRequired("src/app/admin/debug/components/DebugPanelStatusBySection.tsx");
const debugCreatorLane = readRequired("src/app/admin/debug/components/DebugCreatorLane.tsx");
const debugPrimitives = readRequired("src/app/admin/debug/components/DebugPrimitives.tsx");
const debugPage = readRequired("src/app/admin/debug/page.tsx");
const controlTower = readRequired("src/app/admin/debug/components/DebugControlTower.tsx");
const controlTowerCards = readRequired("src/app/admin/debug/components/DebugControlTowerCards.tsx");
const modelTest = readRequired("tests/unit/admin-debug-control-tower.spec.ts");
const summaryCardTest = readRequired("tests/unit/admin-debug-summary-cards.spec.ts");
const adminOpsHealthTest = readRequired("tests/unit/admin-ops-health.spec.ts");
const adminPanelSystemLogsTest = readRequired("tests/unit/admin-panel-system-logs.spec.ts");
const adminOrchestrationTest = readRequired("tests/unit/admin-orchestration.spec.ts");
const componentTest = readRequired("tests/unit/admin-debug-control-tower-component.spec.tsx");
const controlTowerDoc = readRequired("docs/agent-truth/admin-debug-control-tower.md");
const adminTruthDoc = readRequired("docs/agent-truth/human-readable-admin-truth.md");
const evidenceDoc = readRequired("docs/agent-truth/debug-evidence-pipeline.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");
const releaseNotesScript = readRequired("scripts/release/update-public-changelog.ts");
const debugNowBundle = `${debugTabNow}\n${debugCreatorLane}\n${debugNowDiagnostics}`;

if (packageJson.scripts?.["check:admin-debug-control-tower"] !== "tsx scripts/agent/validate-admin-debug-control-tower.ts") {
  fail("package.json must expose check:admin-debug-control-tower.");
}

for (const expected of [
  "ADMIN_DEBUG_CONTROL_TOWER_REPORTS",
  "public-beta-score.generated.json",
  "speed-security-hardening.generated.json",
  "codebase-hardening.generated.json",
  "device-ui-dry-audit.generated.json",
  "content-protection-score.generated.json",
  "gumdrop-economy-score.generated.json",
  "google-cost-bleed.generated.json",
  "cloudrun-sql-bigquery-guardrails.generated.json",
  "telemetry-parity-score.generated.json",
  "debug-evidence-index.generated.json",
  "precatch-runtime-issues.generated.json",
  "creator-lane-debug-parity.generated.json",
  "Required generated state is missing and cannot be treated as healthy.",
  "FRESH_MS = 24 * ONE_HOUR_MS",
  "STALE_MAJOR_MS = 72 * ONE_HOUR_MS",
  "nextActions",
  "debugEvidence",
  "slice(0, 10)",
]) {
  requireIncludes(helper, expected, "Admin debug control tower model helper");
}

for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "listRecentDebugEvidence",
  "buildAdminDebugControlTowerModel",
  "Cache-Control",
  "private, max-age=30",
  "withRouteRuntimeHealth",
  "recordRouteRuntimeSample",
]) {
  requireIncludes(apiRoute, expected, "Admin debug control tower API route");
}
for (const expected of [
  "TaskIssueAttribution",
  "expectedSource",
  "foundSource",
  "issueType",
  "sourceFreshness",
  "eligibleForTasks",
  "expectedSource: \"task_catalog\"",
  "foundSource: \"task_assignments\"",
  "assignment_missing",
  "onboarding_not_complete",
  "Rebuild task assignment for this user",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug task issue attribution model");
}
for (const expected of [
  "BugIntakeTriageSummary",
  "BugReportTriageCard",
  "loadedCount",
  "last7dCount",
  "backlogCount",
  "needsTriageCount",
  "groupedByPath",
  "createdAtUtc",
  "ageBucket",
  "older_backlog",
  "inventoryState",
  "buildBugIntakeTriageSummary",
  "bugReportsLast7d: bugIntakeTriage.last7dCount",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug bug intake triage truth model");
}
requireIncludes(runtimeHealth, "admin/debug/control-tower:GET", "Route runtime health targets");

for (const expected of [
  "import { DebugControlTower }",
  "<DebugControlTower />",
  "<DebugNowDiagnostics",
  "Creator Lane",
  "System health now",
  "data-debug-health-freshness",
  "data-debug-health-generated-at-utc",
  "data-debug-route-failure-count",
  "data-debug-diagnostics-cluster-count",
  "data-debug-writer-count",
  "data-debug-score-penalty-count",
  "writerCountSource",
  "lastSeenAtUtc",
  "Score penalties",
]) {
  requireIncludes(debugNowBundle, expected, "DebugTabNow must keep old diagnostics while mounting Control Tower");
}
requireIncludes(debugTabNow, "<DebugCreatorLane", "DebugTabNow must mount the Creator Lane detail card");
requireIncludes(debugCreatorLane, "Top creator lane mismatches", "Creator Lane card must surface actionable mismatch details");
requireIncludes(debugCreatorLane, "Materializer has no recorded completion timestamp.", "Creator Lane card must explain missing materialization timestamps");

for (const expected of [
  "scorePenalties",
  "activeIssueClusters",
  "getDiagnosticSuggestedValidator",
  "DiagnosticChannelTruth",
  "currentWindow",
  "recentWindow",
  "loadedSample",
  "freshnessState",
  "sample_error_history",
  "Current window is clean",
  "source is stale",
  "DownstreamWriterTruth",
  "expectedActivity",
  "freshnessState",
  "displayState",
  "traffic_dependent",
  "Warehouse heartbeat updated recently.",
  "getDiagnosticSuggestedAction",
  "routeContext",
  "errorName",
  "firstSeenAtUtc",
  "lastSeenAtUtc",
  "Check admin/debug/assistant response parsing or fallback JSON handling.",
  "DebugSectionStatus",
  "AdminPanelSignal",
  "signalType",
  "reviewableSignalCount",
  "totalSignalCount",
  "bug_intake",
  "inventory",
  "LOW_CONFIDENCE_EVENT_REVIEW_THRESHOLD",
]) {
  requireIncludes(adminOpsHealth + adminOpsHealthContract + readRequired("src/lib/admin-panel-system-logs.ts") + readRequired("src/lib/server/admin-panel-system-logs.ts"), expected, "Admin debug truth models must expose diagnostics, writers, and section signals");
}

for (const expected of [
  "Current window, recent window, loaded sample history",
  "Current ${formatWindowHours",
  "Recent window",
  "Loaded sample history",
  "Sample size",
  "Window details",
  "data-debug-diagnostics-channel",
  "data-debug-current-window-state",
  "data-debug-recent-window-state",
  "data-debug-sample-history-state",
  "data-debug-channel-freshness",
  "data-debug-channel-overall-state",
  "data-debug-last-seen-at-utc",
  "data-debug-writer-id",
  "data-debug-writer-tracked",
  "data-debug-writer-freshness",
  "data-debug-writer-error-state",
  "data-debug-writer-display-state",
  "data-debug-writer-expected-activity",
  "data-debug-diagnostic-cluster-key",
  "data-debug-diagnostic-cluster-count",
  "recentClusters",
  "Individual events",
  "badgeLabelForWriterState",
]) {
  requireIncludes(debugNowDiagnostics, expected, "Recent diagnostics panel must label current/recent/sample/freshness windows");
}
requireIncludes(debugPrimitives, "badgeLabel", "Debug primitive pills must allow quiet writer badges without WAIT labels");
for (const expected of [
  "DebugRepairProposal",
  "DebugRepairProposalGroup",
  "canonicalSourcePath",
  "repairKind",
  "actionability",
  "sourceContextState",
  "duplicateCount",
  "duplicateProposalIds",
  "sourceCollection",
  "firstSeenAtUtc",
  "lastSeenAtUtc",
  "dedupeKey",
  "buildDebugRepairProposalDedupeKey",
  "Notification source context missing",
  "Drop click canonical source context missing",
  "visibleRecords",
  "hiddenRecordCount",
  "inspectOnlyProposals",
  "duplicateProposalsCollapsed",
  "groupedProposalCards",
  "groupedSourceRecordsCollapsed",
]) {
  requireIncludes(`${adminOrchestration}\n${adminOrchestrationRepairs}`, expected, "Debug repair proposals must be deduped and grouped with source context truth");
}
for (const expected of [
  "Expected source",
  "Found source",
  "Issue type",
  "Freshness",
  "Eligible",
  "canSelfHeal",
]) {
  requireIncludes(debugTabActions, expected, "Task Issues Attribution panel must show source-truth classification");
}
for (const expected of [
  "Actionable repairs",
  "Inspect-only",
  "Duplicates collapsed",
  "data-debug-repair-dedupe-key",
  "data-debug-repair-canonical-source-path",
  "data-debug-repair-actionability",
  "data-debug-repair-source-context-state",
  "data-debug-repair-duplicate-count",
  "data-debug-repair-source-collection",
  "data-debug-repair-visible-count",
  "data-debug-repair-actionable-count",
  "data-debug-repair-inspect-only-count",
  "Source collection",
  "Affected records",
  "Show source records",
  "Show more",
  "proposal.actionability === \"actionable\"",
  "Apply",
  "Inspect",
]) {
  requireIncludes(debugTabActions, expected, "Repairs panel must separate actionable, inspect-only, and deduped proposals");
}
requireNotIncludes(debugTabActions, "proposal.actionType !== \"rebuild_projection\"", "Repairs panel must not decide actionability from raw actionType in the UI");
requireIncludes(debugTabActions, "<DebugBugIntakePanel data={data} />", "Debug actions tab must delegate loaded bug intake truth to the focused panel");
for (const expected of [
  "Bug reports to triage",
  "Loaded",
  "Last 7d",
  "Older backlog",
  "Needs triage",
  "Last 7 days",
  "Path clusters",
  "Loaded sample and last-seven-day intake are separate",
  "data-bug-intake-loaded-count",
  "data-bug-intake-last7d-count",
  "data-bug-intake-backlog-count",
  "data-bug-intake-needs-triage-count",
  "data-bug-report-status",
  "data-bug-report-severity",
  "data-bug-report-age-bucket",
  "data-bug-report-evidence-state",
  "createdAtUtc",
  "ageBucket === \"last_7d\" ? \"RECENT\" : \"BACKLOG\"",
  "badgeLabel=\"LOADED\"",
  "badgeLabel=\"INFO\"",
]) {
  requireIncludes(debugBugIntakePanel, expected, "Bug intake triage panel must separate loaded sample, recent intake, backlog, and evidence inventory");
}
for (const forbidden of [
  "<Pill label=\"Status\" value={report.status} />",
  "<Pill label=\"Breadcrumbs\" value={report.breadcrumbsCount} />",
  "<Pill label=\"Diagnostics\" value={report.diagnosticsCount} />",
  "<Pill label=\"Rollouts\" value={report.rolloutCount} />",
  "<Pill label=\"When\" value={formatRelative(report.timestamp)} />",
]) {
  requireNotIncludes(`${debugTabActions}\n${debugBugIntakePanel}`, forbidden, "Bug intake panel must not render WAIT-style chips for known loaded values");
}
for (const expected of [
  "Signals total",
  "Needs review",
  "data-debug-section-status",
  "data-debug-section-severity",
  "data-debug-signal-type",
  "data-debug-current-counts",
  "data-debug-historical-counts",
  "data-debug-inventory-counts",
  "data-debug-reviewable-signal-count",
  "data-debug-total-signal-count",
]) {
  requireIncludes(debugPanelStatus, expected, "Panel status by section must separate total and reviewable signals");
}

for (const forbidden of [
  "label=\"Current\"",
  "Sample count",
]) {
  requireNotIncludes(debugNowDiagnostics, forbidden, "Recent diagnostics panel must not render ambiguous diagnostics chips");
}

requireIncludes(debugPage, "canonicalState?.status === \"Live\"", "Debug page must treat the canonical Live state as healthy");
requireIncludes(releaseNotesScript, "Improved internal health reporting so beta issues show fresher, clearer status.", "Release notes script must include the System Health truth copy");
requireIncludes(releaseNotesScript, "Improved internal health panels so writer freshness and repeated diagnostics are easier to read.", "Release notes script must include downstream writer freshness copy");
requireIncludes(releaseNotesScript, "Improved internal debug status labels so inventory counts do not look like system failures.", "Release notes script must include debug signal severity copy");
requireIncludes(releaseNotesScript, "Improved internal task assignment diagnostics.", "Release notes script must include task issue attribution copy");
requireIncludes(releaseNotesScript, "Improved internal repair proposal grouping so duplicate debug actions are easier to review.", "Release notes script must include repair proposal dedupe copy");
requireIncludes(releaseNotesScript, "Improved internal repair proposal grouping so repeated debug items are easier to review.", "Release notes script must include inspect-only repair proposal grouping copy");
requireIncludes(releaseNotesScript, "Improved internal bug report triage labels so loaded reports no longer appear stuck.", "Release notes script must include bug intake triage copy");

for (const expected of [
  "data-admin-debug-v2=\"control-tower\"",
  "data-debug-mobile-layout=\"compact-card-stack\"",
  "data-debug-report-source",
  "data-debug-report-freshness",
  "data-debug-truth-state",
  "data-debug-critical-count",
  "data-debug-next-action-count",
  "Control Tower",
  "Public beta truth, live evidence, and next actions.",
  "Recommended Next Actions",
  "Live Issues",
  "min-h-11",
  "authFetch(\"/api/admin/debug/control-tower\")",
  "reportClientIssue",
]) {
  requireIncludes(controlTower, expected, "Admin debug Control Tower UI");
}

for (const expected of [
  "Beta Readiness",
  "Device + UI",
  "Money + Cost",
  "Telemetry + Behavior",
  "Support + Creator Monetization",
  "Top findings",
  "<details",
  "missing",
  "stale",
  "toBadgeState",
]) {
  requireIncludes(controlTowerCards, expected, "Admin debug Control Tower card layer");
}

for (const forbidden of [
  "setInterval",
  "useAdminPollingSWR",
  "JSON.stringify(",
  "<pre",
  "supportMessageBody",
  "rawSupportBody",
  "messageBody",
]) {
  requireNotIncludes(controlTower + controlTowerCards, forbidden, "Admin debug Control Tower UI must stay compact and redacted");
}

if (lineCount(controlTower) > 300) {
  fail(`DebugControlTower.tsx must stay below 300 lines; found ${lineCount(controlTower)}.`);
}
if (lineCount(controlTowerCards) > 300) {
  fail(`DebugControlTowerCards.tsx must stay below 300 lines; found ${lineCount(controlTowerCards)}.`);
}

for (const expected of [
  "labels required missing reports as missing and critical",
  "labels stale reports as stale instead of live",
  "surfaces critical findings and next actions first",
  "keeps debug evidence redacted and support-scoped",
]) {
  requireIncludes(modelTest, expected, "Admin debug Control Tower model tests");
}

for (const expected of [
  "explains aggregate route failures when the per-route sample is empty",
  "surfaces active diagnostic clusters with validator context",
]) {
  requireIncludes(summaryCardTest, expected, "Admin debug summary card tests");
}

for (const expected of [
  "separates current diagnostics from loaded sample error history",
  "marks stale channels stale instead of live when current counts are empty",
  "labels traffic-dependent writer inactivity as quiet instead of live",
  "labels recent warehouse heartbeats as live",
  "clusters repeated AI assistant SyntaxError fallback warnings",
]) {
  requireIncludes(adminOpsHealthTest, expected, "Admin ops health diagnostics truth tests");
}

for (const expected of [
  "classifies bug intake counts as info instead of review",
  "classifies rollout and release counts as inventory info",
  "reviewableSignalCount",
  "totalSignalCount",
]) {
  requireIncludes(adminPanelSystemLogsTest, expected, "Admin panel system log signal classification tests");
}
for (const expected of [
  "dedupes inspect-only repair proposals and excludes them from actionable count",
  "keeps rebuild projection proposals actionable after dedupe",
  "groups repeated notification source context records and shows only the first five",
  "Notification source context missing",
  "Drop click canonical source context missing",
  "duplicateProposalsCollapsed",
  "inspectOnlyProposals",
  "groupedProposalCards",
]) {
  requireIncludes(adminOrchestrationTest, expected, "Admin orchestration repair proposal dedupe tests");
}

for (const expected of [
  "renders mobile compact control tower sections without sensitive bodies",
  "data-admin-debug-v2",
  "Public Beta",
  "Device + UI",
  "Money + Cost",
  "Support message detail route returned forbidden.",
  "not.toContain(\"secret support body\")",
]) {
  requireIncludes(componentTest, expected, "Admin debug Control Tower component tests");
}

const doctrineBundle = [controlTowerDoc, adminTruthDoc, evidenceDoc, readme, agents, repoMemory].join("\n");
for (const expected of [
  "Admin Debug v2 is the mobile-first Control Tower",
  "Missing or stale data must never be shown as healthy",
  "Heavy raw JSON stays collapsed",
  "Existing ops health and creator lane parity remain",
]) {
  requireIncludes(doctrineBundle, expected, "Admin debug Control Tower doctrine docs");
}

requireRegex(controlTowerDoc, /Beta Readiness[\s\S]*Live Issues[\s\S]*Device \+ UI[\s\S]*Money \+ Cost[\s\S]*Telemetry \+ Behavior[\s\S]*Support \+ Creator Monetization/u, "Control Tower docs must describe the required information architecture");

const aggregateOnlyHealth = buildAdminDebugSystemHealthNowModel({
  score: 40,
  scorePenalties: [{
    id: "pipeline-active-failures",
    label: "Active route pipeline failures",
    points: 30,
    source: "opsHealth.pipeline",
    truthState: "failed",
  }],
  activePipelineFailureCount: 8,
  recentPipelineFailureCount: 8,
  sampledPipelineFailureCount: 53,
  activePipelineWindowMs: 60 * 60 * 1000,
  lastPipelineFailureAt: Date.now() - 21 * 60 * 1000,
  activeDiagnosticCount: 0,
  recentDiagnosticCount: 0,
  sampledDiagnosticCount: 0,
  activeIssueClusterCount: 0,
  routeFailureCount: 0,
  writerSampleCount: 10,
  writerWarnCount: 0,
  writerFailCount: 0,
  runtimeWarningCount: 0,
});
if (!String(aggregateOnlyHealth.routeFailures.emptyDetail).includes("No active route failures in current sample")) {
  fail("Summary route failure count must explain an aggregate/sample-window mismatch when per-route failures are empty.");
}
if (aggregateOnlyHealth.writers.summaryValue === "0/0") {
  fail("Writers summary must not say 0/0 while tracked writers exist.");
}
if (aggregateOnlyHealth.writers.summaryValue !== "10/10") {
  fail("Writers summary must show healthy/total tracked writers when all materializers are live.");
}
if (aggregateOnlyHealth.score.penaltyCount === 0) {
  fail("Health status ERROR/DEGRADED states must expose score penalty reasons.");
}

const diagnosticClusterHealth = buildAdminDebugSystemHealthNowModel({
  score: 86,
  scorePenalties: [{
    id: "active-diagnostics",
    label: "14 active diagnostics across 2 clusters",
    points: 14,
    source: "opsHealth.diagnostics",
    truthState: "degraded",
  }],
  activePipelineFailureCount: 0,
  recentPipelineFailureCount: 0,
  sampledPipelineFailureCount: 0,
  activePipelineWindowMs: 60 * 60 * 1000,
  activeDiagnosticCount: 14,
  recentDiagnosticCount: 14,
  sampledDiagnosticCount: 14,
  activeIssueClusterCount: 2,
  activeDiagnosticClusters: [{
    id: "diagnostic:admin:warn:abc",
    fingerprint: "admin|warn|Debug route delayed",
    severity: "warn",
    count: 9,
    lastSeenAt: Date.UTC(2026, 4, 5, 21),
    source: "admin",
    sourceRouteOrComponent: "/api/admin/debug",
    message: "Debug route delayed",
    suggestedValidator: "npm run check:admin-debug-control-tower",
  }],
  routeFailureCount: 0,
  writerSampleCount: 10,
  writerWarnCount: 0,
  writerFailCount: 0,
  runtimeWarningCount: 0,
});
if (diagnosticClusterHealth.diagnostics.clusterCount > 0 && diagnosticClusterHealth.diagnostics.clusters.length === 0) {
  fail("Diagnostics count exists but clusters are not surfaced.");
}

try {
  const changedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const allowedPatterns = [
    /^src\/lib\/admin-debug-control-tower\.ts$/u,
    /^src\/lib\/admin-debug-summary-cards\.ts$/u,
    /^src\/lib\/admin-panel-system-logs\.ts$/u,
    /^src\/lib\/admin-ops-health\.ts$/u,
    /^src\/lib\/server\/admin-panel-system-logs\.ts$/u,
    /^src\/lib\/server\/admin-ops-health\.ts$/u,
    /^src\/lib\/server\/admin-orchestration\.ts$/u,
    /^src\/lib\/server\/admin-orchestration-repairs\.ts$/u,
    /^src\/lib\/route-runtime-health\.ts$/u,
    /^src\/app\/api\/admin\/debug\/control-tower\/route\.ts$/u,
    /^src\/app\/api\/admin\/debug\/route\.ts$/u,
    /^src\/app\/admin\/debug\/page\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugControlTower(?:Cards)?\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugBugIntakePanel\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugCreatorLane\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugNowDiagnostics\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPanelStatusBySection\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPrimitives\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabNow\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabActions\.tsx$/u,
    /^src\/lib\/creator-experiences\.ts$/u,
    /^src\/lib\/creator-lane-debug-parity\.ts$/u,
    /^src\/lib\/creator-onboarding\.ts$/u,
    /^src\/lib\/admin\/synthetic-creators-view-as\.ts$/u,
    /^src\/lib\/telemetry-catalog\.ts$/u,
    /^src\/lib\/user-utils\.ts$/u,
    /^src\/lib\/server\/creator-admin-action-contract\.ts$/u,
    /^src\/lib\/server\/creator-onboarding\.ts$/u,
    /^src\/lib\/server\/creator-onboarding-diagnostics\.ts$/u,
    /^src\/lib\/server\/creator-review-queue\.ts$/u,
    /^src\/app\/admin\/roster\/page\.tsx$/u,
    /^src\/app\/api\/admin\/roster\/route\.ts$/u,
    /^src\/types\/db\.ts$/u,
    /^scripts\/agent\/repair-creator-lifecycle-history-gap\.ts$/u,
    /^scripts\/agent\/score-creator-lane-debug-parity\.ts$/u,
    /^scripts\/agent\/validate-creator-fan-experience-settings\.ts$/u,
    /^scripts\/agent\/validate-creator-lane-debug-parity\.ts$/u,
    /^scripts\/agent\/validate-creator-lane-old-logic-removal\.ts$/u,
    /^scripts\/agent\/validate-creator-identity-markers\.ts$/u,
    /^scripts\/agent\/validate-synthetic-creators-view-as\.ts$/u,
    /^scripts\/agent\/validate-admin-debug-control-tower\.ts$/u,
    /^scripts\/agent\/validate-admin-user-behavior-truth\.ts$/u,
    /^scripts\/agent\/validate-daily-task-telemetry-truth\.ts$/u,
    /^scripts\/release\/update-public-changelog\.ts$/u,
    /^CHANGELOG\.md$/u,
    /^public\/kandydrops-release-notes\.json$/u,
    /^src\/lib\/release-notes\/public-release-notes\.ts$/u,
    /^tests\/unit\/admin-debug-control-tower(?:-component)?\.spec\.tsx?$/u,
    /^tests\/unit\/admin-debug-summary-cards\.spec\.ts$/u,
    /^tests\/unit\/admin-panel-system-logs\.spec\.ts$/u,
    /^tests\/unit\/admin-orchestration\.spec\.ts$/u,
    /^tests\/unit\/admin-ops-health\.spec\.ts$/u,
    /^tests\/unit\/ai-debug-assistant\.spec\.ts$/u,
    /^tests\/unit\/creator-experiences\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding-diagnostics\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding-server\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding\.spec\.ts$/u,
    /^tests\/unit\/synthetic-creators-view-as\.spec\.ts$/u,
    /^agent\/state\/debug-evidence-index\.generated\.json$/u,
    /^agent\/state\/precatch-runtime-issues\.generated\.json$/u,
    /^agent\/state\/speed-security-hardening\.generated\.json$/u,
    /^agent\/state\/google-cost-bleed\.generated\.json$/u,
    /^agent\/state\/creator-lane-debug-parity\.generated\.json$/u,
    /^docs\/agent-truth\/admin-debug-control-tower\.md$/u,
    /^docs\/agent-truth\/admin-user-behavior-truth\.md$/u,
    /^docs\/agent-truth\/admin-creator-account-controls\.md$/u,
    /^docs\/agent-truth\/creator-admin-action-route\.md$/u,
    /^docs\/agent-truth\/creator-identity-markers\.md$/u,
    /^docs\/agent-truth\/creator-fan-experience-settings\.md$/u,
    /^docs\/agent-truth\/creator-lane-debug-parity\.md$/u,
    /^docs\/agent-truth\/creator-lane-legacy-truth-inventory\.md$/u,
    /^docs\/agent-truth\/synthetic-creators-view-as\.md$/u,
    /^docs\/agent-truth\/human-readable-admin-truth\.md$/u,
    /^docs\/agent-truth\/debug-evidence-pipeline\.md$/u,
    /^docs\/agent-truth\/support-recovery-flows\.md$/u,
    /^docs\/agent-truth\/admin-analytics-daily-task-pipeline\.md$/u,
    /^README\.md$/u,
    /^AGENTS\.md$/u,
    /^REPO_MEMORY_LEDGER\.md$/u,
    /^EVERY_FILE_FUNCTION_CHECKLIST\.md$/u,
    /^FULL_SCALE_CODEBASE_AUDIT\.md$/u,
    /^package\.json$/u,
  ];
  const unexpected = changedFiles.filter((filePath) => !allowedPatterns.some((pattern) => pattern.test(filePath.replace(/\\/g, "/"))));
  if (unexpected.length > 0) {
    fail(`Admin debug Control Tower pass must not touch public UI or unrelated surfaces. Unexpected diff: ${unexpected.join(", ")}`);
  }
} catch (error) {
  fail(`Unable to inspect changed files: ${(error as Error).message}`);
}

if (failures.length > 0) {
  console.error("Admin debug Control Tower validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin debug Control Tower validation passed.");

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

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const helper = readRequired("src/lib/admin-debug-control-tower.ts");
const apiRoute = readRequired("src/app/api/admin/debug/control-tower/route.ts");
const controlTowerLoader = readRequired("src/lib/server/admin-debug-control-tower-loader.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const analyticsIngestIdentifiedRoute = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const debugEvidenceContract = readRequired("src/lib/debug-evidence-contract.ts");
const debugEvidenceRoute = readRequired("src/app/api/debug/evidence/route.ts");
const clientDiagnostics = readRequired("src/lib/client-diagnostics.ts");
const clientErrorReporting = readRequired("src/lib/client-error-reporting.ts");
const adminErrorCatcher = readRequired("src/components/AdminErrorCatcher.tsx");
const runtimeHealth = readRequired("src/lib/route-runtime-health.ts");
const adminOpsHealth = readRequired("src/lib/server/admin-ops-health.ts");
const adminOpsHealthContract = readRequired("src/lib/admin-ops-health.ts");
const adminOrchestration = readRequired("src/lib/server/admin-orchestration.ts");
const adminOrchestrationRepairs = readRequired("src/lib/server/admin-orchestration-repairs.ts");
const notificationContracts = readRequired("src/lib/notification-contracts.ts");
const taskObservability = readRequired("src/lib/tasks/task-observability.ts");
const notificationsRoute = readRequired("src/app/api/notifications/route.ts");
const notificationsHook = readRequired("src/hooks/useNotifications.ts");
const notificationBell = readRequired("src/components/Navigation/NotificationBell.tsx");
const notificationRuntimeBridge = readRequired("src/components/Notifications/NotificationRuntimeBridge.tsx");
const creatorBroadcastsRoute = readRequired("src/app/api/creator/broadcasts/route.ts");
const creatorBroadcastNotifications = readRequired("src/lib/notifications/creator-broadcast-notifications.ts");
const creatorSubscriptionsCronRoute = readRequired("src/app/api/cron/process-creator-subscriptions/route.ts");
const creatorOnboardingAlerts = readRequired("src/lib/server/creator-onboarding-alerts.ts");
const debugTabNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const debugTabActions = readRequired("src/app/admin/debug/components/DebugTabActions.tsx");
const debugBugIntakePanel = readRequired("src/app/admin/debug/components/DebugBugIntakePanel.tsx");
const debugTabInfrastructure = readRequired("src/app/admin/debug/components/DebugTabInfrastructure.tsx");
const debugTabMonitoring = readRequired("src/app/admin/debug/components/DebugTabMonitoring.tsx");
const debugMonitoringRoutes = readRequired("src/app/admin/debug/components/DebugMonitoringRoutes.tsx");
const debugNowDiagnostics = readRequired("src/app/admin/debug/components/DebugNowDiagnostics.tsx");
const debugAdvancedDataValidation = readRequired("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx");
const debugAdvancedDrift = readRequired("src/app/admin/debug/components/DebugAdvancedDrift.tsx");
const debugAdvancedExperiments = readRequired("src/app/admin/debug/components/DebugAdvancedExperiments.tsx");
const debugAdvancedTelemetry = readRequired("src/app/admin/debug/components/DebugAdvancedTelemetry.tsx");
const debugAdvancedBehavior = readRequired("src/app/admin/debug/components/DebugAdvancedBehavior.tsx");
const debugAdvancedTruth = readRequired("src/app/admin/debug/components/DebugAdvancedTruth.tsx");
const debugPanelStatus = readRequired("src/app/admin/debug/components/DebugPanelStatusBySection.tsx");
const debugCreatorLane = readRequired("src/app/admin/debug/components/DebugCreatorLane.tsx");
const debugPrimitives = readRequired("src/app/admin/debug/components/DebugPrimitives.tsx");
const debugRuntimeEvidenceGroups = readRequired("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx");
const debugPage = readRequired("src/app/admin/debug/page.tsx");
const controlTower = readRequired("src/app/admin/debug/components/DebugControlTower.tsx");
const debugOperatorCockpit = readRequired("src/app/admin/debug/components/DebugOperatorCockpit.tsx");
const controlTowerBusinessTruth = readRequired("src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx");
const controlTowerCards = readRequired("src/app/admin/debug/components/DebugControlTowerCards.tsx");
const adminPanelSystemLogs = readRequired("src/lib/server/admin-panel-system-logs.ts");
const analyticsHistoricalRoute = readRequired("src/app/api/admin/analytics/historical/route.ts");
const analyticsValidationHelper = readRequired("src/lib/server/admin-analytics-historical-validation.ts");
const modelTest = readRequired("tests/unit/admin-debug-control-tower.spec.ts");
const summaryCardTest = readRequired("tests/unit/admin-debug-summary-cards.spec.ts");
const adminOpsHealthTest = readRequired("tests/unit/admin-ops-health.spec.ts");
const adminPanelSystemLogsTest = readRequired("tests/unit/admin-panel-system-logs.spec.ts");
const adminOrchestrationTest = readRequired("tests/unit/admin-orchestration.spec.ts");
const notificationReadStateTest = readRequired("tests/unit/notification-read-state.spec.tsx");
const componentTest = readRequired("tests/unit/admin-debug-control-tower-component.spec.tsx");
const adminDataValidationTest = readRequired("tests/unit/admin-data-validation.spec.ts");
const controlTowerDoc = readRequired("docs/agent-truth/admin-debug-control-tower.md");
const controlTowerDoctrine = readRequired("docs/doctrine/surfaces/admin-debug-control-tower-doctrine.md");
const analyticsDoctrine = readRequired("docs/doctrine/surfaces/admin-analytics-doctrine.md");
const analyticsTruthDoc = readRequired("docs/agent-truth/admin-analytics-truth.md");
const adminUsersDoctrine = readRequired("docs/doctrine/surfaces/admin-users-doctrine.md");
const adminTruthDoc = readRequired("docs/agent-truth/human-readable-admin-truth.md");
const evidenceDoc = readRequired("docs/agent-truth/debug-evidence-pipeline.md");
const notificationPipelineDoc = readRequired("docs/agent-truth/notification-pipeline.md");
const environmentContractDoc = readRequired("docs/agent-truth/environment-contract.md");
const telemetryIdentifiedParityDoc = readRequired("docs/agent-truth/telemetry-identified-parity.md");
const eventFactTruthDoc = readRequired("docs/agent-truth/event-fact-truth.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");
const dependencyTruthScript = readRequired("scripts/agent/check-dependency-truth.ts");
const adminOverviewRoute = readRequired("src/app/api/admin/overview/route.ts");
const adminOverviewUsers = readRequired("src/lib/server/admin-overview-users.ts");
const adminOverviewContract = readRequired("src/lib/admin-overview.ts");
const adminModerationConsole = readRequired("src/components/Admin/AdminModerationConsole.tsx");
const adminModerationSecurityAlerts = readRequired("src/components/Admin/AdminModerationSecurityAlerts.tsx");
const adminModerationRealtime = readRequired("src/hooks/useAdminModerationRealtime.ts");
const adminModerationContracts = readRequired("src/lib/admin-moderation.ts");
const adminModerationThreadsRoute = readRequired("src/app/api/admin/moderation/threads/route.ts");
const adminModerationThreadDetailRoute = readRequired("src/app/api/admin/moderation/threads/[threadId]/route.ts");
const adminModerationSecurityAlertsRoute = readRequired("src/app/api/admin/moderation/security-alerts/route.ts");
const guestQualityHelper = readRequired("src/lib/admin-analytics-guest-bounce-quality.ts");
const eventMixHelper = readRequired("src/lib/admin-analytics-event-mix.ts");
const liveInteractionStreamHelper = readRequired("src/lib/admin-analytics-live-interaction-stream.ts");
const returnCadenceHelper = readRequired("src/lib/admin-analytics-return-cadence.ts");
const navigationDestinationsHelper = readRequired("src/lib/admin-analytics-navigation-destinations.ts");
const deviceMixHelper = readRequired("src/lib/admin-analytics-device-mix.ts");
const topPathsHelper = readRequired("src/lib/admin-analytics-top-paths.ts");
const regionDemandHelper = readRequired("src/lib/admin-analytics-region-demand.ts");
const contentConversionHelper = readRequired("src/lib/admin-analytics-content-conversion.ts");
const topDropConversionHelper = readRequired("src/lib/admin-analytics-top-drop-conversion.ts");
const recentCommerceFeedHelper = readRequired("src/lib/admin-analytics-recent-commerce-feed.ts");
const deterministicTruth = readRequired("src/lib/deterministic-admin-truth.ts");
const adminAnalyticsOperationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const adminAnalyticsAudienceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const adminAnalyticsCommerceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const functionsPackageJson = JSON.parse(readRequired("functions/package.json")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; overrides?: Record<string, unknown> };
const debugNowBundle = `${debugTabNow}\n${debugCreatorLane}\n${debugNowDiagnostics}`;

if (packageJson.scripts?.["check:admin-debug-control-tower"] !== "tsx scripts/agent/validate-admin-debug-control-tower.ts") {
  fail("package.json must expose check:admin-debug-control-tower.");
}
if (packageJson.scripts?.["check:dependency-truth"] !== "tsx scripts/agent/check-dependency-truth.ts") {
  fail("package.json must expose check:dependency-truth.");
}
if (packageJson.scripts?.["check:task-catalog-coverage"] !== "tsx scripts/agent/validate-task-catalog-coverage.ts") {
  fail("package.json must expose check:task-catalog-coverage.");
}
if (Object.keys(packageJson.dependencies ?? {}).length === 0 || Object.keys(packageJson.devDependencies ?? {}).length === 0) {
  fail("Root package.json must expose direct runtime and dev dependencies for the dependency inventory panel.");
}
if (Object.keys(functionsPackageJson.dependencies ?? {}).length === 0 || Object.keys(functionsPackageJson.devDependencies ?? {}).length === 0) {
  fail("functions/package.json must expose direct runtime and dev dependencies for the dependency inventory panel.");
}
for (const expected of [
  "verifyDirectDependencies",
  "root runtime dependencies:",
  "functions runtime dependencies:",
  "Dependency truth validation passed.",
  "@google-cloud/storage",
  "@google-cloud/pubsub",
  "must not be treated as not-direct",
]) {
  requireIncludes(dependencyTruthScript, expected, "Dependency truth validator must verify direct dependency inventory and not-direct package handling");
}

for (const expected of [
  "browserSecurityBlocked?: boolean",
  "actionable?: boolean",
  "nonActionableThirdParty?: boolean",
  "sourceSurface?: string",
  "browserFrameOwner?: string",
  "canonicalPublicBetaScore",
  "canonicalPublicBetaReadinessReason",
  "canonicalPublicBetaCapDetails",
  "canonicalPublicBetaSourceDrift",
  "canonicalPublicBetaTruthState",
  "evidenceCapDetails",
  "readCanonicalPublicBetaScore",
  "reportAggregateScore",
  "reportAggregateTruthState",
  "reportAggregateSummary",
  "readReportCommitState",
  "sourceDrift",
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
requireNotIncludes(helper, "const overallScore = scoreValues", "Admin debug control tower model helper must not compute the primary score from report averages");
for (const expected of [
  "canonicalPublicBetaReadinessReason",
  "canonicalPublicBetaCapDetails",
  "canonicalPublicBetaSourceDrift",
  "canonicalPublicBetaTruthState",
  "data-debug-visible-summary=\"single-triage-strip\"",
  "Details and next steps",
  "Items to clear",
  "reportAggregateSummary",
  "data-debug-canonical-public-beta-score",
]) {
  requireIncludes(controlTower, expected, "Admin Debug Control Tower canonical beta score card");
}
requireNotIncludes(controlTower, "Needs proof", "Admin Debug Control Tower compact view must not restore the removed redundant proof label");
requireNotIncludes(controlTower, "Source reports</p>", "Admin Debug Control Tower compact view must not restore the removed source-report card");
requireNotIncludes(controlTower, "model?.overallScore ?? \"--\"", "Admin Debug Control Tower primary score must not render report aggregate overallScore");
requireNotIncludes(controlTower, "model?.canonicalPublicBetaScore ?? \"--\"", "Admin Debug Control Tower primary view must not render the raw beta score as the hero value");
requireNotIncludes(controlTower, "model.reportAggregateScore", "Admin Debug Control Tower primary view must keep report aggregate scores collapsed/out of the main view");
requireNotIncludes(controlTower, "reportAggregateScore ?? \"clean\"", "Admin Debug Control Tower report aggregate must not be labeled clean/ready");
for (const expected of [
  "data-debug-operator-summary-source-states",
  "Needs action {needsActionCount}",
  "Refresh due {refreshDueCount}",
  "Ready {readyCount}",
]) {
  requireIncludes(debugOperatorCockpit, expected, "Admin Debug operator cockpit must summarize source-derived states");
}
for (const forbidden of [
  "Sections {cockpit.summary.sectionCount}",
  "AI critic {cockpit.summary.aiCriticFindings}",
  "Playbooks {cockpit.summary.recoveryPlaybooks}",
  "Score impact:",
]) {
  requireNotIncludes(debugOperatorCockpit, forbidden, "Admin Debug operator cockpit must not show generic proof/work stats");
}
for (const expected of [
  "\"browser_security_boundary\"",
  "technicalSummary?:",
  "browserSecurityBlocked?: boolean",
  "nonActionableThirdParty?: boolean",
  "buildDebugEvidenceTechnicalSummary",
]) {
  requireIncludes(debugEvidenceContract, expected, "Debug evidence contract must classify browser security boundaries explicitly");
}
for (const expected of [
  "\"browser_security_boundary\"",
]) {
  requireIncludes(debugEvidenceRoute, expected, "Debug evidence API route must accept browser security boundary diagnostics");
}
for (const expected of [
  "classifyBrowserSecurityBoundaryError",
  "shouldRecordClientDiagnosticFingerprint",
  "BROWSER_SECURITY_BOUNDARY_PATTERNS",
  "\"Browser blocked cross-origin frame access. This is expected when third-party iframes are protected. App code should not inspect cross-origin frames.\"",
  "recordClientDiagnostic(\"ui\"",
]) {
  requireIncludes(clientDiagnostics, expected, "Client diagnostics bridge must classify browser security boundary warnings safely");
}
for (const expected of [
  "classifyBrowserSecurityBoundaryError",
  "shouldRecordClientDiagnosticFingerprint",
  "evidenceCategory?: DebugEvidenceCategory",
  "evidenceCategory = \"browser_security_boundary\"",
  "fingerprint = browserSecurityBoundary.fingerprint",
]) {
  requireIncludes(clientErrorReporting, expected, "Client error reporting must route browser security boundaries into debug evidence instead of generic runtime failures");
}
for (const expected of [
  "classifyBrowserSecurityBoundaryError",
  "reportClientIssue({",
  "evidenceCategory: \"browser_security_boundary\"",
  "consoleLabel: \"[AdminErrorCatcher] Browser security boundary\"",
]) {
  requireIncludes(adminErrorCatcher, expected, "AdminErrorCatcher must classify cross-origin frame security blocks before legacy admin UI error ingestion");
}
for (const expected of [
  "recordDebugEvidence",
  "classifyBrowserSecurityBoundaryFromAdminUiError",
  "category: \"browser_security_boundary\"",
  "sourceSurface: \"admin\"",
  "return;",
]) {
  requireIncludes(analyticsIngestIdentifiedRoute, expected, "Analytics ingest identified route must keep browser security boundary errors out of server diagnostics");
}

for (const expected of [
  "AdminModerationRouteErrorCode",
  "AdminModerationRouteErrorResponse",
  "\"unauthorized\"",
  "\"forbidden\"",
  "\"moderation_threads_unavailable\"",
  "\"moderation_alerts_unavailable\"",
  "\"moderation_query_failed\"",
]) {
  requireIncludes(adminModerationContracts, expected, "Admin moderation contracts must expose typed route errors");
}
for (const expected of [
  "useAuth()",
  "authFetch(path",
  "classifyModerationRouteError",
  "adminSessionState",
  "\"waiting_for_admin_session\"",
]) {
  requireIncludes(adminModerationRealtime, expected, "Admin moderation realtime hook must wait for admin auth and use authenticated fetch");
}
requireNotIncludes(adminModerationRealtime, "fetch(path", "Admin moderation realtime hook must not use raw fetch for guarded admin routes");
for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "moderationThreadsGuarded: true",
  "errorCode: error.status === 403 ? \"forbidden\" : \"unauthorized\"",
  "errorCode: \"moderation_threads_unavailable\"",
  "adminModerationRoute: true",
  "adminOnly: true",
]) {
  requireIncludes(adminModerationThreadsRoute, expected, "Admin moderation threads route must enforce typed admin auth");
}
for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "moderationThreadDetailGuarded: true",
  "errorCode: error.status === 403 ? \"forbidden\" : \"unauthorized\"",
  "errorCode: \"moderation_thread_detail_unavailable\"",
  "adminModerationRoute: true",
  "adminOnly: true",
]) {
  requireIncludes(adminModerationThreadDetailRoute, expected, "Admin moderation thread detail route must enforce typed admin auth");
}
for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "moderationAlertsGuarded: true",
  "errorCode: error.status === 403 ? \"forbidden\" : \"unauthorized\"",
  "errorCode: \"moderation_alerts_unavailable\"",
  "adminModerationRoute: true",
  "adminOnly: true",
]) {
  requireIncludes(adminModerationSecurityAlertsRoute, expected, "Admin moderation security alerts route must enforce typed admin auth");
}
for (const expected of [
  "explainModerationRouteError",
  "threadCountLabel",
  "alertCountLabel",
  "Waiting for admin session...",
  "/api/admin/moderation/threads",
  "/api/admin/moderation/threads/[threadId]",
]) {
  requireIncludes(adminModerationConsole, expected, "Admin moderation console must distinguish auth wait from route failure");
}
for (const expected of [
  "const displayCount = error",
  "\"Unknown\"",
  "Waiting for admin session...",
  "safeErrorMessage",
  "data-moderation-alerts-safe-error=\"true\"",
  "adminSessionState",
]) {
  requireIncludes(adminModerationSecurityAlerts, expected, "Admin moderation alerts panel must not show verified zero on route failure");
}
requireNotIncludes(adminModerationSecurityAlerts, "{error.message}", "Admin moderation alerts panel must not expose raw route failure text");

for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "loadAdminDebugControlTower",
  "Cache-Control",
  "private, max-age=30",
  "withRouteRuntimeHealth",
  "recordRouteRuntimeSample",
]) {
  requireIncludes(apiRoute, expected, "Admin debug control tower API route");
}
for (const expected of [
  "listRecentDebugEvidence",
  "buildAdminDebugControlTowerModel",
  "debugEvidenceSource:",
  "\"firestore\"",
]) {
  requireIncludes(controlTowerLoader, expected, "Admin debug control tower loader");
}
for (const expected of [
  "readAdminUserTruthSnapshot",
  "const adminUserTruthSnapshot = await readAdminUserTruthSnapshot({",
  "adminUserTruthSnapshot,",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug route must source business metrics from the canonical admin-user truth snapshot");
}
for (const forbidden of [
  "@/lib/server/analytics-metrics",
  "@/lib/server/admin-analytics-shared",
  "@/lib/admin-analytics-live-runtime",
]) {
  requireNotIncludes(adminDebugRoute, forbidden, "Admin debug route must not import legacy analytics metric helpers directly for business truth");
}
for (const expected of [
  "businessSnapshot",
  "Canonical Business Truth",
  "do not inherit ops-health status",
  "businessSnapshot.issues.length > 0",
]) {
  requireIncludes(controlTowerBusinessTruth, expected, "Debug Control Tower business truth card must render canonical business truth separately from ops health");
}
for (const expected of [
  "const adminUserTruthSnapshot = data?.adminUserTruthSnapshot;",
  "<DebugControlTower businessSnapshot={adminUserTruthSnapshot} />",
]) {
  requireIncludes(debugTabNow, expected, "Debug tab now must pass canonical business truth into the control tower lane");
}
requireNotIncludes(debugTabNow, "title=\"Business truth now\"", "Debug tab now must not duplicate business truth already rendered in Control Tower");
for (const expected of [
  "adminUserTruthSnapshot?: AdminUserTruthSnapshot",
  "overview.business_truth_snapshot",
  "business truth is independent from ops health",
  "canonical admin-user truth snapshot",
]) {
  requireIncludes(adminPanelSystemLogs, expected, "Admin panel system logs must keep business truth canonical and separate from ops health");
}
for (const expected of [
  "TaskCatalogCoverageItem",
  "TaskCatalogCoverageSummary",
  "buildTaskCatalogCoverage",
  "summarizeTaskCatalogCoverage",
  "\"tracking_gap\"",
  "\"assignment_gap\"",
  "\"completion_gap\"",
  "\"reward_risk\"",
  "Shared trigger requires criteria to avoid ambiguous completion.",
  "Legacy unlock trigger relies on canonical drop_unlocked alias proof.",
  "Max > 1 task lacks distinct or count-safe keying.",
]) {
  requireIncludes(taskObservability, expected, "Task observability must expose end-to-end task coverage");
}
for (const expected of [
  "TaskIssueAttribution",
  "TaskReceiptPolicy",
  "TaskReceiptParityRow",
  "TaskGumdropGuardrailState",
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
  "taskCoverageSummary",
  "taskGumdropGuardrails",
  "RuntimeTaskDriftSummary",
  "RuntimeUnsupportedGroup",
  "RuntimeTaskSourceParityRow",
  "TaskSourceMismatchReason",
  "TaskTelemetryMappingSummary",
  "SharedTaskEventGroup",
  "TaskTelemetryAlignmentWarning",
  "runtimeTaskDriftSummary",
  "taskTelemetryMappingSummary",
  "unsupportedRuntimeGroups",
  "sourceParityRows",
  "canonicalCompletionSource",
  "sourceParityState",
  "tasksSampled",
  "alignedCount",
  "partialCount",
  "mismatchCount",
  "unknownCount",
  "activityScope",
  "classifyRuntimeUnsupportedReason",
  "suggestedActionForRuntimeUnsupportedReason",
  "sourceLabelForRuntimeDriftKind",
  "buildRuntimeTaskMismatchReasons",
  "resolveRuntimeTaskSourceParityState",
  "explainRuntimeTaskSourceParity",
  "buildSharedTaskEventDisambiguators",
  "buildSharedTaskEventExplanation",
  "unsafeSharedEventCount",
  "unsupportedActiveAssignments",
  "\"safe_with_criteria\"",
  "\"needs_criteria\"",
  "\"unsafe_shared_event\"",
  "\"shared_event_missing_criteria\"",
  "\"shared_event_missing_unique_keying\"",
  "\"completion_source_mismatch\"",
  "\"rollup_completed_exceeds_task_completed\"",
  "\"event_stats_not_task_scoped\"",
  "\"receipts_without_task_completion\"",
  "expectedReceiptPolicy",
  "receiptParityState",
  "taskRewardReceiptCount",
  "purchaseReceiptCount",
  "relatedActionReceiptCount",
  "Task shows rewarded completions but no task reward receipts were found.",
  "Task reward receipts are not required here.",
  "Purchase receipts (",
  "readyTasks",
  "partialTasks",
  "rewardRiskTasks",
  "assignmentGapTasks",
  "trackingGapTasks",
  "completionGapTasks",
  "legacyTasks",
  "buildTaskCatalogCoverage(BUILT_IN_DAILY_TASKS, runtimeTaskAudit)",
  "summarizeTaskCatalogCoverage(coverage)",
  "BehavioralIntelligencePanelState",
  "BehavioralDropPanelRow",
  "BehavioralConnectedModules",
  "buildBehavioralIntelligencePanelState",
  "behavioralIntelligencePanel",
  "overallFreshnessExplanation",
  "activeRankingMode",
  "mlValidationState",
  "connectedModules",
  "connectedModuleCount",
  "missingModuleCount",
  "confidenceFormula",
  "completionExplanation",
  "negativeExplanation",
  "TelemetryTruthRecoveryState",
  "TelemetryTruthRecoverySourceLayer",
  "TelemetryTruthRecoveryRepairGroup",
  "EstimatedWatchRecoveryGroup",
  "EstimatedWatchRecoveryRow",
  "buildTelemetryTruthRecoveryState",
  "buildEstimatedWatchRecoveryGroups",
  "telemetryTruthRecoveryPanel",
  "formulaState",
  "actionableRepairCount",
  "inspectOnlyRepairCount",
  "estimatedWatchRecoveryGroups",
  "estimatedViews",
  "estimatedRatioPct",
  "duplicateRatePct",
  "recoveredSessionCount",
  "Last rebuild is",
  "Observed layer only counts viewer opens/session starts; checked layer also includes eligible page-load candidates after dedupe review.",
  "Estimated ratio does not match estimated views divided by final views. Inspect estimated-layer math.",
  "Duplicate rate is present without an explicit duplicate-candidate denominator. Inspect validated-layer source fields.",
  "Weighted source truth, rebuild freshness, sample quality, and repair burden.",
  "stale-open timeout fallback = min(15s, max(3s, round((totalVisibleSeconds - totalWatchSeconds) * 250ms))).",
  "Confidence starts at 100%, then subtracts 25% for stale-open timeout, 25% when no raw watch observations exist, and 20% when capture was degraded.",
  "countsTowardVerifiedWatch: false",
  "countsTowardEstimatedWatch: true",
  "\"not_enough_sample\"",
  "\"under_baseline\"",
  "\"experimental\"",
  "\"active\"",
  "\"deterministic\" | \"hybrid\" | \"ml_experimental\" | \"ml_active\" | \"unknown\"",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug task issue attribution model");
}
for (const expected of [
  "buildDataValidationPanelState",
  "DataValidationPanelState",
  "AnalyticsSourceHealth",
  "TelemetryParityValidation",
  "FailureCluster",
  "SourceCheck",
  "\"loading\" | \"loaded\" | \"not_validated\" | \"stale\" | \"failed\" | \"unavailable\"",
  "daily_continuity_coverage",
  "recent_6_day_coverage",
  "source_agreement_chart_readiness",
  "telemetryParityValidation",
  "canonicalSampleCount",
  "telemetryParityEventSource",
  "telemetryParitySampleSource",
  "pipelineFailureClusters",
  "required_sample_missing",
  "analytics_refresh_failures_present",
  "Recent analytics continuity gap detected",
  "Chart readiness is",
  "missingDays",
  "recentGapDays",
  "status: \"not_validated\"",
  "status: \"failed\"",
  "Validation has not run for this range yet.",
  "Retry the validation route or inspect admin analytics historical route errors.",
  "TASK_GUIDANCE_IMPLEMENTED",
  "TASK_GUIDANCE_REQUIRED_IN_BETA",
  "task_guidance_parity",
  "implemented:",
  "required:",
  "eventNames:",
  "\"required_sample_missing\"",
  "\"not_implemented\"",
  "CommerceParityCheck",
  "purchase_revenue_truth",
  "purchase_funnel_telemetry",
  "purchase_telemetry_undercount",
  "Missing purchase telemetry:",
  "UnlockWatchParity",
  "unlock_access_truth",
  "unlock_funnel_telemetry",
  "missingUnlockTelemetryCount",
  "unlock_telemetry_undercount",
  "viewer_activity_truth",
  "rawSessionStartEvents",
  "rawStartRequired",
  "watch_capture_quality",
  "replay-recovered sessions were recorded",
  "AnalyticsModuleCoverage",
  "AnalyticsModuleCoverageItem",
  "buildModuleSourceMap",
  "buildModuleCoverageEvidence",
  "dependentPanels",
  "missingRequiredSources",
  "presentAcceptedSources",
  "requiredGapModules",
  "optionalGapModules",
  "parityScoreFormula",
  "nextValidator",
  "nextAction",
  "requiredForBeta",
  "analyticsModuleCoverage",
  "moduleCoverage: analyticsModuleCoverage",
  "module.moduleLabel",
  "module.missingRequiredSources.join",
  "module.dependentPanels.join",
  "module.nextValidator",
  "module_empty",
  "module_partial",
]) {
  requireIncludes(analyticsValidationHelper, expected, "Data validation helper must expose explicit loading truth states");
}
for (const expected of [
  "BehaviorEventContext",
  "BehaviorCoverageDomain",
  "ActorRiskReason",
  "ActorRiskReasonCode",
  "actorMissing: createGapCount()",
  "routeMissing: createGapCount()",
  "requiredMissing",
  "optionalMissing",
  "backgroundExempt",
  "uniqueOpenFindingCount",
  "duplicateFindingCount",
  "inspectOnlyFindingCount",
  "evalEligibleByContext",
  "lowConfidenceRequired",
  "required_missing_actor",
  "required_missing_session",
  "required_missing_route",
  "duplicate_findings_capped",
  "inspect_only_findings_capped",
  "evalEligibleExplanation",
  "Most findings are duplicate inspect-only source-context items.",
  "riskReasons",
  "riskDomains",
  "notification_target_missing",
  "system_event_in_user_behavior",
  "creator_event_counted_as_user",
  "Risk count exists but no source reason was attached; inspect normalization evidence.",
]) {
  requireIncludes(adminOrchestration, expected, "Admin orchestration snapshot must classify behavior gaps by context");
}
for (const expected of [
  "notification_read",
  "notification_opened",
  "notification_action_clicked",
  "notifications_dropdown_opened",
  "backgroundExempt",
]) {
  requireIncludes(adminOrchestration, expected, "Admin orchestration must treat foreground notification interactions differently from background delivery");
}
for (const expected of [
  "targetUserId or recipientUserId",
  "actorUserId / actorType",
  "route or surface (foreground only)",
  "Notification source context missing",
]) {
  requireIncludes(adminOrchestrationRepairs, expected, "Admin orchestration repairs must describe notification ownership context precisely");
}
for (const expected of [
  "NotificationCanonicalContext",
  "buildNotificationRecord",
  "\"background_route_not_required\"",
  "\"missing_target_user\"",
  "\"missing_actor_for_foreground\"",
  "\"missing_route_for_foreground\"",
]) {
  requireIncludes(notificationContracts, expected, "Notification contracts must expose canonical ownership context");
}
for (const expected of [
  "buildNotificationRecord",
  "targetUserId",
  "actorType: \"admin\"",
  "sourceComponent: \"notifications_admin_route\"",
]) {
  requireIncludes(notificationsRoute, expected, "Notifications API must write canonical ownership context");
}
for (const expected of [
  "actor_user_id: userId",
  "target_user_id: userId",
  "surface: \"notifications_inbox\"",
]) {
  requireIncludes(notificationsHook, expected, "Notifications hook must keep actor and target explicit for foreground reads");
}
for (const expected of [
  "actor_user_id: currentUserId ?? \"\"",
  "target_user_id: currentUserId ?? \"\"",
  "surface: \"notifications_dropdown\"",
]) {
  requireIncludes(notificationBell, expected, "Notification bell must keep actor and target explicit for foreground interactions");
}
for (const expected of [
  "actor_user_id: user.uid",
  "target_user_id: user.uid",
  "surface: \"notification_runtime\"",
]) {
  requireIncludes(notificationRuntimeBridge, expected, "Notification runtime bridge must keep actor and target explicit for service-worker interactions");
}
for (const expected of [
  "buildNotificationRecord",
  "sourceComponent: \"creator_broadcasts_route\"",
  "sourceEntityType: \"creator_broadcast\"",
]) {
  requireIncludes(`${creatorBroadcastsRoute}\n${creatorBroadcastNotifications}`, expected, "Creator broadcasts must write notification ownership context");
}
for (const expected of [
  "buildNotificationRecord",
  "sourceComponent: \"creator_subscription_cron\"",
  "targetUserId: userId",
]) {
  requireIncludes(creatorSubscriptionsCronRoute, expected, "Creator subscription cron must write notification ownership context");
}
for (const expected of [
  "buildNotificationRecord",
  "sourceComponent: \"creator_onboarding_alerts\"",
]) {
  requireIncludes(creatorOnboardingAlerts, expected, "Creator onboarding alerts must write notification ownership context");
}
for (const expected of [
  "actor_user_id: \"notify_user\"",
  "target_user_id: \"notify_user\"",
  "surface: \"notifications_dropdown\"",
]) {
  requireIncludes(notificationReadStateTest, expected, "Notification read tests must cover explicit actor and target ownership");
}
for (const expected of [
  "attachDataValidationState",
  "dataValidation: payload.dataValidation",
  "dataValidation: buildDataValidationPanelState",
  "analyticsSourceHealth: payload.analyticsSourceHealth",
  "telemetryParityValidation",
  "analyticsModuleCoverage",
  "canonicalSampleCount: canonicalAuthenticatedSampleCount",
  "telemetryParityEventSource: \"analytics_rollups_daily.authenticatedEvents\"",
  "telemetryParitySampleSource: \"analytics_event_facts\"",
  "buildPipelineFailureClusters",
  "section !== \"dataValidation\"",
]) {
  requireIncludes(analyticsHistoricalRoute, expected, "Historical analytics route must return explicit dataValidation state");
}
for (const expected of [
  "data?.dataValidation ?? buildFallbackPanelState(data)",
  "analyticsSourceHealth?.continuity.missingDays.length",
  "data-analytics-availability-state",
  "data-analytics-continuity-state",
  "data-analytics-missing-day-count",
  "data-analytics-recent-gap-count",
  "data-analytics-last-complete-day-utc",
  "data-analytics-source-agreement-state",
  "data-analytics-chart-readiness-state",
  "Required modules",
  "Optional modules",
  "label=\"Required verified\"",
  "label=\"Required partial\"",
  "label=\"Required empty\"",
  "label=\"Optional gaps\"",
  "label=\"Required parity\"",
  "data-module-coverage-id",
  "data-module-coverage-status",
  "data-module-coverage-tier",
  "Accepted sources:",
  "Canonical gaps:",
  "External optional gaps:",
  "Dependent panels:",
  "Validator:",
  "check.checkKey === \"module_coverage\"",
  "label=\"Verified required\"",
  "label=\"Partial required\"",
  "label=\"Empty required\"",
  "Missing days:",
  "Recent gaps:",
  "Chart readiness",
  "Source agreement",
  "uiSemantics.summaryPills.map",
  "Source agreement failures",
  "data-raw-validation-rows-default-open=\"false\"",
  "Loading validation checks...",
  "Validation has not run for this range yet.",
  "Validation failed. {effectiveNextAction}",
  "badgeLabel=\"INFO\"",
  "badgeLabel={panelState.lastValidatedAtUtc ? \"INFO\" : \"NOT VALIDATED\"}",
  "cacheDisplayState(panelState.cacheState)",
  "cacheTruthState(panelState.cacheState)",
  "REFRESH DUE",
  "Path",
  "Range",
  "Cache",
  "Last validated",
  "Loaded ${panelState.checkCount}",
  "label=\"Issues\"",
  "summary.issueCount",
  "panelState.blockedPassCount",
  "Event source",
  "Sample source",
  "Top failure clusters",
  "badgeLabel={check.sampleRequired && !check.sampleCount ? \"MISSING\" : check.passAllowed === false ? \"PRESENT\" : \"LOADED\"}",
  "badgeLabel={telemetryUiState.confidenceBadgeLabel}",
  "badgeLabel={telemetryUiState.passAllowedBadgeLabel}",
  "refreshDiagnosticsBadgeLabel",
  "check.checkKey === \"task_guidance_parity\"",
  "label=\"Implemented\"",
  "label=\"Required\"",
  "label=\"Expected events\"",
]) {
  requireIncludes(debugAdvancedDataValidation, expected, "Data Validation debug panel must render explicit loaded/not_validated/failed truth");
}
for (const expected of [
  "data-behavior-health-score",
  "data-behavior-unique-open-findings",
  "data-behavior-duplicate-findings",
  "data-behavior-inspect-only-findings",
  "data-behavior-required-missing-route",
  "data-behavior-optional-missing-route",
  "data-behavior-background-exempt-route",
  "data-behavior-domain",
  "data-behavior-domain-event-count",
  "data-behavior-domain-open-unique",
  "data-behavior-domain-duplicates",
  "data-behavior-domain-state",
  "Unique open findings",
  "Duplicate findings",
  "Inspect-only findings",
  "Low confidence required events",
  "Background exempt",
  "Eval eligibility excludes background, system, and identity-linkage events.",
  "label=\"Events\" value={entry.eventCount} tone=\"neutral\" truthState={entry ? \"live\" : \"unavailable\"} badgeLabel=\"LOADED\"",
  "Most findings are duplicate inspect-only source-context items.",
  "title=\"Actor ownership and bleed risk\"",
  "data-actor-event-count-state",
  "data-actor-event-count",
  "data-actor-risk-reason-code",
  "data-actor-risk-reason-count",
  "data-actor-risk-applies-to-bleed",
  "data-actor-bleed-risk-count",
  "data-actor-critical-count",
  "data-actor-domains",
  "label=\"Events\" value={actor.eventCount} tone=\"neutral\" truthState={actor ? \"live\" : \"unavailable\"} badgeLabel=\"LOADED\"",
  "Risk domains:",
  "Risk reasons",
  "Reason\" value={reason.reasonCode || \"unknown\"}",
  "Risk count exists but no source reason was attached; inspect normalization evidence.",
  "title=\"Task catalog coverage\"",
  "Built-in\" value={data?.taskCoverageSummary?.builtIn",
  "Ready\" value={data?.taskCoverageSummary?.ready",
  "Partial\" value={data?.taskCoverageSummary?.partial",
  "Unsupported\" value={data?.taskCoverageSummary?.unsupported",
  "Reward risk\" value={data?.taskCoverageSummary?.rewardRisk",
  "Tracking gap\" value={data?.taskCoverageSummary?.trackingGap",
  "Completion gap\" value={data?.taskCoverageSummary?.completionGap",
  "Source mix:",
  "Readiness\" value={task.coverageState}",
  "label=\"Reward\" value={`${task.rewardGd} GD`}",
  "label=\"Max\" value={task.maxRequired}",
  "label=\"Action\" value={`${task.actionType}`}",
  "label=\"Mode\" value={task.mode}",
  "label=\"Keying\" value={task.keying || \"any\"}",
  "label=\"Criteria\" value={(task.criteria || []).length > 0 ? \"filtered\" : \"none\"}",
  "Missing evidence",
  "Raw trigger details",
]) {
  requireIncludes(debugAdvancedTruth, expected, "Behavior normalization internals panel must render loaded context-aware gap truth");
}
for (const forbidden of [
  "subtitle=\"Built-in task definitions, trigger source, and action path.\"",
  "<Pill label=\"Canonical\" value={data?.stats?.canonicalTasks ?? 0} tone=\"good\" />",
  "<Pill label=\"Telemetry\" value={data?.stats?.telemetryValidatedTasks ?? 0} tone=\"good\" />",
  "<Pill label=\"Reward\" value={task.reward} />",
  "<Pill label=\"Max\" value={task.maxProgress} />",
  "<Pill label=\"Action\" value={task.actionMode === \"runtime\" ? `${task.actionType} (runtime)` : `${task.actionType} (route)`} />",
]) {
  requireNotIncludes(debugAdvancedTruth, forbidden, "Task coverage panel must not use shallow trigger-only or WAIT-style field truth");
}
for (const forbidden of [
  "validations.length || (isLoading ? \"Loading\" : 0)",
  "tone={summary.failCount > 0 ? \"bad\" : \"good\"}",
  "value={data?.cacheState || \"unknown\"}",
  "value={formatTimestamp(data?.generatedAtMs)}",
  "Recent analytics continuity gap detected\" && \"pass\"",
]) {
  requireNotIncludes(debugAdvancedDataValidation, forbidden, "Data Validation debug panel must not show fake zero/live loading placeholders");
}
for (const expected of [
  "ReceiptSampleView",
  "ReceiptSummaryRow",
  "rawEventName",
  "normalizedAction",
  "displayLabel",
  "actorDisplayName",
  "shortUserId",
  "targetDropTitle",
  "amountDisplay",
  "dedupeKeyLabel",
  "sourceTruth",
  "sourceState",
  "createdAtUtc",
  "Daily check-in claimed",
  "GumDrops purchased",
  "Task notifications enabled",
  "Push notification preference",
  "profile API",
  "Purchase receipt ·",
  "Unlock ·",
  "buildUserIdentityFromSnapshot",
  "receiptDropRefs.length > 0 ? await adminDb.getAll(...receiptDropRefs) : []",
  "TelemetryCoverageRow",
  "TelemetryCoverageEventPurpose",
  "classifyTelemetryCoveragePurpose",
  "inferTelemetryCoverageSourceState",
  "buildTelemetryCoverageExplanation",
  "telemetryCoverageRows",
  "\"daily_check_in_claim\"",
  "\"notification_marked_read\"",
  "\"viewer_asset_changed\"",
  "\"identity\"",
  "\"viewer_support\"",
  "\"semantic_ux\"",
  "\"task_mapping_missing\"",
  "\"supporting\"",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug receipt sample model must normalize aliases and enrich user/drop context");
}
for (const expected of [
  "DependencyInventory",
  "DependencyEntry",
  "DependencyGroup",
  "packageSources",
  "functions/package.json",
  "package-lock.json",
  "functions/package-lock.json",
  "firestoreConnectivity",
  "lastTelemetryPingAtUtc",
  "runtimeDependencies",
  "devDependencies",
  "functionsDependencies",
  "overrideCount",
  "notDirectDependencies",
  "buildCompleteDependencyInventory",
  "rootLockfile",
  "functionsLockfile",
  "envExampleText",
  "packageFreshness",
  "transitive/not direct",
  "absent",
  "buildDependencyEntries",
  "getLockfileInstalledVersion",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug dependency inventory model must read full direct dependency inventory and separate not-direct packages");
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
  "RouteRuntimeSummaryTruth",
  "RouteRuntimeRecordTruth",
  "buildRouteRuntimeSummaryTruth",
  "buildRouteRuntimeRecordTruth",
  "getRouteRuntimeRiskClass",
  "no_sample",
  "routeRiskClass",
  "hasSample",
  "lastLatencyState",
  "avgLatencyState",
  "maxLatencyState",
  "errorHistoryState",
  "latencyState",
  "No runtime sample has been recorded. Metrics are unavailable, not zero.",
  "Historical latency contains slow samples; current health can still be healthy.",
]) {
  requireIncludes(runtimeHealth, expected, "Route runtime health truth model");
}
requireIncludes(readRequired("src/lib/server/route-runtime-health.ts"), "lastResult: \"no_sample\"", "Default route runtime records must not fake success before any sample exists");

for (const expected of [
  "import { DebugControlTower }",
  "<DebugControlTower businessSnapshot={adminUserTruthSnapshot} />",
  "<DebugNowDiagnostics",
  "Creator Lane",
  "data-admin-debug-now-layout=\"triage_strip_plus_source_drawer\"",
  "data-admin-debug-source-drawer-count=\"1\"",
  "data-admin-debug-health-summary-card-count=\"4\"",
  "data-admin-debug-raw-samples-default=\"collapsed\"",
  "data-debug-health-freshness",
  "data-debug-health-generated-at-utc",
  "data-debug-route-failure-count",
  "data-debug-diagnostics-cluster-count",
  "data-debug-writer-count",
  "data-debug-score-penalty-count",
  "writerCountSource",
  "lastSeenAtUtc",
]) {
  requireIncludes(debugNowBundle, expected, "DebugTabNow must keep compact source diagnostics while mounting Control Tower");
}
for (const forbidden of [
  "title=\"System health now\"",
  "systemHealthSummary",
  "label: \"Score penalties\"",
]) {
  requireNotIncludes(debugNowBundle, forbidden, "DebugTabNow must not reintroduce duplicate visible score-heavy containers");
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
for (const expected of [
  "routeRuntimeSummaryTruth",
  "buildRouteRuntimeSummaryTruth",
  "Status",
  "Tracked",
  "Filter",
  "Unseen",
  "Stale",
  "Warn",
  "Fail",
  "Slow samples",
  "Native chat fail",
  "Native chat stale",
  "Native chat unseen",
  "Compat chat fail",
  "Compat chat stale",
  "Compat chat unseen",
  "truthState={routeRuntimeLoaded ? \"live\" : \"unavailable\"}",
  "badgeLabel={routeRuntimeLoaded ? \"LOADED\" : \"UNKNOWN\"}",
]) {
  requireIncludes(debugTabMonitoring, expected, "Tracked route runtime summary must separate loaded inventory, review signals, and labeled chat triples");
}
for (const expected of [
  "buildRouteRuntimeRecordTruth",
  "formatChatTriple(\"Native chat\"",
  "formatChatTriple(\"Compat chat\"",
  "data-route-runtime-loaded",
  "data-route-runtime-tracked-count",
  "data-route-runtime-observed-count",
  "data-route-runtime-unseen-count",
  "data-route-runtime-stale-count",
  "data-route-runtime-warn-count",
  "data-route-runtime-fail-count",
  "data-route-runtime-slow-count",
  "data-route-runtime-health-state",
  "data-route-runtime-status",
  "data-route-runtime-coverage",
  "data-route-runtime-freshness",
  "data-route-runtime-has-sample",
  "data-route-runtime-last-result",
  "data-route-runtime-last-latency-state",
  "data-route-runtime-avg-latency-state",
  "data-route-runtime-max-latency-state",
  "data-route-runtime-latency-state",
  "data-route-runtime-error-history-state",
  "data-route-runtime-risk-class",
  "data-route-runtime-summary-reason",
  "Native chat observed",
  "Native chat samples",
  "Compat observed",
  "Compat samples",
  "loadedBadge",
  "badgeLabel=\"INFO\"",
  "truth.latency.maxLatencyState === \"review_history\" ? \"SLOW\" : \"INFO\"",
  "truth.lastResult === \"no_sample\" ? \"No sample\"",
  "truth.hasSample ?",
  "value=\"—\"",
  "badgeLabel=\"NO SAMPLE\"",
  "No runtime sample has been recorded. Metrics are unavailable, not zero.",
  "healthy with latency review",
]) {
  requireIncludes(debugMonitoringRoutes, expected, "Tracked route runtime rows must label loaded counts, chat triples, and latency review states");
}
for (const forbidden of [
  "value={`${nativeChatRouteRuntimeSummary.fail}/${nativeChatRouteRuntimeSummary.warn}/${nativeChatRouteRuntimeSummary.stale}`}",
  "value={`${compatibilityChatRouteRuntimeSummary.fail}/${compatibilityChatRouteRuntimeSummary.warn}/${compatibilityChatRouteRuntimeSummary.stale}`}",
  "<Pill label=\"Avg latency\" value={`${entry.averageLatencyMs ?? 0}ms`} />",
  "<Pill label=\"Max latency\" value={`${entry.maxLatencyMs ?? 0}ms`} />",
  "Last result\" value={entry.lastResult}",
  "Last latency\" value={`${entry.lastLatencyMs ?? 0}ms`}",
  "<Pill label=\"Observed\" value={nativeChatRouteRuntimeHealth.length - nativeChatRouteRuntimeRates.unseenCount} />",
  "<Pill label=\"Samples\" value={nativeChatRouteRuntimeRates.totalSamples} />",
]) {
  requireNotIncludes(`${debugTabMonitoring}\n${debugMonitoringRoutes}`, forbidden, "Tracked route runtime panel must not render unlabeled triples or WAIT-style numeric metric chips");
}
for (const expected of [
  "RecentTransactionAdminRow",
  "transactionId",
  "createdAtUtc",
  "typeLabel",
  "amountDisplay",
  "unit: \"GD\" | \"USD\" | \"unknown\"",
  "direction: \"credit\" | \"debit\" | \"neutral\"",
  "userDisplayName",
  "shortUserId",
  "userIdentityState",
  "adminUserHref",
  "sourceOfFunds",
]) {
  requireIncludes(adminOverviewContract, expected, "Recent transaction admin row contract must include identity, unit, source, and timestamp truth");
}
for (const expected of [
  "AdminOverviewUserIdentity",
  "shortenAdminOverviewUserId",
  "buildAdminOverviewUserIdentityMap",
  "buildAdminOverviewFallbackIdentity",
  "userIdentityState: \"resolved\"",
  "userIdentityState: userId.trim().length > 0 ? \"fallback_uid\" : \"missing\"",
  "where(\"__name__\", \"in\", chunk).get()",
]) {
  requireIncludes(adminOverviewUsers, expected, "Admin overview user identity enrichment must batch resolve bounded user ids and expose fallback identity truth");
}
for (const expected of [
  "buildAdminOverviewUserIdentityMap",
  "getRecentTransactionTypeLabel",
  "formatRecentTransactionAmount",
  "getRecentTransactionSourceOfFunds",
  "addRecentTransactionContinuityLabels",
  "createdAtUtc: timestamp > 0 ? new Date(timestamp).toISOString() : \"\"",
  "adminUserHref: `/admin/user/${encodeURIComponent(raw.userId)}`",
  "sourceOfFunds: getRecentTransactionSourceOfFunds(raw)",
  "Same user sequence:",
]) {
  requireIncludes(adminOverviewRoute, expected, "Admin overview route must serialize recent transactions with safe identity, unit, source, UTC, link, and continuity truth");
}
for (const expected of [
  "title=\"Recent transactions\"",
  "value={recentTransactions.length > 0 ? \"loaded\" : \"empty\"}",
  "badgeLabel={recentTransactions.length > 0 ? \"LOADED\" : \"EMPTY\"}",
  "Feed window",
  "Latest loaded entries",
  "data-recent-transactions-loaded-count",
  "data-transaction-created-at-utc",
  "data-transaction-user-identity-state",
  "entry.amountDisplay || `${entry.amount} GD`",
  "entry.typeLabel || entry.type",
  "entry.adminUserHref || `/admin/user/${entry.userId}`",
  "entry.userDisplayName || entry.username || entry.shortUserId",
  "entry.userIdRedacted || entry.shortUserId || \"redacted_uid\"",
  "identity_missing",
  "User profile could not be resolved from loaded admin sample.",
  "UTC: {entry.createdAtUtc || formatUtc(entry.timestamp)}",
  "Admin drilldown UID: {entry.userId}",
  "entry.continuityLabel",
]) {
  requireIncludes(debugTabMonitoring, expected, "Recent transactions panel must show loaded state, enriched identity, units, admin links, UTC, and continuity details");
}
for (const forbidden of [
  "<Pill label=\"Loaded\" value={recentTransactions.length} />",
  "<Pill label=\"Feed window\" value=\"Latest loaded entries\" />",
  "<td className=\"px-3 py-3 text-white\">{entry.amount}</td>",
  "<td className=\"px-3 py-3 text-gray-300\">{entry.username ? `@${entry.username}` : entry.userId}</td>",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Recent transactions panel must not render WAIT-style loaded chips, bare amounts, or raw full UID primary text");
}
for (const expected of [
  "QueueRuntimeOutcomeRow",
  "schedulerKey",
  "queueKind",
  "dropTitle",
  "dropIdentityState",
  "creatorName",
  "scheduledForUtc",
  "lastOutcomeAtUtc",
  "adminDropHref",
  "rawKeyCollapsed",
  "parseQueueActivationKey",
  "buildQueueRuntimeOutcomeRows",
  "adminDb.getAll(...dropRefs)",
  "adminDb.getAll(...creatorRefs)",
  "warningReasons",
  "heartbeatState",
  "outcomesState",
  "No heartbeat records, but dispatch outcome records exist.",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin debug API must enrich queue outcomes with batched drop and creator context without mutating queue records");
}
for (const expected of [
  "queueLoaded",
  "queueNeedsReview",
  "queueStatus",
  "data-queue-runtime-loaded",
  "data-queue-runtime-heartbeat-count",
  "data-queue-runtime-outcome-count",
  "data-queue-runtime-warning-count",
  "data-queue-runtime-drop-identity-state",
  "data-queue-runtime-drop-id",
  "data-queue-runtime-scheduler-key",
  "data-queue-runtime-outcome",
  "data-queue-runtime-scheduled-for-utc",
  "Heartbeat lane",
  "Outcome lane",
  "Reason",
  "No heartbeat records, but dispatch outcome records exist.",
  "Scheduled ${entry.scheduledForUtc}",
  "Last outcome ${entry.lastOutcomeAtUtc}",
  "View drop",
  "View creator",
  "Raw queue details",
  "Scheduler key:",
  "dropMetadataState",
  "data-queue-runtime-drop-metadata-source",
  "Drop ${entry.shortDropId}",
  "drop_metadata_missing",
]) {
  requireIncludes(debugTabMonitoring, expected, "Queue runtime continuity panel must show loaded state, readable drop context, warning reasons, links, and collapsed raw scheduler keys");
}
for (const forbidden of [
  "<div><p className=\"font-semibold text-white\">{entry.dropId}</p><p className=\"text-xs text-gray-400\">{entry.activationKey} | {formatRelative(entry.updatedAt)}</p></div>",
  "<Pill label=\"Jobs\" value={queueRuntimeSummary.jobHeartbeats.total} />",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Queue runtime continuity panel must not use raw drop ids as primary text or WAIT-style loaded chips");
}
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

requireIncludes(debugPage, "opsCanonicalState.displayLabel", "Debug page must derive a canonical ops state when backend canonical state is missing");
requireIncludes(debugPage, "opsCanonicalState.status", "Debug page must expose derived canonical ops state in debug evidence");

for (const expected of [
  "RecentEventFlowRow",
  "EVENT_FLOW_GROUP_WINDOW_MS",
  "buildRecentEventFlowRows",
  "buildLowConfidenceCauseBreakdown",
  "eventContext",
  "createdAtUtc",
  "ageLabel",
  "freshnessState",
  "evalEligibilityReason",
  "duplicateCount",
  "\"identity_linkage\"",
  "\"background_task_engine\"",
  "\"background_ledger\"",
  "\"notification_system\"",
  "\"server_system\"",
  "Identity linkage event; not scored as behavior.",
  "Task engine event; route not required.",
  "Ledger reward event; route not required.",
  "Notification system event; behavioral scoring uses notification_read/open actions.",
  "Relationship materializer event; route not required.",
  "Server/system click lacks user ownership; excluded from user scoring.",
  "system event missing ownership",
  "foreground telemetry",
  "background event excluded from scoring",
  "orphaned notification context",
  "data-event-flow-loaded-count",
  "data-event-flow-low-confidence-count",
  "data-event-flow-grouped-count",
  "data-event-flow-context",
  "data-event-flow-freshness",
  "data-event-flow-eval-eligible",
  "data-event-flow-eval-reason",
  "data-event-flow-duplicate-count",
  "data-event-flow-missing-inputs-required",
  "Top low-confidence causes",
  "Unique rows",
  "Last event age",
  "createdAtUtc:",
  "ageLabel:",
  "evalEligibilityReason:",
  "Context-only missing inputs ignored for this event type",
  "badgeLabel=\"LOADED\"",
]) {
  requireIncludes(debugTabMonitoring, expected, "Recent event flow panel must classify context, freshness, grouping, eval reasons, and loaded values");
}
for (const forbidden of [
  "<Pill label=\"Events\" value={data?.stats?.orchestrationEvents ?? 0} />",
  "<Pill label=\"Actor\" value={event.actor.actorLabel || event.actor.actorType} />",
  "<Pill label=\"Surface\" value={event.session.sourceSurface || \"background\"} />",
  "<Pill label=\"Eval eligible\" value={event.readiness.trainingEligible ? \"yes\" : \"no\"}",
  "Missing inputs: {event.dependencyReadiness.missing.join(\", \")}",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Recent event flow panel must not render raw WAIT-style event rows or context-free missing input warnings");
}

for (const expected of [
  "data-daily-task-activity-loaded-count",
  "data-daily-task-window-id",
  "data-daily-task-reason-code",
  "data-daily-task-source",
  "Task event timing",
  "assignedAtUtc:",
  "updatedAtUtc:",
  "expiresAtUtc:",
  "Paid reward",
  "Potential reward",
  "Forfeited potential",
  "Paid rewards",
  "Potential assigned",
  "rewardCreditIdempotencyKey",
  "rewardAuditFlag",
  "badgeLabel=\"LOADED\"",
]) {
  requireIncludes(debugTabMonitoring, expected, "Recent task activity panel must label loaded task fields and expose window/source/reason truth");
}
for (const forbidden of [
  "<Pill label=\"Recent events\" value={(data?.recentTaskEvents || []).length} />",
  "<Pill label=\"Rollups\" value={(data?.taskRollups || []).length} />",
  "<Pill label=\"Daily points\" value={(data?.dailyTaskSeries || []).length} />",
  "<Pill label=\"User\" value={event.username} />",
  "<Pill label=\"Reward\" value={event.reward} />",
  "<Pill label=\"Progress\" value={`${event.progress}/${event.maxProgress}`} />",
  "<Pill label=\"Reward total\"",
  "<Pill label=\"Rewards\" value={day.rewardTotal}",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Recent task activity panel must not render WAIT-style loaded task fields");
}

for (const expected of [
  "Recent receipts and dedupe sample",
  "sourceStatusForOptionalNumber(data?.stats?.receiptsLast7d, monitoringDataLoaded)",
  "sourceStatusForSampleArray(data?.recentReceipts, monitoringDataLoaded)",
  "badgeForSourceStatus(receiptsLast7dStatus)",
  "badgeForSourceStatus(recentReceiptsStatus)",
  "receipt.displayLabel",
  "receipt.dedupeKeyLabel",
  "receipt.lastSeenAtUtc",
  "label=\"Source\" value={receipt.sourceTruth}",
  "receipt.actorDisplayName",
  "receipt.shortUserId",
  "receipt.createdAtUtc",
  "receipt.rawEventName",
  "dedupeKey:",
  "targetDropTitle:",
  "Aliases\" value={`${receipt.aliasCount} aliases normalized`}",
  "data-debug-receipt-source-state={receipt.sourceState}",
  "data-debug-receipt-created-at-utc={receipt.createdAtUtc}",
]) {
  requireIncludes(debugTabMonitoring, expected, "Recent receipts panel must show readable receipt labels, timestamps, and source truth");
}
for (const forbidden of [
  "{receipt.eventName}</p><p className=\"text-xs text-gray-400\">{receipt.uid || \"guest\"} | {receipt.receiptKey}</p>",
  "<Pill label=\"Source\" value={receipt.source} />",
  "{receipt.eventName}</p><p className=\"text-xs text-gray-400\">{formatTimestamp(receipt.lastSeenAt)}</p>",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Recent receipts panel must not render raw UID, raw dedupe key, or WAIT-style source truth");
}

for (const expected of [
  "Admin session + config readiness",
  "Current admin identity and required config presence for debug/admin tools. This does not prove external services are healthy.",
  "Admin session verified",
  "Config present",
  "Runtime not verified here",
  "data-admin-session-state",
  "data-admin-config-ga-state",
  "data-admin-config-vapid-state",
  "data-admin-config-database-state",
  "data-admin-config-navigation-signing-state",
  "data-admin-prereq-runtime-verified=\"false\"",
  "data-admin-session-sensitive-collapsed=\"true\"",
  "These checks confirm the current admin session and config presence only.",
  "Runtime GA delivery not verified here",
  "Push delivery not verified here",
  "Runtime database connectivity not verified here",
  "Config present, signing runtime not exercised",
  "Session details",
  "User ID:",
  "Email:",
]) {
  requireIncludes(debugTabMonitoring, expected, "Admin session config readiness card must separate config presence from runtime health and collapse sensitive identity details");
}
for (const forbidden of [
  "title=\"Admin session and runtime prerequisites\"",
  "GA property\" value={data?.opsHealth?.runtime?.gaPropertyConfigured ? \"Ready\" : \"Missing\"}",
  "Database URL\" value={data?.opsHealth?.runtime?.databaseUrlConfigured ? \"Ready\" : \"Missing\"}",
  "Navigation signing\" value={data?.opsHealth?.runtime?.navigationSessionSigningReady ? \"Ready\" : \"Missing\"}",
  "<div className=\"flex justify-between gap-3 border-b border-white/10 py-2\"><span className=\"text-gray-400\">User ID</span>",
  "<div className=\"flex justify-between gap-3 border-b border-white/10 py-2\"><span className=\"text-gray-400\">Email</span>",
]) {
  requireNotIncludes(debugTabMonitoring, forbidden, "Admin session config readiness card must not label config as runtime Ready or show sensitive identity as primary fields");
}
const vapidChipCount = (debugTabMonitoring.match(/label="VAPID"/g) ?? []).length;
if (vapidChipCount !== 1) {
  fail(`Admin session config readiness card must render VAPID once; found ${vapidChipCount}.`);
}

for (const expected of [
  "Task parity and Gum Drop guardrails",
  "Task assignment issues, reward parity, creator-spend guardrails, and receipt explanations in one view.",
  "data-task-guardrail-reward-version",
  "data-task-guardrail-multiplier",
  "data-task-guardrail-built-in-avg",
  "data-task-guardrail-creator-spend-state",
  "data-task-receipt-policy",
  "data-task-receipt-parity-state",
  "data-task-paid-reward-total",
  "data-task-potential-reward-total",
  "data-task-affected-user-count",
  "label=\"Task reward receipts\"",
  "label=\"Purchase receipts\"",
  "label=\"Paid rewards\"",
  "label=\"Potential assigned rewards\"",
  "label=\"Receipt policy\"",
  "Expected source",
  "Found source",
]) {
  requireIncludes(debugAdvancedDrift, expected, "Task GumDrop guardrail panel must show loaded receipt parity truth");
}
for (const forbidden of [
  "label=\"Reward total\"",
  "label=\"Receipts\" value={entry.receiptCount} tone=\"neutral\" truthState=\"live\" badgeLabel=\"LOADED\"",
  "<Pill label=\"Reward version\" value={data?.taskRewardConfig?.rewardVersion ?? \"--\"} />",
  "<Pill label=\"Tracked creator spends\" value={data?.creatorSpendParity?.trackedTransactions ?? 0} />",
]) {
  requireNotIncludes(debugAdvancedDrift, forbidden, "Task GumDrop guardrail panel must not leave ambiguous or unloaded labels");
}
for (const expected of [
  "Runtime task sample and custom-task drift",
  "data-runtime-task-sampled-users",
  "data-runtime-task-assignment-count",
  "data-runtime-task-custom-assigned-count",
  "data-runtime-task-cooldown-drift-count",
  "data-runtime-task-unsupported-count",
  "data-runtime-task-unsupported-reason",
  "data-runtime-task-unsupported-group-count",
  "data-runtime-task-unsupported-severity",
  "data-task-runtime-assigned-users",
  "data-task-runtime-claimed-count",
  "data-task-runtime-completed-count",
  "data-task-runtime-reward-count",
  "data-task-runtime-receipt-count",
  "data-task-runtime-rollup-completed",
  "data-task-runtime-event-stats",
  "data-task-runtime-source-parity",
  "data-task-runtime-mismatch-reason",
  "data-task-runtime-canonical-source",
  "label=\"Sampled users\"",
  "label=\"Assignments\"",
  "label=\"Tasks sampled\"",
  "label=\"Aligned\"",
  "label=\"Partial\"",
  "label=\"Mismatch\"",
  "label=\"Custom assigned\"",
  "label=\"Cooldown drift\"",
  "label=\"Unsupported runtime\"",
  "label=\"Canonical source\"",
  "label=\"Parity\"",
  "Unsupported runtime records are grouped by reason and source",
  "event stats as completion proof",
  "No source parity mismatches detected in the sampled runtime evidence.",
  "No unsupported runtime records were found",
  "No active user sample was attached to this runtime drift group.",
]) {
  requireIncludes(debugAdvancedDrift, expected, "Runtime task drift panel must show grouped unsupported runtime truth");
}
for (const forbidden of [
  "label=\"Custom assigned\" value={data?.stats?.runtimeCustomAssignments ?? 0} tone={(data?.stats?.runtimeCustomAssignments ?? 0) > 0 ? \"good\" : \"warn\"}",
]) {
  requireNotIncludes(debugAdvancedDrift, forbidden, "Runtime task drift panel must not flag zero custom assignments as review");
}
for (const expected of [
  "Task telemetry mapping",
  "taskTelemetryMappingSummary",
  "receiptMappingGroups",
  "label=\"Task trigger events\"",
  "label=\"Lifecycle events\"",
  "label=\"Supporting telemetry\"",
  "label=\"Shared events needing criteria\"",
  "label=\"Unsupported runtime\"",
  "Kind: receipt",
  "No grouped receipt mapping issues were detected in the sampled data.",
  "Sample receipts:",
  "label=\"Lane\"",
  "label=\"First seen\"",
  "label=\"Last seen\"",
  "label=\"Purpose\"",
  "label=\"Mapped tasks\"",
  "label=\"Tracking source\"",
  "truthState=\"live\"",
  "badgeLabel=\"LOADED\"",
  "Lifecycle event, not a task trigger",
  "Supporting telemetry, not a task trigger",
  "Missing task mapping: expected by task catalog",
  "Shared event needs criteria",
  "Receipt pool shared across tasks",
  "Shared events are only safe when criteria, distinct keying, and count thresholds keep task attribution scoped.",
  "label=\"Shared by\"",
  "label=\"Assigned\"",
  "label=\"Receipts\"",
  "label=\"Event stats\"",
  "receiptMeaning",
  "criteria state",
  "No unsafe shared event groups are distorting task attribution in the sampled data.",
  "No shared event groups currently qualify as safe-with-criteria in the sampled data.",
  "No unsupported runtime task records were detected in the sampled data.",
  "Event stats are raw trigger evidence.",
  "Telemetry coverage sample",
  "titleForCoveragePurpose",
  "labelForCoverageState",
  "toneForCoverageState",
  "label=\"Tracked events\"",
  "label=\"Task triggers\"",
  "label=\"Supporting/lifecycle\"",
  "label=\"Alias needed\"",
  "label=\"True unsupported/orphaned\"",
  "Aliases seen:",
  "Supporting event, not a task gap",
  "Missing task mapping",
  "Task lifecycle",
  "Viewer support",
  "Semantic UX",
]) {
  requireIncludes(debugAdvancedTelemetry, expected, "Task telemetry mapping panel must show grouped ambiguity and loaded truth");
}

for (const expected of [
  "Ranking mode",
  "Rebuild freshness",
  "Drop freshness",
  "ML validation",
  "Connected modules",
  "Confidence formula:",
  "Completion:",
  "Negative:",
  "Top reasons:",
  "Missing inputs:",
  "Suppression",
  "Final rank",
  "badgeLabel=\"LOADED\"",
]) {
  requireIncludes(debugAdvancedBehavior, expected, "Behavioral intelligence panel must expose loaded calibration truth");
}
for (const expected of [
  "Telemetry Truth Recovery",
  "Formula state",
  "Actionable repairs",
  "Inspect-only",
  "Observed views",
  "Checked views",
  "Final views",
  "Estimated ratio",
  "Recovered sessions",
  "Estimated views",
  "Estimated session ends -",
  "Recovered watch total",
  "Per session mode",
  "Verified watch",
  "Estimated watch",
  "Estimation formula:",
  "Confidence factors:",
  "No completion state changed. This recovery estimated session end time only; it did not mark content complete.",
  "Affected sessions (first 5)",
  "Global truth summary",
  "Observed, checked, final, and estimated layers stay separate and explicitly labeled.",
  "Verified watch excludes estimated timeout recovery. Final reporting may still include estimated watch when quality is mixed or estimated.",
  "data-telemetry-truth-last-rebuild-at-utc",
  "data-telemetry-truth-freshness-state",
  "data-telemetry-truth-quality-state",
  "data-telemetry-truth-estimated-ratio",
  "data-telemetry-truth-duplicate-rate",
  "data-telemetry-truth-recovered-sessions",
  "data-telemetry-truth-formula-state",
  "data-telemetry-truth-open-repairs",
  "Observed raw views",
  "Validated views",
  "Estimated/recovered views",
  "Final reporting views",
  "Recovery share",
  "Raw identity and source details",
  "Creator:",
  "Drop ID:",
  "data-drop-recovery-drop-id",
  "data-drop-recovery-identity-state",
  "data-drop-recovery-quality",
  "data-drop-recovery-raw-views",
  "data-drop-recovery-validated-views",
  "data-drop-recovery-estimated-views",
  "data-drop-recovery-finalized-views",
  "data-drop-recovery-duplicate-rate",
  "data-drop-recovery-repaired-pct",
  "data-drop-recovery-formula-state",
  "data-user-watch-user-id",
  "data-user-watch-identity-state",
  "data-user-watch-total-seconds",
  "data-user-watch-verified-seconds",
  "data-user-watch-estimated-seconds",
  "data-user-watch-fallback-seconds",
  "data-user-watch-quality",
  "data-user-watch-confidence",
  "data-user-watch-raw-gaps",
  "data-user-watch-quality-reason",
  "User watch math details",
  "Fallback watch",
  "UID ",
  "Full UID:",
  "raw_gaps_present",
  "exact_invalid_due_to_raw_gaps",
]) {
  requireIncludes(debugAdvancedBehavior, expected, "Telemetry truth recovery panel must expose freshness, formulas, and repair grouping");
}
requireNotIncludes(debugAdvancedBehavior, "WAIT", "Behavioral intelligence panel must not show WAIT for loaded values");

for (const expected of [
  "adminAnalyticsRecoveryEvidence",
  "buildAdminAnalyticsRecoveryEvidenceDebugMetadata",
  "REQUIRED_ADMIN_DEBUG_RECOVERY_LANES",
  "analytics_identity_links",
  "guest_tracking_indexes",
  "user_journey_indexes",
  "behavioral_timeline_facts",
  "notification_facts",
  "support_recovery_facts",
  "analytics_legacy_recovered_events",
  "analytics_pipeline_daily",
  "analytics_export_status",
  "analytics_guest_batches",
  "analytics_sessions",
  "analytics_event_facts",
  "productionAllowedNow: false",
  "production_backfill_disabled",
  "adminAnalyticsPromotedNow: false",
  "recovery_evidence_debug_first",
  "source_confidence",
  "mapping_warning",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin Debug recovery evidence route payload");
}

for (const expected of [
  "DebugRecoveryEvidenceSummary",
  "DebugGumdropRecoverySummary",
  "data-admin-debug-recovery-evidence",
  "data-admin-debug-recovery-production-allowed",
  "data-admin-debug-recovery-summary-compact=\"true\"",
  "data-admin-debug-recovery-details-default=\"collapsed\"",
  "data-admin-debug-recovery-no-scrollwrap=\"true\"",
  "data-admin-debug-recovery-details=\"collapsed_by_default\"",
  "data-admin-debug-recovery-lane-key",
  "data-admin-debug-recovery-lane-detail-default=\"collapsed\"",
  "productionAllowedNow=false",
  "adminAnalyticsPromotedNow",
  "sourceTruthLabel",
  "data-admin-debug-gumdrop-recovery=\"true\"",
  "data-admin-debug-gumdrop-recovery-state",
  "data-admin-debug-gumdrop-recovery-analytics-only",
  "diagnostic_only_not_treasury_truth",
  "data-admin-debug-gumdrop-recovery-money-action-allowed",
  "data-admin-debug-gumdrop-recovery-details=\"collapsed_by_default\"",
]) {
  requireIncludes(debugRuntimeEvidenceGroups, expected, "Admin Debug recovery evidence visual summary");
}
requireNotIncludes(debugRuntimeEvidenceGroups, "ScrollWrap", "Admin Debug recovery evidence visual summary");
requireNotIncludes(debugRuntimeEvidenceGroups, "overflow-auto", "Admin Debug recovery evidence visual summary");
requireIncludes(debugTabNow, "<DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />", "Admin Debug Right Now tab");
requireNotIncludes(debugTabNow, "title=\"Business truth now\"", "Admin Debug Right Now tab");

for (const expected of [
  "Human-readable rollout state, current beta relation, and sample actor resolution.",
  "Configured",
  "Active experiments",
  "Fully rolled out",
  "Train freshness",
  "Historical alpha changelog",
  "Current Beta",
  "Kill switch configured",
  "Rollback tested: not proven here.",
  "Representative rollout dry run",
  "These are fixture contexts used to verify registry rules. They are not live user assignments.",
  "SIMULATED",
  "Fallback:",
  "data-rollout-eval-mode",
  "data-rollout-actor-source",
  "data-rollout-actor-simulated",
  "data-rollout-eval-role",
  "data-rollout-eval-route",
  "data-rollout-eval-reason",
  "data-rollout-eval-variant",
  "Fully rolled out; no active holdout detected.",
  "Fully rolled out baseline feature. Not currently an A/B test.",
  "Alpha baseline preserved for history; current Beta release notes are tracked separately",
  "data-rollout-configured-count",
  "data-rollout-active-experiment-count",
  "data-rollout-fully-rolled-out-count",
  "data-rollout-effective-state",
  "data-rollout-kill-switch-configured",
  "data-rollout-train-freshness",
  "data-rollout-stage",
  "data-rollout-audience",
]) {
  requireIncludes(`${debugAdvancedExperiments}\n${adminDebugRoute}`, expected, "Rollout registry panel must show readable rollout state and beta relation");
}
requireNotIncludes(debugAdvancedExperiments, "WAIT", "Rollout registry panel must not show WAIT for loaded values");

for (const expected of [
  "Infrastructure Health & Dependencies",
  "Package inventory plus selected runtime connectivity checks. Package presence does not prove runtime use.",
  "Environment & runtime checks",
  "Inventory counts",
  "Dependency groups",
  "Package sources",
  "Overrides and not-direct packages",
  "Runtime deps",
  "Dev deps",
  "Functions deps",
  "Unknown direct deps",
  "Declared",
  "Lockfile verified:",
  "Not directly installed / transitive or expected but absent",
  "data-debug-dependency-generated-at-utc",
  "data-debug-dependency-group-count",
  "inventory.generatedAtUtc",
  "inventory.totals?.runtimeDependencies",
  "inventory.totals?.devDependencies",
  "inventory.totals?.functionsDependencies",
  "inventory.notDirectDependencies",
  "TRANSITIVE",
  "ABSENT",
]) {
  requireIncludes(debugTabInfrastructure, expected, "Infrastructure dependency panel must show full grouped inventory and separate runtime truth from package truth");
}
for (const forbidden of [
  "subtitle=\"Runtime telemetry showing actual module versions and connection state.\"",
  "Core Dependencies",
  "Dev Dependencies",
  "\"@google-cloud/pubsub\": pkg.dependencies?.[\"@google-cloud/pubsub\"] || \"unknown\"",
  "\"@google-cloud/storage\": pkg.dependencies?.[\"@google-cloud/storage\"] || \"unknown\"",
]) {
  requireNotIncludes(`${debugTabInfrastructure}\n${adminDebugRoute}`, forbidden, "Infrastructure dependency panel must not show selected-only unknown core dependencies");
}

for (const expected of [
  "data-admin-debug-v2=\"control-tower\"",
  "data-debug-mobile-layout=\"compact-card-stack\"",
  "data-debug-report-source",
  "data-debug-report-freshness",
  "data-debug-truth-state",
  "data-debug-critical-count",
  "data-debug-next-action-count",
  "Control Tower",
  "Readiness, current issues, and next actions.",
  "Next actions",
  "Current issues",
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

if (lineCount(controlTower) > 360) {
  fail(`DebugControlTower.tsx must stay below 360 lines; found ${lineCount(controlTower)}.`);
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
  "returns not_validated when no validation rows are available",
  "returns loaded counts only after validation rows exist",
  "returns failed when the validation route errors",
  "buildDataValidationPanelState",
]) {
  requireIncludes(adminDataValidationTest, expected, "Admin data validation tests must cover not_validated and failed states");
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

const doctrineBundle = [controlTowerDoc, adminTruthDoc, evidenceDoc, notificationPipelineDoc, environmentContractDoc, telemetryIdentifiedParityDoc, eventFactTruthDoc, readme, agents, repoMemory].join("\n");
for (const expected of [
  "Admin Debug v2 is the mobile-first Control Tower",
  "Missing or stale data must never be shown as healthy",
  "Heavy raw JSON stays collapsed",
  "Existing ops health and creator lane parity remain",
]) {
  requireIncludes(doctrineBundle, expected, "Admin debug Control Tower doctrine docs");
}
for (const expected of [
  "resolveMetricState",
  "safeRate",
  "getRollingWindow",
  "calculateGumdropValueBasis",
  "resolveWatchTruth",
  "classifyEventContext",
  "adjustRegionalDemand",
  "resolvePanelPagination",
  "WAIT",
  "not_observed",
  "unavailable: mismatched source/range",
]) {
  requireIncludes(deterministicTruth, expected, "Deterministic admin truth helper");
}
for (const expected of [
  "WAIT means actively loading only",
  "zero requires verified source",
  "estimated is not verified",
  "No rate may render without denominator, source, and range truth",
  "Display language uses unwrap",
  "current, recent, and sample windows",
  "must not require a selected user",
]) {
  requireIncludes(`${controlTowerDoctrine}\n${analyticsDoctrine}\n${analyticsTruthDoc}\n${adminUsersDoctrine}`, expected, "Deterministic admin doctrine bundle");
}

requireRegex(controlTowerDoc, /Beta Readiness[\s\S]*Current Issues[\s\S]*Device \+ UI[\s\S]*Money \+ Cost[\s\S]*Telemetry \+ Behavior[\s\S]*Support \+ Creator Monetization/u, "Control Tower docs must describe the required information architecture");

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

for (const expected of [
  "estimatedSourceTruth",
  "estimatedFormula",
  "consentedGuestBatchCount",
  "missingReason",
  "nextAction",
  "seriesExplanation",
  "Signed-in bounce sample only. Guest bounce remains unavailable without consented guest batches.",
]) {
  requireIncludes(guestQualityHelper, expected, "Guest quality truth helper");
}
for (const expected of [
  "data-guest-quality-state",
  "data-guest-estimated-views",
  "data-guest-estimate-source-truth",
  "data-guest-estimate-formula-state",
  "data-guest-consented-batch-count",
  "data-guest-last-batch-at-utc",
  "data-signed-in-bounce-state",
  "data-guest-quality-next-action",
  "Source",
  "Formula unavailable",
  "Signed-in bounce sample only. Guest bounce unavailable.",
]) {
  requireIncludes(adminAnalyticsOperationsTab, expected, "Guest quality analytics panel");
}
requireNotIncludes(adminAnalyticsOperationsTab, "Series: collapsed", "Guest quality analytics panel");
for (const expected of [
  "catalogCategoryState",
  "actualSurfaceState",
  "eventsNeedingCatalogMapping",
  "eventsMissingSurfaceContext",
  'pattern: /dashboard/i',
  "Catalog-inferred categories must not be shown as verified route or surface context.",
]) {
  requireIncludes(eventMixHelper, expected, "Event mix truth helper");
}
for (const expected of [
  "Categories are inferred from the event catalog; verified route and surface context is missing for this range.",
  "Verified surface context:",
  "Catalog inference:",
  "Category:",
  "(catalog-inferred)",
  "Surface: missing",
  "Route: missing",
  "missing verified surface context",
]) {
  requireIncludes(adminAnalyticsOperationsTab, expected, "Event mix analytics panel");
}
for (const expected of [
  "generatedAtUtc",
  "freshnessState",
  "sourceTruth",
  "eventType",
  "failureReason",
  "duplicateCount",
  "Failed due to previous reset or inactivity policy",
  "refresh due snapshot",
]) {
  requireIncludes(liveInteractionStreamHelper, expected, "Live interaction stream truth helper");
}
for (const expected of [
  "buildAdminAnalyticsReturnCadenceModel",
  "Return cadence is using identified activity fallback because the cadence snapshot has not hydrated.",
  "Return cadence source missing. No verified zero should be displayed.",
  "trackedAuthenticatedUsers",
  "uniqueReturners",
  "conversionPct",
]) {
  requireIncludes(returnCadenceHelper, expected, "Return cadence truth helper");
}
for (const expected of [
  "buildAdminAnalyticsNavigationDestinationsModel",
  "No explicit navigation tap events found. Showing destination visits from page-view fallback.",
  "Expected events: navigation_click, semantic_target_clicked with destination, notification_action_clicked.",
  "\"tap_events\"",
  "\"mixed_fallback\"",
  "\"destination_views_only\"",
]) {
  requireIncludes(navigationDestinationsHelper, expected, "Navigation destinations truth helper");
}
for (const expected of [
  "buildAdminAnalyticsDeviceMixModel",
  "GA engaged sessions / GA sessions for each device category.",
  "Device mix is GA session-based, not authenticated-user based.",
  "\"ga4\"",
  "Mobile is dominant; prioritize mobile layout, thumb-reach CTAs, and image payload limits.",
]) {
  requireIncludes(deviceMixHelper, expected, "Device mix truth helper");
}
for (const expected of [
  "buildAdminAnalyticsTopPathsModel",
  "\"high_volume_low_engagement\"",
  "\"zero_time\"",
  "\"creator\"",
  "\"legal\"",
  "\"dashboard\"",
  "Top 25 snapshot only. This panel paginates the available snapshot, not every path in GA.",
  "0s avg time suggests timing is unavailable for this path or users are exiting immediately after arrival.",
]) {
  requireIncludes(topPathsHelper, expected, "Top paths truth helper");
}
for (const expected of [
  "buildAdminAnalyticsRegionDemandModel",
  "Raw geography with internal/admin traffic separated from external demand.",
  "Adjusted demand excludes proven admin-surface traffic only.",
  "Unknown city/country is a data-quality bucket",
]) {
  requireIncludes(regionDemandHelper, expected, "Region demand truth helper");
}
for (const expected of [
    "buildAdminAnalyticsContentConversionModel",
    "\"drop_metadata_plus_unlock_rollups\"",
    "No preview/unwrap/drop metadata source available for this range.",
    "Content conversion is using access rollup fallback because unwrap telemetry is missing.",
    "rowsByDimension",
    "overallUnlockRatePct",
  ]) {
    requireIncludes(contentConversionHelper, expected, "Content conversion truth helper");
  }
  for (const expected of [
  "buildAdminAnalyticsTopDropConversionModel",
  "formatTopDropUnwrapRate",
  "safeRate",
  "dropIdentityState",
  "chartLabel",
  "Unwrap conversion uses unwraps divided by validated drop views",
]) {
  requireIncludes(topDropConversionHelper, expected, "Top Drop Conversion truth helper");
}
requireIncludes(deterministicTruth, "\"<0.1%\"", "Deterministic top-drop rate precision guard");
  for (const expected of [
    "buildAdminAnalyticsRecentCommerceFeedState",
    "RecentCommerceFeedState",
    "amountDisplay",
    "direction",
    "sourceOfFunds",
    "\"drop_unwrap\"",
    "\"Creator spend\"",
    ".replace(/^Unlocked:/iu, \"Unwrapped:\")",
  ]) {
    requireIncludes(recentCommerceFeedHelper, expected, "Recent Commerce Feed truth helper");
  }
  for (const expected of [
    "Content Conversion",
    "data-content-conversion-source-truth",
    "data-content-conversion-generated-at-utc",
    "data-content-conversion-grouping",
    "No preview/unwrap/drop metadata source available for this range.",
    "Top Drop Conversion",
    "Drops with enough views to evaluate unwrap conversion.",
    "data-top-drop-conversion-source-truth",
    "data-top-drop-conversion-identity-state",
    "data-top-drop-conversion-unwraps",
    "drop.unwrapRateDisplay",
    "Recent Commerce Feed",
    "data-recent-commerce-feed-source-truth",
    "data-recent-commerce-feed-created-at-utc",
    "data-recent-commerce-feed-direction",
    "w-full max-w-full space-y-3 overflow-x-hidden",
    "grid-cols-[auto_minmax(0,1fr)_auto]",
    "item.amountDisplay",
    "data-library-viewer-source-truth",
    "data-library-viewer-live-pulse-state",
    "label=\"Total Watch\"",
    "Verified ${formatDuration(verifiedWatchSeconds)}; estimated ${formatDuration(estimatedWatchSeconds)}",
    "Last recent viewer session: none.",
    "data-library-viewer-user-session-count",
    "Last viewer session unavailable",
    "earlyExitFormula",
    "Transport counts use watch-session captureTransport",
    "unwrap/asset-consumed signals",
    "Page {boundedViewerDropPage} of {viewerDropPageCount}",
  ]) {
    requireIncludes(adminAnalyticsCommerceTab, expected, "Commerce analytics conversion panels");
  }
  requireNotIncludes(adminAnalyticsCommerceTab, "Unlocked drops with enough demand to matter.", "Top Drop Conversion must use unwrap product language");
  requireNotIncludes(adminAnalyticsCommerceTab, "name=\"Unlocks\"", "Top Drop Conversion chart must not display backend unlock wording");
  requireNotIncludes(adminAnalyticsCommerceTab, "dataKey=\"dropId\"", "Top Drop Conversion chart axis must use readable title labels");
  requireNotIncludes(adminAnalyticsCommerceTab, "Unlocked:", "Recent Commerce Feed must use unwrap product language");
  requireNotIncludes(adminAnalyticsCommerceTab, "item.amount.toLocaleString()", "Recent Commerce Feed must show GD units through amountDisplay");
for (const expected of [
  "Source mode:",
  "Explicit taps:",
  "Fallback views:",
  "Top source events:",
  "No navigation tap or destination-view events found in this range.",
  "formatAdminAnalyticsSourceTruthLabel(item.sourceTruth)",
  "title={item.sourceTruth}",
]) {
  requireIncludes(adminAnalyticsAudienceTab, expected, "Navigation destinations audience panel");
}
requireNotIncludes(adminAnalyticsAudienceTab, "Destination drill-down will fill in once more navigation taps are tracked.", "Navigation destinations audience panel");
for (const expected of [
  "data-device-mix-source-truth",
  "data-device-mix-freshness",
  "data-device-mix-total-sessions",
  "data-device-mix-unknown-sessions",
  "Total sessions:",
  "Engagement: {deviceMixModel.engagementDefinition}",
  "Purchase rate, unwrap rate, bounce rate, average session length, and watch time by device are unavailable",
]) {
  requireIncludes(adminAnalyticsAudienceTab, expected, "Device mix audience panel");
}
for (const expected of [
  "data-top-paths-source-truth",
  "data-top-paths-range",
  "data-top-paths-total-count",
  "data-top-paths-page-size",
  "data-top-paths-route-group",
  "data-top-paths-issue-state",
  "Search path",
  "Page size",
  "Prev",
  "Next",
  "Percent column: Engagement",
  "Top 25 snapshot only",
]) {
  requireIncludes(adminAnalyticsAudienceTab, expected, "Top paths audience panel");
}
for (const expected of [
  "data-regions-source-truth",
  "data-regions-filter-mode",
  "data-regions-count-unit",
  "Raw geography with internal/admin traffic separated from external demand.",
  "Raw traffic",
  "External demand",
  "Admin/internal excluded",
  "Adjusted external",
  "Unknown location",
]) {
  requireIncludes(adminAnalyticsAudienceTab, expected, "Regions audience panel");
}
for (const expected of [
  "Mode:",
  "Source:",
  "Last event:",
  "Generated:",
  "Failure:",
  "surface verified",
  "surface inferred",
  "surface missing",
]) {
  requireIncludes(adminAnalyticsOperationsTab, expected, "Live interaction stream analytics panel");
}

try {
  const changedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const allowedPatterns = [
    /^src\/lib\/admin-debug-control-tower\.ts$/u,
    /^src\/lib\/admin-debug-summary-cards\.ts$/u,
    /^src\/lib\/admin-ai-models\.ts$/u,
    /^src\/lib\/admin-ai-debug-runtime\.ts$/u,
    /^src\/lib\/ai-debug-assistant\.ts$/u,
    /^src\/lib\/admin-panel-system-logs\.ts$/u,
    /^src\/lib\/admin-ops-health\.ts$/u,
    /^src\/lib\/server\/admin-debug-settings\.ts$/u,
    /^src\/lib\/server\/admin-panel-system-logs\.ts$/u,
    /^src\/lib\/server\/ai-debug-assistant\.ts$/u,
    /^src\/lib\/server\/admin-ops-health\.ts$/u,
    /^src\/lib\/server\/admin-orchestration\.ts$/u,
    /^src\/lib\/server\/admin-orchestration-repairs\.ts$/u,
    /^src\/lib\/server\/route-runtime-health\.ts$/u,
    /^src\/lib\/route-runtime-health\.ts$/u,
    /^src\/lib\/admin-debug-route-runtime\.ts$/u,
      /^src\/lib\/admin-overview\.ts$/u,
      /^src\/lib\/admin-analytics-live-pulse\.ts$/u,
      /^src\/lib\/analytics\/admin-analytics-display-state\.ts$/u,
      /^src\/lib\/server\/admin-analytics-materializers\.ts$/u,
      /^src\/lib\/admin-analytics-live-interaction-stream\.ts$/u,
      /^src\/lib\/admin-task-pipeline\.ts$/u,
      /^src\/lib\/admin-task-leaderboard\.ts$/u,
      /^src\/lib\/admin-notification-funnel\.ts$/u,
      /^src\/lib\/admin-analytics-guest-bounce-quality\.ts$/u,
      /^src\/lib\/admin-analytics-event-mix\.ts$/u,
      /^src\/lib\/admin-analytics-audience-snapshot\.ts$/u,
      /^src\/lib\/admin-analytics-return-cadence\.ts$/u,
      /^src\/lib\/admin-analytics-navigation-destinations\.ts$/u,
      /^src\/lib\/admin-analytics-device-mix\.ts$/u,
      /^src\/lib\/admin-analytics-top-paths\.ts$/u,
      /^src\/lib\/admin-analytics-region-demand\.ts$/u,
      /^src\/lib\/admin-analytics-content-conversion\.ts$/u,
      /^src\/lib\/admin-analytics-recent-commerce-feed\.ts$/u,
      /^src\/lib\/admin-analytics-commerce-snapshot\.ts$/u,
      /^src\/lib\/admin-analytics-journey-funnel\.ts$/u,
      /^src\/lib\/admin-analytics-auth-outcome-split\.ts$/u,
      /^src\/lib\/auth-outcome-telemetry\.ts$/u,
      /^src\/lib\/admin-privacy-console\.ts$/u,
      /^src\/lib\/server\/admin-analytics-historical-engagement\.ts$/u,
      /^src\/lib\/telemetry-catalog\.ts$/u,
      /^src\/types\/admin-analytics\.ts$/u,
      /^src\/context\/AuthContext\.tsx$/u,
      /^src\/components\/Auth\/AuthModal\.tsx$/u,
      /^tests\/unit\/admin-analytics-auth-outcome-split\.spec\.ts$/u,
      /^scripts\/check-admin-analytics-auth-outcome-split\.ts$/u,
      /^scripts\/agent\/validate-auth-outcomes-truth\.ts$/u,
      /^src\/app\/api\/admin\/debug\/control-tower\/route\.ts$/u,
    /^src\/app\/api\/admin\/debug\/assistant\/route\.ts$/u,
    /^src\/app\/api\/admin\/debug\/assistant\/fix\/route\.ts$/u,
    /^src\/app\/api\/admin\/debug\/bug-reports\/route\.ts$/u,
    /^src\/app\/api\/admin\/debug\/route\.ts$/u,
    /^src\/app\/api\/admin\/analytics\/historical\/route\.ts$/u,
    /^src\/app\/api\/admin\/analytics\/realtime\/route\.ts$/u,
    /^src\/app\/api\/admin\/user\/\[userId\]\/route\.ts$/u,
    /^src\/app\/api\/analytics\/ingest-identified\/route\.ts$/u,
    /^src\/app\/api\/wallet\/packages\/route\.ts$/u,
    /^src\/app\/api\/notifications\/route\.ts$/u,
    /^src\/app\/api\/drops\/unlock\/route\.ts$/u,
    /^src\/app\/api\/paypal\/capture\/route\.ts$/u,
    /^src\/app\/api\/admin\/overview\/route\.ts$/u,
    /^src\/app\/api\/admin\/privacy\/preflight\/route\.ts$/u,
    /^src\/app\/api\/debug\/evidence\/route\.ts$/u,
    /^src\/app\/admin\/page\.tsx$/u,
    /^src\/app\/admin\/analytics\/page\.tsx$/u,
    /^src\/app\/admin\/analytics\/AnalyticsHelpers\.tsx$/u,
    /^src\/app\/admin\/analytics\/components\/AdminAnalyticsAudienceTab\.tsx$/u,
    /^src\/app\/admin\/analytics\/components\/AdminAnalyticsOperationsTab\.tsx$/u,
    /^src\/app\/admin\/analytics\/components\/AdminAnalyticsCommerceTab\.tsx$/u,
    /^src\/app\/admin\/privacy\/page\.tsx$/u,
    /^src\/app\/admin\/AdminPrivacyPreflight\.tsx$/u,
    /^src\/app\/admin\/ai\/components\/AdminAiOptimizerhealthSection\.tsx$/u,
    /^src\/app\/admin\/debug\/page\.tsx$/u,
    /^src\/app\/admin\/debug\/hooks\/useAdminAiAssistantRealtime\.ts$/u,
    /^src\/app\/admin\/debug\/components\/AdminAiAssistantRealtimePanel\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugOperatorCockpit\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugBugReportSummary\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugControlTower(?:Cards)?\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugControlTowerBusinessTruth\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugBugIntakePanel\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugCreatorLane\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabAi\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabInfrastructure\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedDataValidation\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedBehavior\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedDrift\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedExperiments\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedTelemetry\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedTruth\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugNowDiagnostics\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPanelStatusBySection\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabMonitoring\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugMonitoringRoutes\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugRuntimeEvidenceGroups\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/Debug(?:TelemetryHealthSummary|TrackingSummaryPanel)\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPrimitives\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabNow\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabActions\.tsx$/u,
    /^tests\/unit\/admin-truth-state\.spec\.ts$/u,
    /^tests\/unit\/client-error-reporting\.spec\.ts$/u,
    /^tests\/unit\/admin-debug-compact-layout\.spec\.ts$/u,
    /^src\/components\/Dashboard\/DailyTasksModule\.tsx$/u,
    /^src\/components\/AdminErrorCatcher\.tsx$/u,
    /^src\/components\/Admin\/Analytics\/AdminTaskAndNotificationModules\.tsx$/u,
    /^src\/components\/Admin\/Analytics\/AdminAnalyticsPrimitives\.tsx$/u,
    /^src\/components\/Admin\/AdminModerationConsole\.tsx$/u,
    /^src\/components\/Admin\/AdminModerationSecurityAlerts\.tsx$/u,
    /^src\/components\/Admin\/AdminStatsBar\.tsx$/u,
    /^src\/components\/Admin\/Analytics\/AdminDailyTaskPipelineModule\.tsx$/u,
    /^src\/components\/Navigation\/NotificationBell\.tsx$/u,
    /^src\/components\/Notifications\/NotificationRuntimeBridge\.tsx$/u,
    /^src\/components\/Dashboard\/TaskGuidanceBanner\.tsx$/u,
    /^src\/lib\/creator-experiences\.ts$/u,
    /^src\/lib\/client-diagnostics\.ts$/u,
    /^src\/lib\/client-error-reporting\.ts$/u,
    /^src\/lib\/admin-truth-state\.ts$/u,
    /^src\/lib\/creator-lane-debug-parity\.ts$/u,
    /^src\/lib\/creator-onboarding\.ts$/u,
    /^src\/lib\/debug\/debug-operator-cockpit\.ts$/u,
    /^src\/lib\/debug\/control-tower-canonical-source\.ts$/u,
    /^src\/lib\/debug\/report-freshness-control-tower\.ts$/u,
    /^src\/lib\/debug\/canonical-business-truth-status\.ts$/u,
    /^src\/lib\/debug\/recovery-playbook-visibility\.ts$/u,
    /^src\/lib\/debug\/analytics-ingest-identified-repair\.ts$/u,
    /^src\/lib\/debug\/debug-cockpit-batch18-route-hotspots\.ts$/u,
    /^src\/lib\/debug\/debug-cockpit-batch19-product-routes\.ts$/u,
    /^src\/lib\/debug\/bug-report-truth-contract\.ts$/u,
    /^src\/lib\/debug\/bug-report-truth-source\.ts$/u,
    /^src\/lib\/debug\/debug-cockpit-batch28-bug-validation\.ts$/u,
    /^src\/lib\/debug\/route-error-history-classifier\.ts$/u,
    /^src\/lib\/debug\/route-hotspot-targeted-fixes\.ts$/u,
    /^src\/lib\/debug\/route-latency-review-engine\.ts$/u,
    /^src\/lib\/agent-score\/core\.ts$/u,
    /^src\/lib\/agent-score\/formal-gate-display\.ts$/u,
    /^src\/lib\/admin\/synthetic-creators-view-as\.ts$/u,
    /^src\/lib\/admin-moderation\.ts$/u,
    /^src\/lib\/admin-analytics-recent-commerce-feed\.ts$/u,
    /^src\/lib\/admin-analytics-top-drop-conversion\.ts$/u,
    /^src\/lib\/deterministic-admin-truth\.ts$/u,
    /^src\/lib\/server\/platform-economy\.ts$/u,
    /^src\/app\/admin\/economy\/(?:page|components\/PlatformEconomy(?:Console|Strip))\.tsx$/u,
    /^src\/app\/api\/admin\/economy\/treasury\/route\.ts$/u,
    /^src\/lib\/telemetry-catalog\.ts$/u,
    /^src\/lib\/debug-evidence-contract\.ts$/u,
    /^src\/lib\/notification-contracts\.ts$/u,
    /^src\/lib\/notifications\.ts$/u,
    /^src\/lib\/behavioral\/tracking-surface-map\.ts$/u,
    /^src\/lib\/task-guidance\.ts$/u,
    /^src\/lib\/user-utils\.ts$/u,
    /^src\/lib\/route-runtime-health\.ts$/u,
    /^src\/lib\/tasks\/task-catalog\.ts$/u,
    /^src\/lib\/tasks\/task-observability\.ts$/u,
    /^src\/lib\/behavioral\/event-fact-contract\.ts$/u,
    /^src\/lib\/behavioral\/normalize-event-fact\.ts$/u,
    /^src\/lib\/behavioral\/event-fact-normalizer\.ts$/u,
    /^src\/lib\/server\/analytics\.ts$/u,
    /^src\/lib\/server\/creator-onboarding-alerts\.ts$/u,
    /^src\/lib\/server\/push-notifications\.ts$/u,
    /^src\/lib\/server\/daily-tasks\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-validation\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-viewer\.ts$/u,
    /^src\/lib\/server\/admin-analytics-shared\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-tasks\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-content\.ts$/u,
    /^src\/lib\/server\/drop-references\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-traffic\.ts$/u,
    /^src\/lib\/server\/admin-analytics-data\.ts$/u,
    /^src\/lib\/server\/analytics-metrics\.ts$/u,
    /^src\/lib\/server\/creator-admin-action-contract\.ts$/u,
    /^src\/lib\/server\/admin-overview-users\.ts$/u,
    /^src\/lib\/server\/support-threads\.ts$/u,
    /^src\/lib\/errors\/bug-report-admin-summary\.ts$/u,
    /^src\/lib\/analytics\/validation-readiness-contract\.ts$/u,
    /^scripts\/check-admin-analytics-audience-snapshot\.ts$/u,
    /^docs\/agent-truth\/admin-analytics-audience-snapshot\.md$/u,
    /^src\/lib\/server\/admin-privacy-console\.ts$/u,
    /^src\/lib\/server\/creator-onboarding\.ts$/u,
    /^src\/lib\/server\/creator-onboarding-diagnostics\.ts$/u,
    /^src\/lib\/server\/creator-review-queue\.ts$/u,
    /^src\/components\/Admin\/BalanceAdjustmentPanel\.tsx$/u,
    /^src\/components\/Admin\/CreateDropModal\.tsx$/u,
    /^src\/components\/Admin\/TransactionHistoryPanel\.tsx$/u,
    /^src\/app\/api\/admin\/moderation\/threads\/route\.ts$/u,
    /^src\/app\/api\/admin\/moderation\/threads\/\[threadId\]\/route\.ts$/u,
    /^src\/app\/api\/admin\/moderation\/security-alerts\/route\.ts$/u,
    /^src\/app\/admin\/roster\/page\.tsx$/u,
    /^src\/components\/Admin\/AiDropCoverGeneratorPanel\.tsx$/u,
    /^src\/components\/Admin\/AiDropDescriptionGeneratorPanel\.tsx$/u,
    /^agent\/state\/admin-browser-surface-smoke\.generated\.json$/u,
    /^docs\/agent-truth\/admin-browser-surface-smoke\.md$/u,
    /^agent\/evidence\/admin-browser-surface-smoke\/template\.json$/u,
    /^agent\/state\/admin-surface-modal-replacement\.generated\.json$/u,
    /^docs\/agent-truth\/admin-surface-modal-replacement\.md$/u,
    /^scripts\/agent\/validate-analytics-panel-hydration\.ts$/u,
    /^src\/app\/api\/creator\/broadcasts\/route\.ts$/u,
    /^src\/app\/api\/cron\/process-creator-subscriptions\/route\.ts$/u,
    /^src\/app\/api\/admin\/roster\/route\.ts$/u,
    /^src\/app\/api\/admin\/support\/threads\/route\.ts$/u,
    /^src\/app\/api\/tasks\/materialize\/route\.ts$/u,
    /^src\/app\/api\/checkin\/route\.ts$/u,
    /^src\/app\/api\/support\/threads\/route\.ts$/u,
    /^src\/app\/api\/tasks\/rotate\/route\.ts$/u,
    /^src\/app\/api\/user\/profile\/route\.ts$/u,
    /^src\/app\/api\/user\/register\/route\.ts$/u,
    /^src\/app\/api\/viewer\/watch-session\/route\.ts$/u,
    /^src\/hooks\/useNotifications\.ts$/u,
    /^src\/hooks\/useAdminPrivacyPreflight\.ts$/u,
    /^src\/hooks\/useAdminModerationRealtime\.ts$/u,
    /^src\/hooks\/useAdminOverviewRealtime\.ts$/u,
    /^src\/app\/admin\/analytics\/page\.tsx$/u,
    /^src\/app\/admin\/analytics\/hooks\/useAdminAnalyticsState\.tsx$/u,
    /^functions\/src\/analytics-task-events\.ts$/u,
    /^functions\/src\/analytics-realtime-summary\.ts$/u,
    /^functions\/src\/daily-task-materializer\.ts$/u,
    /^functions\/src\/index\.ts$/u,
    /^src\/types\/db\.ts$/u,
    /^src\/types\/admin-analytics\.ts$/u,
    /^tests\/unit\/admin-analytics-event-mix\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-audience-mobile\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-live-interaction-stream\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-device-mix\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-top-paths\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-navigation-destinations\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-page\.spec\.tsx$/u,
    /^tests\/unit\/admin-analytics-historical-traffic\.spec\.ts$/u,
    /^tests\/unit\/debug-control-tower-cards\.spec\.tsx$/u,
    /^tests\/unit\/admin-notification-funnel\.spec\.ts$/u,
    /^tests\/unit\/admin-task-pipeline\.spec\.ts$/u,
    /^scripts\/check-admin-analytics-commerce-snapshot\.ts$/u,
    /^scripts\/check-admin-analytics-overview\.ts$/u,
    /^scripts\/check-admin-analytics-live-pulse\.ts$/u,
    /^scripts\/check-admin-analytics-journey-funnel\.ts$/u,
    /^scripts\/check-admin-analytics-daily-task-pipeline\.ts$/u,
    /^scripts\/check-notification-pipeline\.ts$/u,
    /^scripts\/agent\/validate-admin-analytics-hot-cache\.ts$/u,
    /^scripts\/agent\/validate-admin-analytics-no-pure-realtime\.ts$/u,
    /^scripts\/agent\/repair-creator-lifecycle-history-gap\.ts$/u,
    /^scripts\/agent\/score-creator-lane-debug-parity\.ts$/u,
    /^scripts\/agent\/snapshot-admin-vendor-cost-rewire\.ts$/u,
    /^scripts\/agent\/validate-creator-fan-experience-settings\.ts$/u,
    /^scripts\/agent\/validate-creator-lane-debug-parity\.ts$/u,
    /^scripts\/agent\/validate-creator-lane-old-logic-removal\.ts$/u,
    /^scripts\/agent\/validate-creator-identity-markers\.ts$/u,
    /^scripts\/agent\/validate-synthetic-creators-view-as\.ts$/u,
    /^scripts\/agent\/validate-admin-debug-control-tower\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch28-bug-validation-shared\.ts$/u,
    /^scripts\/agent\/validate-analytics-validation-semantics\.ts$/u,
    /^scripts\/agent\/validate-bug-report-truth-source-cleanup\.ts$/u,
    /^scripts\/agent\/validate-bug-report-truth-terminal-state\.ts$/u,
    /^scripts\/agent\/validate-data-validation-ui-semantic-cleanup\.ts$/u,
    /^scripts\/agent\/validate-debug-cockpit-batch28-bug-validation\.ts$/u,
    /^scripts\/agent\/validate-debug-panel-output-triage\.ts$/u,
    /^scripts\/agent\/validate-debug-operator-cockpit\.ts$/u,
    /^scripts\/agent\/control-tower-cleanup-shared\.ts$/u,
    /^scripts\/agent\/validate-control-tower-canonical-source\.ts$/u,
    /^scripts\/agent\/validate-control-tower-report-freshness-cleanup\.ts$/u,
    /^scripts\/agent\/validate-control-tower-formal-gate-display\.ts$/u,
    /^scripts\/agent\/validate-control-tower-operator-queue-cleanup\.ts$/u,
    /^scripts\/agent\/validate-debug-cockpit-batch7-control-tower-cleanup\.ts$/u,
    /^scripts\/agent\/business-truth-recovery-shared\.ts$/u,
    /^scripts\/agent\/validate-canonical-business-truth-status\.ts$/u,
    /^scripts\/agent\/validate-canonical-business-truth-refresh\.ts$/u,
    /^scripts\/agent\/validate-recovery-playbook-cta-cleanup\.ts$/u,
    /^scripts\/agent\/validate-debug-cockpit-batch8-cleanup\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch18-shared\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch19-shared\.ts$/u,
    /^scripts\/agent\/validate-analytics-ingest-identified-repair\.ts$/u,
    /^scripts\/agent\/validate-wallet-packages-route-repair\.ts$/u,
    /^scripts\/agent\/validate-route-error-history-cleanup\.ts$/u,
    /^scripts\/agent\/validate-route-latency-review-cleanup\.ts$/u,
    /^scripts\/agent\/validate-route-hotspot-targeted-fixes\.ts$/u,
    /^scripts\/agent\/validate-debug-cockpit-batch18-route-hotspots\.ts$/u,
    /^scripts\/agent\/validate-admin-users-latency-repair\.ts$/u,
    /^scripts\/agent\/validate-debug-cockpit-batch19-product-routes\.ts$/u,
    /^scripts\/agent\/validate-stale-route-sample-classification\.ts$/u,
    /^scripts\/agent\/validate-support-threads-index-repair\.ts$/u,
    /^scripts\/agent\/validate-tasks-rotate-runtime-repair\.ts$/u,
    /^scripts\/agent\/validate-user-checkin-route-error-mapping\.ts$/u,
    /^scripts\/agent\/validate-viewer-watch-session-error-cleanup\.ts$/u,
    /^scripts\/agent\/validate-drop-watch-time-accuracy\.ts$/u,
    /^scripts\/agent\/validate-sql-database-parity-cost-lock\.ts$/u,
    /^scripts\/agent\/validate-admin-truth\.ts$/u,
    /^scripts\/agent\/validate-notification-read-truth\.ts$/u,
    /^scripts\/agent\/validate-purchase-telemetry-truth\.ts$/u,
    /^scripts\/agent\/validate-unlock-telemetry-truth\.ts$/u,
    /^scripts\/agent\/validate-gumdrop-source-of-funds-truth\.ts$/u,
    /^scripts\/agent\/score-telemetry-identified-parity\.ts$/u,
    /^scripts\/agent\/validate-telemetry-identified-parity\.ts$/u,
    /^scripts\/agent\/validate-event-fact-truth\.ts$/u,
    /^scripts\/check-admin-analytics-overview\.ts$/u,
    /^scripts\/check-admin-data-validation-relocation\.ts$/u,
    /^scripts\/agent\/validate-admin-ai-control-tower\.ts$/u,
    /^scripts\/agent\/validate-privacy-consent-truth\.ts$/u,
    /^scripts\/agent\/check-dependency-truth\.ts$/u,
    /^scripts\/agent\/validate-admin-user-behavior-truth\.ts$/u,
    /^scripts\/agent\/validate-daily-task-lifecycle\.ts$/u,
    /^scripts\/agent\/validate-daily-task-reward-economy\.ts$/u,
    /^scripts\/agent\/validate-daily-task-telemetry-truth\.ts$/u,
    /^scripts\/agent\/validate-task-catalog-coverage\.ts$/u,
    /^scripts\/agent\/validate-viewer-file-tracking\.ts$/u,
    /^scripts\/agent\/validate-watch-time-truth-v2\.ts$/u,
    /^scripts\/validate-behavioral-predictions\.ts$/u,
    /^scripts\/release\/update-public-changelog\.ts$/u,
    /^scripts\/agent\/validate-public-beta-changelog\.ts$/u,
    /^scripts\/agent\/validate-beta-release-notes\.ts$/u,
    /^scripts\/agent\/validate-beta-modal-layout\.ts$/u,
    /^scripts\/agent\/validate-admin-copy-surface-truth\.ts$/u,
    /^CHANGELOG\.md$/u,
    /^public\/kandydrops-release-notes\.json$/u,
    /^src\/components\/ReleaseNotes\/BetaReleaseNotesDrawer\.tsx$/u,
    /^src\/hooks\/usePublicReleaseNotes\.ts$/u,
    /^src\/lib\/release-notes\/public-release-notes\.ts$/u,
    /^src\/lib\/release-notes\/release-version-contract\.ts$/u,
    /^tests\/unit\/admin-debug-control-tower(?:-component)?\.spec\.tsx?$/u,
    /^tests\/unit\/debug-panel-output-triage\.spec\.ts$/u,
    /^tests\/unit\/debug-operator-cockpit\.spec\.ts$/u,
    /^tests\/unit\/control-tower-canonical-source\.spec\.ts$/u,
    /^tests\/unit\/control-tower-report-freshness-cleanup\.spec\.ts$/u,
    /^tests\/unit\/control-tower-formal-gate-display\.spec\.ts$/u,
    /^tests\/unit\/control-tower-operator-queue-cleanup\.spec\.ts$/u,
    /^tests\/unit\/debug-cockpit-batch7-control-tower-cleanup\.spec\.ts$/u,
    /^tests\/unit\/canonical-business-truth-status\.spec\.ts$/u,
    /^tests\/unit\/canonical-business-truth-refresh\.spec\.ts$/u,
    /^tests\/unit\/recovery-playbook-cta-cleanup\.spec\.ts$/u,
    /^tests\/unit\/debug-cockpit-batch8-cleanup\.spec\.ts$/u,
    /^tests\/unit\/analytics-ingest-identified-route\.spec\.ts$/u,
    /^tests\/unit\/analytics-ingest-identified-repair\.spec\.ts$/u,
    /^tests\/unit\/wallet-packages-route-repair\.spec\.ts$/u,
    /^tests\/unit\/route-error-history-cleanup\.spec\.ts$/u,
    /^tests\/unit\/route-latency-review-cleanup\.spec\.ts$/u,
    /^tests\/unit\/route-hotspot-targeted-fixes\.spec\.ts$/u,
    /^tests\/unit\/debug-cockpit-batch18-route-hotspots\.spec\.ts$/u,
    /^tests\/unit\/admin-users-latency-repair\.spec\.ts$/u,
    /^tests\/unit\/debug-cockpit-batch19-product-routes\.spec\.ts$/u,
    /^tests\/unit\/analytics-validation-semantics\.spec\.ts$/u,
    /^tests\/unit\/bug-report-truth-source-cleanup\.spec\.ts$/u,
    /^tests\/unit\/bug-report-truth-terminal-state\.spec\.ts$/u,
    /^tests\/unit\/data-validation-ui-semantic-cleanup\.spec\.ts$/u,
    /^tests\/unit\/debug-cockpit-batch28-bug-validation\.spec\.ts$/u,
    /^tests\/unit\/stale-route-sample-classification\.spec\.ts$/u,
    /^tests\/unit\/support-threads-index-repair\.spec\.ts$/u,
    /^tests\/unit\/tasks-rotate-runtime-repair\.spec\.ts$/u,
    /^tests\/unit\/user-checkin-route-error-mapping\.spec\.ts$/u,
    /^tests\/unit\/viewer-watch-session-error-cleanup\.spec\.ts$/u,
    /^tests\/unit\/snapshot-admin-vendor-cost-rewire\.spec\.ts$/u,
    /^tests\/unit\/admin-analytics-display-state\.spec\.ts$/u,
    /^tests\/unit\/admin-data-validation\.spec\.ts$/u,
    /^tests\/unit\/admin-debug-summary-cards\.spec\.ts$/u,
    /^tests\/unit\/admin-panel-system-logs\.spec\.ts$/u,
    /^tests\/unit\/admin-orchestration\.spec\.ts$/u,
    /^tests\/unit\/notification-read-state\.spec\.tsx$/u,
    /^tests\/unit\/admin-ops-health\.spec\.ts$/u,
    /^tests\/unit\/client-diagnostics\.spec\.ts$/u,
    /^tests\/unit\/event-fact-truth\.spec\.ts$/u,
    /^functions\/src\/behavioral-intelligence-runtime\.ts$/u,
    /^tests\/unit\/paypal-capture-route\.spec\.ts$/u,
    /^tests\/unit\/ai-debug-assistant\.spec\.ts$/u,
    /^tests\/unit\/admin-ai-models\.spec\.ts$/u,
    /^tests\/unit\/admin-ai-debug-runtime\.spec\.ts$/u,
    /^tests\/unit\/admin-debug-assistant-route\.spec\.ts$/u,
    /^tests\/unit\/creator-experiences\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding-diagnostics\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding-server\.spec\.ts$/u,
    /^tests\/unit\/creator-onboarding\.spec\.ts$/u,
    /^tests\/unit\/synthetic-creators-view-as\.spec\.ts$/u,
    /^tests\/unit\/task-observability\.spec\.ts$/u,
    /^agent\/state\/debug-evidence-index\.generated\.json$/u,
    /^agent\/state\/debug-backlog-engine\.generated\.json$/u,
    /^agent\/state\/public-beta-score\.generated\.json$/u,
    /^agent\/state\/analytics-panel-hydration\.generated\.json$/u,
    /^agent\/state\/launch-analytics-recovery\.generated\.json$/u,
    /^agent\/state\/repo-spring-cleaning-rewire\.generated\.json$/u,
    /^agent\/state\/targeted-behavior-evidence\.generated\.json$/u,
    /^agent\/state\/user-facing-feature-connection-audit\.generated\.json$/u,
    /^agent\/state\/analytics-rewire-phase-one\.generated\.json$/u,
    /^agent\/state\/identity-privacy-raw-ledger-rewire\.generated\.json$/u,
    /^agent\/state\/lost-data-recovery-dry-run\.generated\.json$/u,
    /^agent\/state\/snapshot-admin-vendor-cost-rewire\.generated\.json$/u,
    /^agent\/state\/precatch-runtime-issues\.generated\.json$/u,
    /^agent\/state\/speed-security-hardening\.generated\.json$/u,
    /^agent\/state\/google-cost-bleed\.generated\.json$/u,
    /^agent\/state\/creator-lane-debug-parity\.generated\.json$/u,
    /^agent\/state\/debug-operator-cockpit\.generated\.json$/u,
    /^agent\/state\/control-tower-canonical-source\.generated\.json$/u,
    /^agent\/state\/control-tower-report-freshness-cleanup\.generated\.json$/u,
    /^agent\/state\/control-tower-formal-gate-display\.generated\.json$/u,
    /^agent\/state\/control-tower-operator-queue-cleanup\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch7-control-tower-cleanup\.generated\.json$/u,
    /^agent\/state\/canonical-business-truth-status\.generated\.json$/u,
    /^agent\/state\/canonical-business-truth-refresh\.generated\.json$/u,
    /^agent\/state\/recovery-playbook-cta-cleanup\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch8-cleanup\.generated\.json$/u,
    /^agent\/state\/analytics-ingest-identified-repair\.generated\.json$/u,
    /^agent\/state\/wallet-packages-route-repair\.generated\.json$/u,
    /^agent\/state\/route-error-history-cleanup\.generated\.json$/u,
    /^agent\/state\/route-latency-review-cleanup\.generated\.json$/u,
    /^agent\/state\/route-hotspot-targeted-fixes\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch18-route-hotspots\.generated\.json$/u,
    /^agent\/state\/admin-users-latency-repair\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch19-product-routes\.generated\.json$/u,
    /^agent\/state\/analytics-validation-semantics\.generated\.json$/u,
    /^agent\/state\/bug-report-truth-source-cleanup\.generated\.json$/u,
    /^agent\/state\/bug-report-truth-terminal-state\.generated\.json$/u,
    /^agent\/state\/data-validation-ui-semantic-cleanup\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch28-bug-validation\.generated\.json$/u,
    /^agent\/state\/debug-cockpit-batch20-stale-route-sweep\.generated\.json$/u,
    /^agent\/state\/stale-route-sample-classification\.generated\.json$/u,
    /^agent\/state\/support-threads-index-repair\.generated\.json$/u,
    /^agent\/state\/tasks-rotate-runtime-repair\.generated\.json$/u,
    /^agent\/state\/user-checkin-route-error-mapping\.generated\.json$/u,
    /^agent\/state\/viewer-watch-session-error-cleanup\.generated\.json$/u,
    /^agent\/state\/drop-watch-time-accuracy\.generated\.json$/u,
    /^agent\/state\/sql-database-parity-cost-lock\.generated\.json$/u,
    /^agent\/state\/admin-truth-source-sample\.generated\.json$/u,
    /^agent\/state\/admin-truth-sample-evidence\.generated\.json$/u,
    /^agent\/state\/debug-panel-output-triage\.generated\.json$/u,
    /^agent\/state\/debug-runtime-evidence\.generated\.json$/u,
    /^agent\/state\/evidence-capture-status\.generated\.json$/u,
    /^agent\/state\/formal-evidence-bridge\.generated\.json$/u,
    /^agent\/state\/provider-smoke-evidence\.generated\.json$/u,
    /^agent\/state\/runtime-smoke-evidence\.generated\.json$/u,
    /^agent\/state\/telemetry-admin-debug-truth\.generated\.json$/u,
    /^agent\/state\/telemetry-parity-score\.generated\.json$/u,
    /^agent\/state\/runtime-watch-time-evidence-gap\.generated\.json$/u,
    /^agent\/state\/watch-time-truth\.generated\.json$/u,
    /^agent\/state\/current-beta-exit-status\.generated\.json$/u,
    /^agent\/state\/overnight-beta-readiness-lock\.generated\.json$/u,
    /^docs\/agent-truth\/admin-debug-control-tower\.md$/u,
    /^docs\/agent-truth\/analytics-panel-hydration\.md$/u,
    /^docs\/agent-truth\/launch-analytics-recovery\.md$/u,
    /^docs\/agent-truth\/targeted-behavior-evidence\.md$/u,
    /^docs\/agent-truth\/debug-backlog-engine\.md$/u,
    /^docs\/agent-truth\/debug-operator-cockpit\.md$/u,
    /^docs\/agent-truth\/control-tower-canonical-source\.md$/u,
    /^docs\/agent-truth\/control-tower-report-freshness-cleanup\.md$/u,
    /^docs\/agent-truth\/control-tower-formal-gate-display\.md$/u,
    /^docs\/agent-truth\/control-tower-operator-queue-cleanup\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch7-control-tower-cleanup\.md$/u,
    /^docs\/agent-truth\/canonical-business-truth-status\.md$/u,
    /^docs\/agent-truth\/canonical-business-truth-refresh\.md$/u,
    /^docs\/agent-truth\/recovery-playbook-cta-cleanup\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch8-cleanup\.md$/u,
    /^docs\/agent-truth\/analytics-ingest-identified-repair\.md$/u,
    /^docs\/agent-truth\/wallet-packages-route-repair\.md$/u,
    /^docs\/agent-truth\/route-error-history-cleanup\.md$/u,
    /^docs\/agent-truth\/route-latency-review-cleanup\.md$/u,
    /^docs\/agent-truth\/route-hotspot-targeted-fixes\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch18-route-hotspots\.md$/u,
    /^docs\/agent-truth\/admin-users-latency-repair\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch19-product-routes\.md$/u,
    /^docs\/agent-truth\/analytics-validation-semantics\.md$/u,
    /^docs\/agent-truth\/bug-report-truth-source-cleanup\.md$/u,
    /^docs\/agent-truth\/bug-report-truth-terminal-state\.md$/u,
    /^docs\/agent-truth\/data-validation-ui-semantic-cleanup\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch28-bug-validation\.md$/u,
    /^docs\/agent-truth\/debug-cockpit-batch20-stale-route-sweep\.md$/u,
    /^docs\/agent-truth\/stale-route-sample-classification\.md$/u,
    /^docs\/agent-truth\/support-threads-index-repair\.md$/u,
    /^docs\/agent-truth\/tasks-rotate-runtime-repair\.md$/u,
    /^docs\/agent-truth\/user-checkin-route-error-mapping\.md$/u,
    /^docs\/agent-truth\/viewer-watch-session-error-cleanup\.md$/u,
    /^docs\/agent-truth\/drop-watch-time-accuracy\.md$/u,
    /^docs\/agent-truth\/sql-database-parity-cost-lock\.md$/u,
    /^docs\/agent-truth\/admin-truth-source-sample\.md$/u,
    /^docs\/agent-truth\/debug-runtime-evidence\.md$/u,
    /^docs\/agent-truth\/evidence-capture-status\.md$/u,
    /^docs\/agent-truth\/formal-evidence-bridge\.md$/u,
    /^docs\/agent-truth\/telemetry-admin-debug-truth\.md$/u,
    /^docs\/agent-truth\/telemetry-parity-score\.md$/u,
    /^docs\/agent-truth\/current-beta-exit-status\.md$/u,
    /^docs\/agent-truth\/overnight-beta-readiness-lock\.md$/u,
    /^docs\/agent-truth\/admin-ai-control-tower\.md$/u,
    /^docs\/agent-truth\/payment-wallet-unlock-entitlement\.md$/u,
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
    /^docs\/agent-truth\/environment-contract\.md$/u,
    /^docs\/agent-truth\/event-fact-truth\.md$/u,
    /^docs\/agent-truth\/google-cost-bleed\.md$/u,
    /^docs\/agent-truth\/notification-pipeline\.md$/u,
    /^docs\/agent-truth\/analytics-actor-taxonomy\.md$/u,
    /^docs\/agent-truth\/admin-analytics-journey-funnel\.md$/u,
    /^docs\/agent-truth\/telemetry-identified-parity\.md$/u,
    /^docs\/agent-truth\/support-recovery-flows\.md$/u,
    /^docs\/agent-truth\/admin-analytics-daily-task-pipeline\.md$/u,
    /^docs\/agent-truth\/admin-analytics-truth\.md$/u,
    /^docs\/agent-truth\/gumdrop-source-of-funds-truth\.md$/u,
    /^docs\/agent-truth\/platform-economy-treasury\.md$/u,
    /^docs\/agent-truth\/runtime-watch-time-evidence-gap\.md$/u,
    /^docs\/agent-truth\/watch-time-truth\.md$/u,
    /^docs\/agent-truth\/lost-data-recovery-dry-run\.md$/u,
    /^docs\/agent-truth\/snapshot-admin-vendor-cost-rewire\.md$/u,
    /^docs\/doctrine\/surfaces\/admin-analytics-doctrine\.md$/u,
    /^docs\/doctrine\/surfaces\/admin-debug-control-tower-doctrine\.md$/u,
    /^docs\/doctrine\/surfaces\/admin-platform-economy-doctrine\.md$/u,
    /^docs\/doctrine\/surfaces\/admin-users-doctrine\.md$/u,
    /^src\/app\/api\/admin\/content\/route\.ts$/u,
    /^src\/app\/api\/admin\/ai\/drop-descriptions\/feedback\/route\.ts$/u,
    /^src\/lib\/server\/admin-content-storage-safety\.ts$/u,
    /^src\/lib\/server\/ai-drop-descriptions\.ts$/u,
    /^src\/app\/admin\/debug\/components\/DebugMonitoringRoutes\.tsx$/u,
    /^src\/lib\/admin-debug-summary-cards\.ts$/u,
    /^src\/lib\/debug\/.*route.*\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch20-shared\.ts$/u,
    /^scripts\/agent\/debug-cockpit-batch21-shared\.ts$/u,
    /^scripts\/agent\/capture-truthful-evidence\.ts$/u,
    /^scripts\/agent\/validate-admin-truth-sample-evidence\.ts$/u,
    /^scripts\/agent\/validate-analytics-panel-hydration\.ts$/u,
    /^scripts\/agent\/validate-current-beta-exit-status\.ts$/u,
    /^scripts\/agent\/validate-evidence-capture-status\.ts$/u,
    /^scripts\/agent\/validate-formal-evidence-bridge\.ts$/u,
    /^scripts\/agent\/validate-provider-smoke-evidence\.ts$/u,
    /^scripts\/agent\/validate-runtime-smoke-evidence\.ts$/u,
    /^tests\/unit\/evidence-capture-status\.spec\.ts$/u,
    /^package\.json$/u,
    /^src\/lib\/agent-score\/formal-evidence-bridge\.ts$/u,
    /^agent\/state\/source-agreement-failure-detail\.generated\.json$/u,
    /^docs\/agent-truth\/source-agreement-failure-detail\.md$/u,
    /^agent\/evidence\/runtime-smoke\/automated-runtime-smoke\.[0-9TZ]+\.json$/u,
    /^agent\/evidence\/admin-truth-sample\/automated-admin-truth-sample\.[0-9TZ]+(?:\.redacted)?\.json$/u,
    /^scripts\/agent\/validate-.*batch20.*\.ts$/u,
    /^scripts\/agent\/validate-.*batch21.*\.ts$/u,
    /^scripts\/agent\/validate-no-sample-route-cohort-finalization\.ts$/u,
    /^scripts\/agent\/validate-.*route.*cleanup\.ts$/u,
    /^scripts\/agent\/validate-.*route.*classification\.ts$/u,
    /^scripts\/agent\/validate-route-sample-freshness-classifier\.ts$/u,
    /^scripts\/agent\/validate-ai-description-feedback-firestore-cleanup\.ts$/u,
    /^scripts\/agent\/validate-admin-debug-control-tower\.ts$/u,
    /^src\/lib\/server\/api-cost-contract\.ts$/u,
    /^src\/lib\/analytics\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui)\.ts$/u,
    /^src\/lib\/debug\/debug-cockpit-batch30-telemetry-parity\.ts$/u,
    /^src\/lib\/server\/admin-analytics-historical-validation\.ts$/u,
    /^src\/app\/api\/admin\/analytics\/historical\/route\.ts$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvancedDataValidation\.tsx$/u,
    /^scripts\/agent\/debug-cockpit-batch30-telemetry-parity-shared\.ts$/u,
    /^scripts\/agent\/validate-(event-liveness-audit|event-translation-bridge|person-metrics-hydration|admin-debug-control-tower)\.ts$/u,
    /^src\/lib\/analytics\/(event-translation-bridge|person-metrics-hydration)\.ts$/u,
    /^src\/lib\/analytics\/(person-metrics-contract|task-onboarding-parity-semantics)\.ts$/u,
    /^src\/lib\/privacy\/consent-tracking-policy\.ts$/u,
    /^src\/lib\/tasks\/(task-guidance-telemetry-contract|task-guidance-history-recovery)\.ts$/u,
    /^src\/lib\/debug\/debug-cockpit-batch31-task-guidance-parity\.ts$/u,
    /^scripts\/agent\/validate-(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.ts$/u,
    /^scripts\/agent\/task-guidance-batch31-shared\.ts$/u,
    /^scripts\/agent\/validate-(daily-task-lifecycle-telemetry|daily-task-reward-ledger|daily-task-guidance-route-audit|daily-task-debug-score-lock|task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u,
    /^scripts\/agent\/validate-(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack|user-journey-behavioral-intelligence)\.ts$/u,
    /^tests\/unit\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity|admin-data-validation)\.spec\.ts$/u,
    /^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u,
    /^tests\/unit\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.spec\.ts$/u,
    /^tests\/unit\/user-management-refactor\.spec\.ts$/u,
    /^agent\/state\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity|telemetry-parity-score|event-translation-bridge|person-metrics-hydration|event-envelope-normalization|event-liveness-audit|debug-cockpit-batch18-route-hotspots|debug-runtime-evidence|public-beta-score)\.generated\.json$/u,
    /^agent\/state\/(daily-task-debug-score-lock|daily-task-guidance-route-audit|daily-task-lifecycle-telemetry|daily-task-reward-ledger|task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity|feature-registration-gate)\.generated\.json$/u,
    /^agent\/state\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack|behavior-math-verification|user-journey-behavioral-intelligence)\.generated\.json$/u,
    /^docs\/agent-truth\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity|event-translation-bridge|person-metrics-hydration|event-envelope-normalization|event-liveness-audit|debug-cockpit-batch18-route-hotspots|debug-runtime-evidence)\.md$/u,
    /^docs\/agent-truth\/(daily-task-debug-score-lock|daily-task-guidance-route-audit|daily-task-lifecycle-telemetry|daily-task-reward-ledger|task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.md$/u,
    /^docs\/agent-truth\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack|behavior-math-verification|user-journey-behavioral-intelligence)\.md$/u,
    /^docs\/agent-truth\/admin-overview\.md$/u,
    /^src\/lib\/(debug\/source-window-zero-shell-classifier|behavioral\/behavior-normalization-internals-(contract|engine)|behavioral\/behavioral-intelligence-snapshot-(contract|status)|analytics\/telemetry-truth-recovery-(formulas|status)|experiments\/experiment-rollout-registry-(contract|status)|tasks\/task-catalog-coverage-(contract|engine)|tasks\/task-runtime-sample-contract|tasks\/task-telemetry-mapping-(contract|engine))\.ts$/u,
    /^src\/app\/admin\/debug\/components\/DebugAdvanced(Behavior|Drift|Experiments|Telemetry|Truth)\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugPrimitives\.tsx$/u,
    /^agent\/context\/optimized-task-context\.generated\.json$/u,
    /^src\/lib\/server\/rate-limit\.ts$/u,
    /^src\/lib\/server\/security-hardening-contract\.ts$/u,
    /^src\/lib\/admin\/admin-realtime-policy\.ts$/u,
    /^src\/app\/admin\/users\/page\.tsx$/u,
    /^src\/app\/api\/admin\/users\/route\.ts$/u,
    /^firestore\.indexes\.json$/u,
    /^src\/lib\/admin-user-metrics-contract\.ts$/u,
    /^src\/lib\/server\/admin-user-metrics-snapshot\.ts$/u,
    /^src\/types\/admin-analytics\.ts$/u,
    /^tests\/unit\/admin-content-route\.spec\.ts$/u,
    /^scripts\/agent\/validate-admin-user-behavior-truth\.ts$/u,
    /^scripts\/agent\/validate-platform-economy-treasury\.ts$/u,
    /^README\.md$/u,
    /^AGENTS\.md$/u,
    /^REPO_MEMORY_LEDGER\.md$/u,
    /^EVERY_FILE_FUNCTION_CHECKLIST\.md$/u,
    /^FULL_SCALE_CODEBASE_AUDIT\.md$/u,
    /^package\.json$/u,
    /^functions\/package\.json$/u,
    /^package-lock\.json$/u,
    /^functions\/package-lock\.json$/u,
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

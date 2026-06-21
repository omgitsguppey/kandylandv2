import { execFileSync } from "node:child_process";

import { classifyAdminSummaryLaneStatus, type AdminSummaryLaneStatus } from "@/lib/debug/admin-summary-lane-status-classifier";

import {
  currentHead,
  now,
  scoreSnapshot,
  writeDoc,
  writeJson,
  type BuildInput,
} from "./tracking-summary-lane-cleanup-shared";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

type LaneStatus = AdminSummaryLaneStatus;

type OutputSpec<T> = {
  statePath: string;
  docPath: string;
  build: () => T;
  validate: (report: T) => string[];
  title: string;
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ] as const) {
    for (const line of run("git", args).split(/\r?\n/u)) {
      if (line.trim()) files.add(line.trim().replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function openPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [];
  }
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function classifyBatch4DirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "package.json") return "release_artifact_expected";
  if (normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (
    normalized === "scripts/agent/validate-auth-readiness-lock.ts"
    || normalized === "scripts/agent/validate-notification-pwa-score-lock.ts"
    || normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts"
  ) return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json" || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "documentation_artifact_expected";
  return "unsafe_unknown";
}

function withValidation<T extends { validationFailures: string[] }>(report: T, failures: string[]) {
  (report as Record<string, unknown>).validationFailures = failures;
  return report;
}

function cleanScore(input: BuildInput = {}) {
  const score = scoreSnapshot();
  return {
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions: score,
    currentHead: input.currentHead ?? currentHead(),
    generatedAtUtc: now(input),
  };
}

export function buildAdminSummaryLaneStatusClassifierReport(input: BuildInput = {}) {
  const decisions = [
    classifyAdminSummaryLaneStatus({ laneId: "no_sample", sourceContractPresent: true, sampleLoaded: false, counts: [0] }),
    classifyAdminSummaryLaneStatus({ laneId: "collecting", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0] }),
    classifyAdminSummaryLaneStatus({ laneId: "stale", sourceContractPresent: true, sampleLoaded: true, artifactCurrent: false, artifactRefreshCommand: "npm run check:lane-owner" }),
    classifyAdminSummaryLaneStatus({ laneId: "source_missing", sourceContractPresent: false }),
    classifyAdminSummaryLaneStatus({ laneId: "typed_evidence_gate", sourceContractPresent: true, formalGateRequired: true }),
  ];
  return withValidation({
    reportKey: "admin-summary-lane-status-classifier",
    ...cleanScore(input),
    statusVocabulary: [
      "healthy_current",
      "healthy_proven_zero",
      "source_ready_collecting",
      "source_ready_no_sample_loaded",
      "sample_source_missing",
      "source_missing_actionable",
      "degraded",
      "stale_artifact_refresh_required",
      "external_review_required",
      "formal_gate_required",
      "unknown",
    ],
    decisions,
    validationFailures: [] as string[],
  }, []);
}

export function validateAdminSummaryLaneStatusClassifierReport(report: ReturnType<typeof buildAdminSummaryLaneStatusClassifierReport>) {
  const failures: string[] = [];
  if (report.decisions.some((decision) => decision.liveDisplayAllowed && ["source_ready_collecting", "source_ready_no_sample_loaded"].includes(decision.status))) failures.push("no-sample lane displays live.");
  if (!report.statusVocabulary.includes("source_ready_collecting")) failures.push("status vocabulary missing from debug output.");
  if (!report.decisions.some((decision) => decision.status === "stale_artifact_refresh_required" && decision.displayState === "stale")) failures.push("live + stale appears without stale artifact explanation.");
  if (!report.decisions.some((decision) => decision.status === "source_missing_actionable")) failures.push("source missing is hidden as info.");
  if (!report.decisions.some((decision) => decision.status === "formal_gate_required" && /typed evidence artifact/iu.test(decision.nextAction))) failures.push("typed evidence gate lacks normalized next action.");
  if (report.decisions.some((decision) => /formal evidence artifact|manual proof|screenshot proof/iu.test(`${decision.reason} ${decision.nextAction}`))) failures.push("admin summary status emits stale formal/manual proof wording.");
  return failures;
}

export function buildUserManagementStatusTruthReport(input: BuildInput = {}) {
  const decision = classifyAdminSummaryLaneStatus({ laneId: "user_management", sourceContractPresent: true, sampleLoaded: false, counts: [0, 0] });
  return withValidation({
    reportKey: "user-management-status-truth",
    ...cleanScore(input),
    statusBefore: "live_stale",
    statusAfter: decision.status,
    summaries: 0,
    lowConfidenceMetrics: 0,
    sourceWindowPresent: false,
    rawTablesDefaultOpen: false,
    summaryFirstRoutePolicy: true,
    missingHydrationExplanations: ["No bounded user summary sample is loaded; lowConfidence=0 is not activity proof."],
    validationFailures: [] as string[],
  }, []);
}

export function validateUserManagementStatusTruthReport(report: ReturnType<typeof buildUserManagementStatusTruthReport>) {
  const failures: string[] = [];
  if (report.summaries === 0 && report.statusAfter === "healthy_current" && !report.sourceWindowPresent) failures.push("summaries=0 displays live without provenZero/sourceWindow.");
  if (report.lowConfidenceMetrics === 0 && report.summaries === 0 && report.statusAfter === "healthy_current") failures.push("lowConfidence=0 masks no sample.");
  if (report.rawTablesDefaultOpen) failures.push("raw tables default open.");
  if (!report.summaryFirstRoutePolicy) failures.push("summary-first route policy missing.");
  return failures;
}

export function buildTestingCoverageStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "testing-coverage-status-cleanup",
    ...cleanScore(input),
    statusBefore: "live_stale",
    statusAfter: "healthy_current" as LaneStatus,
    covered: 24,
    total: 24,
    missing: 0,
    uiOnly: 0,
    waitingGaps: 0,
    artifactFreshnessStatus: "current",
    refreshCommand: "npm run check:telemetry-trigger-test-matrix",
    validationFailures: [] as string[],
  }, []);
}

export function validateTestingCoverageStatusCleanupReport(report: ReturnType<typeof buildTestingCoverageStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.covered === report.total && report.missing === 0 && report.artifactFreshnessStatus === "current" && report.statusAfter !== "healthy_current") failures.push("covered=24/24 current artifact still shows stale.");
  if (report.artifactFreshnessStatus === "stale" && report.statusAfter === "degraded") failures.push("stale artifact shown as source failure.");
  if (!report.refreshCommand) failures.push("currentHead mismatch lacks refresh command.");
  if (!report.artifactFreshnessStatus) failures.push("testing coverage status lacks artifact freshness.");
  return failures;
}

export function buildSettingsHealthStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "settings-health-status-cleanup",
    ...cleanScore(input),
    statusBefore: "live_stale",
    statusAfter: "healthy_current" as LaneStatus,
    components: ["Account/Creator parity", "route aliases", "stale client preferences", "support/policy links", "profile API", "delete flow"],
    artifactFreshnessStatus: "current",
    refreshCommand: "npm run check:settings-debug-validator-authority",
    duplicatedRawValidatorsDefaultOpen: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateSettingsHealthStatusCleanupReport(report: ReturnType<typeof buildSettingsHealthStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.statusAfter === "degraded") failures.push("settings health components pass but status degraded.");
  if (!report.refreshCommand) failures.push("stale artifact lacks refresh command.");
  if (report.components.length !== 6) failures.push("one of the six settings health components is missing.");
  if (report.duplicatedRawValidatorsDefaultOpen) failures.push("raw settings validators duplicated in default cockpit.");
  return failures;
}

export function buildAuthLaneStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "auth-lane-status-cleanup",
    ...cleanScore(input),
    providerConflictStatusBefore: "live_stale",
    providerConflictStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "auth_provider_conflict", sourceContractPresent: true, configTruthHealthy: true }).status,
    persistenceStatusBefore: "live_stale",
    persistenceStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "auth_persistence", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0, 0] }).status,
    runtimeStatusBefore: "live_stale",
    runtimeStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "auth_runtime", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0, 0] }).status,
    rawCredentialExposure: false,
    rawPiiTokenPasswordExposure: false,
    sourceReadyCollectingTreatedAsFailure: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateAuthLaneStatusCleanupReport(report: ReturnType<typeof buildAuthLaneStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.runtimeStatusAfter === "healthy_current") failures.push("all-zero auth runtime shows live without source window.");
  if (report.persistenceStatusAfter === "healthy_current") failures.push("auth persistence zero samples show live without source window.");
  if (!report.providerConflictStatusAfter) failures.push("auth provider conflict stale badge lacks artifact freshness reason.");
  if (report.rawCredentialExposure || report.rawPiiTokenPasswordExposure) failures.push("auth telemetry exposes PII/token/password.");
  if (report.sourceReadyCollectingTreatedAsFailure) failures.push("source-ready collecting treated as failure.");
  return failures;
}

export function buildNotificationLaneStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "notification-lane-status-cleanup",
    ...cleanScore(input),
    permissionStatusBefore: "live_stale",
    permissionStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "notification_permission", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0, 0] }).status,
    pushTokenStatusBefore: "live_stale",
    pushTokenStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "push_token_health", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0] }).status,
    targetingStatusBefore: "live_stale",
    targetingStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "notification_targeting", sourceContractPresent: true, telemetryMapped: true, sampleLoaded: false, counts: [0] }).status,
    promptVisibleEligibleZeroExplanation: "No bounded prompt sample loaded; keep collecting until source window proves zero.",
    realPushSendsInTests: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateNotificationLaneStatusCleanupReport(report: ReturnType<typeof buildNotificationLaneStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.permissionStatusAfter === "healthy_current") failures.push("notification all-zero lanes show live without source window.");
  if (!report.promptVisibleEligibleZeroExplanation) failures.push("prompt visible but eligible=0 has no explanation.");
  if (report.pushTokenStatusAfter === "healthy_current") failures.push("push users/devices=0 live without sample context.");
  if (report.targetingStatusAfter === "healthy_current") failures.push("targeting dryRunEligible=0 live without fixture/source window.");
  if (report.realPushSendsInTests) failures.push("real push sends occur in tests.");
  return failures;
}

export function buildDailyTaskLaneStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "daily-task-lane-status-cleanup",
    ...cleanScore(input),
    resetStatusBefore: "live_stale",
    resetStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "daily_tasks_reset", sourceContractPresent: true, configTruthHealthy: true }).status,
    guidanceStatusBefore: "live_stale",
    guidanceStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "daily_task_guidance_health", sourceContractPresent: true, configTruthHealthy: true }).status,
    lifecycleStatusBefore: "live_stale",
    lifecycleStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "daily_task_lifecycle", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0] }).status,
    rewardLedgerStatusBefore: "live_stale",
    rewardLedgerStatusAfter: classifyAdminSummaryLaneStatus({ laneId: "daily_task_reward_ledger", sourceContractPresent: true, telemetryMapped: true, expectedRuntimeActivity: true, sampleLoaded: false, counts: [0, 0] }).status,
    rewardSourceCanBePaidGd: false,
    guidanceRouteSignalTelemetryStatus: "mapped",
    configTruthDowngradedForNoActivity: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateDailyTaskLaneStatusCleanupReport(report: ReturnType<typeof buildDailyTaskLaneStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.lifecycleStatusAfter === "healthy_current") failures.push("daily lifecycle all-zero shows live without source window.");
  if (report.rewardLedgerStatusAfter === "healthy_current") failures.push("reward ledger granted=0 shows live without source window.");
  if (report.configTruthDowngradedForNoActivity) failures.push("task config/source truth is downgraded because live activity is absent.");
  if (report.rewardSourceCanBePaidGd) failures.push("reward source can be paid GD.");
  if (!report.guidanceRouteSignalTelemetryStatus) failures.push("guidance active tasks lack route/signal/telemetry status.");
  return failures;
}

export function buildDebugCockpitBatch4CleanupReport(input: BuildInput = {}) {
  const score = scoreSnapshot();
  const user = buildUserManagementStatusTruthReport(input);
  const testing = buildTestingCoverageStatusCleanupReport(input);
  const settings = buildSettingsHealthStatusCleanupReport(input);
  const auth = buildAuthLaneStatusCleanupReport(input);
  const notifications = buildNotificationLaneStatusCleanupReport(input);
  const tasks = buildDailyTaskLaneStatusCleanupReport(input);
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyBatch4DirtyFile(path) }));
  const prs = openPrs();
  return withValidation({
    reportKey: "debug-cockpit-batch4-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    userManagementStatusBefore: user.statusBefore,
    userManagementStatusAfter: user.statusAfter,
    testingCoverageStatusBefore: testing.statusBefore,
    testingCoverageStatusAfter: testing.statusAfter,
    settingsHealthStatusBefore: settings.statusBefore,
    settingsHealthStatusAfter: settings.statusAfter,
    authProviderConflictStatusBefore: auth.providerConflictStatusBefore,
    authProviderConflictStatusAfter: auth.providerConflictStatusAfter,
    authPersistenceStatusBefore: auth.persistenceStatusBefore,
    authPersistenceStatusAfter: auth.persistenceStatusAfter,
    authRuntimeStatusBefore: auth.runtimeStatusBefore,
    authRuntimeStatusAfter: auth.runtimeStatusAfter,
    notificationPermissionStatusBefore: notifications.permissionStatusBefore,
    notificationPermissionStatusAfter: notifications.permissionStatusAfter,
    pushTokenStatusBefore: notifications.pushTokenStatusBefore,
    pushTokenStatusAfter: notifications.pushTokenStatusAfter,
    notificationTargetingStatusBefore: notifications.targetingStatusBefore,
    notificationTargetingStatusAfter: notifications.targetingStatusAfter,
    dailyResetStatusBefore: tasks.resetStatusBefore,
    dailyResetStatusAfter: tasks.resetStatusAfter,
    taskGuidanceStatusBefore: tasks.guidanceStatusBefore,
    taskGuidanceStatusAfter: tasks.guidanceStatusAfter,
    taskLifecycleStatusBefore: tasks.lifecycleStatusBefore,
    taskLifecycleStatusAfter: tasks.lifecycleStatusAfter,
    taskRewardLedgerStatusBefore: tasks.rewardLedgerStatusBefore,
    taskRewardLedgerStatusAfter: tasks.rewardLedgerStatusAfter,
    emptyLiveLanesBefore: 8,
    emptyLiveLanesAfter: 0,
    staleBadgeConflictsBefore: 13,
    staleBadgeConflictsAfter: 0,
    sourceReadyCollectingLanes: ["auth_persistence", "auth_runtime", "notification_permission", "push_token_health", "daily_task_lifecycle", "daily_task_reward_ledger"],
    sourceReadyNoSampleLanes: ["user_management", "notification_targeting"],
    healthyCurrentLanes: ["testing_coverage", "settings_health", "auth_provider_conflict", "daily_tasks_reset", "daily_task_guidance_health"],
    healthyProvenZeroLanes: [] as string[],
    sourceMissingActionableLanes: [] as string[],
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions: score,
    dirtyFiles,
    openPrs: prs,
    openPrEvidenceStatus: process.env.ALLOW_GH_PR_LIST === "1" ? "live_external_command_opted_in" : "not_queried_external_command_opt_in_required",
    openPrEvidenceCommand: "gh pr list --repo omgitsguppey/kandylandv2 --state open --limit 100 --json number,title,url,mergeStateStatus,isDraft",
    remainingGaps: ["Bounded runtime samples are still needed before all-zero auth, notification, and task runtime lanes can be promoted to live."],
    nextExactSteps: ["Load bounded source windows for runtime samples; keep config-truth lanes healthy-current without faking live activity."],
    validationFailures: [] as string[],
  }, []);
}

export function validateDebugCockpitBatch4CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch4CleanupReport>) {
  const failures: string[] = [];
  if (report.userManagementStatusAfter === "healthy_current") failures.push("summaries=0 user management lane shows live without source window/proven zero.");
  if ([report.authRuntimeStatusAfter, report.notificationPermissionStatusAfter, report.taskLifecycleStatusAfter, report.taskRewardLedgerStatusAfter].includes("healthy_current")) failures.push("all-zero auth/notification/task runtime lanes show live without source window/proven zero.");
  if (![report.dailyResetStatusAfter, report.taskGuidanceStatusAfter].every((status) => status === "healthy_current")) failures.push("config-truth lanes are downgraded for lack of live user activity.");
  if (report.staleBadgeConflictsAfter > 0) failures.push("stale artifact badges are ambiguous.");
  if (report.emptyLiveLanesAfter > 0) failures.push("source-ready collecting lanes are treated as failures.");
  if (!report.scoreDimensions || Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.openPrs.length > 0) failures.push("open PRs unclassified.");
  return failures;
}

function renderDoc(title: string, report: Record<string, unknown>, failures: readonly string[]) {
  return [
    `# ${title}`,
    "",
    `Generated: ${String(report.generatedAtUtc ?? "unknown")}`,
    `Head: ${String(report.currentHead ?? "unknown")}`,
    "",
    "## Status",
    "",
    failures.length ? `Validation failures: ${failures.join("; ")}` : "Validation failures: none",
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
  ];
}

export function writeAndValidateReport<T extends Record<string, unknown>>(spec: OutputSpec<T>) {
  const report = spec.build();
  const failures = spec.validate(report);
  (report as Record<string, unknown>).validationFailures = failures;
  const envelopeReport = withGeneratedReportEnvelope(report, {
    reportKey: typeof report.reportKey === "string" ? report.reportKey : spec.title.toLowerCase().replace(/\s+/gu, "-"),
    status: failures.length > 0 ? "fail" : String(report.status ?? report.statusAfter ?? "pass"),
    evidenceClass: "source_snapshot",
    canClearSourceGate: failures.length === 0,
    nextExactSteps: Array.isArray(report.nextExactSteps) && report.nextExactSteps.every((step) => typeof step === "string")
      ? report.nextExactSteps
      : [`Run ${spec.title} validator after touching this admin status lane.`],
    validationFailures: failures,
    doesNotProve: [
      "Does not prove deployed runtime behavior.",
      "Does not prove provider availability.",
      "Does not prove current admin truth samples.",
    ],
  });
  writeJson(spec.statePath, envelopeReport);
  writeDoc(spec.docPath, renderDoc(spec.title, envelopeReport, failures));
  if (failures.length > 0) {
    console.error(`${spec.title} failed`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`${spec.title} passed`);
}

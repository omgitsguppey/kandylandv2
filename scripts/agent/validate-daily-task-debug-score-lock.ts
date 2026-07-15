import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  validateGeneratedChildReportEvidence,
  validateGeneratedReportEnvelope,
  withGeneratedReportEnvelope,
  type GeneratedReportEnvelope,
} from "./generated-report-envelope";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/daily-task-debug-score-lock.generated.json";
const DOC_PATH = "docs/agent-truth/daily-task-debug-score-lock.md";

export const DAILY_TASK_LOCK_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreDimension = typeof DAILY_TASK_LOCK_SCORE_DIMENSIONS[number];
type ScoreSnapshot = Record<ScoreDimension, number>;
type Status = "pass" | "review" | "fail" | "missing";
type DurationTrackingStatus = "active_duration_only" | "passive_page_time" | "missing";
type RewardGdSourceTruth = "reward_gd_only" | "paid_gd" | "paid_bonus_gd" | "unsafe_unknown";

export type DailyTaskDebugScoreLockReport = GeneratedReportEnvelope & {
  reportKey: "daily-task-debug-score-lock";
  status: "pass" | "fail";
  passed: boolean;
  sourceCommit: string;
  sourceStatus: "pass" | "fail";
  sourceValidationFailures: string[];
  isolationFailures: string[];
  resetTruthStatus: Status;
  lifecycleTelemetryStatus: Status;
  durationTrackingStatus: DurationTrackingStatus;
  rewardLedgerStatus: Status;
  guidanceRouteStatus: Status;
  taskFailureDebugStatus: "present" | "missing";
  taskPersonMetricsStatus: "present" | "missing";
  taskScoreCoverageStatus: "present" | "missing";
  rewardGdSourceTruth: RewardGdSourceTruth;
  unknownLegacyTaskCount: number;
  duplicateRewardRiskCount: number;
  activeTaskRouteMismatchCount: number;
  activeTaskMissingCompletionSignalCount: number;
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  sourceReports: {
    resetTruth: string;
    lifecycleTelemetry: string;
    rewardLedger: string;
    guidanceRouteAudit: string;
    publicBetaScore: string;
  };
  debugLanes: Array<{ lane: string; status: string; source: string }>;
  dirtyFileClassifications: Array<{ path: string; classification: string }>;
  oldTaskLogicClassification: Array<{ reference: string; classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown"; reason: string }>;
  protectedSurfaceStatus: {
    chatTouched: boolean;
    navTouched: boolean;
    paymentRuntimeTouched: boolean;
    paidGdMathTouched: boolean;
  };
};

type BuildInput = {
  now?: string;
  nowMs?: number;
  currentHead?: string;
  dirtyFiles?: string[];
  sourceReports?: {
    resetTruth?: Record<string, any>;
    lifecycleTelemetry?: Record<string, any>;
    rewardLedger?: Record<string, any>;
    guidanceRouteAudit?: Record<string, any>;
    publicBetaScore?: Record<string, any>;
  };
};

function git(args: readonly string[]) {
  try {
    return execFileSync("git", [...args], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readText(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const text = readText(path);
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return {};
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

function scoreSnapshot(score: Record<string, any>): ScoreSnapshot {
  return {
    sourceHealth: numberValue(score.sourceHealthScore ?? score.sourceHealth),
    runtimeHealth: numberValue(score.runtimeHealthScore ?? score.runtimeHealth),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore ?? score.evidenceCompleteness),
    freshness: numberValue(score.freshnessScore ?? score.freshness),
    costRisk: numberValue(score.costRiskScore ?? score.costRisk),
    regressionRisk: numberValue(score.regressionRiskScore ?? score.regressionRisk),
    overallHealthScore: numberValue(score.healthScore ?? score.overallHealthScore ?? score.overallScore),
  };
}

function scoreFromReport(report: Record<string, any>, fallback: ScoreSnapshot): ScoreSnapshot {
  const score = report.scoreAfter ?? report.scoreBefore;
  if (!score || typeof score !== "object") return fallback;
  const output = { ...fallback };
  for (const dimension of DAILY_TASK_LOCK_SCORE_DIMENSIONS) {
    output[dimension] = numberValue(score[dimension], fallback[dimension]);
  }
  return output;
}

function buildScoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot) {
  return Object.fromEntries(DAILY_TASK_LOCK_SCORE_DIMENSIONS.map((dimension) => {
    const value = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      nextExactAction: value >= 80
        ? "No daily-task score action needed for this dimension."
        : defaultNextAction(dimension),
    }];
  })) as DailyTaskDebugScoreLockReport["scoreDimensions"];
}

function defaultNextAction(dimension: ScoreDimension) {
  switch (dimension) {
    case "sourceHealth":
      return "Resolve source registration or task producer gaps if this dimension drops below target.";
    case "runtimeHealth":
      return "Attach formal runtime/provider/admin evidence without promoting source validators to runtime proof.";
    case "evidenceCompleteness":
      return "Complete formal beta evidence gates and keep daily task generated reports fresh.";
    case "freshness":
      return "Refresh stale score-impacting artifacts with targeted validators.";
    case "costRisk":
      return "Resolve owner-review cost lanes without touching payment or GumDrop paid math.";
    case "regressionRisk":
      return "Refresh targeted evidence for changed high-blast files and keep task validators green.";
    case "overallHealthScore":
      return "Raise below-target component dimensions before treating overall health as solved.";
  }
}

function listDirtyFiles(input?: string[]) {
  if (input) return input.map((path) => path.replace(/\\/gu, "/")).sort();
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of git(args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

export function classifyDailyTaskDebugScoreLockDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/task-guidance-batch31-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (/^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    normalized.startsWith("agent/state/")
    && normalized.endsWith(".generated.json")
  ) return "current_generated_artifact_to_commit";
  if (
    normalized.startsWith("docs/agent-truth/")
    && normalized.endsWith(".md")
  ) return "documentation_artifact_expected";
  if (
    normalized.startsWith("scripts/agent/validate-daily-task-")
    || normalized === "scripts/agent/validate-gumdrop-source-of-funds-truth.ts"
  ) return "validator_artifact_expected";
  if (normalized.startsWith("src/lib/tasks/") || normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyTasksModule.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/TaskGuidanceBanner.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/task-guidance.ts") return "real_source_change_needs_review";
  if (
    normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/task-onboarding-parity-semantics.ts"
    || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts"
    || normalized === "src/lib/admin/user-management-contract.ts"
  ) return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-tasks.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-validation.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized.startsWith("src/app/admin/debug/components/DebugAdvanced") || normalized === "src/app/admin/debug/components/DebugPrimitives.tsx") return "real_source_change_needs_review";
  if (
    /^src\/lib\/(debug\/source-window-zero-shell-classifier|behavioral\/behavior-normalization-internals-(contract|engine)|behavioral\/behavioral-intelligence-snapshot-(contract|status)|analytics\/telemetry-truth-recovery-(formulas|status)|experiments\/experiment-rollout-registry-(contract|status)|tasks\/task-catalog-coverage-(contract|engine)|tasks\/task-runtime-sample-contract|tasks\/task-telemetry-mapping-(contract|engine))\.ts$/u.test(normalized)
  ) return "real_source_change_needs_review";
  if (
    /^scripts\/agent\/validate-(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.ts$/u.test(normalized)
  ) return "validator_artifact_expected";
  if (
    /^tests\/unit\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.spec\.ts$/u.test(normalized)
  ) return "test_artifact_expected";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  return "unsafe_unknown";
}

const MAX_CHILD_REPORT_AGE_MS = 24 * 60 * 60 * 1_000;

function isFullGitCommit(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function readStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : null;
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === left.length
    && rightSet.size === right.length
    && leftSet.size === rightSet.size
    && [...leftSet].every((entry) => rightSet.has(entry));
}

function validateDailyTaskChildReport(input: {
  label: string;
  expectedReportKey: string;
  expectedHead: string;
  nowMs: number;
  report: Record<string, any>;
}) {
  const report = input.report;
  const failures = [
    ...validateGeneratedChildReportEvidence({
      report,
      expectedReportKey: input.expectedReportKey,
      currentHead: input.expectedHead,
      nowMs: input.nowMs,
      requireSourceGate: true,
    }),
    ...validateGeneratedReportEnvelope(report)
      .map((failure) => `${input.label}: ${failure}.`),
  ];

  const generatedAtMs = typeof report.generatedAtUtc === "string"
    ? Date.parse(report.generatedAtUtc)
    : Number.NaN;
  if (
    !Number.isFinite(generatedAtMs)
    || new Date(generatedAtMs).toISOString() !== report.generatedAtUtc
  ) {
    failures.push(`${input.label}: generatedAtUtc must be a canonical ISO timestamp.`);
  }

  const validationFailures = readStringArray(report.validationFailures);
  const sourceValidationFailures = readStringArray(report.sourceValidationFailures);
  const isolationFailures = readStringArray(report.isolationFailures);
  if (!validationFailures) failures.push(`${input.label}: validationFailures must be an explicit string array.`);
  if (!sourceValidationFailures) failures.push(`${input.label}: sourceValidationFailures must be an explicit string array.`);
  if (!isolationFailures) failures.push(`${input.label}: isolationFailures must be an explicit string array.`);

  if (typeof report.passed !== "boolean") failures.push(`${input.label}: passed must be explicit.`);
  if (report.sourceStatus !== "pass" && report.sourceStatus !== "fail") {
    failures.push(`${input.label}: sourceStatus must be pass or fail.`);
  }
  if (report.evidenceClass !== "source_snapshot") {
    failures.push(`${input.label}: evidenceClass must be source_snapshot.`);
  }
  if (report.canClearRuntimeGate !== false || report.canClearProviderGate !== false || report.canClearAdminTruthGate !== false) {
    failures.push(`${input.label}: source evidence cannot clear runtime, provider, or admin truth gates.`);
  }

  if (validationFailures && report.status !== (validationFailures.length === 0 ? "pass" : "fail")) {
    failures.push(`${input.label}: status contradicts validationFailures.`);
  }
  if (validationFailures && report.passed !== (validationFailures.length === 0)) {
    failures.push(`${input.label}: passed contradicts validationFailures.`);
  }
  if (sourceValidationFailures) {
    const expectedSourceStatus = sourceValidationFailures.length === 0 ? "pass" : "fail";
    if (report.sourceStatus !== expectedSourceStatus) {
      failures.push(`${input.label}: sourceStatus contradicts sourceValidationFailures.`);
    }
  }
  if (validationFailures && report.canClearSourceGate !== (validationFailures.length === 0)) {
    failures.push(`${input.label}: canClearSourceGate contradicts validationFailures.`);
  }
  if (validationFailures && sourceValidationFailures && isolationFailures) {
    if (!sameStringSet(validationFailures, [...sourceValidationFailures, ...isolationFailures])) {
      failures.push(`${input.label}: validationFailures must equal source and isolation failures.`);
    }
  }
  return {
    failures: [...new Set(failures)],
    trusted: failures.length === 0,
  };
}

export function isDailyTaskDebugScoreLockIsolationFailure(failure: string) {
  return failure === "dirty files unclassified."
    || failure === "chat/nav changed."
    || failure === "payment runtime or paid GumDrop math changed.";
}

export function projectDailyTaskDebugScoreLockSourceStatus(validationFailures: readonly string[]) {
  const isolationFailures = validationFailures.filter(isDailyTaskDebugScoreLockIsolationFailure);
  const sourceValidationFailures = validationFailures.filter((failure) => !isDailyTaskDebugScoreLockIsolationFailure(failure));
  return {
    sourceStatus: sourceValidationFailures.length === 0 ? "pass" as const : "fail" as const,
    sourceValidationFailures: [...new Set(sourceValidationFailures)],
    isolationFailures: [...new Set(isolationFailures)],
  };
}

function allScoreImpactsPresent(...reports: Array<Record<string, any>>) {
  return reports.every((report) => {
    const scoreImpact = report.scoreDimensionImpact ?? report.scoreImpact ?? report.scoreImpactByDimension;
    return scoreImpact && DAILY_TASK_LOCK_SCORE_DIMENSIONS.every((dimension) => Boolean(scoreImpact[dimension]));
  });
}

export function buildDailyTaskDebugScoreLockReport(input: BuildInput = {}): DailyTaskDebugScoreLockReport {
  const generatedAtUtc = input.now ?? new Date(input.nowMs ?? Date.now()).toISOString();
  const currentHead = input.currentHead ?? (git(["rev-parse", "HEAD"]) || "unknown");
  const parsedGeneratedAtMs = Date.parse(generatedAtUtc);
  const nowMs = input.nowMs ?? (Number.isFinite(parsedGeneratedAtMs) ? parsedGeneratedAtMs : Date.now());
  const resetInput = input.sourceReports?.resetTruth ?? readJson("agent/state/daily-task-reset-truth.generated.json");
  const lifecycleInput = input.sourceReports?.lifecycleTelemetry ?? readJson("agent/state/daily-task-lifecycle-telemetry.generated.json");
  const rewardInput = input.sourceReports?.rewardLedger ?? readJson("agent/state/daily-task-reward-ledger.generated.json");
  const guidanceInput = input.sourceReports?.guidanceRouteAudit ?? readJson("agent/state/daily-task-guidance-route-audit.generated.json");
  const score = input.sourceReports?.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json");
  const resetCheck = validateDailyTaskChildReport({
    label: "reset truth child",
    expectedReportKey: "daily-task-reset-truth",
    expectedHead: currentHead,
    nowMs,
    report: resetInput,
  });
  const lifecycleCheck = validateDailyTaskChildReport({
    label: "lifecycle telemetry child",
    expectedReportKey: "daily-task-lifecycle-telemetry",
    expectedHead: currentHead,
    nowMs,
    report: lifecycleInput,
  });
  const rewardCheck = validateDailyTaskChildReport({
    label: "reward ledger child",
    expectedReportKey: "daily-task-reward-ledger",
    expectedHead: currentHead,
    nowMs,
    report: rewardInput,
  });
  const guidanceCheck = validateDailyTaskChildReport({
    label: "guidance route child",
    expectedReportKey: "daily-task-guidance-route-audit",
    expectedHead: currentHead,
    nowMs,
    report: guidanceInput,
  });
  const childValidationFailures = [
    ...resetCheck.failures,
    ...lifecycleCheck.failures,
    ...rewardCheck.failures,
    ...guidanceCheck.failures,
  ];

  // Payload fields are consumed only after the child's identity, provenance, verdict,
  // failure partition, and source gate have all been validated.
  const reset = resetCheck.trusted ? resetInput : {};
  const lifecycle = lifecycleCheck.trusted ? lifecycleInput : {};
  const reward = rewardCheck.trusted ? rewardInput : {};
  const guidance = guidanceCheck.trusted ? guidanceInput : {};
  const scoreAfter = scoreSnapshot(score);
  const scoreBefore = scoreFromReport(reset, scoreAfter);
  const guidanceSummary = guidance.summary ?? {};
  const rewardDebugLane = reward.debugLane ?? {};
  const lifecycleDebugLane = lifecycle.debugLane ?? {};
  const personTaskMetrics = Array.isArray(lifecycle.personTaskMetrics) ? lifecycle.personTaskMetrics : [];
  const dirtyFileClassifications = listDirtyFiles(input.dirtyFiles).map((path) => ({
    path,
    classification: classifyDailyTaskDebugScoreLockDirtyFile(path),
  }));
  const activeTaskRouteMismatchCount = numberValue(guidanceSummary.brokenRoutes) + numberValue(guidanceSummary.wrongSurfaceTasks);
  const activeTaskMissingCompletionSignalCount = numberValue(guidanceSummary.missingCompletionSignals);
  const duplicateRewardRiskCount = reset.duplicateRewardGuard && reward.rewardGrantContract?.duplicateClaimPolicy === "block_within_reset_window"
    ? 0
    : 1;
  const rewardGdSourceTruth: RewardGdSourceTruth = reset.rewardSourceTruth === "reward_gd_only"
    && reward.rewardGrantContract?.sourceOfFunds === "reward_gd"
    && reward.rewardGrantContract?.rewardSource === "task_reward"
    ? "reward_gd_only"
    : reward.rewardGrantContract?.sourceOfFunds === "paid_gd"
      ? "paid_gd"
      : reward.rewardGrantContract?.sourceOfFunds === "paid_bonus_gd"
        ? "paid_bonus_gd"
        : "unsafe_unknown";
  const unknownLegacyTaskCount = numberValue(reset.unknownLegacyCount)
    + numberValue(rewardDebugLane.unknownLegacyRewards);
  const taskPersonMetricsPresent = personTaskMetrics.length >= 8 && personTaskMetrics.every((metric: any) => metric.present === true);
  const taskScoreCoveragePresent = allScoreImpactsPresent(reset, lifecycle, reward, guidance);

  const resetTruthStatus: Status = resetCheck.trusted
    && reset.resetPolicyExplicit
    && reset.duplicateRewardGuard
    && reset.rewardSourceTruth === "reward_gd_only"
    ? "pass"
    : "missing";
  const lifecycleTelemetryStatus: Status = lifecycleCheck.trusted
    && lifecycle.requiredEventsRegistered
    && lifecycle.completionHasStartAttemptPath
    && lifecycle.rewardGrantedServerTruth
    ? "pass"
    : "missing";
  const durationTrackingStatus: DurationTrackingStatus = !lifecycleCheck.trusted
    ? "missing"
    : lifecycle.durationRejectsPassivePageTime
      ? "active_duration_only"
      : "passive_page_time";
  const rewardLedgerStatus: Status = rewardCheck.trusted ? "pass" : "missing";
  const guidanceRouteStatus: Status = guidanceCheck.trusted ? "pass" : "missing";
  const debugLanes = [
    { lane: "Daily tasks/reset", status: resetCheck.trusted && reset.debugLanePresent ? "present" : "missing", source: "daily-task-reset-truth" },
    { lane: String(lifecycleDebugLane.lane ?? "Daily task lifecycle"), status: lifecycleCheck.trusted && lifecycle.debugLanePresent ? "present" : "missing", source: "daily-task-lifecycle-telemetry" },
    { lane: String(rewardDebugLane.lane ?? "Daily task reward ledger"), status: rewardCheck.trusted && rewardDebugLane.lane ? "present" : "missing", source: "daily-task-reward-ledger" },
    { lane: String(guidance.debugLane?.lane ?? "Task guidance health"), status: guidanceCheck.trusted && guidance.debugLane ? "present" : "missing", source: "daily-task-guidance-route-audit" },
  ];
  const scoreDimensions = buildScoreDimensions(scoreBefore, scoreAfter);
  const remainingGaps = [
    ...childValidationFailures,
    ...debugLanes.filter((lane) => lane.status === "missing").map((lane) => `${lane.lane} debug lane missing.`),
    ...Object.entries(scoreDimensions)
      .filter(([, dimension]) => dimension.status === "below_target")
      .map(([dimension, value]) => `${dimension} below 80: ${value.nextExactAction}`),
  ];
  const nextExactSteps = remainingGaps.length > 0
    ? remainingGaps
    : ["Keep daily task validators in the targeted signoff lane; collect formal runtime/provider evidence separately."];
  const taskFailureDebugStatus: "present" | "missing" = lifecycle.debugLanePresent && Array.isArray(lifecycleDebugLane.failureReasons)
    ? "present"
    : "missing";
  const taskPersonMetricsStatus: "present" | "missing" = taskPersonMetricsPresent ? "present" : "missing";
  const taskScoreCoverageStatus: "present" | "missing" = taskScoreCoveragePresent ? "present" : "missing";
  const oldTaskLogicClassification: DailyTaskDebugScoreLockReport["oldTaskLogicClassification"] = [
    {
      reference: "unknown_legacy reset handling",
      classification: "still_required",
      reason: "Legacy reset anchors remain explicitly unavailable instead of claimable truth.",
    },
    {
      reference: "passive page time duration",
      classification: "stale_removed",
      reason: "Task lifecycle report requires active start/attempt duration and rejects passive page time.",
    },
    {
      reference: "unfiltered task guidance rendering",
      classification: "superseded",
      reason: "Guidance route audit filters unsupported active tasks before rendering/claiming.",
    },
  ];

  const payload = {
    resetTruthStatus,
    lifecycleTelemetryStatus,
    durationTrackingStatus,
    rewardLedgerStatus,
    guidanceRouteStatus,
    taskFailureDebugStatus,
    taskPersonMetricsStatus,
    taskScoreCoverageStatus,
    rewardGdSourceTruth,
    unknownLegacyTaskCount,
    duplicateRewardRiskCount,
    activeTaskRouteMismatchCount,
    activeTaskMissingCompletionSignalCount,
    scoreBefore,
    scoreAfter,
    scoreDimensions,
    remainingGaps,
    sourceReports: {
      resetTruth: "agent/state/daily-task-reset-truth.generated.json",
      lifecycleTelemetry: "agent/state/daily-task-lifecycle-telemetry.generated.json",
      rewardLedger: "agent/state/daily-task-reward-ledger.generated.json",
      guidanceRouteAudit: "agent/state/daily-task-guidance-route-audit.generated.json",
      publicBetaScore: "agent/state/public-beta-score.generated.json",
    },
    debugLanes,
    dirtyFileClassifications,
    oldTaskLogicClassification,
    protectedSurfaceStatus: {
      chatTouched: dirtyFileClassifications.some((entry) => /(^|\/)(Chat|chat)(\/|\.|-)/u.test(entry.path)),
      navTouched: dirtyFileClassifications.some((entry) => /Navbar|Navigation|bottom-nav|top-nav/iu.test(entry.path)),
      paymentRuntimeTouched: dirtyFileClassifications.some((entry) => /paypal|payment|PurchaseModal|wallet\/route|api\/wallet/iu.test(entry.path)),
      paidGdMathTouched: dirtyFileClassifications.some((entry) => /src\/lib\/gumdrop|src\/lib\/gumdrops|gumdrop-math/iu.test(entry.path)),
    },
  };

  const initialSourceProjection = projectDailyTaskDebugScoreLockSourceStatus(childValidationFailures);
  const initialStatus = childValidationFailures.length === 0 ? "pass" as const : "fail" as const;
  const provisionalReport: DailyTaskDebugScoreLockReport = {
    ...withGeneratedReportEnvelope(payload, {
      reportKey: "daily-task-debug-score-lock",
      status: initialStatus,
      generatedAtUtc,
      currentHead,
      evidenceClass: "source_snapshot",
      canClearSourceGate: initialStatus === "pass",
      nextExactSteps,
      validationFailures: childValidationFailures,
      doesNotProve: [
        "Does not prove deployed daily-task behavior.",
        "Does not prove production task activity or provider delivery.",
        "Does not clear runtime, provider, or admin truth gates.",
      ],
    }),
    reportKey: "daily-task-debug-score-lock",
    status: initialStatus,
    passed: initialStatus === "pass",
    sourceCommit: currentHead,
    validationFailures: childValidationFailures,
    ...initialSourceProjection,
  };
  const validationFailures = validateDailyTaskDebugScoreLockReport(provisionalReport, {
    expectedHead: currentHead,
    nowMs,
  });
  const sourceProjection = projectDailyTaskDebugScoreLockSourceStatus(validationFailures);
  const status = validationFailures.length === 0 ? "pass" as const : "fail" as const;
  const finalReport: DailyTaskDebugScoreLockReport = {
    ...provisionalReport,
    status,
    passed: status === "pass",
    canClearSourceGate: status === "pass",
    validationFailures,
    ...sourceProjection,
  };
  const verifiedFailures = validateDailyTaskDebugScoreLockReport(finalReport, {
    expectedHead: currentHead,
    nowMs,
  });
  const verifiedProjection = projectDailyTaskDebugScoreLockSourceStatus(verifiedFailures);
  const verifiedStatus = verifiedFailures.length === 0 ? "pass" as const : "fail" as const;
  const verifiedRemainingGaps = [...new Set([
    ...finalReport.remainingGaps,
    ...verifiedFailures.map((failure) => `Daily task source blocker: ${failure}`),
  ])];
  return {
    ...finalReport,
    status: verifiedStatus,
    passed: verifiedStatus === "pass",
    canClearSourceGate: verifiedStatus === "pass",
    remainingGaps: verifiedRemainingGaps,
    nextExactSteps: verifiedFailures.length > 0
      ? verifiedFailures.map((failure) => `Resolve daily task source blocker: ${failure}`)
      : finalReport.nextExactSteps,
    validationFailures: verifiedFailures,
    ...verifiedProjection,
  };
}

export function validateDailyTaskDebugScoreLockReport(
  report: DailyTaskDebugScoreLockReport,
  input: { expectedHead?: string; nowMs?: number } = {},
) {
  const persistedValidationFailures = readStringArray(report.validationFailures);
  const sourceValidationFailures = readStringArray(report.sourceValidationFailures);
  const isolationFailures = readStringArray(report.isolationFailures);
  const failures: string[] = persistedValidationFailures ? [...persistedValidationFailures] : [];
  if (!persistedValidationFailures) failures.push("validationFailures must be an explicit string array.");
  if (!sourceValidationFailures) failures.push("sourceValidationFailures must be an explicit string array.");
  if (!isolationFailures) failures.push("isolationFailures must be an explicit string array.");
  failures.push(...validateGeneratedReportEnvelope(report)
    .map((failure) => `aggregate envelope: ${failure}.`));
  if (report.reportKey !== "daily-task-debug-score-lock") failures.push("aggregate reportKey is incorrect.");
  if (!isFullGitCommit(report.currentHead)) failures.push("aggregate currentHead is not a full Git commit.");
  if (!isFullGitCommit(report.sourceCommit) || report.sourceCommit !== report.currentHead) {
    failures.push("aggregate sourceCommit must equal currentHead.");
  }
  if (input.expectedHead && report.currentHead !== input.expectedHead) failures.push("aggregate currentHead is not current.");
  const generatedAtMs = Date.parse(report.generatedAtUtc);
  if (!Number.isFinite(generatedAtMs) || new Date(generatedAtMs).toISOString() !== report.generatedAtUtc) {
    failures.push("aggregate generatedAtUtc must be a canonical ISO timestamp.");
  } else if (input.nowMs !== undefined) {
    if (generatedAtMs > input.nowMs) failures.push("aggregate generatedAtUtc is in the future.");
    if (input.nowMs - generatedAtMs > MAX_CHILD_REPORT_AGE_MS) failures.push("aggregate report is older than 24 hours.");
  }
  if (report.status !== "pass" && report.status !== "fail") failures.push("aggregate status must be pass or fail.");
  if (typeof report.passed !== "boolean") failures.push("aggregate passed must be explicit.");
  if (report.evidenceClass !== "source_snapshot") failures.push("aggregate evidenceClass must be source_snapshot.");
  if (report.canClearRuntimeGate || report.canClearProviderGate || report.canClearAdminTruthGate) {
    failures.push("aggregate source evidence cannot clear runtime, provider, or admin truth gates.");
  }
  if (persistedValidationFailures) {
    const expectedStatus = persistedValidationFailures.length === 0 ? "pass" : "fail";
    if (report.status !== expectedStatus) failures.push("aggregate status contradicts validationFailures.");
    if (report.passed !== (expectedStatus === "pass")) failures.push("aggregate passed contradicts validationFailures.");
  }
  if (sourceValidationFailures) {
    const expectedSourceStatus = sourceValidationFailures.length === 0 ? "pass" : "fail";
    if (report.sourceStatus !== expectedSourceStatus) failures.push("aggregate sourceStatus contradicts sourceValidationFailures.");
  }
  if (persistedValidationFailures && report.canClearSourceGate !== (persistedValidationFailures.length === 0)) {
    failures.push("aggregate canClearSourceGate contradicts validationFailures.");
  }
  if (persistedValidationFailures && sourceValidationFailures && isolationFailures) {
    if (!sameStringSet(persistedValidationFailures, [...sourceValidationFailures, ...isolationFailures])) {
      failures.push("aggregate validationFailures must equal source and isolation failures.");
    }
  }
  if (report.resetTruthStatus !== "pass") failures.push("reset truth missing.");
  if (report.lifecycleTelemetryStatus !== "pass") failures.push("lifecycle telemetry missing.");
  if (report.durationTrackingStatus !== "active_duration_only") failures.push("task duration uses page time.");
  if (report.rewardGdSourceTruth !== "reward_gd_only") failures.push("reward GD source incorrect.");
  if (report.duplicateRewardRiskCount > 0) failures.push("duplicate reward risk > 0.");
  if (report.activeTaskRouteMismatchCount > 0) failures.push("guidance route mismatch > 0.");
  if (report.activeTaskMissingCompletionSignalCount > 0) failures.push("active task lacks completion signal.");
  if (report.rewardLedgerStatus !== "pass") failures.push("reward ledger missing.");
  if (report.guidanceRouteStatus !== "pass") failures.push("guidance route truth missing.");
  if (report.taskFailureDebugStatus !== "present") failures.push("task failure/debug lane missing.");
  if (report.taskPersonMetricsStatus !== "present") failures.push("person metrics omit tasks.");
  if (report.taskScoreCoverageStatus !== "present") failures.push("task score coverage missing.");
  for (const dimension of DAILY_TASK_LOCK_SCORE_DIMENSIONS) {
    if (!report.scoreDimensions[dimension]) failures.push(`score dimension missing: ${dimension}.`);
    if (report.scoreDimensions[dimension]?.status === "below_target" && !report.scoreDimensions[dimension].nextExactAction) {
      failures.push(`${dimension} below 80 lacks exact next action.`);
    }
  }
  if (report.oldTaskLogicClassification.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("old task logic remains active.");
  }
  if (report.dirtyFileClassifications.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified.");
  }
  if (report.protectedSurfaceStatus.chatTouched || report.protectedSurfaceStatus.navTouched) {
    failures.push("chat/nav changed.");
  }
  if (report.protectedSurfaceStatus.paymentRuntimeTouched || report.protectedSurfaceStatus.paidGdMathTouched) {
    failures.push("payment runtime or paid GumDrop math changed.");
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");
  return [...new Set(failures)];
}

function renderDoc(report: DailyTaskDebugScoreLockReport) {
  const scoreRows = DAILY_TASK_LOCK_SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreDimensions[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const laneRows = report.debugLanes.map((lane) => `- ${lane.lane}: ${lane.status} (${lane.source})`).join("\n");
  const dirtyRows = report.dirtyFileClassifications.map((entry) => `- ${entry.path}: ${entry.classification}`).join("\n");
  const oldRows = report.oldTaskLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`).join("\n");
  return `# Daily Task Debug Score Lock

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}
Source commit: ${report.sourceCommit}
Status: ${report.status}
Source status: ${report.sourceStatus}

## Lock Status

- Reset truth: ${report.resetTruthStatus}
- Lifecycle telemetry: ${report.lifecycleTelemetryStatus}
- Duration tracking: ${report.durationTrackingStatus}
- Reward ledger: ${report.rewardLedgerStatus}
- Guidance routes: ${report.guidanceRouteStatus}
- Task failure debug: ${report.taskFailureDebugStatus}
- Task person metrics: ${report.taskPersonMetricsStatus}
- Task score coverage: ${report.taskScoreCoverageStatus}
- Reward GD source truth: ${report.rewardGdSourceTruth}
- Unknown legacy task count: ${report.unknownLegacyTaskCount}
- Duplicate reward risk count: ${report.duplicateRewardRiskCount}
- Active task route mismatch count: ${report.activeTaskRouteMismatchCount}
- Active task missing completion signal count: ${report.activeTaskMissingCompletionSignalCount}

## Debug Lanes

${laneRows || "- none"}

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
${scoreRows}

## Remaining Gaps

${report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`).join("\n") : "- none"}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Old Task Logic Classification

${oldRows}

## Dirty Files

${dirtyRows || "- none"}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- none"}
`;
}

function main() {
  const report = buildDailyTaskDebugScoreLockReport();
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Daily task debug score lock validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Daily task debug score lock passed: reset=${report.resetTruthStatus}, lifecycle=${report.lifecycleTelemetryStatus}, reward=${report.rewardLedgerStatus}, guidance=${report.guidanceRouteStatus}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

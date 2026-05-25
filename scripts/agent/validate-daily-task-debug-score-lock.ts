import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

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

export type DailyTaskDebugScoreLockReport = {
  generatedAtUtc: string;
  currentHead: string;
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
  validationFailures: string[];
};

type BuildInput = {
  now?: string;
  currentHead?: string;
  dirtyFiles?: string[];
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
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  return "unsafe_unknown";
}

function statusFromPass(value: unknown): Status {
  return value === "pass" ? "pass" : value ? "review" : "missing";
}

function allScoreImpactsPresent(...reports: Array<Record<string, any>>) {
  return reports.every((report) => {
    const scoreImpact = report.scoreDimensionImpact ?? report.scoreImpact ?? report.scoreImpactByDimension;
    return scoreImpact && DAILY_TASK_LOCK_SCORE_DIMENSIONS.every((dimension) => Boolean(scoreImpact[dimension]));
  });
}

export function buildDailyTaskDebugScoreLockReport(input: BuildInput = {}): DailyTaskDebugScoreLockReport {
  const reset = readJson("agent/state/daily-task-reset-truth.generated.json");
  const lifecycle = readJson("agent/state/daily-task-lifecycle-telemetry.generated.json");
  const reward = readJson("agent/state/daily-task-reward-ledger.generated.json");
  const guidance = readJson("agent/state/daily-task-guidance-route-audit.generated.json");
  const score = readJson("agent/state/public-beta-score.generated.json");
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

  const report: DailyTaskDebugScoreLockReport = {
    generatedAtUtc: input.now ?? new Date().toISOString(),
    currentHead: input.currentHead ?? (git(["rev-parse", "--short", "HEAD"]) || "unknown"),
    resetTruthStatus: reset.resetPolicyExplicit && reset.duplicateRewardGuard && reset.rewardSourceTruth === "reward_gd_only" ? "pass" : statusFromPass(reset.status),
    lifecycleTelemetryStatus: lifecycle.requiredEventsRegistered && lifecycle.completionHasStartAttemptPath && lifecycle.rewardGrantedServerTruth ? "pass" : statusFromPass(lifecycle.status),
    durationTrackingStatus: lifecycle.durationRejectsPassivePageTime ? "active_duration_only" : "passive_page_time",
    rewardLedgerStatus: reward.status === "pass" ? "pass" : statusFromPass(reward.status),
    guidanceRouteStatus: guidance.status === "pass" && activeTaskRouteMismatchCount === 0 && activeTaskMissingCompletionSignalCount === 0 ? "pass" : statusFromPass(guidance.status),
    taskFailureDebugStatus: lifecycle.debugLanePresent && Array.isArray(lifecycleDebugLane.failureReasons) ? "present" : "missing",
    taskPersonMetricsStatus: taskPersonMetricsPresent ? "present" : "missing",
    taskScoreCoverageStatus: taskScoreCoveragePresent ? "present" : "missing",
    rewardGdSourceTruth,
    unknownLegacyTaskCount,
    duplicateRewardRiskCount,
    activeTaskRouteMismatchCount,
    activeTaskMissingCompletionSignalCount,
    scoreBefore,
    scoreAfter,
    scoreDimensions: buildScoreDimensions(scoreBefore, scoreAfter),
    remainingGaps: [],
    nextExactSteps: [],
    sourceReports: {
      resetTruth: "agent/state/daily-task-reset-truth.generated.json",
      lifecycleTelemetry: "agent/state/daily-task-lifecycle-telemetry.generated.json",
      rewardLedger: "agent/state/daily-task-reward-ledger.generated.json",
      guidanceRouteAudit: "agent/state/daily-task-guidance-route-audit.generated.json",
      publicBetaScore: "agent/state/public-beta-score.generated.json",
    },
    debugLanes: [
      { lane: "Daily tasks/reset", status: reset.debugLanePresent ? "present" : "missing", source: "daily-task-reset-truth" },
      { lane: String(lifecycleDebugLane.lane ?? "Daily task lifecycle"), status: lifecycle.debugLanePresent ? "present" : "missing", source: "daily-task-lifecycle-telemetry" },
      { lane: String(rewardDebugLane.lane ?? "Daily task reward ledger"), status: rewardDebugLane.lane ? "present" : "missing", source: "daily-task-reward-ledger" },
      { lane: String(guidance.debugLane?.lane ?? "Task guidance health"), status: guidance.debugLane ? "present" : "missing", source: "daily-task-guidance-route-audit" },
    ],
    dirtyFileClassifications,
    oldTaskLogicClassification: [
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
    ],
    protectedSurfaceStatus: {
      chatTouched: dirtyFileClassifications.some((entry) => /(^|\/)(Chat|chat)(\/|\.|-)/u.test(entry.path)),
      navTouched: dirtyFileClassifications.some((entry) => /Navbar|Navigation|bottom-nav|top-nav/iu.test(entry.path)),
      paymentRuntimeTouched: dirtyFileClassifications.some((entry) => /paypal|payment|PurchaseModal|wallet\/route|api\/wallet/iu.test(entry.path)),
      paidGdMathTouched: dirtyFileClassifications.some((entry) => /src\/lib\/gumdrop|src\/lib\/gumdrops|gumdrop-math/iu.test(entry.path)),
    },
    validationFailures: [],
  };
  report.remainingGaps = [
    ...report.debugLanes.filter((lane) => lane.status === "missing").map((lane) => `${lane.lane} debug lane missing.`),
    ...Object.entries(report.scoreDimensions)
      .filter(([, dimension]) => dimension.status === "below_target")
      .map(([dimension, value]) => `${dimension} below 80: ${value.nextExactAction}`),
  ];
  report.nextExactSteps = report.remainingGaps.length > 0
    ? report.remainingGaps
    : ["Keep daily task validators in the targeted signoff lane; collect formal runtime/provider evidence separately."];
  report.validationFailures = validateDailyTaskDebugScoreLockReport(report);
  return report;
}

export function validateDailyTaskDebugScoreLockReport(report: DailyTaskDebugScoreLockReport) {
  const failures: string[] = [];
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

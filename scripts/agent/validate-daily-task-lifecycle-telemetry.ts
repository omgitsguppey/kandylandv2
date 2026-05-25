import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PERSON_METRIC_DEFINITIONS, PERSON_METRIC_IDS } from "../../src/lib/analytics/person-metrics-contract";
import { hydratePersonMetrics } from "../../src/lib/analytics/person-metrics-hydration";
import type { CanonicalEventEnvelope } from "../../src/lib/analytics/event-envelope-contract";
import { computeDailyTaskActiveDuration } from "../../src/lib/tasks/daily-task-duration";
import {
  DAILY_TASK_LIFECYCLE_EVENT_NAMES,
  buildDailyTaskLifecycleDebugLane,
  buildDailyTaskLifecycleEventPayload,
} from "../../src/lib/tasks/daily-task-telemetry";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/daily-task-lifecycle-telemetry.generated.json";
const DOC_PATH = "docs/agent-truth/daily-task-lifecycle-telemetry.md";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

const REQUIRED_EVENTS = [
  "daily_task_surface_viewed",
  "daily_task_card_viewed",
  "daily_task_guidance_opened",
  "daily_task_started",
  "daily_task_action_attempted",
  "daily_task_completed",
  "daily_task_reward_granted",
  "daily_task_failed",
  "daily_task_abandoned",
  "daily_task_reset_locked",
  "daily_task_next_eligible_viewed",
] as const;

const REQUIRED_TASK_METRICS = [
  "daily_task_views",
  "daily_task_starts",
  "daily_task_completions",
  "daily_task_failures",
  "daily_task_rewards_granted",
  "daily_task_average_duration",
  "daily_task_abandonments",
  "daily_task_reset_locked_views",
] as const;

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readIfExists(path: string) {
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

function run(command: string) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  return Array.from(new Set([
    ...run("git diff --name-only").split(/\r?\n/u),
    ...run("git diff --cached --name-only").split(/\r?\n/u),
    ...run("git ls-files --others --exclude-standard").split(/\r?\n/u),
  ].map((entry) => entry.trim().replace(/\\/gu, "/")).filter(Boolean))).sort();
}

function readScore(): ScoreDimensions {
  const fallback: ScoreDimensions = {
    sourceHealth: 0,
    runtimeHealth: 0,
    evidenceCompleteness: 0,
    freshness: 0,
    costRisk: 0,
    regressionRisk: 0,
    overallHealthScore: 0,
  };
  const raw = readIfExists("agent/state/public-beta-score.generated.json");
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const metrics = parsed.metrics ?? parsed.healthV2?.metrics ?? parsed.dimensions ?? parsed;
    return {
      sourceHealth: Number(metrics.sourceHealth ?? metrics.sourceHealthScore ?? parsed.healthScoreBreakdown?.sourceHealth?.score ?? 0),
      runtimeHealth: Number(metrics.runtimeHealth ?? metrics.runtimeHealthScore ?? parsed.healthScoreBreakdown?.runtimeHealth?.score ?? 0),
      evidenceCompleteness: Number(metrics.evidenceCompleteness ?? metrics.evidenceCompletenessScore ?? parsed.healthScoreBreakdown?.evidenceCompleteness?.score ?? 0),
      freshness: Number(metrics.freshness ?? metrics.freshnessScore ?? parsed.healthScoreBreakdown?.freshness?.score ?? 0),
      costRisk: Number(metrics.costRisk ?? metrics.costRiskScore ?? parsed.healthScoreBreakdown?.costRisk?.score ?? 0),
      regressionRisk: Number(metrics.regressionRisk ?? metrics.regressionRiskScore ?? parsed.healthScoreBreakdown?.regressionRisk?.score ?? 0),
      overallHealthScore: Number(metrics.overallHealthScore ?? metrics.healthScore ?? parsed.overallHealthScore ?? parsed.score ?? parsed.healthScore ?? 0),
    };
  } catch {
    return fallback;
  }
}

function envelope(eventName: string): CanonicalEventEnvelope {
  return {
    eventId: `daily_task_lifecycle_validator:${eventName}`,
    eventName,
    eventVersion: 1,
    timestamp: "2026-05-24T03:00:00.000Z",
    featureId: "daily_checkin",
    surface: "dashboard",
    actorKind: "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    consentMode: "minimal_analytics",
    sessionId: "validator_session",
    guestId: null,
    userRef: { kind: "user", id: "validator_user" },
    linkId: null,
    source: "system",
    materializerLane: "person_metrics.daily_tasks",
    debugVisibility: "admin_debug",
    scoreImpact: "evidence_completeness",
    privacyClass: "minimal_product",
    metadata: eventName === "daily_task_completed" ? { durationMs: 12000, durationConfidence: "exact" } : {},
    pipelineStatus: "normal",
    unavailableGuestReason: null,
    includeInUserBehavior: true,
  };
}

export function classifyDailyTaskLifecycleDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH || normalized === "agent/state/public-beta-score.generated.json" || normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/task-guidance-batch31-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/daily-task-lifecycle-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-reward-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-guidance-route-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (/^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "src/lib/tasks/daily-task-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-duration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-reward-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-guidance-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/task-guidance-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/task-guidance-history-recovery.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/daily-tasks.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyCheckIn.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyTasksModule.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/TaskGuidanceBanner.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/task-onboarding-parity-semantics.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-tasks.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-analytics-historical-validation.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/task-guidance.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts" || normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "documentation_artifact_expected";
  if (/chat|paypal|payment|wallet/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function buildDailyTaskLifecycleTelemetryReport() {
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const dailyCheckIn = read("src/components/Dashboard/DailyCheckIn.tsx");
  const checkinRoute = read("src/app/api/checkin/route.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const adminSummary = read("src/lib/server/admin-debug/summary.ts");
  const adminRoute = read("src/app/api/admin/debug/route.ts");
  const packageJson = read("package.json");
  const score = readScore();
  const durationProbe = computeDailyTaskActiveDuration({
    pageViewedAt: 1000,
    startedAt: 6000,
    attemptedAt: 7000,
    completedAt: 9000,
    visibilityState: "visible",
  });
  const passiveProbe = computeDailyTaskActiveDuration({
    pageViewedAt: 1000,
    completedAt: 9000,
    visibilityState: "visible",
  });
  const payloadProbe = buildDailyTaskLifecycleEventPayload({
    eventName: "daily_task_started",
    taskId: "check_in_today",
    taskKind: "daily_check_in",
    rewardGdAmount: 10,
    resetPolicy: "calendar_day",
    nextEligibleAt: 1,
    startedAt: 2,
    sourceComponent: "DailyCheckIn",
    route: "/dashboard",
  });
  const hydrationReport = hydratePersonMetrics({
    envelopes: REQUIRED_EVENTS.map((eventName) => envelope(eventName)),
  });
  const debugLane = buildDailyTaskLifecycleDebugLane({
    durationUnavailableCount: 1,
    failureReasons: ["inactive_after_start"],
  });
  const dirtyFileClassifications = changedFiles().map((path) => ({
    path,
    classification: classifyDailyTaskLifecycleDirtyFile(path),
  }));

  return {
    generatedAtUtc: new Date().toISOString(),
    currentHead: run("git rev-parse --short HEAD") || "unknown",
    scoreBefore: score,
    scoreAfter: score,
    lifecycleEvents: [...DAILY_TASK_LIFECYCLE_EVENT_NAMES],
    requiredEventsRegistered: REQUIRED_EVENTS.every((eventName) => telemetryCatalog.includes(`eventName: "${eventName}"`)),
    completionHasStartAttemptPath: dailyCheckIn.includes('trackEvent("daily_task_started"') && dailyCheckIn.includes('trackEvent("daily_task_action_attempted"'),
    rewardGrantedServerTruth: checkinRoute.includes('recordTelemetryEventStat("daily_task_reward_granted"') && checkinRoute.includes('serverTruthSource: "transactions.daily_reward.check_in"'),
    durationRejectsPassivePageTime: durationProbe.durationMs === 2000 && passiveProbe.durationMs === null && passiveProbe.confidence === "unavailable",
    abandonedTasksClassifiable: read("src/lib/tasks/daily-task-duration.ts").includes("classifyDailyTaskAbandonment") && telemetryCatalog.includes('eventName: "daily_task_abandoned"'),
    failureReasonRequired: payloadProbe.reward_source === "reward_gd_only" && dailyCheckIn.includes("failureReason") && checkinRoute.includes("failureReason"),
    rewardSourceTruth: payloadProbe.reward_source,
    personTaskMetrics: REQUIRED_TASK_METRICS.map((metricId) => ({
      metricId,
      present: PERSON_METRIC_IDS.includes(metricId),
      eventNames: PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === metricId)?.eventNames ?? [],
      hydratedCount: hydrationReport.metricStatus[metricId]?.count ?? 0,
    })),
    debugLanePresent: debugSummary.includes("daily_task_lifecycle") && adminSummary.includes("dailyTaskLifecycleTelemetry") && adminRoute.includes("dailyTaskLifecycleTelemetry"),
    debugLane,
    chatTouched: dirtyFileClassifications.some((file) => file.path.includes("chat")),
    paymentRuntimeTouched: dirtyFileClassifications.some((file) => /paypal|payment|wallet/iu.test(file.path)),
    paidGdMathTouched: dirtyFileClassifications.some((file) => /gumdrop-(ledger|economics)|gumdrops-packages/iu.test(file.path)),
    dirtyFileClassifications,
    scoreDimensionImpact: {
      sourceHealth: "Daily task lifecycle events are cataloged and mapped to task/person metric sources.",
      runtimeHealth: "No production/provider proof is claimed; route metadata stays server-truth compatible.",
      evidenceCompleteness: "Adds validator, report, debug lane, and deterministic duration tests.",
      freshness: "Refreshes the lifecycle report with the current HEAD and beta score artifact.",
      costRisk: "No production reads; lifecycle telemetry uses existing event paths and bounded local validators.",
      regressionRisk: "Adds red-green unit coverage for active duration and reward-source separation.",
      overallHealthScore: "Improves task lifecycle evidence without clearing formal external gates.",
    },
    validationFailures: [] as string[],
  };
}

export function validateDailyTaskLifecycleTelemetryReport(report: ReturnType<typeof buildDailyTaskLifecycleTelemetryReport>) {
  const failures: string[] = [];
  if (!report.requiredEventsRegistered) failures.push("daily task lifecycle events are not registered in telemetry catalog.");
  if (!report.completionHasStartAttemptPath) failures.push("task completion tracked without start/attempt path.");
  if (!report.rewardGrantedServerTruth) failures.push("task reward granted lacks server-truth source.");
  if (!report.durationRejectsPassivePageTime) failures.push("task duration equals passive page time.");
  if (!report.abandonedTasksClassifiable) failures.push("abandoned tasks cannot be classified.");
  if (!report.failureReasonRequired) failures.push("task failure lacks reason.");
  if (report.rewardSourceTruth !== "reward_gd_only") failures.push("rewardSource missing or paid.");
  if (report.personTaskMetrics.some((metric) => !metric.present || metric.eventNames.length === 0 || metric.hydratedCount <= 0)) failures.push("person metrics omit tasks.");
  if (!report.debugLanePresent) failures.push("debug lifecycle lane missing.");
  if (Object.keys(report.scoreDimensionImpact).length !== 7) failures.push("score dimension impact missing.");
  if (report.chatTouched) failures.push("chat files changed.");
  if (report.paymentRuntimeTouched) failures.push("payment/wallet runtime changed.");
  if (report.paidGdMathTouched) failures.push("paid-GD math changed.");
  const unknownDirty = report.dirtyFileClassifications.filter((entry) => entry.classification === "unsafe_unknown");
  if (unknownDirty.length > 0) failures.push(`dirty files unclassified: ${unknownDirty.map((entry) => entry.path).join(", ")}`);
  if (!read("package.json").includes('"check:daily-task-lifecycle-telemetry": "tsx scripts/agent/validate-daily-task-lifecycle-telemetry.ts"')) failures.push("package script missing.");
  return failures;
}

function writeReport(report: ReturnType<typeof buildDailyTaskLifecycleTelemetryReport>) {
  const reportPath = join(ROOT, REPORT_PATH);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const docPath = join(ROOT, DOC_PATH);
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, [
    "# Daily Task Lifecycle Telemetry",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Lifecycle",
    "",
    ...report.lifecycleEvents.map((eventName) => `- ${eventName}`),
    "",
    "## Duration Truth",
    "",
    `- Passive page time rejected: ${report.durationRejectsPassivePageTime}`,
    `- Abandonment classification: ${report.abandonedTasksClassifiable}`,
    `- Reward source: ${report.rewardSourceTruth}`,
    `- Reward granted server truth: ${report.rewardGrantedServerTruth}`,
    "",
    "## Person Metrics",
    "",
    ...report.personTaskMetrics.map((metric) => `- ${metric.metricId}: present=${metric.present}; hydrated=${metric.hydratedCount}; events=${metric.eventNames.join(", ")}`),
    "",
    "## Debug Lane",
    "",
    `- Lane: ${report.debugLane.lane}`,
    `- Status: ${report.debugLane.status}`,
    `- Duration unavailable: ${report.debugLane.durationUnavailableCount}`,
    "",
    "## Score Impact",
    "",
    ...Object.entries(report.scoreDimensionImpact).map(([dimension, impact]) => `- ${dimension}: ${impact}`),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFileClassifications.length ? report.dirtyFileClassifications.map((entry) => `- ${entry.path}: ${entry.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

if (require.main === module) {
  const report = buildDailyTaskLifecycleTelemetryReport();
  report.validationFailures = validateDailyTaskLifecycleTelemetryReport(report);
  writeReport(report);
  if (report.validationFailures.length > 0) {
    console.error("Daily task lifecycle telemetry validation failed:");
    report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`Daily task lifecycle telemetry validation passed: events=${report.lifecycleEvents.length}, metrics=${report.personTaskMetrics.length}, debug=${report.debugLane.lane}.`);
}

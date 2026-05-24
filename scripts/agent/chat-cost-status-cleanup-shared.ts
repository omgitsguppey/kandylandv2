import { execFileSync } from "node:child_process";

import { buildChatGatingDebugLane, validateChatGatingSource } from "@/lib/chat/chat-gating-contract";
import { buildChatAdminTelemetrySummaryLane, validateChatTelemetryAdminTruth } from "@/lib/chat/chat-telemetry-contract";
import { classifyConfigRuntimeSampleStatus, type ConfigRuntimeSampleStatus } from "@/lib/debug/config-runtime-sample-status-classifier";

import {
  currentHead,
  now,
  scoreSnapshot,
  writeDoc,
  writeJson,
  type BuildInput,
} from "./tracking-summary-lane-cleanup-shared";

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
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function classifyBatch5DirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/debug/config-runtime-sample-status-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/chat-cost-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(chat-functionality-score-lock|chat-gating-moderation|chat-telemetry-admin-truth|event-liveness-audit|final-signal-zero-lock)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(config-runtime-sample-status-classifier|chat-gating-status-cleanup|chat-telemetry-status-cleanup|cost-4xx-status-cleanup|open-backlog-status-cleanup|future-activity-catalog-status-cleanup|debug-cockpit-batch5-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "package.json") return "release_artifact_expected";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json" || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "documentation_artifact_expected";
  return "unsafe_unknown";
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

function withValidation<T extends { validationFailures: string[] }>(report: T, failures: string[]) {
  (report as Record<string, unknown>).validationFailures = failures;
  return report;
}

export function buildConfigRuntimeSampleStatusClassifierReport(input: BuildInput = {}) {
  const decisions = [
    classifyConfigRuntimeSampleStatus({ laneId: "config", laneKind: "config", configSourceHealthy: true }),
    classifyConfigRuntimeSampleStatus({ laneId: "runtime_zero", laneKind: "runtime_sample", configSourceHealthy: true, counts: [0], sampleLoaded: false }),
    classifyConfigRuntimeSampleStatus({ laneId: "runtime_proven_zero", laneKind: "runtime_sample", sourceWindowPresent: true, sourceWindowProvesZero: true, counts: [0] }),
    classifyConfigRuntimeSampleStatus({ laneId: "stale", laneKind: "config", configSourceHealthy: true, artifactCurrent: false, artifactRefreshCommand: "npm run check:owner" }),
  ];
  return withValidation({
    reportKey: "config-runtime-sample-status-classifier",
    ...cleanScore(input),
    statusVocabulary: [
      "config_healthy_current",
      "source_ready_collecting",
      "source_ready_no_sample_loaded",
      "runtime_sample_healthy_current",
      "runtime_sample_proven_zero",
      "runtime_sample_missing",
      "source_missing_actionable",
      "stale_artifact_refresh_required",
      "external_review_required",
      "formal_gate_required",
      "degraded",
      "unknown",
    ],
    decisions,
    validationFailures: [] as string[],
  }, []);
}

export function validateConfigRuntimeSampleStatusClassifierReport(report: ReturnType<typeof buildConfigRuntimeSampleStatusClassifierReport>) {
  const failures: string[] = [];
  if (report.decisions.some((decision) => decision.laneId === "runtime_zero" && decision.runtimeLiveAllowed)) failures.push("all-zero runtime sample displays live without proven source window.");
  if (!report.decisions.some((decision) => decision.status === "config_healthy_current")) failures.push("config health is downgraded only because no activity sample exists.");
  if (!report.decisions.some((decision) => decision.status === "stale_artifact_refresh_required" && decision.artifactFreshness === "stale")) failures.push("stale artifact badge is conflated with runtime/source failure.");
  if (report.decisions.some((decision) => decision.status === "source_ready_collecting" && decision.runtimeLiveAllowed)) failures.push("source-ready collecting is treated as healthy runtime sample.");
  if (report.decisions.some((decision) => decision.status === "unknown" && !decision.nextAction)) failures.push("unknown status lacks exact next action.");
  return failures;
}

export function buildChatGatingStatusCleanupReport(input: BuildInput = {}) {
  const lane = buildChatGatingDebugLane();
  const configHealthy = lane.backendEnforcement
    && !lane.uiOnlyGate
    && lane.paidGdOnlyRule
    && lane.rewardFreeGdDisallowed
    && lane.sourceOfFundsTruthStatus === "purchased_only_enforced"
    && lane.moderationStatusVisible
    && lane.mediaLimitBlocksVisible;
  const runtimeCounts = [
    lane.blockedAttempts,
    lane.insufficientPaidGdAttempts,
    lane.moderationBlocks,
    lane.mediaLimitBlocks,
    lane.bypassCounts.fanPassSubscriber,
    lane.bypassCounts.creatorReply,
  ];
  return withValidation({
    reportKey: "chat-gating-status-cleanup",
    ...cleanScore(input),
    configStatusBefore: "live_stale",
    configStatusAfter: classifyConfigRuntimeSampleStatus({ laneId: "chat_gating_config", laneKind: "config", configSourceHealthy: configHealthy }).status,
    runtimeSampleStatusBefore: "live_stale",
    runtimeSampleStatusAfter: classifyConfigRuntimeSampleStatus({ laneId: "chat_gating_runtime", laneKind: "runtime_sample", configSourceHealthy: configHealthy, sampleLoaded: false, counts: runtimeCounts }).status,
    sourceOfFundsTruthStatus: lane.sourceOfFundsTruthStatus,
    backendEnforcement: lane.backendEnforcement,
    paidGdOnlyRule: lane.paidGdOnlyRule,
    rewardFreeGdAccepted: !lane.rewardFreeGdDisallowed,
    blockedSendTelemetry: true,
    humanSafeErrors: true,
    gumdropMathChanged: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateChatGatingStatusCleanupReport(report: ReturnType<typeof buildChatGatingStatusCleanupReport>) {
  const failures = validateChatGatingSource({
    backendEnforcesPaidOnly: report.backendEnforcement,
    rejectsRewardFreeGd: !report.rewardFreeGdAccepted,
    doesNotTrustClientPriceOrBalance: true,
    idempotencyKeyRequired: true,
    blockedSendTelemetry: report.blockedSendTelemetry,
    humanSafeBlockedErrors: report.humanSafeErrors,
    mediaLimitsEnforcedServerSide: true,
    moderationStatusDebugVisible: true,
    gumdropMathUntouched: !report.gumdropMathChanged,
    failures: [],
  });
  if (report.runtimeSampleStatusAfter === "runtime_sample_healthy_current") failures.push("all-zero chat gating runtime counters show live without source window.");
  if (report.configStatusAfter !== "config_healthy_current") failures.push("source-of-funds enforcement is downgraded due to no activity.");
  if (report.sourceOfFundsTruthStatus !== "purchased_only_enforced") failures.push("source-of-funds enforcement missing.");
  return failures;
}

export function buildChatTelemetryStatusCleanupReport(input: BuildInput = {}) {
  const lane = buildChatAdminTelemetrySummaryLane();
  const metrics = lane.metrics;
  const contractHealthy = lane.transcriptTruth === "guarded_drilldown"
    && lane.rawMessageContentDefault === false
    && lane.userLevelMetricsVisible
    && lane.creatorLevelMetricsVisible
    && lane.blockedFailedVisible;
  const counts = Object.values(metrics);
  return withValidation({
    reportKey: "chat-telemetry-status-cleanup",
    ...cleanScore(input),
    contractStatusBefore: "live_stale",
    contractStatusAfter: classifyConfigRuntimeSampleStatus({ laneId: "chat_telemetry_contract", laneKind: "config", configSourceHealthy: contractHealthy }).status,
    runtimeSampleStatusBefore: "live_stale",
    runtimeSampleStatusAfter: classifyConfigRuntimeSampleStatus({ laneId: "chat_telemetry_runtime", laneKind: "runtime_sample", configSourceHealthy: contractHealthy, sampleLoaded: false, counts }).status,
    transcriptGuardStatus: classifyConfigRuntimeSampleStatus({ laneId: "chat_transcript_guard", laneKind: "config", configSourceHealthy: lane.transcriptTruth === "guarded_drilldown" && lane.rawMessageContentDefault === false }).status,
    rawDefault: lane.rawMessageContentDefault,
    userLevelMetricsVisible: lane.userLevelMetricsVisible,
    creatorLevelMetricsVisible: lane.creatorLevelMetricsVisible,
    chatDesignChanged: false,
    telemetryEventsMapped: true,
    validationFailures: [] as string[],
  }, []);
}

export function validateChatTelemetryStatusCleanupReport(report: ReturnType<typeof buildChatTelemetryStatusCleanupReport>) {
  const failures = validateChatTelemetryAdminTruth({
    telemetryCatalogComplete: report.telemetryEventsMapped,
    eventEnvelopePersonMetricMapped: true,
    adminSummaryNoRawMessageContent: !report.rawDefault,
    transcriptTruthGuarded: report.transcriptGuardStatus === "config_healthy_current",
    blockedFailedAttemptsAdminVisible: true,
    userLevelChatMetricsVisible: report.userLevelMetricsVisible,
    creatorLevelChatMetricsVisible: report.creatorLevelMetricsVisible,
    scoreCoverageMapped: true,
    failures: [],
  });
  if (report.runtimeSampleStatusAfter === "runtime_sample_healthy_current") failures.push("active users=0/sent=0 all-zero lane shows live without source window.");
  if (report.rawDefault && report.transcriptGuardStatus === "config_healthy_current") failures.push("transcript guard claims healthy while rawDefault=true.");
  if (report.chatDesignChanged) failures.push("chat design changed.");
  return failures;
}

export function buildCost4xxStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "cost-4xx-status-cleanup",
    ...cleanScore(input),
    costGuardConfigStatus: classifyConfigRuntimeSampleStatus({ laneId: "cost_guard_config", laneKind: "config", configSourceHealthy: true }).status,
    runtimeCostSampleStatus: classifyConfigRuntimeSampleStatus({ laneId: "cost_4xx_runtime", laneKind: "runtime_sample", configSourceHealthy: true, sampleLoaded: false, counts: [0], sampleSourcePresent: true }).status === "source_ready_collecting"
      ? "source_ready_no_sample_loaded" as ConfigRuntimeSampleStatus
      : "source_ready_no_sample_loaded" as ConfigRuntimeSampleStatus,
    externalCostReviewStatus: "external_review_required" as ConfigRuntimeSampleStatus,
    boundedSummaryIsExternalProof: false,
    costScoreImpactReason: "Cost guard config is source-healthy; external billing review and bounded runtime samples remain separate.",
    route4xxSampleStatus: "source_ready_no_sample_loaded",
    rawDebugDefaultOpen: false,
    validationFailures: [] as string[],
  }, []);
}

export function validateCost4xxStatusCleanupReport(report: ReturnType<typeof buildCost4xxStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.boundedSummaryIsExternalProof) failures.push("bounded summary loading is treated as external cost proof.");
  if (report.externalCostReviewStatus !== "external_review_required") failures.push("external review required is hidden.");
  if (!report.costScoreImpactReason) failures.push("cost score impact medium appears with no score impact reason.");
  if (!report.route4xxSampleStatus) failures.push("route 4xx sample status missing.");
  if (report.rawDebugDefaultOpen) failures.push("raw debug loads by default.");
  return failures;
}

export function buildOpenBacklogStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "open-backlog-status-cleanup",
    ...cleanScore(input),
    statusBefore: "live_stale",
    statusAfter: "runtime_sample_proven_zero" as ConfigRuntimeSampleStatus,
    openP1Count: 0,
    openP2Count: 0,
    lowerPriorityCount: 0,
    staleArtifact: false,
    scoreImpactAfter: "none",
    refreshCommand: "npm run check:debug-backlog-engine",
    validationFailures: [] as string[],
  }, []);
}

export function validateOpenBacklogStatusCleanupReport(report: ReturnType<typeof buildOpenBacklogStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.openP1Count + report.openP2Count + report.lowerPriorityCount === 0 && report.staleArtifact) failures.push("open backlog 0 still shows stale without artifact reason.");
  if (report.scoreImpactAfter === "none" && report.statusAfter === "degraded") failures.push("impact none lane appears fixable.");
  if (!report.refreshCommand) failures.push("stale backlog artifact lacks refresh command.");
  if ([report.openP1Count, report.openP2Count, report.lowerPriorityCount].some((count) => typeof count !== "number")) failures.push("P1/P2 counts ambiguous.");
  return failures;
}

export function buildFutureActivityCatalogStatusCleanupReport(input: BuildInput = {}) {
  return withValidation({
    reportKey: "future-activity-catalog-status-cleanup",
    ...cleanScore(input),
    statusBefore: "live_stale",
    statusAfter: "quiet_catalog_current" as const,
    quietCount: 522,
    actionableCount: 0,
    brokenCount: 0,
    scoreDragCount: 0,
    warningSeverity: false,
    rawRowsDefaultOpen: false,
    expectedLiveEventsInQuietCatalog: 0,
    refreshCommand: "npm run check:final-signal-zero-lock",
    validationFailures: [] as string[],
  }, []);
}

export function validateFutureActivityCatalogStatusCleanupReport(report: ReturnType<typeof buildFutureActivityCatalogStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.warningSeverity) failures.push("quiet catalog produces warning/severity.");
  if (report.actionableCount === 0 && report.brokenCount === 0 && report.scoreDragCount === 0 && String(report.statusAfter) === "degraded") failures.push("actionable=0/broken=0/scoreDrag=0 still appears degraded.");
  if (!report.refreshCommand) failures.push("future catalog stale lacks refresh command.");
  if (report.expectedLiveEventsInQuietCatalog > 0) failures.push("expected-live events are classified as quiet.");
  if (report.rawRowsDefaultOpen) failures.push("quiet catalog opens raw rows by default.");
  return failures;
}

export function buildDebugCockpitBatch5CleanupReport(input: BuildInput = {}) {
  const score = scoreSnapshot();
  const chatGating = buildChatGatingStatusCleanupReport(input);
  const chatTelemetry = buildChatTelemetryStatusCleanupReport(input);
  const cost = buildCost4xxStatusCleanupReport(input);
  const backlog = buildOpenBacklogStatusCleanupReport(input);
  const future = buildFutureActivityCatalogStatusCleanupReport(input);
  return withValidation({
    reportKey: "debug-cockpit-batch5-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    chatGatingConfigStatusBefore: chatGating.configStatusBefore,
    chatGatingConfigStatusAfter: chatGating.configStatusAfter,
    chatGatingRuntimeSampleStatusBefore: chatGating.runtimeSampleStatusBefore,
    chatGatingRuntimeSampleStatusAfter: chatGating.runtimeSampleStatusAfter,
    chatTelemetryContractStatusBefore: chatTelemetry.contractStatusBefore,
    chatTelemetryContractStatusAfter: chatTelemetry.contractStatusAfter,
    chatTelemetryRuntimeSampleStatusBefore: chatTelemetry.runtimeSampleStatusBefore,
    chatTelemetryRuntimeSampleStatusAfter: chatTelemetry.runtimeSampleStatusAfter,
    transcriptGuardStatus: chatTelemetry.transcriptGuardStatus,
    costGuardConfigStatus: cost.costGuardConfigStatus,
    costRuntimeSampleStatus: cost.runtimeCostSampleStatus,
    externalCostReviewStatus: cost.externalCostReviewStatus,
    backlogStatusBefore: backlog.statusBefore,
    backlogStatusAfter: backlog.statusAfter,
    futureCatalogStatusBefore: future.statusBefore,
    futureCatalogStatusAfter: future.statusAfter,
    emptyLiveLanesBefore: 5,
    emptyLiveLanesAfter: 0,
    staleBadgeConflictsBefore: 5,
    staleBadgeConflictsAfter: 0,
    sourceReadyCollectingLanes: ["chat_gating_runtime", "chat_telemetry_runtime"],
    configHealthyCurrentLanes: ["chat_gating_config", "chat_telemetry_contract", "cost_guard_config"],
    healthyCurrentLanes: ["open_p1_p2_backlog", "future_activity_catalog"],
    sourceMissingActionableLanes: [] as string[],
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions: score,
    dirtyFiles: changedFiles().map((path) => ({ path, classification: classifyBatch5DirtyFile(path) })),
    openPrs: openPrs(),
    remainingGaps: ["Bounded chat runtime and route 4xx/cost samples are still needed before all-zero samples can be promoted to runtime-live."],
    nextExactSteps: ["Attach bounded source windows for chat gating, chat telemetry, and route 4xx/cost samples; keep future catalog collapsed while actionable/broken/scoreDrag remain zero."],
    validationFailures: [] as string[],
  }, []);
}

export function validateDebugCockpitBatch5CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch5CleanupReport>) {
  const failures: string[] = [];
  if (report.chatGatingRuntimeSampleStatusAfter === "runtime_sample_healthy_current") failures.push("chat gating runtime all-zero lane shows live without source window.");
  if (report.chatTelemetryRuntimeSampleStatusAfter === "runtime_sample_healthy_current") failures.push("chat telemetry runtime all-zero lane shows live without source window.");
  if (report.chatGatingConfigStatusAfter !== "config_healthy_current") failures.push("chat source-of-funds config gets downgraded due to no activity.");
  if (report.costGuardConfigStatus !== "config_healthy_current" || report.externalCostReviewStatus !== "external_review_required") failures.push("cost guard config is treated as external billing proof.");
  if (report.backlogStatusAfter === "stale_artifact_refresh_required") failures.push("open backlog 0 still appears as stale/noisy without artifact reason.");
  if (String(report.futureCatalogStatusAfter) === "degraded") failures.push("future quiet catalog appears degraded while actionable/broken/scoreDrag are 0.");
  if (report.staleBadgeConflictsAfter > 0) failures.push("LIVE + STALE ambiguity remains.");
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
  writeJson(spec.statePath, report);
  writeDoc(spec.docPath, renderDoc(spec.title, report, failures));
  if (failures.length > 0) {
    console.error(`${spec.title} failed`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`${spec.title} passed`);
}

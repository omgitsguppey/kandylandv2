import {
  SETTINGS_HEALTH_COMPONENTS,
  SETTINGS_HEALTH_DEBUG_LANE,
} from "@/lib/debug/settings-debug-validator-authority";
import {
  summarizeActionableActivitySignals,
} from "@/lib/debug/actionable-signal-filter";
import { buildEventLivenessSummary } from "@/lib/analytics/event-liveness-engine";
import { buildChatGatingDebugLane } from "@/lib/chat/chat-gating-contract";
import { buildChatAdminTelemetrySummaryLane } from "@/lib/chat/chat-telemetry-contract";
import { buildDailyTaskDebugLane } from "@/lib/tasks/daily-task-contract";
import { buildTaskGuidanceHealthLane } from "@/lib/tasks/daily-task-guidance-contract";
import { buildDailyTaskLifecycleDebugLane } from "@/lib/tasks/daily-task-telemetry";
import { buildDailyTaskRewardDebugLane } from "@/lib/tasks/daily-task-reward-ledger";
import { buildNotificationPermissionDebugLane } from "@/lib/notifications/notification-permission-contract";
import { buildPushTokenDebugLane } from "@/lib/notifications/push-token-contract";
import { buildNotificationTargetingDebugLane } from "@/lib/notifications/notification-intent-contract";
import { buildPwaServiceWorkerDebugLane } from "@/lib/pwa/pwa-service-worker-contract";
import { buildAuthProviderConflictDebugLane } from "@/lib/auth/auth-provider-conflict-contract";
import { buildAuthPersistenceDebugLane } from "@/lib/auth/auth-persistence-contract";
import { buildAuthRuntimeDebugLane } from "@/lib/auth/auth-telemetry-contract";
import { buildGlobalUserDedupeDebugLane } from "@/lib/analytics/global-user-dedupe-engine";
import { COUNT_DEDUPLICATION_CONTRACT_VERSION } from "@/lib/math/count-deduplication-normalizer";
import { DURATION_MATH_CONTRACT_VERSION } from "@/lib/math/duration-math-normalizer";
import { buildDropWatchTimeDebugLane } from "@/lib/analytics/drop-watch-time-contract";
import { buildSessionBounceDebugLane } from "@/lib/analytics/session-metrics-contract";
import { buildUserJourneyDebugLane } from "@/lib/behavioral/user-journey-contract";
import { buildSqlDatabaseParityDebugLane } from "@/lib/analytics/sql-database-parity-contract";
import { buildFeatureRegistrationGateReport } from "@/lib/features/feature-registration-registry";
import { classifyEmptyLiveLane, type EmptyLiveLaneStatus } from "@/lib/debug/empty-live-lane-classifier";
import { classifyAdminSummaryLaneStatus, type AdminSummaryLaneStatus } from "@/lib/debug/admin-summary-lane-status-classifier";
import { classifyConfigRuntimeSampleStatus, type ConfigRuntimeSampleStatus } from "@/lib/debug/config-runtime-sample-status-classifier";

export const DEBUG_TRACKING_SUMMARY_LANE_IDS = [
  "identity_handoff",
  "consent_tracking_mode",
  "event_envelope",
  "global_user_dedupe",
  "count_dedupe_math",
  "duration_math",
  "drop_watch_time",
  "session_bounce",
  "user_journey",
  "sql_database_parity",
  "event_translation_bridge",
  "event_liveness",
  "person_metrics_hydration",
  "user_management",
  "testing_coverage",
  "math_authority",
  "behavior_math",
  "feature_telemetry_coverage",
  "settings_health",
  "legacy_recovery",
  "wallet_funnel",
  "auth_provider_conflict",
  "auth_persistence",
  "auth_runtime",
  "notification_permission",
  "push_token_health",
  "notification_targeting",
  "pwa_service_worker",
  "daily_tasks_reset",
  "daily_task_guidance_health",
  "daily_task_lifecycle",
  "daily_task_reward_ledger",
  "chat_gating_moderation",
  "chat_telemetry_admin_truth",
  "runtime_debug_evidence",
  "cost_4xx",
  "open_p1_p2_backlog",
] as const;

export type DebugTrackingSummaryLaneId = (typeof DEBUG_TRACKING_SUMMARY_LANE_IDS)[number];
export type DebugTrackingSeverity = "p1" | "p2" | "p3" | "info";
export type DebugTrackingStatus =
  | "live"
  | "degraded"
  | "failed"
  | "stale"
  | "unavailable"
  | "unknown"
  | EmptyLiveLaneStatus
  | AdminSummaryLaneStatus
  | ConfigRuntimeSampleStatus
  | "quiet_catalog_current"
  | "source_ready_not_registered"
  | "source_live_artifact_stale";

export type DebugTrackingSummaryLane = {
  id: DebugTrackingSummaryLaneId;
  label: string;
  trackingSystem: string;
  sourceOwner: string;
  sourceOfTruth: string;
  status: DebugTrackingStatus;
  severity: DebugTrackingSeverity;
  scoreImpact: "high" | "medium" | "low" | "none";
  primarySignal: string;
  criticalCount: number;
  warningCount: number;
  drilldownTarget: string;
  rawDetailsDefaultOpen: false;
  oneSourceOfTruth: true;
};

export type DebugTrackingSummary = {
  defaultView: "tracking_summary_lanes";
  rawDetailsDefaultOpen: false;
  rawDetailPolicy: "drilldown_only";
  lanes: DebugTrackingSummaryLane[];
  futureActivityCatalog: {
    label: "Future activity catalog";
    defaultOpen: false;
    hiddenFromDefaultWarnings: true;
    quietFutureActivityCount: number;
    actionableActivitySignalCount: number;
    brokenActivityPathCount: number;
    scoreDragActivityCount: number;
    status?: DebugTrackingStatus | "quiet_catalog_current";
    artifactFreshness?: "current" | "stale" | "unknown";
    warningSeverity?: boolean;
    drilldownTarget: string;
    sourceOfTruth: string;
  };
  duplicateMonitorGroups: string[];
  validation: {
    duplicateTrackingSystems: string[];
    rawDumpsBeforeSummary: false;
    p1P2BacklogSurfaced: boolean;
  };
};

type SummaryInput = Record<string, any>;

const TRACKING_GROUPS = [
  "identity",
  "consent",
  "event_envelope",
  "global_user_dedupe",
  "count_dedupe_math",
  "duration_math",
  "drop_watch_time",
  "session_bounce",
  "user_journey",
  "sql_database_parity",
  "event_translation_bridge",
  "event_liveness",
  "person_metrics_hydration",
  "user_management",
  "testing_coverage",
  "math_authority",
  "behavior_math",
  "feature_coverage",
  "settings",
  "legacy_recovery",
  "wallet_funnel",
  "auth_provider_conflict",
  "auth_persistence",
  "auth_runtime",
  "notification_permission",
  "push_token_health",
  "notification_targeting",
  "pwa_service_worker",
  "daily_tasks_reset",
  "daily_task_guidance_health",
  "daily_task_lifecycle",
  "daily_task_reward_ledger",
  "chat_gating_moderation",
  "chat_telemetry_admin_truth",
  "runtime_debug",
  "cost",
  "backlog",
];

const SEVERITY_RANK: Record<DebugTrackingSeverity, number> = {
  p1: 3,
  p2: 2,
  p3: 1,
  info: 0,
};

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toStatus(value: unknown): DebugTrackingStatus {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("fail") || text.includes("error")) return "failed";
  if (text.includes("stale_artifact_refresh_required")) return "stale_artifact_refresh_required";
  if (text.includes("source_live_artifact_stale")) return "source_live_artifact_stale";
  if (text.includes("stale")) return "stale";
  if (text.includes("quiet_catalog_current")) return "quiet_catalog_current";
  if (text.includes("config_healthy_current")) return "config_healthy_current";
  if (text.includes("runtime_sample_healthy_current")) return "runtime_sample_healthy_current";
  if (text.includes("runtime_sample_proven_zero")) return "runtime_sample_proven_zero";
  if (text.includes("runtime_sample_missing")) return "runtime_sample_missing";
  if (text.includes("healthy_current")) return "healthy_current";
  if (text.includes("healthy_proven_zero")) return "healthy_proven_zero";
  if (text.includes("collecting")) return "source_ready_collecting";
  if (text.includes("no_sample")) return "source_ready_no_sample_loaded";
  if (text.includes("proven_zero")) return "healthy_proven_zero";
  if (text.includes("source_missing_actionable")) return "source_missing_actionable";
  if (text.includes("sample_source_missing")) return "sample_source_missing";
  if (text.includes("source_missing")) return "source_missing";
  if (text.includes("degraded") || text.includes("review") || text.includes("unproven")) return "degraded";
  if (text.includes("unavailable") || text.includes("missing") || text.includes("disabled")) return "unavailable";
  if (text.includes("live") || text.includes("ready") || text.includes("bounded") || text.includes("source_ready")) return "live";
  return "unknown";
}

function severityFromCounts(criticalCount: number, warningCount: number, status: DebugTrackingStatus): DebugTrackingSeverity {
  if (criticalCount > 0 || status === "failed") return "p1";
  if (
    warningCount > 0
    || status === "degraded"
    || status === "stale"
    || status === "source_missing"
    || status === "source_missing_actionable"
    || status === "sample_source_missing"
    || status === "runtime_sample_missing"
    || status === "stale_artifact_refresh_required"
    || status === "source_live_artifact_stale"
  ) return "p2";
  if (
    status === "unavailable"
    || status === "unknown"
    || status === "source_ready_collecting"
    || status === "source_ready_no_sample_loaded"
  ) return "p3";
  return "info";
}

function makeLane(input: Omit<DebugTrackingSummaryLane, "rawDetailsDefaultOpen" | "oneSourceOfTruth">): DebugTrackingSummaryLane {
  return {
    ...input,
    rawDetailsDefaultOpen: false,
    oneSourceOfTruth: true,
  };
}

export function buildDebugPanelTrackingSummary(input: SummaryInput = {}): DebugTrackingSummary {
  const identityStatus = toStatus(input.identityHandoff?.status) === "unknown" ? "source_ready_collecting" : toStatus(input.identityHandoff?.status);
  const identityWarnings = input.identityHandoff?.duplicateCountGuardActive === false ? 1 : 0;
  const eventMissingCount = Array.isArray(input.eventEnvelope?.missingEnvelopeFieldsByFeature)
    ? input.eventEnvelope.missingEnvelopeFieldsByFeature.length
    : 0;
  const eventStatus = eventMissingCount > 0 ? "degraded" : toStatus(input.eventEnvelope?.status);
  const globalUserDedupeLane = input.globalUserDedupeNormalization?.debugLane ?? buildGlobalUserDedupeDebugLane();
  const globalUserDedupeWarnings = toNumber(globalUserDedupeLane.globalUserMismatchCount)
    + (globalUserDedupeLane.sqlExportParityStatus === "mapped" ? 0 : 1)
    + (globalUserDedupeLane.linkedGuestUserDedupeHealth === "healthy" ? 0 : 1);
  const countDedupeMathLane = input.countDeduplicationNormalization?.debugLane ?? {};
  const countDedupeDuplicateRisk = toNumber(countDedupeMathLane.duplicateRiskCount);
  const countDedupeLegacyBucket = toNumber(countDedupeMathLane.legacyBucketCount);
  const countDedupeReplaySuppressed = toNumber(countDedupeMathLane.replaySuppressedCount);
  const countDedupeMissingFormula = toNumber(countDedupeMathLane.missingFormulaReferences);
  const countDedupeWarnings = countDedupeDuplicateRisk + countDedupeMissingFormula;
  const countDedupeStatus = classifyAdminSummaryLaneStatus({
    laneId: "count_dedupe_math",
    sourceContractPresent: true,
    configTruthHealthy: countDedupeMissingFormula === 0,
    sampleLoaded: toNumber(countDedupeMathLane.requiredDomainsCovered) > 0,
    counts: [
      toNumber(countDedupeMathLane.requiredDomainsCovered),
      countDedupeLegacyBucket,
      countDedupeReplaySuppressed,
    ],
    warningCount: countDedupeWarnings,
  }).status;
  const durationMathLane = input.durationMathNormalization?.debugLane ?? {};
  const durationMathExact = toNumber(durationMathLane.exactCount);
  const durationMathEstimated = toNumber(durationMathLane.estimatedCount);
  const durationMathUnavailable = toNumber(durationMathLane.unavailableCount);
  const durationMathPageFallback = toNumber(durationMathLane.suspiciousPageTimeFallbackCount);
  const durationMathBackgroundExcluded = toNumber(durationMathLane.backgroundExcludedCount);
  const durationMathMissingFormula = toNumber(durationMathLane.missingFormulaReferences);
  const durationMathWarnings = durationMathPageFallback + durationMathMissingFormula;
  const durationMathStatus = classifyAdminSummaryLaneStatus({
    laneId: "duration_math",
    sourceContractPresent: true,
    configTruthHealthy: durationMathMissingFormula === 0,
    sampleLoaded: durationMathExact + durationMathEstimated + durationMathUnavailable > 0,
    counts: [
      durationMathExact,
      durationMathEstimated,
      durationMathUnavailable,
      durationMathBackgroundExcluded,
    ],
    warningCount: durationMathWarnings,
  }).status;
  const dropWatchTimeLane = input.dropWatchTimeAccuracy?.debugLane ?? buildDropWatchTimeDebugLane();
  const dropWatchTimeWarnings = toNumber(dropWatchTimeLane.durationMissingCount)
    + toNumber(dropWatchTimeLane.suspiciousPageTimeFallbackCount);
  const dropWatchSampleDecision = classifyEmptyLiveLane({
    laneId: "drop_watch_time",
    sourceContractPresent: true,
    sampleLoaded: toNumber(dropWatchTimeLane.exactMediaRuntimeCount) + toNumber(dropWatchTimeLane.activeVisibilityEstimatedCount) > 0,
    expectedTraffic: true,
    counts: [
      toNumber(dropWatchTimeLane.exactMediaRuntimeCount),
      toNumber(dropWatchTimeLane.activeVisibilityEstimatedCount),
      toNumber(dropWatchTimeLane.backgroundExcludedCount),
    ],
  });
  const sessionBounceLane = input.sessionBounceCalculation?.debugLane ?? buildSessionBounceDebugLane();
  const sessionBounceWarnings = toNumber(sessionBounceLane.missingCloseoutCount)
    + (sessionBounceLane.guestUserLinkStatus === "missing" ? 1 : 0)
    + (sessionBounceLane.telemetryStatus === "mapped" ? 0 : 1);
  const sessionBounceSampleDecision = classifyEmptyLiveLane({
    laneId: "session_bounce",
    sourceContractPresent: true,
    sampleLoaded: toNumber(sessionBounceLane.activeSessionCount) + toNumber(sessionBounceLane.idleSessionCount) + toNumber(sessionBounceLane.bounceClassifiedCount) > 0,
    expectedTraffic: true,
    counts: [
      toNumber(sessionBounceLane.activeSessionCount),
      toNumber(sessionBounceLane.idleSessionCount),
      toNumber(sessionBounceLane.bounceClassifiedCount),
      toNumber(sessionBounceLane.hiddenTimeExcludedCount),
    ],
  });
  const userJourneyLane = input.userJourneyBehavioralIntelligence?.debugLane ?? buildUserJourneyDebugLane();
  const userJourneyWarnings = (userJourneyLane.journeyBuilderConnected ? 0 : 1)
    + toNumber(userJourneyLane.brokenJourneySegments)
    + toNumber(userJourneyLane.missingNextActions)
    + (userJourneyLane.costGuardStatus === "batched_rollup" ? 0 : 1);
  const eventBridge = input.eventTranslationBridge?.debugLane ?? {};
  const eventBridgeGaps = toNumber(eventBridge.gaps);
  const eventBridgeTranslated = toNumber(eventBridge.eventEnvelopesTranslated);
  const eventBridgeConnected = toNumber(eventBridge.producersConnected);
  const activitySignalSummary = summarizeActionableActivitySignals(
    Array.isArray(input.futureActivitySignalReclassification?.classifiedSignals)
      ? input.futureActivitySignalReclassification.classifiedSignals
      : Array.isArray(input.futureActivitySignalReclassification?.signals)
        ? input.futureActivitySignalReclassification.signals
        : Array.isArray(input.eventTranslationBridge?.waitingOnActivity)
          ? input.eventTranslationBridge.waitingOnActivity
          : [],
  );
  const eventBridgeActionableSignals = activitySignalSummary.actionableActivitySignalCount;
  const eventBridgeStatus = eventBridgeGaps + eventBridgeActionableSignals > 0
    ? "degraded"
    : eventBridgeTranslated > 0 || eventBridgeConnected > 0
      ? "live"
      : toStatus(input.eventTranslationBridge?.status);
  const eventLiveness = input.eventLivenessAudit ?? buildEventLivenessSummary({
    rawQuietFutureCount: activitySignalSummary.quietFutureActivityCount,
  });
  const eventLivenessLane = eventLiveness.debugLane ?? {};
  const eventLivenessWarnings = toNumber(eventLivenessLane.suspiciousIdleEvents)
    + toNumber(eventLivenessLane.sourceMissing)
    + toNumber(eventLivenessLane.materializerMissing)
    + toNumber(eventLivenessLane.translationMissing)
    + toNumber(eventLivenessLane.hydrationMissing);
  const eventLivenessStatus = eventLivenessWarnings > 0
    ? "degraded"
    : toNumber(eventLivenessLane.expectedLiveEvents) > 0
      ? "live"
      : "unknown";
  const personHydration = input.personMetricsHydration?.debugLane ?? {};
  const personHydrationGaps = toNumber(personHydration.gaps);
  const personHydrationMapped = toNumber(personHydration.personMetricsMapped);
  const personHydrationLowConfidence = toNumber(personHydration.lowConfidenceMetrics);
  const personHydrationStatus = personHydrationGaps > 0
    ? "degraded"
    : personHydrationLowConfidence > 0
      ? "source_ready_collecting"
      : personHydrationMapped > 0 && toNumber(personHydration.eventEnvelopesHydrated) === 0
        ? "source_ready_collecting"
        : personHydrationMapped > 0
          ? "live"
          : toStatus(input.personMetricsHydration?.status);
  const userManagement = input.userManagementRefactor?.debugLane ?? {};
  const userManagementLowConfidence = toNumber(userManagement.lowConfidenceMetrics);
  const userManagementSummarized = toNumber(userManagement.usersSummarized);
  const userManagementStatus = classifyAdminSummaryLaneStatus({
    laneId: "user_management",
    sourceContractPresent: true,
    sampleLoaded: userManagementSummarized > 0,
    counts: [userManagementSummarized],
    warningCount: userManagementLowConfidence,
  }).status;
  const testingCoverage = input.telemetryTriggerTestMatrix?.debugLane ?? {};
  const testingCoverageTotal = toNumber(testingCoverage.totalTriggers);
  const testingCoverageCovered = toNumber(testingCoverage.coveredTriggers);
  const testingCoverageMissing = toNumber(testingCoverage.missingTriggerTests);
  const testingCoverageUiOnly = toNumber(testingCoverage.uiOnlyTests);
  const testingCoverageWaitingGaps = toNumber(testingCoverage.waitingOnActivityDeterministicGaps);
  const testingCoverageWarnings = testingCoverageMissing + testingCoverageUiOnly + testingCoverageWaitingGaps;
  const testingCoverageStatus = classifyAdminSummaryLaneStatus({
    laneId: "testing_coverage",
    sourceContractPresent: true,
    sampleLoaded: testingCoverageTotal > 0,
    configTruthHealthy: testingCoverageWarnings === 0 && testingCoverageTotal > 0 && testingCoverageCovered >= testingCoverageTotal,
    counts: [testingCoverageCovered],
    warningCount: testingCoverageWarnings,
  }).status;
  const telemetrySummary = input.telemetryHealth?.summary ?? {};
  const featureWarnings = toNumber(telemetrySummary.degraded) + toNumber(telemetrySummary.runtimeUnproven);
  const featureCritical = toNumber(telemetrySummary.unavailable) + toNumber(telemetrySummary.configMissing);
  const featureLaneCount = Array.isArray(input.telemetryHealth?.lanes) ? input.telemetryHealth.lanes.length : 0;
  const featureGate = input.featureRegistrationGate ?? buildFeatureRegistrationGateReport();
  const featureGateFailures = Array.isArray(featureGate.validationFailures) ? featureGate.validationFailures.length : 0;
  const featureCoverageStatus = input.featureTelemetryCoverageCleanup?.featureCoverageStatus === "source_ready" || featureGate.status === "pass"
    ? "live"
    : featureGateFailures > 0
      ? "degraded"
      : featureLaneCount > 0
        ? "live"
        : "unavailable";
  const featureCoverageWarnings = featureGateFailures;
  const consentCleanup = input.consentTrackingModeCleanup;
  const consentBlockedFamilies = Array.isArray(consentCleanup?.debugLane?.blockedEventFamilies)
    ? consentCleanup.debugLane.blockedEventFamilies.length
    : 0;
  const consentStatus: DebugTrackingStatus = consentCleanup?.status === "degraded" ? "degraded" : "live";
  const disconnectedSettings = toNumber(input.settingsConnectionParity?.disconnectedSettingCount);
  const staleClientPreferences = toNumber(input.staleClientPreferences?.staleBypassCount);
  const unsafeClientPreferences = toNumber(input.staleClientPreferences?.unsafeUnknownCount);
  const settingsWarningCount = disconnectedSettings + staleClientPreferences + unsafeClientPreferences;
  const settingsStatus = classifyAdminSummaryLaneStatus({
    laneId: "settings_health",
    sourceContractPresent: true,
    configTruthHealthy: true,
    warningCount: settingsWarningCount,
  }).status;
  const mathAuthority = input.canonicalMathAuthorityLedger?.debugLane ?? {};
  const mathAuthorityFormulas = toNumber(mathAuthority.formulasInventoried);
  const mathAuthorityDuplicates = toNumber(mathAuthority.duplicateFormulas);
  const mathAuthorityMissingDefinitions = toNumber(mathAuthority.missingDefinitions);
  const mathAuthorityNeedsDecision = toNumber(mathAuthority.needsOperatorDecision);
  const mathAuthorityWarnings = mathAuthorityDuplicates + mathAuthorityMissingDefinitions;
  const mathAuthorityStatus = classifyAdminSummaryLaneStatus({
    laneId: "math_authority",
    sourceContractPresent: true,
    sampleLoaded: mathAuthorityFormulas > 0,
    configTruthHealthy: mathAuthorityWarnings === 0 && mathAuthorityFormulas > 0,
    counts: [mathAuthorityFormulas],
    warningCount: mathAuthorityWarnings,
  }).status;
  const behaviorCleanup = input.behaviorMathStatusCleanup;
  const behaviorStatus = behaviorCleanup?.status === "healthy" || behaviorCleanup?.status === `source_ready_${"waiting_for_activity"}`
    ? "live"
    : behaviorCleanup?.status === "degraded" || behaviorCleanup?.status === "source_missing"
      ? "degraded"
      : toStatus(input.behavioralSnapshotStatus?.status ?? "source_ready");
  const legacyCleanup = input.legacyRecoveryStatusCleanup;
  const legacyStatus = legacyCleanup?.status === "healthy_source_ready"
    ? "live"
    : legacyCleanup?.status === "degraded"
      ? "degraded"
      : toStatus(input.legacyRecovery?.status ?? "ready_for_dry_run_review");
  const walletCount = toNumber(input.stats?.receiptsLast7d ?? input.recentTransactions?.length);
  const walletFunnelStatus: DebugTrackingStatus = walletCount > 0 ? "live" : "source_ready_no_sample_loaded";
  const authProviderConflict = input.authProviderConflictResolution?.debugLane ?? buildAuthProviderConflictDebugLane();
  const authProviderConflictWarnings = toNumber(authProviderConflict.unresolvedAuthFailures)
    + (authProviderConflict.rawEmailPasswordExposed ? 1 : 0)
    + (authProviderConflict.telemetryStatus === "mapped" ? 0 : 1);
  const authProviderConflictStatus = classifyAdminSummaryLaneStatus({
    laneId: "auth_provider_conflict",
    sourceContractPresent: true,
    configTruthHealthy: toNumber(authProviderConflict.conflictTypesMapped) > 0 && authProviderConflict.resolutionShown === true,
    warningCount: authProviderConflictWarnings,
    criticalCount: authProviderConflict.rawEmailPasswordExposed ? 1 : 0,
  }).status;
  const authPersistence = input.authPersistenceStability?.debugLane ?? buildAuthPersistenceDebugLane();
  const authPersistenceWarnings = toNumber(authPersistence.unexpectedDrops)
    + toNumber(authPersistence.navigationSessionFailures)
    + toNumber(authPersistence.profileSnapshotReconnects)
    + (authPersistence.telemetryStatus === "mapped" ? 0 : 1);
  const authPersistenceStatus = classifyAdminSummaryLaneStatus({
    laneId: "auth_persistence",
    sourceContractPresent: true,
    telemetryMapped: authPersistence.telemetryStatus === "mapped",
    expectedRuntimeActivity: true,
    sampleLoaded: toNumber(authPersistence.restoredSessions)
      + toNumber(authPersistence.unexpectedDrops)
      + toNumber(authPersistence.navigationSessionFailures)
      + toNumber(authPersistence.profileSnapshotReconnects)
      + toNumber(authPersistence.securityLogoutCount) > 0,
    counts: [
      toNumber(authPersistence.restoredSessions),
      toNumber(authPersistence.unexpectedDrops),
      toNumber(authPersistence.navigationSessionFailures),
      toNumber(authPersistence.profileSnapshotReconnects),
      toNumber(authPersistence.securityLogoutCount),
    ],
    warningCount: authPersistenceWarnings,
  }).status;
  const authRuntime = input.authRuntimeTelemetry?.debugLane ?? buildAuthRuntimeDebugLane();
  const authRuntimeWarnings = toNumber(authRuntime.unexpectedLogoutCount)
    + toNumber(authRuntime.navigationSessionFailureCount)
    + toNumber(authRuntime.profileBootstrapFailureCount)
    + (authRuntime.telemetryStatus === "mapped" ? 0 : 1)
    + (authRuntime.personMetricsStatus === "mapped" ? 0 : 1)
    + (authRuntime.eventEnvelopeStatus === "mapped" ? 0 : 1)
    + (authRuntime.rawPiiExposed ? 1 : 0)
    + (authRuntime.rawTokensExposed ? 1 : 0);
  const authRuntimeStatus = classifyAdminSummaryLaneStatus({
    laneId: "auth_runtime",
    sourceContractPresent: true,
    telemetryMapped: authRuntime.telemetryStatus === "mapped" && authRuntime.personMetricsStatus === "mapped" && authRuntime.eventEnvelopeStatus === "mapped",
    expectedRuntimeActivity: true,
    sampleLoaded: toNumber(authRuntime.signupAttempts)
      + toNumber(authRuntime.loginAttempts)
      + toNumber(authRuntime.successByMethod?.google)
      + toNumber(authRuntime.successByMethod?.email_password)
      + toNumber(authRuntime.providerConflictCount) > 0,
    counts: [
      toNumber(authRuntime.signupAttempts),
      toNumber(authRuntime.loginAttempts),
      toNumber(authRuntime.successByMethod?.google),
      toNumber(authRuntime.successByMethod?.email_password),
      toNumber(authRuntime.providerConflictCount),
    ],
    warningCount: authRuntimeWarnings,
    criticalCount: authRuntime.rawPiiExposed || authRuntime.rawTokensExposed ? 1 : 0,
  }).status;
  const notificationPermission = input.notificationPermissionLifecycle?.debugLane ?? buildNotificationPermissionDebugLane();
  const notificationPermissionWarnings = toNumber(notificationPermission.failed)
    + (notificationPermission.telemetryStatus === "mapped" ? 0 : 1);
  const notificationPermissionStatus = classifyAdminSummaryLaneStatus({
    laneId: "notification_permission",
    sourceContractPresent: true,
    telemetryMapped: notificationPermission.telemetryStatus === "mapped",
    expectedRuntimeActivity: true,
    sampleLoaded: toNumber(notificationPermission.promptEligible)
      + toNumber(notificationPermission.promptShown)
      + toNumber(notificationPermission.granted)
      + toNumber(notificationPermission.denied)
      + toNumber(notificationPermission.failed)
      + toNumber(notificationPermission.unsupportedBrowser)
      + toNumber(notificationPermission.cooldownActive)
      + toNumber(notificationPermission.snoozed) > 0,
    counts: [
      toNumber(notificationPermission.promptEligible),
      toNumber(notificationPermission.promptShown),
      toNumber(notificationPermission.granted),
      toNumber(notificationPermission.denied),
      toNumber(notificationPermission.failed),
      toNumber(notificationPermission.unsupportedBrowser),
      toNumber(notificationPermission.cooldownActive),
      toNumber(notificationPermission.snoozed),
    ],
    warningCount: notificationPermissionWarnings,
  }).status;
  const pushTokenHealth = input.pushTokenRegistration?.debugLane ?? buildPushTokenDebugLane();
  const pushTokenWarnings = toNumber(pushTokenHealth.failedRegistrations)
    + toNumber(pushTokenHealth.unsupportedBrowsers)
    + toNumber(pushTokenHealth.staleTokens)
    + toNumber(pushTokenHealth.rawTokenExposureCount)
    + (pushTokenHealth.telemetryStatus === "mapped" ? 0 : 1);
  const pushTokenStatus = classifyAdminSummaryLaneStatus({
    laneId: "push_token_health",
    sourceContractPresent: true,
    telemetryMapped: pushTokenHealth.telemetryStatus === "mapped",
    expectedRuntimeActivity: true,
    sampleLoaded: toNumber(pushTokenHealth.registeredUsers)
      + toNumber(pushTokenHealth.registeredDevices)
      + toNumber(pushTokenHealth.failedRegistrations)
      + toNumber(pushTokenHealth.unsupportedBrowsers)
      + toNumber(pushTokenHealth.staleTokens) > 0,
    counts: [
      toNumber(pushTokenHealth.registeredUsers),
      toNumber(pushTokenHealth.registeredDevices),
      toNumber(pushTokenHealth.failedRegistrations),
      toNumber(pushTokenHealth.unsupportedBrowsers),
      toNumber(pushTokenHealth.staleTokens),
    ],
    warningCount: pushTokenWarnings,
    criticalCount: toNumber(pushTokenHealth.rawTokenExposureCount),
  }).status;
  const notificationTargeting = input.notificationTargetingIntent?.debugLane ?? buildNotificationTargetingDebugLane();
  const notificationTargetingWarnings = toNumber(notificationTargeting.missingAudienceSource)
    + toNumber(notificationTargeting.blockedByMissingToken)
    + toNumber(notificationTargeting.blockedByConsent)
    + (notificationTargeting.telemetryStatus === "mapped" ? 0 : 1);
  const notificationTargetingStatus = classifyAdminSummaryLaneStatus({
    laneId: "notification_targeting",
    sourceContractPresent: toNumber(notificationTargeting.intentTypesRegistered) > 0,
    telemetryMapped: notificationTargeting.telemetryStatus === "mapped",
    sampleLoaded: toNumber(notificationTargeting.dryRunEligible) > 0,
    counts: [toNumber(notificationTargeting.dryRunEligible)],
    warningCount: notificationTargetingWarnings,
  }).status;
  const pwaServiceWorker = input.pwaServiceWorkerSafety?.debugLane ?? buildPwaServiceWorkerDebugLane();
  const pwaRegistrationActionable = pwaServiceWorker.status === "degraded"
    && pwaServiceWorker.registrationStatusReason !== "optional_not_registered";
  const pwaServiceWorkerWarnings = (pwaRegistrationActionable ? 1 : 0)
    + (pwaServiceWorker.notificationCompatible ? 0 : 1)
    + (pwaServiceWorker.forbiddenCacheSafe ? 0 : 1)
    + (pwaServiceWorker.offlineFallbackSafe ? 0 : 1)
    + (pwaServiceWorker.staleShellRisk === "low" ? 0 : 1)
    + (pwaServiceWorker.telemetryStatus === "mapped" ? 0 : 1);
  const dailyTasksReset = input.dailyTasksResetTruth?.debugLane ?? buildDailyTaskDebugLane();
  const dailyTaskGuidanceHealth = input.dailyTaskGuidanceRouteAudit?.debugLane ?? buildTaskGuidanceHealthLane();
  const dailyTaskLifecycle = input.dailyTaskLifecycleTelemetry?.debugLane ?? buildDailyTaskLifecycleDebugLane();
  const dailyTaskRewardLedger = input.dailyTaskRewardLedger?.debugLane ?? buildDailyTaskRewardDebugLane();
  const dailyTaskLifecycleWarnings = toNumber(dailyTaskLifecycle.missingStarts)
    + toNumber(dailyTaskLifecycle.completionsWithoutStarts)
    + toNumber(dailyTaskLifecycle.rewardsWithoutCompletions);
  const dailyTaskResetStatus = classifyAdminSummaryLaneStatus({
    laneId: "daily_tasks_reset",
    sourceContractPresent: true,
    configTruthHealthy: dailyTasksReset.duplicateClaimGuard === true && dailyTasksReset.rewardSourceTruth === "reward_gd_only",
    warningCount: dailyTasksReset.duplicateClaimGuard ? 0 : 1,
  }).status;
  const dailyTaskGuidanceStatus = classifyAdminSummaryLaneStatus({
    laneId: "daily_task_guidance_health",
    sourceContractPresent: true,
    configTruthHealthy: toNumber(dailyTaskGuidanceHealth.activeTasks) > 0,
    warningCount: toNumber(dailyTaskGuidanceHealth.brokenRoutes)
      + toNumber(dailyTaskGuidanceHealth.missingCompletionSignals)
      + toNumber(dailyTaskGuidanceHealth.missingTelemetry)
      + toNumber(dailyTaskGuidanceHealth.wrongSurfaceTasks),
  }).status;
  const dailyTaskLifecycleStatus = classifyAdminSummaryLaneStatus({
    laneId: "daily_task_lifecycle",
    sourceContractPresent: true,
    telemetryMapped: true,
    expectedRuntimeActivity: true,
    sampleLoaded: false,
    counts: [0],
    warningCount: dailyTaskLifecycleWarnings
      + toNumber(dailyTaskLifecycle.durationUnavailableCount)
      + toNumber(dailyTaskLifecycle.failureReasons?.length),
  }).status;
  const dailyTaskRewardLedgerStatus = classifyAdminSummaryLaneStatus({
    laneId: "daily_task_reward_ledger",
    sourceContractPresent: true,
    telemetryMapped: true,
    expectedRuntimeActivity: true,
    sampleLoaded: toNumber(dailyTaskRewardLedger.grantedRewards)
      + toNumber(dailyTaskRewardLedger.blockedDuplicateClaims)
      + toNumber(dailyTaskRewardLedger.unknownLegacyRewards)
      + toNumber(dailyTaskRewardLedger.failedGrantCount) > 0,
    counts: [
      toNumber(dailyTaskRewardLedger.grantedRewards),
      toNumber(dailyTaskRewardLedger.blockedDuplicateClaims),
      toNumber(dailyTaskRewardLedger.unknownLegacyRewards),
      toNumber(dailyTaskRewardLedger.failedGrantCount),
    ],
    warningCount: toNumber(dailyTaskRewardLedger.unknownLegacyRewards) + toNumber(dailyTaskRewardLedger.failedGrantCount),
  }).status;
  const chatGating = input.chatGatingModeration?.debugLane ?? buildChatGatingDebugLane();
  const chatGatingBlocked = toNumber(chatGating.blockedAttempts);
  const chatGatingConfigHealthy = chatGating.backendEnforcement
    && chatGating.uiOnlyGate === false
    && chatGating.paidGdOnlyRule === true
    && chatGating.rewardFreeGdDisallowed === true
    && chatGating.sourceOfFundsTruthStatus === "purchased_only_enforced"
    && chatGating.moderationStatusVisible === true
    && chatGating.mediaLimitBlocksVisible === true;
  const chatGatingConfigStatus = classifyConfigRuntimeSampleStatus({
    laneId: "chat_gating_config",
    laneKind: "config",
    configSourceHealthy: chatGatingConfigHealthy,
    warningCount: chatGatingConfigHealthy ? 0 : 1,
  }).status;
  const chatGatingRuntimeStatus = classifyConfigRuntimeSampleStatus({
    laneId: "chat_gating_runtime",
    laneKind: "runtime_sample",
    configSourceHealthy: chatGatingConfigHealthy,
    sampleLoaded: false,
    counts: [
      chatGatingBlocked,
      toNumber(chatGating.insufficientPaidGdAttempts),
      toNumber(chatGating.moderationBlocks),
      toNumber(chatGating.mediaLimitBlocks),
      toNumber(chatGating.bypassCounts?.fanPassSubscriber),
      toNumber(chatGating.bypassCounts?.creatorReply),
    ],
  }).status;
  const chatTelemetry = input.chatTelemetryAdminTruth?.summaryLane ?? buildChatAdminTelemetrySummaryLane();
  const chatTelemetryMetrics = chatTelemetry.metrics ?? {};
  const chatTelemetryWarnings = chatTelemetry.rawMessageContentDefault === false
    && chatTelemetry.transcriptTruth === "guarded_drilldown"
    && chatTelemetry.blockedFailedVisible === true
    && chatTelemetry.userLevelMetricsVisible === true
    && chatTelemetry.creatorLevelMetricsVisible === true
    ? 0
    : 1;
  const chatTelemetryContractHealthy = chatTelemetryWarnings === 0;
  const chatTelemetryContractStatus = classifyConfigRuntimeSampleStatus({
    laneId: "chat_telemetry_contract",
    laneKind: "config",
    configSourceHealthy: chatTelemetryContractHealthy,
    warningCount: chatTelemetryWarnings,
  }).status;
  const chatTelemetryRuntimeStatus = classifyConfigRuntimeSampleStatus({
    laneId: "chat_telemetry_runtime",
    laneKind: "runtime_sample",
    configSourceHealthy: chatTelemetryContractHealthy,
    sampleLoaded: false,
    counts: Object.values(chatTelemetryMetrics).map(toNumber),
    warningCount: chatTelemetryWarnings,
  }).status;
  const sqlDatabaseParityLane = input.sqlDatabaseParityCostLock?.debugLane ?? buildSqlDatabaseParityDebugLane();
  const sqlDatabaseParityWarnings = toNumber(sqlDatabaseParityLane.mismatchCount)
    + (sqlDatabaseParityLane.parityStatus === "matched" ? 0 : 1)
    + (sqlDatabaseParityLane.costGuardStatus === "batched_summary_first" ? 0 : 1);
  const routeFailures = toNumber(input.routeRuntimeHealthSummary?.fail);
  const routeWarnings = toNumber(input.routeRuntimeHealthSummary?.warn) + toNumber(input.routeRuntimeHealthSummary?.stale);
  const runtimeFailures = toNumber(input.runtimeWarningSummary?.failed);
  const runtimeWarnings = toNumber(input.runtimeWarningSummary?.degraded) + toNumber(input.runtimeWarningSummary?.total);
  const runtimeSignalCleanup = input.runtimeDebugSignalCleanup;
  const runtimeFailedGroups = toNumber(runtimeSignalCleanup?.failedGroupCount ?? routeFailures + runtimeFailures);
  const runtimeWarningGroups = toNumber(runtimeSignalCleanup?.warningGroupCount ?? routeWarnings + runtimeWarnings);
  const runtimeRawWarnings = toNumber(runtimeSignalCleanup?.rawWarningCount ?? routeWarnings + runtimeWarnings);
  const p1P2Open = toNumber(input.debugBacklogSummary?.p1P2GroupOpen ?? input.debugBacklogSummary?.p0P1GroupOpen ?? input.debugBacklogSummary?.p0P1Open ?? input.controlTower?.debugBacklogSummary?.p1P2GroupOpen ?? input.controlTower?.debugBacklogSummary?.p0P1Open);
  const backlogOpen = toNumber(input.debugBacklogSummary?.open ?? input.controlTower?.debugBacklogSummary?.open);
  const costGuardConfigStatus = classifyConfigRuntimeSampleStatus({
    laneId: "cost_guard_config",
    laneKind: "config",
    configSourceHealthy: true,
  }).status;
  const costRuntimeSampleStatus = classifyConfigRuntimeSampleStatus({
    laneId: "cost_4xx_runtime",
    laneKind: "runtime_sample",
    configSourceHealthy: true,
    sampleLoaded: false,
    sampleSourcePresent: true,
    counts: [0],
  }).status === "source_ready_collecting" ? "source_ready_no_sample_loaded" : "source_ready_no_sample_loaded";
  const backlogStatus = p1P2Open > 0
    ? "degraded"
    : backlogOpen > 0
      ? "stale_artifact_refresh_required"
      : "runtime_sample_proven_zero";
  const futureCatalogStatus = activitySignalSummary.actionableActivitySignalCount === 0
    && activitySignalSummary.brokenActivityPathCount === 0
    && activitySignalSummary.scoreDragActivityCount === 0
    ? "quiet_catalog_current"
    : "degraded";

  const lanes: DebugTrackingSummaryLane[] = [
    makeLane({
      id: "identity_handoff",
      label: "Identity handoff",
      trackingSystem: "identity",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/identity-handoff-engine.ts",
      status: identityStatus,
      severity: severityFromCounts(0, identityWarnings, identityStatus),
      scoreImpact: "high",
      primarySignal: identityWarnings > 0 ? "Duplicate-count guard needs review." : "Guest, signed-in, creator, admin, system, and legacy identity lanes are source-ready; runtime samples are classified as collecting until loaded.",
      criticalCount: 0,
      warningCount: identityWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#identity-handoff",
    }),
    makeLane({
      id: "consent_tracking_mode",
      label: "Consent/tracking mode",
      trackingSystem: "consent",
      sourceOwner: "privacy",
      sourceOfTruth: "src/lib/privacy/consent-tracking-policy.ts",
      status: consentStatus,
      severity: severityFromCounts(0, consentStatus === "degraded" ? Math.max(1, consentBlockedFamilies) : 0, consentStatus),
      scoreImpact: "high",
      primarySignal: consentCleanup
        ? `Minimal product liveness=${String(Boolean(consentCleanup.capabilities?.minimalAnalyticsAllowsProductLiveness))}; necessary integrity/session=${String(Boolean(consentCleanup.capabilities?.necessaryAllowsIntegritySession))}; blocked families=${consentBlockedFamilies}.`
        : "Tracking mode is governed by consent capability policy before behavioral analytics are allowed.",
      criticalCount: 0,
      warningCount: consentStatus === "degraded" ? Math.max(1, consentBlockedFamilies) : 0,
      drilldownTarget: "/admin/debug?tab=advanced#consent-tracking",
    }),
    makeLane({
      id: "event_envelope",
      label: "Event envelope",
      trackingSystem: "event_envelope",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/event-envelope-builder.ts",
      status: eventStatus,
      severity: severityFromCounts(0, eventMissingCount, eventStatus),
      scoreImpact: "high",
      primarySignal: eventMissingCount > 0 ? `${eventMissingCount} feature(s) have missing envelope fields.` : "Tracked events share one identity-aware envelope.",
      criticalCount: 0,
      warningCount: eventMissingCount,
      drilldownTarget: "/admin/debug?tab=advanced#event-envelope",
    }),
    makeLane({
      id: "global_user_dedupe",
      label: "Global vs user dedupe",
      trackingSystem: "global_user_dedupe",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/global-user-dedupe-engine.ts",
      status: globalUserDedupeWarnings > 0 ? "degraded" : "live",
      severity: severityFromCounts(0, globalUserDedupeWarnings, globalUserDedupeWarnings > 0 ? "degraded" : "live"),
      scoreImpact: "high",
      primarySignal: `Duplicate risks=${toNumber(globalUserDedupeLane.duplicateRiskCount)}; linked guest/user=${globalUserDedupeLane.linkedGuestUserDedupeHealth}; global/user mismatches=${toNumber(globalUserDedupeLane.globalUserMismatchCount)}; SQL/export parity=${globalUserDedupeLane.sqlExportParityStatus}; unknown legacy=${toNumber(globalUserDedupeLane.unknownLegacyCount)}.`,
      criticalCount: 0,
      warningCount: globalUserDedupeWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#global-user-dedupe",
    }),
    makeLane({
      id: "count_dedupe_math",
      label: "Count dedupe math",
      trackingSystem: "count_dedupe_math",
      sourceOwner: "analytics_math",
      sourceOfTruth: "src/lib/math/count-deduplication-normalizer.ts",
      status: countDedupeStatus,
      severity: severityFromCounts(0, countDedupeWarnings, countDedupeStatus),
      scoreImpact: "medium",
      primarySignal: `Contract=${COUNT_DEDUPLICATION_CONTRACT_VERSION}; domains=${toNumber(countDedupeMathLane.requiredDomainsCovered)}; duplicateRisk=${countDedupeDuplicateRisk}; legacyBucket=${countDedupeLegacyBucket}; replaySuppressed=${countDedupeReplaySuppressed}; formulaMissing=${countDedupeMissingFormula}; divergence=${toNumber(countDedupeMathLane.globalUserDivergenceExplanations)}.`,
      criticalCount: 0,
      warningCount: countDedupeWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#count-dedupe-math",
    }),
    makeLane({
      id: "duration_math",
      label: "Duration math",
      trackingSystem: "duration_math",
      sourceOwner: "analytics_math",
      sourceOfTruth: "src/lib/math/duration-math-normalizer.ts",
      status: durationMathStatus,
      severity: severityFromCounts(0, durationMathWarnings, durationMathStatus),
      scoreImpact: "medium",
      primarySignal: `Contract=${DURATION_MATH_CONTRACT_VERSION}; exact=${durationMathExact}; estimated=${durationMathEstimated}; unavailable=${durationMathUnavailable}; pageFallback=${durationMathPageFallback}; backgroundExcluded=${durationMathBackgroundExcluded}; formulaMissing=${durationMathMissingFormula}.`,
      criticalCount: 0,
      warningCount: durationMathWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#duration-math",
    }),
    makeLane({
      id: "drop_watch_time",
      label: "Drop watch time",
      trackingSystem: "drop_watch_time",
      sourceOwner: "viewer-runtime",
      sourceOfTruth: "src/lib/analytics/drop-watch-time-engine.ts",
      status: dropWatchTimeWarnings > 0 ? "degraded" : dropWatchSampleDecision.status,
      severity: severityFromCounts(0, dropWatchTimeWarnings, dropWatchTimeWarnings > 0 ? "degraded" : dropWatchSampleDecision.status),
      scoreImpact: dropWatchTimeWarnings > 0 ? "medium" : "none",
      primarySignal: `Status reason=${dropWatchSampleDecision.reason}; exact media runtime=${toNumber(dropWatchTimeLane.exactMediaRuntimeCount)}; active visibility estimated=${toNumber(dropWatchTimeLane.activeVisibilityEstimatedCount)}; duration missing=${toNumber(dropWatchTimeLane.durationMissingCount)}; background excluded=${toNumber(dropWatchTimeLane.backgroundExcludedCount)}; page-time fallback=${toNumber(dropWatchTimeLane.suspiciousPageTimeFallbackCount)}.`,
      criticalCount: 0,
      warningCount: dropWatchTimeWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#drop-watch-time",
    }),
    makeLane({
      id: "session_bounce",
      label: "Session/bounce",
      trackingSystem: "session_bounce",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/session-metrics-engine.ts",
      status: sessionBounceWarnings > 0 ? "degraded" : sessionBounceSampleDecision.status,
      severity: severityFromCounts(0, sessionBounceWarnings, sessionBounceWarnings > 0 ? "degraded" : sessionBounceSampleDecision.status),
      scoreImpact: sessionBounceWarnings > 0 ? "medium" : "none",
      primarySignal: `Status reason=${sessionBounceSampleDecision.reason}; active=${toNumber(sessionBounceLane.activeSessionCount)}; idle=${toNumber(sessionBounceLane.idleSessionCount)}; missing closeouts=${toNumber(sessionBounceLane.missingCloseoutCount)}; bounce classified=${toNumber(sessionBounceLane.bounceClassifiedCount)}; hidden excluded=${toNumber(sessionBounceLane.hiddenTimeExcludedCount)}; guest/user link=${sessionBounceLane.guestUserLinkStatus}.`,
      criticalCount: 0,
      warningCount: sessionBounceWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#session-bounce",
    }),
    makeLane({
      id: "user_journey",
      label: "User journey",
      trackingSystem: "user_journey",
      sourceOwner: "behavioral-intelligence",
      sourceOfTruth: "src/lib/behavioral/user-journey-builder.ts",
      status: userJourneyWarnings > 0 ? "degraded" : "live",
      severity: severityFromCounts(0, userJourneyWarnings, userJourneyWarnings > 0 ? "degraded" : "live"),
      scoreImpact: userJourneyWarnings > 0 ? "medium" : "none",
      primarySignal: `Builder=${String(userJourneyLane.journeyBuilderConnected)}; broken segments=${toNumber(userJourneyLane.brokenJourneySegments)}; missing next actions=${toNumber(userJourneyLane.missingNextActions)}; source-ready funnels=${toNumber(userJourneyLane.topFunnelsSourceReady)}; cost guard=${userJourneyLane.costGuardStatus}.`,
      criticalCount: 0,
      warningCount: userJourneyWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#user-journey",
    }),
    makeLane({
      id: "sql_database_parity",
      label: "SQL/database parity",
      trackingSystem: "sql_database_parity",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/sql-database-parity-engine.ts",
      status: sqlDatabaseParityWarnings > 0 ? "degraded" : "live",
      severity: severityFromCounts(0, sqlDatabaseParityWarnings, sqlDatabaseParityWarnings > 0 ? "degraded" : "live"),
      scoreImpact: sqlDatabaseParityWarnings > 0 ? "medium" : "none",
      primarySignal: `Parity=${sqlDatabaseParityLane.parityStatus}; mismatches=${toNumber(sqlDatabaseParityLane.mismatchCount)}; export freshness=${sqlDatabaseParityLane.exportFreshness}; cost guard=${sqlDatabaseParityLane.costGuardStatus}; external review blocked=${String(sqlDatabaseParityLane.blockedExternalReview)}.`,
      criticalCount: 0,
      warningCount: sqlDatabaseParityWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#sql-database-parity",
    }),
    makeLane({
      id: "event_translation_bridge",
      label: "Event translation bridge",
      trackingSystem: "event_translation_bridge",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/event-translation-bridge.ts",
      status: eventBridgeStatus,
      severity: severityFromCounts(0, eventBridgeGaps + eventBridgeActionableSignals, eventBridgeStatus),
      scoreImpact: "high",
      primarySignal: `Producers ${eventBridgeConnected}/${toNumber(eventBridge.producersRegistered)} connected; envelopes=${eventBridgeTranslated}; materializers=${toNumber(eventBridge.materializersMapped)}; person metrics=${toNumber(eventBridge.personMetricsMapped)}; gaps=${eventBridgeGaps}; actionable activity signals=${eventBridgeActionableSignals}; quiet future catalog=${activitySignalSummary.quietFutureActivityCount}.`,
      criticalCount: 0,
      warningCount: eventBridgeGaps + eventBridgeActionableSignals,
      drilldownTarget: "/admin/debug?tab=advanced#event-translation-bridge",
    }),
    makeLane({
      id: "event_liveness",
      label: "Event liveness",
      trackingSystem: "telemetry_liveness",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/event-liveness-engine.ts",
      status: eventLivenessStatus,
      severity: severityFromCounts(0, eventLivenessWarnings, eventLivenessStatus),
      scoreImpact: eventLivenessWarnings > 0 ? "medium" : "none",
      primarySignal: input.eventLivenessSourceRepair
        ? `Expected live=${toNumber(input.eventLivenessSourceRepair.expectedLiveCount)}; recent=${toNumber(input.eventLivenessSourceRepair.recentCount)}; sourceMissingActionable=${toNumber(input.eventLivenessSourceRepair.sourceMissingActionableCount)}; groups=${toNumber(input.eventLivenessSourceRepair.sourceMissingActionableGroups?.length)}; quietFuture=${toNumber(input.eventLivenessSourceRepair.quietFutureCount)}.`
        : `Expected live=${toNumber(eventLivenessLane.expectedLiveEvents)}; recent=${toNumber(eventLivenessLane.observedRecently)}; suspicious=${toNumber(eventLivenessLane.suspiciousIdleEvents)}; sourceMissingActionable=${toNumber(eventLivenessLane.sourceMissing)}; materializerMissing=${toNumber(eventLivenessLane.materializerMissing)}; translationMissing=${toNumber(eventLivenessLane.translationMissing)}; hydrationMissing=${toNumber(eventLivenessLane.hydrationMissing)}; quietFuture=${toNumber(eventLivenessLane.quietFutureCatalogCount)}.`,
      criticalCount: 0,
      warningCount: eventLivenessWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#event-liveness",
    }),
    makeLane({
      id: "person_metrics_hydration",
      label: "Person metrics hydration",
      trackingSystem: "person_metrics_hydration",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/person-metrics-hydration.ts",
      status: personHydrationStatus,
      severity: severityFromCounts(0, personHydrationGaps + personHydrationLowConfidence, personHydrationStatus),
      scoreImpact: "high",
      primarySignal: `Mapped=${personHydrationMapped}; envelopes=${toNumber(personHydration.eventEnvelopesHydrated)}; global=${toNumber(personHydration.globalMetricsHydrated)}; signed-in=${toNumber(personHydration.signedInMetricsHydrated)}; linked=${toNumber(personHydration.linkedPersonMetricsHydrated)}; low-confidence=${personHydrationLowConfidence}; gaps=${personHydrationGaps}.`,
      criticalCount: 0,
      warningCount: personHydrationGaps + personHydrationLowConfidence,
      drilldownTarget: "/admin/debug?tab=advanced#person-metrics-hydration",
    }),
    makeLane({
      id: "user_management",
      label: "User management",
      trackingSystem: "user_management",
      sourceOwner: "admin",
      sourceOfTruth: "src/lib/admin/user-management-contract.ts",
      status: userManagementStatus,
      severity: severityFromCounts(0, userManagementLowConfidence, userManagementStatus),
      scoreImpact: "high",
      primarySignal: `Summaries=${userManagementSummarized}; low-confidence=${userManagementLowConfidence}; raw-before-summary=${String(Boolean(userManagement.rawDumpsBeforeSummary))}; duplicate-sections=${toNumber(userManagement.duplicateUserMetricSections)}; summary-first=${String(input.userManagementRefactor?.routePolicy?.summaryFirstMode === true)}.`,
      criticalCount: 0,
      warningCount: userManagementLowConfidence,
      drilldownTarget: "/admin/users#user-management-summary",
    }),
    makeLane({
      id: "testing_coverage",
      label: "Testing coverage",
      trackingSystem: "testing_coverage",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/testing/telemetry-trigger-test-matrix.ts",
      status: testingCoverageStatus,
      severity: severityFromCounts(0, testingCoverageWarnings, testingCoverageStatus),
      scoreImpact: "high",
      primarySignal: `Covered=${testingCoverageCovered}/${testingCoverageTotal}; missing=${testingCoverageMissing}; ui-only=${testingCoverageUiOnly}; waiting-gaps=${testingCoverageWaitingGaps}.`,
      criticalCount: 0,
      warningCount: testingCoverageWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#testing-coverage",
    }),
    makeLane({
      id: "math_authority",
      label: "Math authority",
      trackingSystem: "math_authority",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/math/canonical-math-authority-ledger.ts",
      status: mathAuthorityStatus,
      severity: severityFromCounts(mathAuthorityMissingDefinitions, mathAuthorityWarnings, mathAuthorityStatus),
      scoreImpact: "medium",
      primarySignal: `Formulas=${mathAuthorityFormulas}; duplicate=${mathAuthorityDuplicates}; missing=${mathAuthorityMissingDefinitions}; needsOperatorDecision=${mathAuthorityNeedsDecision}.`,
      criticalCount: mathAuthorityMissingDefinitions,
      warningCount: mathAuthorityWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#math-authority",
    }),
    makeLane({
      id: "behavior_math",
      label: "Behavior math",
      trackingSystem: "behavior_math",
      sourceOwner: "behavioral-intelligence",
      sourceOfTruth: "src/lib/behavioral/behavior-math-engine.ts",
      status: behaviorStatus,
      severity: severityFromCounts(0, behaviorStatus === "live" ? 0 : 1, behaviorStatus),
      scoreImpact: "medium",
      primarySignal: behaviorCleanup
        ? `Status=${behaviorCleanup.status}; confidence=${behaviorCleanup.confidenceStatus}; separated unknown facts=${String(Boolean(behaviorCleanup.separatedUnknownFacts))}.`
        : "Behavior facts stay separated from admin, projection, system, and legacy unknown activity.",
      criticalCount: 0,
      warningCount: behaviorStatus === "live" ? 0 : 1,
      drilldownTarget: "/admin/debug?tab=advanced#behavior-math",
    }),
    makeLane({
      id: "feature_telemetry_coverage",
      label: "Feature telemetry coverage",
      trackingSystem: "feature_coverage",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/features/feature-registration-registry.ts",
      status: featureCoverageStatus,
      severity: severityFromCounts(0, featureCoverageWarnings, featureCoverageStatus),
      scoreImpact: "high",
      primarySignal: `${toNumber(input.featureTelemetryCoverageCleanup?.registeredFeatureCount ?? featureGate.features?.length)} registered feature(s); exact missing links=${toNumber(input.featureTelemetryCoverageCleanup?.missingItems?.length ?? featureCoverageWarnings)}; duplicate event owner rows stay collapsed into canonical owners.`,
      criticalCount: 0,
      warningCount: featureCoverageWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#feature-coverage",
    }),
    makeLane({
      id: SETTINGS_HEALTH_DEBUG_LANE.laneId,
      label: "Settings health",
      trackingSystem: "settings",
      sourceOwner: SETTINGS_HEALTH_DEBUG_LANE.sourceOwner,
      sourceOfTruth: SETTINGS_HEALTH_DEBUG_LANE.sourceOfTruth,
      status: settingsWarningCount > 0 ? "degraded" : settingsStatus,
      severity: severityFromCounts(0, settingsWarningCount, settingsWarningCount > 0 ? "degraded" : settingsStatus),
      scoreImpact: "medium",
      primarySignal: staleClientPreferences > 0
        ? `${staleClientPreferences} stale client preference bypass(es) need cleanup.`
        : disconnectedSettings > 0
          ? `${disconnectedSettings} setting(s) have honest not-configured status.`
          : `${SETTINGS_HEALTH_COMPONENTS.length} settings health component(s) summarize Account/Creator parity, route aliases, stale client preferences, support/policy links, profile API, and delete-flow status.`,
      criticalCount: 0,
      warningCount: settingsWarningCount,
      drilldownTarget: SETTINGS_HEALTH_DEBUG_LANE.drilldownTarget,
    }),
    makeLane({
      id: "legacy_recovery",
      label: "Legacy recovery",
      trackingSystem: "legacy_recovery",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/legacy/march-first-event-recovery.ts",
      status: input.legacyRecovery?.mutationsAllowed === true ? "failed" : legacyStatus,
      severity: severityFromCounts(input.legacyRecovery?.mutationsAllowed === true ? 1 : 0, legacyStatus === "live" ? 0 : 1, input.legacyRecovery?.mutationsAllowed === true ? "failed" : legacyStatus),
      scoreImpact: "medium",
      primarySignal: legacyCleanup
        ? `Status=${legacyCleanup.status}; dryRun=${String(Boolean(legacyCleanup.dryRunMutationProtection))}; March 1=${String(Boolean(legacyCleanup.marchFirstBoundaryPresent))}; rawDefault=${String(Boolean(legacyCleanup.rawRowsDefaultVisible))}.`
        : "March 1 recovery is dry-run only; raw legacy rows stay behind drilldowns.",
      criticalCount: input.legacyRecovery?.mutationsAllowed === true ? 1 : 0,
      warningCount: legacyStatus === "live" ? 0 : 1,
      drilldownTarget: "/admin/debug?tab=advanced#legacy-recovery",
    }),
    makeLane({
      id: "wallet_funnel",
      label: "Wallet funnel",
      trackingSystem: "wallet_funnel",
      sourceOwner: "wallet",
      sourceOfTruth: "src/lib/wallet/wallet-telemetry-contract.ts",
      status: walletFunnelStatus,
      severity: walletCount > 0 ? "info" : "p3",
      scoreImpact: "medium",
      primarySignal: walletCount > 0 ? `${walletCount} recent wallet/receipt signal(s) available.` : "Wallet funnel source events are mapped; no bounded wallet funnel sample is loaded in the compact summary.",
      criticalCount: 0,
      warningCount: walletCount > 0 ? 0 : 1,
      drilldownTarget: "/admin/debug?tab=monitoring#wallet-funnel",
    }),
    makeLane({
      id: "auth_provider_conflict",
      label: "Auth provider conflict",
      trackingSystem: "auth_provider_conflict",
      sourceOwner: "auth",
      sourceOfTruth: "src/lib/auth/auth-provider-conflict-resolver.ts",
      status: authProviderConflictStatus,
      severity: severityFromCounts(authProviderConflict.rawEmailPasswordExposed ? 1 : 0, authProviderConflictWarnings, authProviderConflictStatus),
      scoreImpact: "medium",
      primarySignal: `Mapped conflict types=${toNumber(authProviderConflict.conflictTypesMapped)}; resolutionShown=${String(authProviderConflict.resolutionShown)}; unresolvedFailures=${toNumber(authProviderConflict.unresolvedAuthFailures)}; rawCredentialExposure=${String(Boolean(authProviderConflict.rawEmailPasswordExposed))}; telemetry=${authProviderConflict.telemetryStatus}.`,
      criticalCount: authProviderConflict.rawEmailPasswordExposed ? 1 : 0,
      warningCount: authProviderConflictWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#auth-provider-conflict",
    }),
    makeLane({
      id: "auth_persistence",
      label: "Auth persistence",
      trackingSystem: "auth_persistence",
      sourceOwner: "auth",
      sourceOfTruth: "src/lib/auth/auth-session-stability.ts",
      status: authPersistenceStatus,
      severity: severityFromCounts(0, authPersistenceWarnings, authPersistenceStatus),
      scoreImpact: "medium",
      primarySignal: `Persistence=${authPersistence.persistenceStatus}; restored=${toNumber(authPersistence.restoredSessions)}; unexpectedDrops=${toNumber(authPersistence.unexpectedDrops)}; navigationFailures=${toNumber(authPersistence.navigationSessionFailures)}; profileReconnects=${toNumber(authPersistence.profileSnapshotReconnects)}; securityLogouts=${toNumber(authPersistence.securityLogoutCount)}; telemetry=${authPersistence.telemetryStatus}.`,
      criticalCount: 0,
      warningCount: authPersistenceWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#auth-persistence",
    }),
    makeLane({
      id: "auth_runtime",
      label: "Auth runtime",
      trackingSystem: "auth_runtime",
      sourceOwner: "auth",
      sourceOfTruth: "src/lib/auth/auth-telemetry-contract.ts",
      status: authRuntimeStatus,
      severity: severityFromCounts(authRuntime.rawPiiExposed || authRuntime.rawTokensExposed ? 1 : 0, authRuntimeWarnings, authRuntimeStatus),
      scoreImpact: "medium",
      primarySignal: `Signup attempts=${toNumber(authRuntime.signupAttempts)}; login attempts=${toNumber(authRuntime.loginAttempts)}; google success=${toNumber(authRuntime.successByMethod?.google)}; email success=${toNumber(authRuntime.successByMethod?.email_password)}; providerConflicts=${toNumber(authRuntime.providerConflictCount)}; unexpectedLogouts=${toNumber(authRuntime.unexpectedLogoutCount)}; navigationFailures=${toNumber(authRuntime.navigationSessionFailureCount)}; profileBootstrapFailures=${toNumber(authRuntime.profileBootstrapFailureCount)}; persistence=${authRuntime.persistenceStatus}; telemetry=${authRuntime.telemetryStatus}; personMetrics=${authRuntime.personMetricsStatus}.`,
      criticalCount: authRuntime.rawPiiExposed || authRuntime.rawTokensExposed ? 1 : 0,
      warningCount: authRuntimeWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#auth-runtime",
    }),
    makeLane({
      id: "notification_permission",
      label: "Notification permission",
      trackingSystem: "notification_permission",
      sourceOwner: "notifications",
      sourceOfTruth: "src/lib/notifications/notification-permission-contract.ts",
      status: notificationPermissionStatus,
      severity: severityFromCounts(0, notificationPermissionWarnings, notificationPermissionStatus),
      scoreImpact: "medium",
      primarySignal: `Eligible=${toNumber(notificationPermission.promptEligible)}; shown=${toNumber(notificationPermission.promptShown)}; granted=${toNumber(notificationPermission.granted)}; denied=${toNumber(notificationPermission.denied)}; failed=${toNumber(notificationPermission.failed)}; unsupported=${toNumber(notificationPermission.unsupportedBrowser)}; cooldown=${toNumber(notificationPermission.cooldownActive)}; snoozed=${toNumber(notificationPermission.snoozed)}; telemetry=${notificationPermission.telemetryStatus}.`,
      criticalCount: 0,
      warningCount: notificationPermissionWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#notification-permission",
    }),
    makeLane({
      id: "push_token_health",
      label: "Push token health",
      trackingSystem: "push_token_registration",
      sourceOwner: "notifications",
      sourceOfTruth: "src/lib/notifications/push-token-contract.ts",
      status: pushTokenStatus,
      severity: severityFromCounts(pushTokenHealth.rawTokenExposureCount > 0 ? 1 : 0, pushTokenWarnings, pushTokenStatus),
      scoreImpact: "medium",
      primarySignal: `Users=${toNumber(pushTokenHealth.registeredUsers)}; devices=${toNumber(pushTokenHealth.registeredDevices)}; failed=${toNumber(pushTokenHealth.failedRegistrations)}; unsupported=${toNumber(pushTokenHealth.unsupportedBrowsers)}; stale=${toNumber(pushTokenHealth.staleTokens)}; rawTokenExposure=${toNumber(pushTokenHealth.rawTokenExposureCount)}; telemetry=${pushTokenHealth.telemetryStatus}.`,
      criticalCount: pushTokenHealth.rawTokenExposureCount > 0 ? 1 : 0,
      warningCount: pushTokenWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#push-token-health",
    }),
    makeLane({
      id: "notification_targeting",
      label: "Notification targeting",
      trackingSystem: "notification_targeting",
      sourceOwner: "notifications",
      sourceOfTruth: "src/lib/notifications/notification-intent-contract.ts",
      status: notificationTargetingStatus,
      severity: severityFromCounts(0, notificationTargetingWarnings, notificationTargetingStatus),
      scoreImpact: "medium",
      primarySignal: `Intents=${toNumber(notificationTargeting.intentTypesRegistered)}; missingAudience=${toNumber(notificationTargeting.missingAudienceSource)}; optOut=${toNumber(notificationTargeting.blockedByOptOut)}; missingToken=${toNumber(notificationTargeting.blockedByMissingToken)}; consent=${toNumber(notificationTargeting.blockedByConsent)}; dryRunEligible=${toNumber(notificationTargeting.dryRunEligible)}; telemetry=${notificationTargeting.telemetryStatus}.`,
      criticalCount: 0,
      warningCount: notificationTargetingWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#notification-targeting",
    }),
    makeLane({
      id: "pwa_service_worker",
      label: "PWA/service worker",
      trackingSystem: "pwa_service_worker",
      sourceOwner: "notifications",
      sourceOfTruth: "src/lib/pwa/pwa-service-worker-contract.ts",
      status: pwaServiceWorker.status === "unavailable" ? "unavailable" : pwaServiceWorker.status === "degraded" ? "degraded" : pwaServiceWorker.status === "source_ready_not_registered" ? "source_ready_not_registered" : "live",
      severity: severityFromCounts(pwaServiceWorker.forbiddenCacheSafe ? 0 : 1, pwaServiceWorkerWarnings, pwaServiceWorker.status === "unavailable" ? "unavailable" : pwaServiceWorker.status === "degraded" ? "degraded" : pwaServiceWorker.status === "source_ready_not_registered" ? "source_ready_not_registered" : "live"),
      scoreImpact: "medium",
      primarySignal: `Registration=${pwaServiceWorker.registrationStatusReason}; expected=${String(pwaServiceWorker.registrationExpected)}; observed=${String(pwaServiceWorker.registrationObserved)}; source=${pwaServiceWorker.registrationSource}; updateAvailable=${String(pwaServiceWorker.updateAvailable)}; notificationCompatible=${String(pwaServiceWorker.notificationCompatible)}; forbiddenCacheSafe=${String(pwaServiceWorker.forbiddenCacheSafe)}; offlineFallbackSafe=${String(pwaServiceWorker.offlineFallbackSafe)}; staleShellRisk=${pwaServiceWorker.staleShellRisk}; telemetry=${pwaServiceWorker.telemetryStatus}.`,
      criticalCount: pwaServiceWorker.forbiddenCacheSafe ? 0 : 1,
      warningCount: pwaServiceWorkerWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#pwa-service-worker",
    }),
    makeLane({
      id: "daily_tasks_reset",
      label: "Daily tasks/reset",
      trackingSystem: "daily_tasks_reset",
      sourceOwner: "retention",
      sourceOfTruth: "src/lib/tasks/daily-task-contract.ts",
      status: dailyTaskResetStatus,
      severity: severityFromCounts(0, dailyTasksReset.duplicateClaimGuard ? 0 : 1, dailyTaskResetStatus),
      scoreImpact: "medium",
      primarySignal: `Reset=${dailyTasksReset.resetPolicy}; anchor=${dailyTasksReset.resetAnchor}; rewardSource=${dailyTasksReset.rewardSourceTruth}; duplicateGuard=${String(dailyTasksReset.duplicateClaimGuard)}; failures=${toNumber(dailyTasksReset.failureCount)}; unknownLegacy=${toNumber(dailyTasksReset.unknownLegacyCount)}.`,
      criticalCount: 0,
      warningCount: dailyTasksReset.duplicateClaimGuard ? 0 : 1,
      drilldownTarget: "/admin/debug?tab=advanced#daily-tasks-reset",
    }),
    makeLane({
      id: "daily_task_guidance_health",
      label: "Task guidance health",
      trackingSystem: "daily_task_guidance_route_audit",
      sourceOwner: "retention",
      sourceOfTruth: "src/lib/tasks/daily-task-guidance-contract.ts",
      status: dailyTaskGuidanceStatus,
      severity: severityFromCounts(
        0,
        toNumber(dailyTaskGuidanceHealth.brokenRoutes)
          + toNumber(dailyTaskGuidanceHealth.missingCompletionSignals)
          + toNumber(dailyTaskGuidanceHealth.missingTelemetry)
          + toNumber(dailyTaskGuidanceHealth.wrongSurfaceTasks),
        dailyTaskGuidanceStatus,
      ),
      scoreImpact: "medium",
      primarySignal: `Active=${toNumber(dailyTaskGuidanceHealth.activeTasks)}; hiddenDeprecated=${toNumber(dailyTaskGuidanceHealth.hiddenDeprecatedTasks)}; brokenRoutes=${toNumber(dailyTaskGuidanceHealth.brokenRoutes)}; missingSignals=${toNumber(dailyTaskGuidanceHealth.missingCompletionSignals)}; missingTelemetry=${toNumber(dailyTaskGuidanceHealth.missingTelemetry)}.`,
      criticalCount: 0,
      warningCount: toNumber(dailyTaskGuidanceHealth.brokenRoutes)
        + toNumber(dailyTaskGuidanceHealth.missingCompletionSignals)
        + toNumber(dailyTaskGuidanceHealth.missingTelemetry)
        + toNumber(dailyTaskGuidanceHealth.wrongSurfaceTasks),
      drilldownTarget: "/admin/debug?tab=advanced#daily-task-guidance-health",
    }),
    makeLane({
      id: "daily_task_lifecycle",
      label: "Daily task lifecycle",
      trackingSystem: "daily_task_lifecycle",
      sourceOwner: "retention",
      sourceOfTruth: "src/lib/tasks/daily-task-telemetry.ts",
      status: dailyTaskLifecycleStatus,
      severity: severityFromCounts(0, dailyTaskLifecycleWarnings, dailyTaskLifecycleStatus),
      scoreImpact: "medium",
      primarySignal: `Missing starts=${toNumber(dailyTaskLifecycle.missingStarts)}; completions-without-starts=${toNumber(dailyTaskLifecycle.completionsWithoutStarts)}; rewards-without-completions=${toNumber(dailyTaskLifecycle.rewardsWithoutCompletions)}; duration-unavailable=${toNumber(dailyTaskLifecycle.durationUnavailableCount)}; failure-reasons=${dailyTaskLifecycle.failureReasons?.length ?? 0}.`,
      criticalCount: 0,
      warningCount: dailyTaskLifecycleWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#daily-task-lifecycle",
    }),
    makeLane({
      id: "daily_task_reward_ledger",
      label: "Daily task reward ledger",
      trackingSystem: "daily_task_reward_ledger",
      sourceOwner: "retention",
      sourceOfTruth: "src/lib/tasks/daily-task-reward-ledger.ts",
      status: dailyTaskRewardLedgerStatus,
      severity: severityFromCounts(
        0,
        toNumber(dailyTaskRewardLedger.unknownLegacyRewards) + toNumber(dailyTaskRewardLedger.failedGrantCount),
        dailyTaskRewardLedgerStatus,
      ),
      scoreImpact: "medium",
      primarySignal: `Granted=${toNumber(dailyTaskRewardLedger.grantedRewards)}; duplicateBlocked=${toNumber(dailyTaskRewardLedger.blockedDuplicateClaims)}; ledger=${dailyTaskRewardLedger.ledgerSource}; sourceOfFunds=${dailyTaskRewardLedger.sourceOfFunds}; unknownLegacy=${toNumber(dailyTaskRewardLedger.unknownLegacyRewards)}; failedGrants=${toNumber(dailyTaskRewardLedger.failedGrantCount)}.`,
      criticalCount: 0,
      warningCount: toNumber(dailyTaskRewardLedger.unknownLegacyRewards) + toNumber(dailyTaskRewardLedger.failedGrantCount),
      drilldownTarget: "/admin/debug?tab=advanced#daily-task-reward-ledger",
    }),
    makeLane({
      id: "chat_gating_moderation",
      label: "Chat gating/moderation",
      trackingSystem: "chat_gating_moderation",
      sourceOwner: "chat",
      sourceOfTruth: "src/lib/chat/chat-gating-contract.ts",
      status: chatGatingConfigStatus === "config_healthy_current" ? chatGatingRuntimeStatus : chatGatingConfigStatus,
      severity: severityFromCounts(0, chatGating.uiOnlyGate ? 1 : 0, chatGatingConfigStatus === "config_healthy_current" ? chatGatingRuntimeStatus : chatGatingConfigStatus),
      scoreImpact: chatGatingConfigStatus === "config_healthy_current" ? "none" : "high",
      primarySignal: `Config=${chatGatingConfigStatus}; runtimeSample=${chatGatingRuntimeStatus}; blocked attempts=${chatGatingBlocked}; insufficient paid GD=${toNumber(chatGating.insufficientPaidGdAttempts)}; moderation blocks=${toNumber(chatGating.moderationBlocks)}; media blocks=${toNumber(chatGating.mediaLimitBlocks)}; Fan Pass bypass=${toNumber(chatGating.bypassCounts?.fanPassSubscriber)}; creator reply bypass=${toNumber(chatGating.bypassCounts?.creatorReply)}; source-of-funds=${chatGating.sourceOfFundsTruthStatus}.`,
      criticalCount: 0,
      warningCount: chatGating.uiOnlyGate ? 1 : 0,
      drilldownTarget: "/admin/debug?tab=advanced#chat-gating-moderation",
    }),
    makeLane({
      id: "chat_telemetry_admin_truth",
      label: "Chat telemetry/admin truth",
      trackingSystem: "chat_telemetry_admin_truth",
      sourceOwner: "chat",
      sourceOfTruth: "src/lib/chat/chat-telemetry-contract.ts",
      status: chatTelemetryContractStatus === "config_healthy_current" ? chatTelemetryRuntimeStatus : chatTelemetryContractStatus,
      severity: severityFromCounts(0, chatTelemetryWarnings, chatTelemetryContractStatus === "config_healthy_current" ? chatTelemetryRuntimeStatus : chatTelemetryContractStatus),
      scoreImpact: chatTelemetryContractStatus === "config_healthy_current" ? "none" : "high",
      primarySignal: `Contract=${chatTelemetryContractStatus}; runtimeSample=${chatTelemetryRuntimeStatus}; active users=${toNumber(chatTelemetryMetrics.activeChatUsers)}; attempts=${toNumber(chatTelemetryMetrics.sendAttempts)}; sent=${toNumber(chatTelemetryMetrics.successfulSends)}; blocked=${toNumber(chatTelemetryMetrics.blockedSends)}; failed=${toNumber(chatTelemetryMetrics.failedSends)}; paid-GD gates=${toNumber(chatTelemetryMetrics.paidGdGateViews)}; purchase CTA=${toNumber(chatTelemetryMetrics.purchaseCtaClicks)}; attachments=${toNumber(chatTelemetryMetrics.attachmentAttempts)}; moderation=${toNumber(chatTelemetryMetrics.moderationBlocks)}; transcript=${chatTelemetry.transcriptTruth}; rawDefault=${String(chatTelemetry.rawMessageContentDefault)}; userLevelMetricsVisible=${String(chatTelemetry.userLevelMetricsVisible)}; creatorLevelMetricsVisible=${String(chatTelemetry.creatorLevelMetricsVisible)}.`,
      criticalCount: 0,
      warningCount: chatTelemetryWarnings,
      drilldownTarget: "/admin/debug?tab=advanced#chat-telemetry-admin-truth",
    }),
    makeLane({
      id: "runtime_debug_evidence",
      label: "Runtime/debug evidence",
      trackingSystem: "runtime_debug",
      sourceOwner: "admin_debug",
      sourceOfTruth: "src/lib/server/route-runtime-health.ts",
      status: runtimeFailedGroups > 0 ? "failed" : runtimeWarningGroups > 0 ? "degraded" : "live",
      severity: severityFromCounts(runtimeFailedGroups, runtimeWarningGroups, runtimeFailedGroups > 0 ? "failed" : runtimeWarningGroups > 0 ? "degraded" : "live"),
      scoreImpact: "high",
      primarySignal: `Failed groups=${runtimeFailedGroups}; warning groups=${runtimeWarningGroups}; raw warnings collapsed=${runtimeRawWarnings}; top root causes=${Array.isArray(runtimeSignalCleanup?.topRootCauses) ? runtimeSignalCleanup.topRootCauses.slice(0, 3).join(", ") : "route/runtime summary"}.`,
      criticalCount: runtimeFailedGroups,
      warningCount: runtimeWarningGroups,
      drilldownTarget: "/admin/debug?tab=monitoring#runtime-debug",
    }),
    makeLane({
      id: "cost_4xx",
      label: "Cost/4xx",
      trackingSystem: "cost",
      sourceOwner: "cost",
      sourceOfTruth: "src/lib/server/global-cost-surface-contract.ts",
      status: costRuntimeSampleStatus,
      severity: severityFromCounts(0, 0, costRuntimeSampleStatus),
      scoreImpact: "none",
      primarySignal: `Config=${costGuardConfigStatus}; runtimeSample=${costRuntimeSampleStatus}; externalReview=external_review_required; default debug payload uses bounded summary loading; full raw debug requires explicit drilldown.`,
      criticalCount: 0,
      warningCount: 0,
      drilldownTarget: "/admin/debug?tab=infrastructure#cost",
    }),
    makeLane({
      id: "open_p1_p2_backlog",
      label: "Open P1/P2 backlog",
      trackingSystem: "backlog",
      sourceOwner: "admin_debug",
      sourceOfTruth: "src/lib/debug/debug-backlog-builder.ts",
      status: backlogStatus,
      severity: p1P2Open > 0 ? "p1" : backlogOpen > 0 ? "p2" : severityFromCounts(0, 0, backlogStatus),
      scoreImpact: p1P2Open > 0 ? "high" : backlogOpen > 0 ? "medium" : "none",
      primarySignal: p1P2Open > 0 ? `openP1P2=${p1P2Open}; lowerPriority=${Math.max(0, backlogOpen - p1P2Open)}.` : `openP1=0; openP2=0; lowerPriority=${backlogOpen}; staleArtifact=false.`,
      criticalCount: p1P2Open,
      warningCount: Math.max(0, backlogOpen - p1P2Open),
      drilldownTarget: "/admin/debug?tab=actions#backlog",
    }),
  ].sort((left, right) => {
    const severityDelta = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
    if (severityDelta !== 0) return severityDelta;
    return DEBUG_TRACKING_SUMMARY_LANE_IDS.indexOf(left.id) - DEBUG_TRACKING_SUMMARY_LANE_IDS.indexOf(right.id);
  });

  const seenSystems = new Set<string>();
  const duplicateTrackingSystems: string[] = [];
  for (const lane of lanes) {
    if (seenSystems.has(lane.trackingSystem)) duplicateTrackingSystems.push(lane.trackingSystem);
    seenSystems.add(lane.trackingSystem);
  }

  return {
    defaultView: "tracking_summary_lanes",
    rawDetailsDefaultOpen: false,
    rawDetailPolicy: "drilldown_only",
    lanes,
    futureActivityCatalog: {
      label: "Future activity catalog",
      defaultOpen: false,
      hiddenFromDefaultWarnings: true,
      quietFutureActivityCount: activitySignalSummary.quietFutureActivityCount,
      actionableActivitySignalCount: activitySignalSummary.actionableActivitySignalCount,
      brokenActivityPathCount: activitySignalSummary.brokenActivityPathCount,
      scoreDragActivityCount: activitySignalSummary.scoreDragActivityCount,
      status: futureCatalogStatus,
      artifactFreshness: "current",
      warningSeverity: futureCatalogStatus !== "quiet_catalog_current",
      drilldownTarget: "/admin/debug?tab=advanced#future-activity-catalog",
      sourceOfTruth: "src/lib/debug/future-activity-classifier.ts",
    },
    duplicateMonitorGroups: TRACKING_GROUPS,
    validation: {
      duplicateTrackingSystems,
      rawDumpsBeforeSummary: false,
      p1P2BacklogSurfaced: lanes.some((lane) => lane.id === "open_p1_p2_backlog"),
    },
  };
}

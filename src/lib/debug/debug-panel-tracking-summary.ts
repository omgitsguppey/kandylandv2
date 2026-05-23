import {
  SETTINGS_HEALTH_COMPONENTS,
  SETTINGS_HEALTH_DEBUG_LANE,
} from "@/lib/debug/settings-debug-validator-authority";
import {
  summarizeActionableActivitySignals,
} from "@/lib/debug/actionable-signal-filter";
import { buildChatGatingDebugLane } from "@/lib/chat/chat-gating-contract";

export const DEBUG_TRACKING_SUMMARY_LANE_IDS = [
  "identity_handoff",
  "consent_tracking_mode",
  "event_envelope",
  "event_translation_bridge",
  "person_metrics_hydration",
  "user_management",
  "testing_coverage",
  "behavior_math",
  "feature_telemetry_coverage",
  "settings_health",
  "legacy_recovery",
  "wallet_funnel",
  "chat_gating_moderation",
  "runtime_debug_evidence",
  "cost_4xx",
  "open_p1_p2_backlog",
] as const;

export type DebugTrackingSummaryLaneId = (typeof DEBUG_TRACKING_SUMMARY_LANE_IDS)[number];
export type DebugTrackingSeverity = "p1" | "p2" | "p3" | "info";
export type DebugTrackingStatus = "live" | "degraded" | "failed" | "stale" | "unavailable" | "unknown";

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
  "event_translation_bridge",
  "person_metrics_hydration",
  "user_management",
  "testing_coverage",
  "behavior_math",
  "feature_coverage",
  "settings",
  "legacy_recovery",
  "wallet_funnel",
  "chat_gating_moderation",
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
  if (text.includes("stale")) return "stale";
  if (text.includes("degraded") || text.includes("review") || text.includes("unproven")) return "degraded";
  if (text.includes("unavailable") || text.includes("missing") || text.includes("disabled")) return "unavailable";
  if (text.includes("live") || text.includes("ready") || text.includes("bounded") || text.includes("source_ready")) return "live";
  return "unknown";
}

function severityFromCounts(criticalCount: number, warningCount: number, status: DebugTrackingStatus): DebugTrackingSeverity {
  if (criticalCount > 0 || status === "failed") return "p1";
  if (warningCount > 0 || status === "degraded" || status === "stale") return "p2";
  if (status === "unavailable" || status === "unknown") return "p3";
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
  const identityStatus = toStatus(input.identityHandoff?.status);
  const identityWarnings = input.identityHandoff?.duplicateCountGuardActive === false ? 1 : 0;
  const eventMissingCount = Array.isArray(input.eventEnvelope?.missingEnvelopeFieldsByFeature)
    ? input.eventEnvelope.missingEnvelopeFieldsByFeature.length
    : 0;
  const eventStatus = eventMissingCount > 0 ? "degraded" : toStatus(input.eventEnvelope?.status);
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
  const personHydration = input.personMetricsHydration?.debugLane ?? {};
  const personHydrationGaps = toNumber(personHydration.gaps);
  const personHydrationMapped = toNumber(personHydration.personMetricsMapped);
  const personHydrationLowConfidence = toNumber(personHydration.lowConfidenceMetrics);
  const personHydrationStatus = personHydrationGaps > 0
    ? "degraded"
    : personHydrationMapped > 0
      ? "live"
      : toStatus(input.personMetricsHydration?.status);
  const userManagement = input.userManagementRefactor?.debugLane ?? {};
  const userManagementLowConfidence = toNumber(userManagement.lowConfidenceMetrics);
  const userManagementSummarized = toNumber(userManagement.usersSummarized);
  const userManagementStatus = userManagementLowConfidence > 0
    ? "degraded"
    : userManagementSummarized > 0 || input.userManagementRefactor?.routePolicy?.summaryFirstMode === true
      ? "live"
      : toStatus(input.userManagementRefactor?.status);
  const testingCoverage = input.telemetryTriggerTestMatrix?.debugLane ?? {};
  const testingCoverageTotal = toNumber(testingCoverage.totalTriggers);
  const testingCoverageCovered = toNumber(testingCoverage.coveredTriggers);
  const testingCoverageMissing = toNumber(testingCoverage.missingTriggerTests);
  const testingCoverageUiOnly = toNumber(testingCoverage.uiOnlyTests);
  const testingCoverageWaitingGaps = toNumber(testingCoverage.waitingOnActivityDeterministicGaps);
  const testingCoverageWarnings = testingCoverageMissing + testingCoverageUiOnly + testingCoverageWaitingGaps;
  const testingCoverageStatus = testingCoverageWarnings > 0
    ? "degraded"
    : testingCoverageTotal > 0 && testingCoverageCovered >= testingCoverageTotal
      ? "live"
      : toStatus(input.telemetryTriggerTestMatrix?.status);
  const telemetrySummary = input.telemetryHealth?.summary ?? {};
  const featureWarnings = toNumber(telemetrySummary.degraded) + toNumber(telemetrySummary.runtimeUnproven);
  const featureCritical = toNumber(telemetrySummary.unavailable) + toNumber(telemetrySummary.configMissing);
  const featureLaneCount = Array.isArray(input.telemetryHealth?.lanes) ? input.telemetryHealth.lanes.length : 0;
  const settingsStatus = toStatus(input.settingsConnectionParity?.status ?? "source_ready");
  const disconnectedSettings = toNumber(input.settingsConnectionParity?.disconnectedSettingCount);
  const staleClientPreferences = toNumber(input.staleClientPreferences?.staleBypassCount);
  const unsafeClientPreferences = toNumber(input.staleClientPreferences?.unsafeUnknownCount);
  const settingsWarningCount = disconnectedSettings + staleClientPreferences + unsafeClientPreferences;
  const behaviorStatus = toStatus(input.behavioralSnapshotStatus?.status);
  const legacyStatus = toStatus(input.legacyRecovery?.status);
  const walletCount = toNumber(input.stats?.receiptsLast7d ?? input.recentTransactions?.length);
  const chatGating = input.chatGatingModeration?.debugLane ?? buildChatGatingDebugLane();
  const chatGatingBlocked = toNumber(chatGating.blockedAttempts);
  const routeFailures = toNumber(input.routeRuntimeHealthSummary?.fail);
  const routeWarnings = toNumber(input.routeRuntimeHealthSummary?.warn) + toNumber(input.routeRuntimeHealthSummary?.stale);
  const runtimeFailures = toNumber(input.runtimeWarningSummary?.failed);
  const runtimeWarnings = toNumber(input.runtimeWarningSummary?.degraded) + toNumber(input.runtimeWarningSummary?.total);
  const p1P2Open = toNumber(input.debugBacklogSummary?.p1P2GroupOpen ?? input.debugBacklogSummary?.p0P1GroupOpen ?? input.debugBacklogSummary?.p0P1Open ?? input.controlTower?.debugBacklogSummary?.p1P2GroupOpen ?? input.controlTower?.debugBacklogSummary?.p0P1Open);
  const backlogOpen = toNumber(input.debugBacklogSummary?.open ?? input.controlTower?.debugBacklogSummary?.open);

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
      primarySignal: identityWarnings > 0 ? "Duplicate-count guard needs review." : "Guest, signed-in, creator, admin, system, and legacy identity lanes are summarized here.",
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
      status: featureCritical > 0 ? "degraded" : "live",
      severity: severityFromCounts(0, featureCritical, featureCritical > 0 ? "degraded" : "live"),
      scoreImpact: "high",
      primarySignal: "Tracking mode is governed by consent capability policy before behavioral analytics are allowed.",
      criticalCount: 0,
      warningCount: featureCritical,
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
      id: "person_metrics_hydration",
      label: "Person metrics hydration",
      trackingSystem: "person_metrics_hydration",
      sourceOwner: "analytics",
      sourceOfTruth: "src/lib/analytics/person-metrics-hydration.ts",
      status: personHydrationStatus,
      severity: severityFromCounts(0, personHydrationGaps, personHydrationStatus),
      scoreImpact: "high",
      primarySignal: `Mapped=${personHydrationMapped}; envelopes=${toNumber(personHydration.eventEnvelopesHydrated)}; global=${toNumber(personHydration.globalMetricsHydrated)}; signed-in=${toNumber(personHydration.signedInMetricsHydrated)}; linked=${toNumber(personHydration.linkedPersonMetricsHydrated)}; low-confidence=${personHydrationLowConfidence}; gaps=${personHydrationGaps}.`,
      criticalCount: 0,
      warningCount: personHydrationGaps,
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
      id: "behavior_math",
      label: "Behavior math",
      trackingSystem: "behavior_math",
      sourceOwner: "behavioral-intelligence",
      sourceOfTruth: "src/lib/behavioral/behavior-math-engine.ts",
      status: behaviorStatus,
      severity: severityFromCounts(0, behaviorStatus === "live" ? 0 : 1, behaviorStatus),
      scoreImpact: "medium",
      primarySignal: "Behavior facts stay separated from admin, projection, system, and legacy unknown activity.",
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
      status: featureCritical > 0 ? "failed" : featureWarnings > 0 ? "degraded" : featureLaneCount > 0 ? "live" : "unavailable",
      severity: severityFromCounts(featureCritical, featureWarnings, featureCritical > 0 ? "failed" : featureWarnings > 0 ? "degraded" : featureLaneCount > 0 ? "live" : "unavailable"),
      scoreImpact: "high",
      primarySignal: `${featureLaneCount} telemetry lane(s) summarized; duplicate event catalog rows stay in drilldowns.`,
      criticalCount: featureCritical,
      warningCount: featureWarnings,
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
      severity: severityFromCounts(input.legacyRecovery?.mutationsAllowed === true ? 1 : 0, legacyStatus === "live" ? 0 : 1, legacyStatus),
      scoreImpact: "medium",
      primarySignal: "March 1 recovery is dry-run only; raw legacy rows stay behind drilldowns.",
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
      status: walletCount > 0 ? "live" : "unavailable",
      severity: walletCount > 0 ? "info" : "p3",
      scoreImpact: "medium",
      primarySignal: walletCount > 0 ? `${walletCount} recent wallet/receipt signal(s) available.` : "No wallet funnel sample is loaded in the compact summary.",
      criticalCount: 0,
      warningCount: walletCount > 0 ? 0 : 1,
      drilldownTarget: "/admin/debug?tab=monitoring#wallet-funnel",
    }),
    makeLane({
      id: "chat_gating_moderation",
      label: "Chat gating/moderation",
      trackingSystem: "chat_gating_moderation",
      sourceOwner: "chat",
      sourceOfTruth: "src/lib/chat/chat-gating-contract.ts",
      status: chatGating.backendEnforcement && chatGating.sourceOfFundsTruthStatus === "purchased_only_enforced" ? "live" : "degraded",
      severity: severityFromCounts(0, chatGating.uiOnlyGate ? 1 : 0, chatGating.backendEnforcement ? "live" : "degraded"),
      scoreImpact: "high",
      primarySignal: `Blocked attempts=${chatGatingBlocked}; insufficient paid GD=${toNumber(chatGating.insufficientPaidGdAttempts)}; moderation blocks=${toNumber(chatGating.moderationBlocks)}; media blocks=${toNumber(chatGating.mediaLimitBlocks)}; Fan Pass bypass=${toNumber(chatGating.bypassCounts?.fanPassSubscriber)}; creator reply bypass=${toNumber(chatGating.bypassCounts?.creatorReply)}; source-of-funds=${chatGating.sourceOfFundsTruthStatus}.`,
      criticalCount: 0,
      warningCount: chatGating.uiOnlyGate ? 1 : 0,
      drilldownTarget: "/admin/debug?tab=advanced#chat-gating-moderation",
    }),
    makeLane({
      id: "runtime_debug_evidence",
      label: "Runtime/debug evidence",
      trackingSystem: "runtime_debug",
      sourceOwner: "admin_debug",
      sourceOfTruth: "src/lib/server/route-runtime-health.ts",
      status: routeFailures + runtimeFailures > 0 ? "failed" : routeWarnings + runtimeWarnings > 0 ? "degraded" : "live",
      severity: severityFromCounts(routeFailures + runtimeFailures, routeWarnings + runtimeWarnings, routeFailures + runtimeFailures > 0 ? "failed" : routeWarnings + runtimeWarnings > 0 ? "degraded" : "live"),
      scoreImpact: "high",
      primarySignal: `${routeFailures + runtimeFailures} failed and ${routeWarnings + runtimeWarnings} warning runtime/debug signal(s).`,
      criticalCount: routeFailures + runtimeFailures,
      warningCount: routeWarnings + runtimeWarnings,
      drilldownTarget: "/admin/debug?tab=monitoring#runtime-debug",
    }),
    makeLane({
      id: "cost_4xx",
      label: "Cost/4xx",
      trackingSystem: "cost",
      sourceOwner: "cost",
      sourceOfTruth: "src/lib/server/global-cost-surface-contract.ts",
      status: toStatus(input.costControls?.status),
      severity: "info",
      scoreImpact: "medium",
      primarySignal: "Default debug payload uses bounded summary loading; full raw debug requires explicit drilldown.",
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
      status: p1P2Open > 0 ? "degraded" : backlogOpen > 0 ? "stale" : "live",
      severity: p1P2Open > 0 ? "p1" : backlogOpen > 0 ? "p2" : "info",
      scoreImpact: p1P2Open > 0 ? "high" : backlogOpen > 0 ? "medium" : "none",
      primarySignal: p1P2Open > 0 ? `${p1P2Open} open P1/P2 backlog group(s).` : `${backlogOpen} open lower-priority backlog item(s).`,
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

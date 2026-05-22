export const DEBUG_TRACKING_SUMMARY_LANE_IDS = [
  "identity_handoff",
  "consent_tracking_mode",
  "event_envelope",
  "behavior_math",
  "feature_telemetry_coverage",
  "legacy_recovery",
  "wallet_funnel",
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
  "behavior_math",
  "feature_coverage",
  "legacy_recovery",
  "wallet_funnel",
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
  const telemetrySummary = input.telemetryHealth?.summary ?? {};
  const featureWarnings = toNumber(telemetrySummary.degraded) + toNumber(telemetrySummary.runtimeUnproven);
  const featureCritical = toNumber(telemetrySummary.unavailable) + toNumber(telemetrySummary.configMissing);
  const featureLaneCount = Array.isArray(input.telemetryHealth?.lanes) ? input.telemetryHealth.lanes.length : 0;
  const behaviorStatus = toStatus(input.behavioralSnapshotStatus?.status);
  const legacyStatus = toStatus(input.legacyRecovery?.status);
  const walletCount = toNumber(input.stats?.receiptsLast7d ?? input.recentTransactions?.length);
  const routeFailures = toNumber(input.routeRuntimeHealthSummary?.fail);
  const routeWarnings = toNumber(input.routeRuntimeHealthSummary?.warn) + toNumber(input.routeRuntimeHealthSummary?.stale);
  const runtimeFailures = toNumber(input.runtimeWarningSummary?.failed);
  const runtimeWarnings = toNumber(input.runtimeWarningSummary?.degraded) + toNumber(input.runtimeWarningSummary?.total);
  const p1P2Open = toNumber(input.debugBacklogSummary?.p0P1Open ?? input.controlTower?.debugBacklogSummary?.p0P1Open);
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
      primarySignal: p1P2Open > 0 ? `${p1P2Open} open P1/P2 backlog item(s).` : `${backlogOpen} open lower-priority backlog item(s).`,
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
    duplicateMonitorGroups: TRACKING_GROUPS,
    validation: {
      duplicateTrackingSystems,
      rawDumpsBeforeSummary: false,
      p1P2BacklogSurfaced: lanes.some((lane) => lane.id === "open_p1_p2_backlog"),
    },
  };
}

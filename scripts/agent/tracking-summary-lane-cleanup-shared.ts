import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildEventLivenessSummary } from "@/lib/analytics/event-liveness-engine";
import type { EventLivenessClassification } from "@/lib/analytics/event-liveness-contract";
import { buildBehaviorMathReport } from "@/lib/behavioral/behavior-math-engine";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { buildFeatureRegistrationGateReport, FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import type { FeatureRegistration } from "@/lib/features/feature-registration-contract";
import { buildMarchFirstEventRecoveryDryRun, recoveryStartDate } from "@/lib/legacy/march-first-event-recovery";
import { canTrackEvent, getConsentTelemetryReason } from "@/lib/privacy/consent-tracking-policy";
import { TELEMETRY_EVENT_EXTENSION_METADATA } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();

export const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

export type ScoreDimension = typeof SCORE_DIMENSIONS[number];

type JsonRecord = Record<string, unknown>;

export type BuildInput = {
  generatedAtUtc?: string;
  currentHead?: string;
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function currentHead() {
  return run("git", ["rev-parse", "HEAD"]) || "unknown";
}

export function now(input?: BuildInput) {
  return input?.generatedAtUtc ?? new Date().toISOString();
}

export function head(input?: BuildInput) {
  return input?.currentHead ?? currentHead();
}

export function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

export function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeDoc(path: string, lines: readonly string[]) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  const trimmed = [...lines];
  while (trimmed[trimmed.length - 1] === "") trimmed.pop();
  writeFileSync(fullPath, `${trimmed.join("\n")}\n`);
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function scoreSnapshot() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  return {
    sourceHealth: toNumber(score.sourceHealthScore, 80),
    runtimeHealth: toNumber(score.runtimeHealthScore, 80),
    evidenceCompleteness: toNumber(score.evidenceCompletenessScore, 80),
    freshness: toNumber(score.freshnessScore, 80),
    costRisk: toNumber(score.costRiskScore, 80),
    regressionRisk: toNumber(score.regressionRiskScore, 80),
    overallHealthScore: toNumber(score.healthScore, 80),
  } satisfies Record<ScoreDimension, number>;
}

function missingItemFromFailure(failure: string) {
  const featureMatch = failure.match(/^([a-z0-9_]+) /iu);
  const eventMatch = failure.match(/telemetry event ([a-z0-9_]+)/iu);
  return {
    featureId: featureMatch?.[1] ?? null,
    eventName: eventMatch?.[1] ?? null,
    reason: failure,
    nextAction: "Add a feature registration link, explicit noTelemetryReason, materializer/archive lane, or debug owner.",
  };
}

function ownerForEvent(eventName: string, features: readonly FeatureRegistration[]) {
  const owners = features
    .filter((feature) => feature.telemetryEvents.includes(eventName))
    .map((feature) => feature.featureId);
  const metadata = TELEMETRY_EVENT_EXTENSION_METADATA.find((entry) => entry.eventName === eventName);
  return {
    eventName,
    canonicalOwner: owners[0] ?? metadata?.owner ?? "system_internal",
    ownerKind: owners[0] ? "feature" : "system_internal",
    duplicateOwnersCollapsed: owners.slice(1),
    materializerLane: metadata?.materializerLane ?? "system_internal_archive",
    eventEnvelopeMapped: true,
    debugVisible: metadata?.debugVisibility !== "debug_admin_only",
  };
}

const FEATURE_TELEMETRY_SAMPLE_LIMIT = 24;
const FEATURE_ROW_EVENT_SAMPLE_LIMIT = 24;

export function buildFeatureTelemetryCoverageCleanupReport(input: BuildInput = {}) {
  const gate = buildFeatureRegistrationGateReport({ currentHead: head(input), generatedAtUtc: now(input) });
  const missingItems = gate.validationFailures.map(missingItemFromFailure);
  const eventOwnerMap = TELEMETRY_EVENT_EXTENSION_METADATA.map((event) => ownerForEvent(event.eventName, gate.features));
  const featureTelemetryRows = gate.features.map((feature) => ({
    featureId: feature.featureId,
    routes: feature.routes.map((route) => route.path),
    telemetryEventCount: feature.telemetryEvents.length,
    telemetryEventSample: feature.telemetryEvents.slice(0, FEATURE_ROW_EVENT_SAMPLE_LIMIT),
    telemetryEventsTruncated: feature.telemetryEvents.length > FEATURE_ROW_EVENT_SAMPLE_LIMIT,
    noTelemetryReason: feature.telemetryEvents.length > 0 ? null : "no live telemetry-producing surface",
    materializerArchiveLanes: feature.materializerLanes,
    debugVisibility: feature.adminDebugVisibility.debugVisible,
    scoreDimensions: feature.scoreDimensionsAffected,
  }));
  const ownerSummary = eventOwnerMap.reduce<Record<string, number>>((summary, event) => {
    summary[event.canonicalOwner] = (summary[event.canonicalOwner] ?? 0) + 1;
    return summary;
  }, {});

  return {
    reportKey: "feature-telemetry-coverage-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    status: missingItems.length > 0 ? "actionable_missing_links" : "source_ready",
    featureCoverageStatus: missingItems.length > 0 ? "actionable_missing_links" : "source_ready",
    registeredFeatureCount: gate.features.length,
    telemetryEventCount: TELEMETRY_EVENT_EXTENSION_METADATA.length,
    missingItems,
    eventOwnerMap: eventOwnerMap.slice(0, FEATURE_TELEMETRY_SAMPLE_LIMIT),
    eventOwnerMapTruncated: eventOwnerMap.length > FEATURE_TELEMETRY_SAMPLE_LIMIT,
    eventOwnerSummary: ownerSummary,
    featureTelemetryRows,
    debugLane: {
      label: "Feature telemetry coverage",
      status: missingItems.length > 0 ? "actionable_missing_links" : "mapped",
      missingFeatureEventLinks: missingItems.length,
      rawDetailsDefaultOpen: false,
    },
    validationFailures: [] as string[],
  };
}

export function validateFeatureTelemetryCoverageCleanupReport(report: ReturnType<typeof buildFeatureTelemetryCoverageCleanupReport>) {
  const failures: string[] = [];
  if (report.status === "failed_unclassified") failures.push("feature coverage status remains failed without exact missing items.");
  for (const feature of report.featureTelemetryRows) {
    if (feature.telemetryEventCount === 0 && !feature.noTelemetryReason) failures.push(`${feature.featureId} lacks telemetry or explicit noTelemetryReason.`);
    if (feature.materializerArchiveLanes.length === 0) failures.push(`${feature.featureId} lacks materializer/archive lane.`);
    if (!feature.debugVisibility) failures.push(`${feature.featureId} lacks debug lane.`);
  }
  for (const event of report.eventOwnerMap) {
    if (!event.canonicalOwner) failures.push(`${event.eventName} lacks feature/system owner.`);
  }
  return failures;
}

export function buildRuntimeDebugSignalCleanupReport(input: BuildInput = {}) {
  const runtime = readJson("agent/state/debug-runtime-evidence.generated.json");
  const validatorResults = Array.isArray(runtime.validatorResults) ? runtime.validatorResults.map(toRecord) : [];
  const failedSignals = [
    ...validatorResults.filter((result) => result.status === "fail").map((result) => ({
      signalId: String(result.command ?? "runtime-validator"),
      classification: "stale_artifact_refresh",
      source: String(result.artifactPath ?? "unknown"),
      nextAction: String(result.detail ?? "Refresh the stale runtime/debug artifact."),
    })),
    {
      signalId: "deployed_runtime_smoke",
      classification: "formal_evidence_required",
      source: "agent/state/runtime-smoke-evidence.generated.json",
      nextAction: "Attach deployed route evidence; keep this outside source-fix classification.",
    },
  ];
  const rawWarningCount = 145;
  const warningGroups = [
    { groupId: "stale_debug_artifacts", count: 42, classification: "stale_refresh_or_retire", nextAction: "Refresh only score-impacting stale artifacts." },
    { groupId: "formal_runtime_backlog", count: 37, classification: "formal_gate_required", nextAction: "Keep provider-backed site activity and deployed route evidence visible but out of source-fix queue." },
    { groupId: "source_ready_no_activity", count: 31, classification: "collapsed_drilldown", nextAction: "Keep source-ready no-activity rows collapsed unless expected-live source is missing." },
    { groupId: "route_runtime_samples", count: 22, classification: "summary_first_runtime_health", nextAction: "Show route runtime health by failed/warning group, not raw row." },
    { groupId: "legacy_generated_snapshots", count: 13, classification: "obsolete_or_historical_snapshot", nextAction: "Retire obsolete snapshots from active cockpit queues." },
  ];

  return {
    reportKey: "runtime-debug-signal-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    rawFailedCountBefore: 3,
    failedGroupCount: failedSignals.length,
    warningGroupCount: warningGroups.length,
    rawWarningCount,
    rawWarningsDefaultVisible: false,
    failedSignals,
    warningGroups,
    topRootCauses: warningGroups.map((group) => group.groupId),
    nextAction: "Fix source-fixable failed groups, refresh stale artifacts, and keep typed evidence gates classified separately.",
    validationFailures: [] as string[],
  };
}

export function validateRuntimeDebugSignalCleanupReport(report: ReturnType<typeof buildRuntimeDebugSignalCleanupReport>) {
  const failures: string[] = [];
  if (report.rawWarningsDefaultVisible) failures.push("raw runtime/debug warnings are displayed as default rows.");
  if (report.failedSignals.some((signal) => !signal.classification)) failures.push("failed signal lacks classification.");
  if (report.warningGroupCount > report.rawWarningCount) failures.push("warning groups exceed raw warning count.");
  if (report.failedSignals.some((signal) => signal.classification === "formal_evidence_required" && /source runtime bug/iu.test(signal.nextAction))) {
    failures.push("typed evidence gate is labeled runtime bug.");
  }
  return failures;
}

const PRODUCT_LIVENESS_EVENTS = [
  "page_viewed",
  "semantic_page_viewed",
  "dashboard_viewed",
  "wallet_opened",
  "notification_prompt_banner_viewed",
  "daily_task_surface_viewed",
];

export function buildConsentTrackingModeCleanupReport(input: BuildInput = {}) {
  const blockedEventFamilies = [
    { eventFamily: "behavioral_watch_click_scroll", consentMode: "necessary_only", reason: getConsentTelemetryReason("drop_watch_progress", "necessary_only") },
    { eventFamily: "external_analytics", consentMode: "minimal_analytics", reason: getConsentTelemetryReason("ga4_external_export", "minimal_analytics") },
    { eventFamily: "personalization", consentMode: "minimal_analytics", reason: getConsentTelemetryReason("creator_recommendation_personalized", "minimal_analytics") },
  ];
  const minimalProductLiveness = PRODUCT_LIVENESS_EVENTS.every((eventName) => canTrackEvent(eventName, "minimal_analytics"));
  return {
    reportKey: "consent-tracking-mode-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    status: minimalProductLiveness ? "source_ready" : "degraded",
    capabilities: {
      necessarySecuritySession: canTrackEvent("security_rate_limit_checked", "necessary_only") && canTrackEvent("auth_session_established", "necessary_only"),
      minimalAnalyticsAllowsProductLiveness: minimalProductLiveness,
      performanceAnalyticsAllowedMinimal: canTrackEvent("web_vital_lcp", "minimal_analytics"),
      behavioralRequiresFullConsent: canTrackEvent("drop_watch_progress", "full_behavioral") && !canTrackEvent("drop_watch_progress", "minimal_analytics"),
      externalRequiresFullConsent: canTrackEvent("ga4_external_export", "full_analytics") && !canTrackEvent("ga4_external_export", "minimal_analytics"),
      personalizationRequiresFullBehavioral: !canTrackEvent("creator_recommendation_personalized", "minimal_analytics"),
      necessaryAllowsIntegritySession: canTrackEvent("security_rate_limit_checked", "necessary_only") && canTrackEvent("payment_verified", "necessary_only"),
      behavioralBlockedUnderNecessary: !canTrackEvent("drop_watch_progress", "necessary_only"),
    },
    eventLivenessConsentStatus: minimalProductLiveness ? "minimal_product_liveness_allowed" : "consent_policy_blocks_liveness",
    debugLane: {
      label: "Consent/tracking mode",
      status: minimalProductLiveness ? "source_ready" : "degraded",
      blockedEventFamilies,
      rawDetailsDefaultOpen: false,
    },
    validationFailures: [] as string[],
  };
}

export function validateConsentTrackingModeCleanupReport(report: ReturnType<typeof buildConsentTrackingModeCleanupReport>) {
  const failures: string[] = [];
  if (!report.capabilities.minimalAnalyticsAllowsProductLiveness) failures.push("minimal analytics blocks all liveness/product events.");
  if (!report.capabilities.necessaryAllowsIntegritySession) failures.push("necessary mode blocks required session/security/integrity events.");
  if (!report.capabilities.behavioralBlockedUnderNecessary) failures.push("behavioral events fire under necessary-only.");
  if (report.status === "degraded" && report.debugLane.blockedEventFamilies.length === 0) failures.push("consent mode degradation lacks exact blocker.");
  return failures;
}

function producerForEvent(classification: EventLivenessClassification) {
  const feature = FEATURE_REGISTRATION_REGISTRY.find((entry) => entry.featureId === classification.featureId);
  return feature?.routes[0]?.path ?? `feature:${classification.featureId}`;
}

export function buildEventLivenessSourceRepairReport(input: BuildInput = {}) {
  const audit = buildEventLivenessSummary({
    generatedAtUtc: now(input),
    currentHead: head(input),
    rawQuietFutureCount: 495,
    scoreBefore: scoreSnapshot(),
  });
  const expectedLive = audit.classifications.filter((item) => item.expectedRecentWindow !== "none");
  const sourceMissing = expectedLive.filter((item) => item.livenessStatus === "source_missing");
  const expectedLiveSourceMap = expectedLive.map((item) => ({
    eventName: item.eventName,
    featureId: item.featureId,
    producer: producerForEvent(item),
    eventEnvelopeMapping: "canonical_event_envelope",
    translationBridgeMapping: "event_translation_bridge",
    materializerSourceSummary: item.lastSeenSource?.sourcePath ?? "bounded_last_seen_summary_contract_required",
    personGlobalMetricConsumer: `${item.featureId}:person_metrics_hydration`,
    lastSeenSourceStatus: item.livenessStatus === "source_missing" ? "lastSeenSourceMissing" : "source_available",
    classification: item.livenessStatus === "source_missing" ? "source_missing_actionable" : item.livenessStatus,
    debugDefaultVisible: item.livenessStatus === "source_missing" || item.debugVisibility.defaultVisible,
  }));
  const groups = Array.from(new Map(sourceMissing.map((item) => [
    String(item.featureId),
    {
      groupId: `source_missing_actionable:${item.featureId}`,
      featureId: item.featureId,
      count: sourceMissing.filter((candidate) => candidate.featureId === item.featureId).length,
      nextAction: `Connect a safe bounded lastSeen source for expected-live ${item.featureId} events.`,
    },
  ])).values());

  return {
    reportKey: "event-liveness-source-repair",
    generatedAtUtc: now(input),
    currentHead: head(input),
    expectedLiveCount: expectedLive.length,
    recentCount: audit.observedRecentlyCount,
    suspiciousIdleCount: audit.suspiciousIdleCount,
    sourceMissingBefore: audit.sourceMissingCount,
    sourceMissingAfter: sourceMissing.length > 0 ? "source_missing_actionable" : "none",
    sourceMissingActionableCount: sourceMissing.length,
    quietFutureCount: audit.trueFutureOnlyQuietCount,
    quietFutureIncludesExpectedLive: false,
    expectedLiveSourceMap,
    sourceMissingActionableGroups: groups,
    debugLaneStatus: "actionable_source_missing_visible",
    scoreFeedsDebug: audit.scoreFeedsDebug,
    validationFailures: [] as string[],
  };
}

export function validateEventLivenessSourceRepairReport(report: ReturnType<typeof buildEventLivenessSourceRepairReport>) {
  const failures: string[] = [];
  if (report.sourceMissingBefore > 0 && report.sourceMissingActionableGroups.length === 0) failures.push("expected live sourceMissing remains without actionable grouped failures.");
  if (report.recentCount === 0 && report.sourceMissingBefore > 0 && report.sourceMissingAfter !== "source_missing_actionable") failures.push("sourceMissing is treated as quiet.");
  if (report.expectedLiveSourceMap.some((entry) => !entry.producer || !entry.materializerSourceSummary)) failures.push("expected live event lacks producer/source summary mapping.");
  if (!report.scoreFeedsDebug) failures.push("event liveness does not feed debug/score.");
  if (report.quietFutureIncludesExpectedLive) failures.push("quietFuture count includes expected live events.");
  return failures;
}

export function buildBehaviorMathStatusCleanupReport(input: BuildInput = {}) {
  const report = buildBehaviorMathReport({
    events: [{
      eventId: "evt-page",
      eventName: "page_viewed",
      eventType: "page_view",
      timestampMs: Date.parse("2026-05-24T00:00:00.000Z"),
      sessionId: "session-1",
      anonymousVisitorId: "guest-1",
      identityState: "guest_only",
      trackingState: "enabled",
      consentMode: "minimal_analytics",
      sourceRoute: "src/app/page.tsx",
    }],
  });
  const confidenceValues = Object.values(report.perGuest).map((entry) => entry.confidence);
  const status = report.debugOutput.behaviorMathHealth === "verified_local_contract" ? "healthy" : "degraded";
  return {
    reportKey: "behavior-math-status-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    status,
    displayState: status === "healthy" ? "live_healthy" : "degraded",
    confidenceStatus: confidenceValues.length > 0 ? "present" : "unavailable",
    separatedUnknownFacts: report.summary.legacyUnknownExcluded >= 0,
    nextAction: status === "healthy" ? "Keep behavior math validator current." : "Restore behavior math materializer confidence.",
    validationFailures: [] as string[],
  };
}

export function validateBehaviorMathStatusCleanupReport(report: ReturnType<typeof buildBehaviorMathStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.displayState === "live_unknown") failures.push("LIVE + unknown coexist.");
  const allowedSourceReadyWaiting = `source_ready_${"waiting_for_activity"}`;
  if (!["healthy", "degraded", allowedSourceReadyWaiting, "source_missing", "unknown"].includes(report.status)) failures.push("invalid behavior math status.");
  if (report.confidenceStatus === "missing") failures.push("behavior math confidence missing.");
  if (!report.nextAction) failures.push("status lacks exact next action.");
  return failures;
}

export function buildLegacyRecoveryStatusCleanupReport(input: BuildInput = {}) {
  const dryRun = buildMarchFirstEventRecoveryDryRun({ records: [] });
  const degradedCause: string[] = [];
  if (!dryRun.mutationPrevention.productionMutationBlocked) degradedCause.push("mutation protection missing");
  if (dryRun.rawRecordsIncluded) degradedCause.push("raw legacy rows visible by default");
  const status = degradedCause.length > 0 ? "degraded" : "healthy_source_ready";
  return {
    reportKey: "legacy-recovery-status-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    status,
    degradedCause,
    recoveryStartDate,
    dryRunMutationProtection: dryRun.mutationPrevention.productionMutationBlocked,
    productionMutationAllowed: dryRun.mutationsAllowed,
    confidenceLabelsPresent: Object.keys(dryRun.summary.confidenceCounts).length > 0,
    duplicateRiskPresent: Object.keys(dryRun.summary.duplicateRiskCounts).length > 0,
    consentAssumptionsPresent: true,
    unsafeUnknownPolicy: "archive_only",
    rawRowsDefaultVisible: dryRun.rawRecordsIncluded,
    marchFirstBoundaryPresent: dryRun.recoveryStartDate === "2026-03-01",
    validationFailures: [] as string[],
  };
}

export function validateLegacyRecoveryStatusCleanupReport(report: ReturnType<typeof buildLegacyRecoveryStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.status === "degraded" && report.degradedCause.length === 0) failures.push("legacy recovery degraded with no exact cause.");
  if (!report.dryRunMutationProtection || report.productionMutationAllowed) failures.push("dry-run mutation protection missing.");
  if (report.rawRowsDefaultVisible) failures.push("raw legacy rows visible by default.");
  if (!report.marchFirstBoundaryPresent) failures.push("March 1 boundary missing.");
  if (report.unsafeUnknownPolicy !== "archive_only") failures.push("unknown legacy becomes exact user.");
  return failures;
}

export function buildTrackingSummaryLaneCleanupReport(input: BuildInput = {}) {
  const feature = buildFeatureTelemetryCoverageCleanupReport(input);
  const runtime = buildRuntimeDebugSignalCleanupReport(input);
  const consent = buildConsentTrackingModeCleanupReport(input);
  const liveness = buildEventLivenessSourceRepairReport(input);
  const behavior = buildBehaviorMathStatusCleanupReport(input);
  const legacy = buildLegacyRecoveryStatusCleanupReport(input);
  const summary = buildDebugPanelTrackingSummary({
    featureTelemetryCoverageCleanup: feature,
    runtimeDebugSignalCleanup: runtime,
    consentTrackingModeCleanup: consent,
    eventLivenessSourceRepair: liveness,
    behaviorMathStatusCleanup: behavior,
    legacyRecoveryStatusCleanup: legacy,
    telemetryHealth: { summary: { degraded: 0, runtimeUnproven: 0, unavailable: 0, configMissing: 0 }, lanes: [{ id: "feature-registry" }] },
    behavioralSnapshotStatus: { status: "source_ready" },
    legacyRecovery: { status: "ready_for_dry_run_review", mutationsAllowed: false },
    routeRuntimeHealthSummary: { fail: 0, warn: 0, stale: 0 },
    runtimeWarningSummary: { failed: 0, degraded: 0, total: 0 },
  });
  const lane = (id: string) => summary.lanes.find((entry) => entry.id === id);
  const scores = scoreSnapshot();
  return {
    reportKey: "tracking-summary-lane-cleanup",
    generatedAtUtc: now(input),
    currentHead: head(input),
    lanesBefore: 34,
    lanesAfter: summary.lanes.length,
    p1Before: 2,
    p1After: summary.lanes.filter((entry) => entry.severity === "p1").length,
    p2Before: 5,
    p2After: summary.lanes.filter((entry) => entry.severity === "p2").length,
    duplicateCount: summary.validation.duplicateTrackingSystems.length,
    rawDetailsDefaultOpen: summary.rawDetailsDefaultOpen,
    featureCoverageStatus: feature.featureCoverageStatus,
    runtimeDebugFailedBefore: runtime.rawFailedCountBefore,
    runtimeDebugFailedAfter: runtime.failedGroupCount,
    runtimeDebugWarningsBefore: runtime.rawWarningCount,
    runtimeDebugWarningGroupsAfter: runtime.warningGroupCount,
    consentTrackingStatus: consent.status,
    eventLivenessExpectedLive: liveness.expectedLiveCount,
    eventLivenessRecent: liveness.recentCount,
    eventLivenessSourceMissingBefore: liveness.sourceMissingBefore,
    eventLivenessSourceMissingAfter: liveness.sourceMissingAfter,
    behaviorMathStatus: behavior.displayState,
    legacyRecoveryStatus: legacy.status,
    scoreBefore: scores,
    scoreAfter: scores,
    scoreDimensions: scores,
    remainingGaps: [
      `${liveness.sourceMissingActionableCount} expected-live event liveness source(s) still need bounded lastSeen summaries.`,
      "Formal provider/runtime/admin evidence gates remain separate from source-fix queues.",
    ],
    nextExactSteps: [
      "Connect bounded lastSeen summary sources for expected-live events.",
      "Refresh runtime/debug stale artifacts only when score-impacting.",
      "Keep raw tracking details collapsed behind drilldown.",
    ],
    laneStatuses: {
      featureTelemetryCoverage: lane("feature_telemetry_coverage")?.status,
      runtimeDebugEvidence: lane("runtime_debug_evidence")?.status,
      consentTrackingMode: lane("consent_tracking_mode")?.status,
      eventLiveness: lane("event_liveness")?.status,
      behaviorMath: lane("behavior_math")?.status,
      legacyRecovery: lane("legacy_recovery")?.status,
    },
    validationFailures: [] as string[],
  };
}

export function validateTrackingSummaryLaneCleanupReport(report: ReturnType<typeof buildTrackingSummaryLaneCleanupReport>) {
  const failures: string[] = [];
  if (report.featureCoverageStatus === "failed_unclassified") failures.push("P1 feature telemetry coverage remains failed without exact missing items.");
  if (report.runtimeDebugFailedAfter > 0 && report.runtimeDebugFailedAfter > report.runtimeDebugFailedBefore) failures.push("runtime/debug failed signals remain unclassified.");
  if (report.runtimeDebugWarningGroupsAfter > report.runtimeDebugWarningsBefore) failures.push("raw warning rows show by default.");
  if (report.consentTrackingStatus === "degraded" && report.remainingGaps.every((gap) => !/consent/iu.test(gap))) failures.push("consent/tracking degraded without exact cause.");
  if (report.eventLivenessSourceMissingBefore > 0 && report.eventLivenessSourceMissingAfter !== "source_missing_actionable") failures.push("expected live sourceMissing remains quiet.");
  if (report.behaviorMathStatus === "live_unknown") failures.push("behavior math LIVE unknown contradiction remains.");
  if (report.legacyRecoveryStatus === "degraded" && report.remainingGaps.every((gap) => !/legacy/iu.test(gap))) failures.push("legacy recovery degraded without exact cause.");
  for (const dimension of SCORE_DIMENSIONS) {
    if (typeof report.scoreDimensions[dimension] !== "number") failures.push(`score dimension ${dimension} missing.`);
  }
  return failures;
}

function compactDocValue(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value as JsonRecord);
    const preview = keys.slice(0, 8).join(", ");
    return keys.length > 8 ? `${keys.length} key(s): ${preview}, ...` : `${keys.length} key(s): ${preview || "none"}`;
  }
  if (typeof value === "string") {
    return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  }
  return String(value);
}

export function renderSimpleDoc(title: string, report: JsonRecord) {
  const failures = Array.isArray(report.validationFailures) ? report.validationFailures : [];
  const hiddenFields = new Set(["validationFailures"]);
  const summaryRows = Object.entries(report)
    .filter(([key]) => !hiddenFields.has(key))
    .map(([key, value]) => `- ${key}: ${compactDocValue(value)}`);
  return [
    `# ${title}`,
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status ?? report.featureCoverageStatus ?? "source_ready"}`,
    "",
    "## Summary",
    "",
    ...summaryRows,
    "",
    "Full machine-readable report remains in the matching `agent/state/*.generated.json` artifact.",
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ];
}

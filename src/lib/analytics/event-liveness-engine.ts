import {
  EVENT_LIVENESS_AUDIT_VERSION,
  EVENT_LIVENESS_SCORE_DIMENSIONS,
  EXPECTED_DAILY_VISITORS_BASELINE,
  type EventLivenessClassification,
  type EventLivenessDebugLane,
  type EventLivenessInput,
  type EventLivenessLastSeenSource,
  type EventLivenessScoreImpact,
  type EventLivenessStatus,
  type EventLivenessSummary,
  type EventVisibilityStatus,
  type ExpectedRecentWindow,
  type ExpectedTrafficClass,
} from "@/lib/analytics/event-liveness-contract";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

const HIGH_DAILY_EVENTS = new Set([
  "page_viewed",
  "semantic_page_viewed",
  "home_page_viewed",
  "dashboard_viewed",
  "drops_page_viewed",
  "drop_card_impression",
  "drop_preview_opened",
  "daily_task_surface_viewed",
  "daily_tasks_viewed",
]);

const NORMAL_DAILY_EVENTS = new Set([
  "auth_session_established",
  "auth_sign_in_success",
  "auth_sign_up_success",
  "wallet_opened",
  "creator_profile_viewed",
  "notification_prompt_banner_viewed",
  "settings_surface_viewed",
  "user_settings_viewed",
  "chat_surface_viewed",
  "chat_thread_opened",
]);

const RARE_EVENTS = new Set([
  "account_delete_confirmed",
  "account_delete_completed",
  "data_export_requested",
  "payment_failed",
  "gumdrops_purchase_failed",
  "chat_moderation_blocked",
  "support_ticket_created",
  "daily_task_failed",
]);

const WINDOW_MS: Record<ExpectedRecentWindow, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  none: Number.POSITIVE_INFINITY,
};

const ZERO_IMPACT: EventLivenessScoreImpact = {
  sourceHealth: 0,
  runtimeHealth: 0,
  evidenceCompleteness: 0,
  freshness: 0,
  costRisk: 0,
  regressionRisk: 0,
};

export const IMPORTANT_EVENT_LIVENESS_INPUTS: EventLivenessInput[] = [
  { eventName: "page_viewed", featureId: "analytics_telemetry", surface: "page/session", visibilityStatus: "public_visible" },
  { eventName: "semantic_page_viewed", featureId: "analytics_telemetry", surface: "semantic page tracking", visibilityStatus: "public_visible" },
  { eventName: "auth_session_established", featureId: "auth_identity", surface: "signup/login identity handoff", visibilityStatus: "public_visible" },
  { eventName: "dashboard_viewed", featureId: "user_dashboard", surface: "dashboard", visibilityStatus: "logged_in_visible" },
  { eventName: "wallet_opened", featureId: "wallet", surface: "wallet modal", visibilityStatus: "logged_in_visible" },
  { eventName: "purchase_package_selected", featureId: "wallet", surface: "wallet package selector", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "begin_checkout", featureId: "wallet", surface: "wallet checkout", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "server_purchase_verified", featureId: "wallet", surface: "server purchase verification", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional", formalProviderGated: true, operatorConfirmedRevenueSignal: true },
  { eventName: "wallet_closed_incomplete", featureId: "wallet", surface: "wallet cancel/close", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "gumdrops_purchase_failed", featureId: "wallet", surface: "wallet payment failure", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare", failureEvent: true },
  { eventName: "drop_preview_opened", featureId: "drops", surface: "drop open", visibilityStatus: "public_visible" },
  { eventName: "drop_unwrapped", featureId: "drops", surface: "unwrap", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "creator_profile_viewed", featureId: "creator_profile", surface: "creator profile", visibilityStatus: "public_visible" },
  { eventName: "creator_fan_pass_viewed", featureId: "fan_pass", surface: "Fan Pass", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "creator_fan_pass_started", featureId: "fan_pass", surface: "Fan Pass purchase", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare" },
  { eventName: "creator_broadcast_detail_viewed", featureId: "broadcasts", surface: "broadcast detail", visibilityStatus: "creator_visible", expectedTrafficClass: "occasional" },
  { eventName: "creator_broadcast_cta_clicked", featureId: "broadcasts", surface: "broadcast CTA", visibilityStatus: "creator_visible", expectedTrafficClass: "occasional" },
  { eventName: "notification_prompt_banner_viewed", featureId: "notifications", surface: "notification prompt", visibilityStatus: "logged_in_visible" },
  { eventName: "notification_opened", featureId: "notifications", surface: "notification inbox", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "user_settings_viewed", featureId: "user_dashboard", surface: "settings", visibilityStatus: "logged_in_visible" },
  { eventName: "setting_toggle_changed", featureId: "user_dashboard", surface: "settings toggles", visibilityStatus: "logged_in_visible", expectedTrafficClass: "occasional" },
  { eventName: "daily_task_surface_viewed", featureId: "daily_checkin", surface: "daily tasks", visibilityStatus: "logged_in_visible" },
  { eventName: "daily_task_started", featureId: "daily_checkin", surface: "daily task lifecycle", visibilityStatus: "logged_in_visible", expectedTrafficClass: "normal_daily" },
  { eventName: "daily_task_completed", featureId: "daily_checkin", surface: "daily task completion", visibilityStatus: "logged_in_visible", expectedTrafficClass: "normal_daily" },
  { eventName: "daily_task_reward_granted", featureId: "daily_checkin", surface: "daily task reward", visibilityStatus: "logged_in_visible", expectedTrafficClass: "normal_daily" },
  { eventName: "chat_surface_viewed", featureId: "user_dashboard", surface: "chat", visibilityStatus: "logged_in_visible" },
  { eventName: "chat_thread_opened", featureId: "user_dashboard", surface: "chat thread", visibilityStatus: "logged_in_visible" },
  { eventName: "chat_message_send_attempted", featureId: "user_dashboard", surface: "chat composer", visibilityStatus: "logged_in_visible", expectedTrafficClass: "normal_daily" },
  { eventName: "chat_message_sent", featureId: "user_dashboard", surface: "chat send", visibilityStatus: "logged_in_visible", expectedTrafficClass: "normal_daily" },
  { eventName: "chat_message_blocked", featureId: "user_dashboard", surface: "chat gating", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare", failureEvent: true },
  { eventName: "support_ticket_created", featureId: "support", surface: "support/report issue", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare" },
  { eventName: "account_delete_clicked", featureId: "auth_identity", surface: "account delete", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare" },
  { eventName: "data_export_requested", featureId: "user_dashboard", surface: "data export", visibilityStatus: "logged_in_visible", expectedTrafficClass: "rare" },
];

function cloneImpact(partial: Partial<EventLivenessScoreImpact> = {}): EventLivenessScoreImpact {
  return { ...ZERO_IMPACT, ...partial };
}

function parseUtc(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isExpectedVisible(visibilityStatus: EventVisibilityStatus) {
  return visibilityStatus === "public_visible"
    || visibilityStatus === "logged_in_visible"
    || visibilityStatus === "creator_visible";
}

export function resolveExpectedTrafficClass(input: Pick<EventLivenessInput, "eventName" | "visibilityStatus" | "expectedTrafficClass" | "expectedDailyVisitorsBaseline" | "failureEvent">): ExpectedTrafficClass {
  if (input.expectedTrafficClass) return input.expectedTrafficClass;
  if (input.visibilityStatus === "future_feature" || input.visibilityStatus === "hidden" || input.visibilityStatus === "disabled") return "future_only";
  if (input.visibilityStatus === "admin_only") return "admin_only";
  if (input.failureEvent || RARE_EVENTS.has(input.eventName)) return "rare";
  const baseline = input.expectedDailyVisitorsBaseline ?? EXPECTED_DAILY_VISITORS_BASELINE;
  if (baseline >= 100 && HIGH_DAILY_EVENTS.has(input.eventName)) return "high_daily";
  if (baseline >= 100 && NORMAL_DAILY_EVENTS.has(input.eventName)) return "normal_daily";
  if (isExpectedVisible(input.visibilityStatus)) return "occasional";
  return "future_only";
}

export function expectedWindowForTraffic(expectedTrafficClass: ExpectedTrafficClass): ExpectedRecentWindow {
  if (expectedTrafficClass === "high_daily" || expectedTrafficClass === "normal_daily") return "24h";
  if (expectedTrafficClass === "occasional") return "7d";
  return "none";
}

export function resolveLastSeenFromAvailableSources(input: EventLivenessInput): EventLivenessLastSeenSource | null {
  if (input.lastSeenSource) return input.lastSeenSource;
  const directLastSeen = input.lastSeenAtUtc;
  if (directLastSeen) {
    return {
      eventName: input.eventName,
      lastSeenAtUtc: directLastSeen,
      source: "materialized_summary",
    };
  }
  const candidates = (input.lastSeenSources ?? [])
    .filter((source) => source.eventName === input.eventName && parseUtc(source.lastSeenAtUtc) !== null)
    .sort((left, right) => (parseUtc(right.lastSeenAtUtc) ?? 0) - (parseUtc(left.lastSeenAtUtc) ?? 0));
  return candidates[0] ?? null;
}

function nextActionFor(status: EventLivenessStatus, eventName: string) {
  switch (status) {
    case "observed_recently":
      return "Keep the existing lastSeen materializer and debug lane fresh.";
    case "observed_stale":
      return `Inspect ${eventName} producer and lastSeen materializer; expected traffic is stale for its liveness window.`;
    case "not_observed_but_expected":
      return `Verify the ${eventName} route/component trigger and event-fact materializer with bounded recent summaries.`;
    case "source_missing":
      return `Add or connect a safe lastSeen source for ${eventName}; do not classify it as future-only quiet.`;
    case "materializer_missing":
      return `Map ${eventName} to a materializer before treating the path as live.`;
    case "translation_missing":
      return `Wire ${eventName} through the canonical event translation bridge.`;
    case "hydration_missing":
      return `Map ${eventName} to person metrics or explicitly classify it as feature-only evidence.`;
    case "disabled_intentionally":
      return "No activity action; feature is intentionally disabled.";
    case "future_only_quiet":
      return "Keep this in the collapsed future activity catalog until the feature becomes live.";
    case "not_observed_and_not_expected":
      return "No action needed unless product expectations change.";
  }
}

function reasonFor(status: EventLivenessStatus, expectedTrafficClass: ExpectedTrafficClass, eventName: string) {
  if (status === "source_missing") return `${eventName} is ${expectedTrafficClass} but has no safe lastSeen source.`;
  if (status === "observed_stale") return `${eventName} has lastSeen evidence, but it is stale for ${expectedTrafficClass}.`;
  if (status === "future_only_quiet") return `${eventName} is not expected to produce real activity yet.`;
  if (status === "not_observed_and_not_expected") return `${eventName} is ${expectedTrafficClass}; quiet is acceptable.`;
  return `${eventName} classified as ${status}.`;
}

function impactForStatus(status: EventLivenessStatus): EventLivenessScoreImpact {
  if (status === "translation_missing") return cloneImpact({ sourceHealth: 3, runtimeHealth: 3, evidenceCompleteness: 3, freshness: 1, regressionRisk: 1 });
  if (status === "materializer_missing" || status === "hydration_missing") return cloneImpact({ runtimeHealth: 2, evidenceCompleteness: 3, freshness: 1, regressionRisk: 1 });
  if (status === "source_missing") return cloneImpact({ runtimeHealth: 1, evidenceCompleteness: 2, freshness: 1 });
  if (status === "observed_stale" || status === "not_observed_but_expected") return cloneImpact({ runtimeHealth: 2, evidenceCompleteness: 2, freshness: 2, regressionRisk: 1 });
  return { ...ZERO_IMPACT };
}

function statusFromInput(input: EventLivenessInput, expectedTrafficClass: ExpectedTrafficClass, expectedRecentWindow: ExpectedRecentWindow, lastSeenSource: EventLivenessLastSeenSource | null): EventLivenessStatus {
  if (input.visibilityStatus === "disabled") return "disabled_intentionally";
  if (expectedTrafficClass === "future_only") return "future_only_quiet";
  if (input.translationMapped === false) return "translation_missing";
  if (input.materializerMapped === false) return "materializer_missing";
  if (input.hydrationMapped === false) return "hydration_missing";
  if ((input.failureEvent || expectedTrafficClass === "rare") && input.successPathObserved) return "not_observed_and_not_expected";
  if (!lastSeenSource) {
    if (expectedRecentWindow === "none" || expectedTrafficClass === "admin_only" || expectedTrafficClass === "rare") {
      return "not_observed_and_not_expected";
    }
    return "source_missing";
  }
  const lastSeenAt = parseUtc(lastSeenSource.lastSeenAtUtc);
  if (!lastSeenAt) return expectedRecentWindow === "none" ? "not_observed_and_not_expected" : "source_missing";
  if (expectedRecentWindow === "none") return "not_observed_and_not_expected";
  const now = parseUtc(input.nowUtc) ?? Date.now();
  const ageMs = now - lastSeenAt;
  return ageMs <= WINDOW_MS[expectedRecentWindow] ? "observed_recently" : "observed_stale";
}

export function classifyEventLiveness(input: EventLivenessInput): EventLivenessClassification {
  const expectedTrafficClass = resolveExpectedTrafficClass(input);
  const expectedRecentWindow = input.expectedRecentWindow ?? expectedWindowForTraffic(expectedTrafficClass);
  const lastSeenSource = resolveLastSeenFromAvailableSources(input);
  const livenessStatus = statusFromInput(input, expectedTrafficClass, expectedRecentWindow, lastSeenSource);
  const scoreImpact = impactForStatus(livenessStatus);
  const scoreDrag = Object.values(scoreImpact).some((value) => value > 0);
  const defaultVisible = scoreDrag || livenessStatus === "source_missing" || livenessStatus === "observed_stale" || livenessStatus === "not_observed_but_expected";

  return {
    ...input,
    expectedTrafficClass,
    expectedRecentWindow,
    expectedDailyVisitorsBaseline: input.expectedDailyVisitorsBaseline ?? EXPECTED_DAILY_VISITORS_BASELINE,
    livenessStatus,
    lastSeenAtUtc: lastSeenSource?.lastSeenAtUtc ?? null,
    lastSeenSource,
    scoreImpact,
    debugVisibility: {
      lane: "Event liveness",
      defaultVisible,
      hiddenFromDefaultWarnings: !defaultVisible,
      drilldownTarget: "/admin/debug?tab=advanced#event-liveness",
    },
    nextAction: nextActionFor(livenessStatus, input.eventName),
    reason: reasonFor(livenessStatus, expectedTrafficClass, input.eventName),
  };
}

export function detectSuspiciousIdleEvent(input: EventLivenessInput | EventLivenessClassification) {
  const classification = "livenessStatus" in input ? input : classifyEventLiveness(input);
  return classification.livenessStatus === "observed_stale"
    || classification.livenessStatus === "not_observed_but_expected";
}

export function explainQuietEvent(input: EventLivenessInput | EventLivenessClassification) {
  const classification = "livenessStatus" in input ? input : classifyEventLiveness(input);
  if (classification.livenessStatus === "future_only_quiet") return `${classification.eventName} is future-only and remains in the quiet catalog.`;
  if (classification.livenessStatus === "not_observed_and_not_expected") return `${classification.eventName} is ${classification.expectedTrafficClass}; quiet is acceptable without score drag.`;
  return classification.reason;
}

function scoreSnapshot(input?: Partial<Record<PublicBetaHealthDimension, number>>): Record<PublicBetaHealthDimension, number> {
  return {
    sourceHealth: input?.sourceHealth ?? 80,
    runtimeHealth: input?.runtimeHealth ?? 80,
    evidenceCompleteness: input?.evidenceCompleteness ?? 80,
    freshness: input?.freshness ?? 80,
    costRisk: input?.costRisk ?? 80,
    regressionRisk: input?.regressionRisk ?? 80,
  };
}

function totalImpact(classifications: readonly EventLivenessClassification[], dimension: PublicBetaHealthDimension) {
  return classifications.reduce((total, item) => total + item.scoreImpact[dimension], 0);
}

function buildDebugLane(classifications: readonly EventLivenessClassification[], quietCount: number): EventLivenessDebugLane {
  return {
    label: "Event liveness",
    expectedLiveEvents: classifications.filter((item) => item.expectedRecentWindow !== "none").length,
    observedRecently: classifications.filter((item) => item.livenessStatus === "observed_recently").length,
    suspiciousIdleEvents: classifications.filter(detectSuspiciousIdleEvent).length,
    sourceMissing: classifications.filter((item) => item.livenessStatus === "source_missing").length,
    materializerMissing: classifications.filter((item) => item.livenessStatus === "materializer_missing").length,
    translationMissing: classifications.filter((item) => item.livenessStatus === "translation_missing").length,
    hydrationMissing: classifications.filter((item) => item.livenessStatus === "hydration_missing").length,
    quietFutureCatalogCount: quietCount,
    quietFutureCatalogDefaultOpen: false,
    defaultShowsRawCatalogRows: false,
    actionableGroupsVisible: true,
  };
}

export function buildEventLivenessSummary(input: {
  rawQuietFutureCount?: number;
  expectedDailyVisitorsBaseline?: number;
  events?: readonly (EventLivenessInput | EventLivenessClassification)[];
  generatedAtUtc?: string;
  currentHead?: string;
  scoreBefore?: Partial<Record<PublicBetaHealthDimension, number>>;
} = {}): EventLivenessSummary {
  const expectedDailyVisitorsBaseline = input.expectedDailyVisitorsBaseline ?? EXPECTED_DAILY_VISITORS_BASELINE;
  const classifications = (input.events ?? IMPORTANT_EVENT_LIVENESS_INPUTS).map((event) =>
    "livenessStatus" in event
      ? event
      : classifyEventLiveness({ expectedDailyVisitorsBaseline, translationMapped: true, materializerMapped: true, hydrationMapped: true, ...event }));
  const suspiciousIdleCount = classifications.filter(detectSuspiciousIdleEvent).length;
  const sourceMissingCount = classifications.filter((item) => item.livenessStatus === "source_missing").length;
  const materializerMissingCount = classifications.filter((item) => item.livenessStatus === "materializer_missing").length;
  const translationMissingCount = classifications.filter((item) => item.livenessStatus === "translation_missing").length;
  const hydrationMissingCount = classifications.filter((item) => item.livenessStatus === "hydration_missing").length;
  const rawQuietFutureCount = input.rawQuietFutureCount ?? 416;
  const actionableQuietReclassifications = suspiciousIdleCount + sourceMissingCount + materializerMissingCount + translationMissingCount + hydrationMissingCount;
  const trueFutureOnlyQuietCount = Math.max(0, rawQuietFutureCount - actionableQuietReclassifications);
  const scoreBefore = scoreSnapshot(input.scoreBefore);
  const scoreAfter = EVENT_LIVENESS_SCORE_DIMENSIONS.reduce<Record<PublicBetaHealthDimension, number>>((output, dimension) => {
    output[dimension] = Number(Math.max(0, scoreBefore[dimension] - Math.min(10, totalImpact(classifications, dimension))).toFixed(2));
    return output;
  }, {} as Record<PublicBetaHealthDimension, number>);

  const commonVisibleEventsWithNoRecentLiveness = classifications.filter((item) =>
    isExpectedVisible(item.visibilityStatus)
    && ["high_daily", "normal_daily"].includes(item.expectedTrafficClass)
    && item.livenessStatus !== "observed_recently");
  const debugLane = buildDebugLane(classifications, trueFutureOnlyQuietCount);

  return {
    reportKey: "event-liveness-audit",
    version: EVENT_LIVENESS_AUDIT_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    expectedDailyVisitorsBaseline,
    rawQuietFutureCount,
    trueFutureOnlyQuietCount,
    suspiciousIdleCount,
    sourceMissingCount,
    materializerMissingCount,
    translationMissingCount,
    hydrationMissingCount,
    observedRecentlyCount: classifications.filter((item) => item.livenessStatus === "observed_recently").length,
    commonVisibleEventsWithNoRecentLiveness,
    classifications,
    debugLane,
    scoreBefore,
    scoreAfter,
    scoreImpactByDimension: EVENT_LIVENESS_SCORE_DIMENSIONS.reduce<Record<PublicBetaHealthDimension, { before: number; after: number; reason: string }>>((output, dimension) => {
      const impact = totalImpact(classifications, dimension);
      output[dimension] = {
        before: scoreBefore[dimension],
        after: scoreAfter[dimension],
        reason: impact > 0
          ? `${impact} event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications.`
          : "Quiet future-only and rare events do not reduce this dimension.",
      };
      return output;
    }, {} as Record<PublicBetaHealthDimension, { before: number; after: number; reason: string }>),
    scoreFeedsDebug: true,
    productionReadsRequired: false,
    fakeActivityUsed: false,
    validationFailures: [],
  };
}

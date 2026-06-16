"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";


import { toast } from "sonner";


import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import {
  useAdminAnalyticsSnapshotRegistry,
  type AdminAnalyticsSnapshotModuleState,
  type AdminAnalyticsSnapshotSectionKey,
} from "@/hooks/useAdminAnalyticsSnapshotRegistry";
import { useNow } from "@/hooks/useNow";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { reportStorageIssue } from "@/lib/client-error-reporting";
import {
  resolveAdminAnalyticsDisplayState,
  resolveAdminAnalyticsOverviewMetricState,
  type AdminAnalyticsDisplaySnapshotState,
  type AdminAnalyticsDisplayState,
  type AdminAnalyticsOverviewDisplayState,
  type AdminAnalyticsOverviewExactness,
} from "@/lib/analytics/admin-analytics-display-state";
import type {
  AdminAnalyticsLiveActor,
  AdminAnalyticsLiveSignals,
} from "@/lib/admin-analytics-live-runtime";
import {
  normalizeAdminSnapshotRatio,
  readAdminSnapshotNumberValue,
  resolveAdminAnalyticsWaitingCopy,
  resolveAdminSnapshotSurfaceState,
} from "@/lib/analytics/admin-analytics-loading-state";
import {
  ADMIN_ANALYTICS_DEFAULT_RANGE,
  normalizeAdminAnalyticsModuleRangeMap,
  type AdminAnalyticsModuleRangeMap,
} from "@/lib/admin-analytics-preferences";
import { buildAuthOutcomeChartModel } from "@/lib/admin-auth-outcome-chart";
import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";
import { buildAdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";
import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
import {
  buildAdminAnalyticsReturnCadenceModel,
  buildAdminAnalyticsReturnCadenceSummary,
  normalizeAdminAnalyticsReturnCadenceSegments,
} from "@/lib/admin-analytics-return-cadence";
import { buildAdminAnalyticsAudienceSnapshotModel } from "@/lib/admin-analytics-audience-snapshot";
import { buildAdminAnalyticsSourceHierarchy } from "@/lib/analytics/admin-analytics-source-hierarchy";
import { buildAnalyticsPanelHydrationReport } from "@/lib/admin-analytics/panel-hydration-resolver";
import { buildAdminAnalyticsCommerceSnapshotModel } from "@/lib/admin-analytics-commerce-snapshot";
import { buildAdminAnalyticsContentConversionModel } from "@/lib/admin-analytics-content-conversion";
import { buildAdminAnalyticsLivePulseModel } from "@/lib/admin-analytics-live-pulse";
import { buildAdminAnalyticsJourneyFunnelModel } from "@/lib/admin-analytics-journey-funnel";
import { buildAdminAnalyticsAuthOutcomeModel } from "@/lib/admin-analytics-auth-outcome-split";
import { buildAdminAnalyticsGuestBounceQualityModel } from "@/lib/admin-analytics-guest-bounce-quality";
import { buildAdminAnalyticsEventMixModel } from "@/lib/admin-analytics-event-mix";
import { buildAdminAnalyticsLiveInteractionStreamModel } from "@/lib/admin-analytics-live-interaction-stream";
import { buildAdminAnalyticsNavigationDestinationsModel } from "@/lib/admin-analytics-navigation-destinations";
import { buildAdminAnalyticsDeviceMixModel } from "@/lib/admin-analytics-device-mix";
import { buildAdminAnalyticsTopPathsModel } from "@/lib/admin-analytics-top-paths";
import { buildAdminAnalyticsRegionDemandModel } from "@/lib/admin-analytics-region-demand";
import { buildAdminAnalyticsTopDropConversionModel } from "@/lib/admin-analytics-top-drop-conversion";
import { buildAdminAnalyticsRecentCommerceFeedState } from "@/lib/admin-analytics-recent-commerce-feed";
import { summarizeAdminIssueForOperator } from "@/lib/admin-copy/admin-truth-copy";
import { PUBLIC_APP_VERSION } from "@/lib/release-notes/public-release-notes";


import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";
import { coerceAdminSurfaceState, type AdminSurfaceState } from "@/lib/admin-parity";

import type { AdminOverviewResponse } from "@/lib/admin-overview";
import type {
  ViewTab,
  RangeOption,
  HistoricalAnalyticsResponse,
  RealtimeAnalyticsResponse,
  AnalyticsPreferencesResponse,
  TaskLeaderboardItem,
  AnalyticsOverviewCard,
} from "@/types/admin-analytics";

import {
  ANALYTICS_FILTER_STORAGE_KEY,
  EMPTY_COUNT_BUCKETS,
  EMPTY_ONBOARDING_STATS,
  EMPTY_ONBOARDING_STEP_STATS,
  EMPTY_WATCH_CAPTURE_HEALTH,
  PIE_COLORS,
  SectionRangeControl,
  TAB_OPTIONS,
  describeEvent,
  formatAbsoluteDateTime,
  formatCompactNumber,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  getJourneyStateClasses,
  getJourneyStateLabel,
  getDeviceIcon,
  isRecentViolation,
  useHistoricalSectionOverride,
} from "../AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;

const ADMIN_ANALYTICS_OVERVIEW_HYDRATION_BUDGET_MS = 3_000;
const ADMIN_ANALYTICS_STORAGE_VERSION = PUBLIC_APP_VERSION;
const ADMIN_ANALYTICS_STORAGE_PREFIX = `kandydrops.admin.analytics.${ADMIN_ANALYTICS_STORAGE_VERSION}`;
const ADMIN_ANALYTICS_OVERVIEW_SNAPSHOT_STORAGE_PREFIX =
  "kandydrops.admin.analytics.overview.lastValidatedBackendSnapshot";
const EMPTY_TASK_LEADERBOARD: TaskLeaderboardItem[] = [];
const ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST =
  "ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST";
const ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS = 0;
const ADMIN_ANALYTICS_PREFERENCES_REFRESH_INTERVAL_MS = 0;
const ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_DETAIL =
  "Raw Firestore realtime listeners are disabled for compact Admin Analytics display; using the snapshot-first realtime route and Admin Debug raw evidence instead.";
const ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_SOURCE_LABEL =
  "analytics_admin_metric_snapshots:snapshot_first_route";
const ADMIN_ANALYTICS_RAW_REALTIME_COLLECTIONS = {
  eventFacts: "analytics_event_facts",
  guestBatches: "analytics_guest_batches",
  guestSessions: "analytics_sessions",
  watchSessions: "analytics_watch_sessions",
} as const;

type AdminAnalyticsOverviewMetricKey =
  | "liveActive"
  | "mobileShare"
  | "revenue"
  | "purchases";

type AdminAnalyticsCostDemotedListenerDebugEntry = {
  collection: string;
  status: "waiting";
  fromCache: false;
  mountedAtMs: number | null;
  lastEventAtMs: null;
  lastServerConfirmedAtMs: null;
  errorMessage: null;
  sourceUse: "debug_only";
  costRisk: "reduced";
  fallbackReason: string;
};

type AdminAnalyticsCostDemotedRealtimeState = AdminAnalyticsLiveSignals & {
  listenerDebugMeta: {
    mountedAtMs: number | null;
    listeners: Record<string, AdminAnalyticsCostDemotedListenerDebugEntry>;
    sourceUse: "snapshot_first_route";
    rawDisplayFallbackDisabled: true;
    costRisk: "reduced";
    fallbackReason: string;
    policyMarker: typeof ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST;
  };
};

type AnalyticsOverviewCardViewModel = AnalyticsOverviewCard & {
  displayValue: string;
  hint: string;
  truthState: AdminSurfaceState;
  statusBadgeLabel?: string;
};

type AdminAnalyticsOverviewDisplayMetric = {
  id: "liveActive" | "mobileShare" | "revenue" | "purchases";
  label: string;
  displayValue: string;
  primaryValue: number | null;
  displayState: AdminAnalyticsOverviewDisplayState;
  exactness: AdminAnalyticsOverviewExactness;
  compactFreshnessLine: string;
  debugReason: string;
  debugSource: string;
  badgeLabel?: string;
  showBadgeInPrimary: boolean;
};

type AnalyticsOverviewHydrationMarks = {
  shellRenderMs: number | null;
  firstMetricCardRenderMs: number | null;
  lastValidatedSnapshotRenderMs: number | null;
  firstRealtimeServerConfirmedUpdateMs: number | null;
  backendRefreshStartMs: number | null;
  backendRefreshCompleteMs: number | null;
  backendRefreshFailMs: number | null;
};

const EMPTY_ANALYTICS_OVERVIEW_HYDRATION_MARKS: AnalyticsOverviewHydrationMarks = {
  shellRenderMs: null,
  firstMetricCardRenderMs: null,
  lastValidatedSnapshotRenderMs: null,
  firstRealtimeServerConfirmedUpdateMs: null,
  backendRefreshStartMs: null,
  backendRefreshCompleteMs: null,
  backendRefreshFailMs: null,
};

type StoredHistoricalOverviewSnapshot = {
  appVersion: typeof ADMIN_ANALYTICS_STORAGE_VERSION;
  savedAtMs: number;
  response?: HistoricalAnalyticsResponse;
};

const ANALYTICS_OVERVIEW_BADGE_LABELS: Record<AdminSurfaceState, string> = {
  loading: "WAIT",
  live: "LIVE",
  cached: "SNAP",
  degraded: "REVIEW",
  fallback: "SNAP",
  stale: "DELAYED",
  unavailable: "UNAVAILABLE",
  failed: "ERROR",
};

const SNAPSHOT_SECTION_KEYS = new Set<string>([
  "platformPulse",
  "audienceSnapshot",
  "commerceSnapshot",
  "livePulse",
  "journeyFunnel",
  "authOutcomeSplit",
  "onboardingVelocity",
  "dailyTaskPipeline",
  "notificationFunnel",
  "eventMix",
  "liveInteractionStream",
  "dataHealthSummary",
]);

const SNAPSHOT_SOURCE_LABELS: Record<string, string> = {
  live: "LIVE",
  verified_cache: "SNAP",
  stale_cache: "REFRESH",
  intraday: "UPDATED",
  estimated: "EST",
  fallback: "SNAP",
  unavailable: "UNAVAILABLE",
  mixed: "PARTIAL",
};

function isSnapshotSectionKey(value: string): value is AdminAnalyticsSnapshotSectionKey {
  return SNAPSHOT_SECTION_KEYS.has(value);
}

function normalizeSnapshotFirstLiveTruthLabel(
  label: RealtimeAnalyticsResponse["liveTruthLabel"] | RealtimeAnalyticsResponse["activeUsersTruthLabel"],
): AdminAnalyticsLiveSignals["liveTruthLabel"] {
  if (label === "cached" || label === "refresh_due") {
    return "cached";
  }

  if (label === "live" || label === "partial" || label === "failed") {
    return label;
  }

  return "fallback";
}

function normalizeSnapshotFirstActiveUser(
  item: NonNullable<RealtimeAnalyticsResponse["activeUsers"]>[number],
  sourceLabel: string,
): AdminAnalyticsLiveActor {
  return {
    ...item,
    actorType: item.actorType === "guest" ? "guest" : "identified",
    sourceLabel: item.sourceLabel ?? sourceLabel,
    truthLabel: item.truthLabel ?? "fallback",
  };
}

function buildCostDemotedRealtimeListenerDebugMeta(nowMs: number): AdminAnalyticsCostDemotedRealtimeState["listenerDebugMeta"] {
  const buildEntry = (collection: string): AdminAnalyticsCostDemotedListenerDebugEntry => ({
    collection,
    status: "waiting",
    fromCache: false,
    mountedAtMs: nowMs,
    lastEventAtMs: null,
    lastServerConfirmedAtMs: null,
    errorMessage: null,
    sourceUse: "debug_only",
    costRisk: "reduced",
    fallbackReason: ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_DETAIL,
  });

  return {
    mountedAtMs: nowMs,
    sourceUse: "snapshot_first_route",
    rawDisplayFallbackDisabled: true,
    costRisk: "reduced",
    fallbackReason: ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_DETAIL,
    policyMarker: ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST,
    listeners: {
      eventFacts: buildEntry(ADMIN_ANALYTICS_RAW_REALTIME_COLLECTIONS.eventFacts),
      guestBatches: buildEntry(ADMIN_ANALYTICS_RAW_REALTIME_COLLECTIONS.guestBatches),
      guestSessions: buildEntry(ADMIN_ANALYTICS_RAW_REALTIME_COLLECTIONS.guestSessions),
      watchSessions: buildEntry(ADMIN_ANALYTICS_RAW_REALTIME_COLLECTIONS.watchSessions),
    },
  };
}

function buildSnapshotFirstRealtimeState(input: {
  liveResponse?: RealtimeAnalyticsResponse;
  nowMs: number;
}): AdminAnalyticsCostDemotedRealtimeState {
  const sourceLabel =
    input.liveResponse?.liveSourceLabel ??
    input.liveResponse?.cacheSourceLabel ??
    ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_SOURCE_LABEL;
  const activeUsers = (input.liveResponse?.activeUsers ?? []).map((item) =>
    normalizeSnapshotFirstActiveUser(item, sourceLabel),
  );

  if (!input.liveResponse) {
    return {
      feedStatus: "failed",
      feedDetail: "No verified snapshot-first realtime payload is available yet.",
      generatedAtMs: null,
      totalActive: 0,
      deepTrackerActive: 0,
      guestActive: 0,
      data: [],
      activeUsers,
      surfaceMix: [],
      issues: ["Snapshot-first realtime route has no verified payload; raw listener fallback is disabled for cost control."],
      liveTruthLabel: "failed",
      liveSourceLabel: sourceLabel,
      activeUsersTruthLabel: "failed",
      activeUsersSourceLabel: sourceLabel,
      listenerDebugMeta: buildCostDemotedRealtimeListenerDebugMeta(input.nowMs),
    };
  }

  return {
    feedStatus: "snapshot",
    feedDetail: ADMIN_ANALYTICS_SNAPSHOT_FIRST_REALTIME_DETAIL,
    generatedAtMs: input.liveResponse.generatedAtMs ?? null,
    totalActive: input.liveResponse.totalActive ?? 0,
    deepTrackerActive: input.liveResponse.deepTrackerActive ?? 0,
    guestActive: activeUsers.filter((item) => item.actorType === "guest").length,
    data: input.liveResponse.data ?? [],
    activeUsers,
    surfaceMix: input.liveResponse.surfaceMix ?? [],
    issues: [],
    liveTruthLabel: normalizeSnapshotFirstLiveTruthLabel(input.liveResponse.liveTruthLabel),
    liveSourceLabel: sourceLabel,
    activeUsersTruthLabel: normalizeSnapshotFirstLiveTruthLabel(input.liveResponse.activeUsersTruthLabel),
    activeUsersSourceLabel: input.liveResponse.activeUsersSourceLabel ?? sourceLabel,
    listenerDebugMeta: buildCostDemotedRealtimeListenerDebugMeta(input.nowMs),
  };
}

function SnapshotRefreshControl(props: { snapshotModule: AdminAnalyticsSnapshotModuleState | null }) {
  const [refreshing, setRefreshing] = useState(false);
  const snapshotModule = props.snapshotModule;

  if (!snapshotModule) {
    return null;
  }

  const label = SNAPSHOT_SOURCE_LABELS[snapshotModule.sourceMode] ?? "UNKNOWN";
  const title = [
    `Snapshot module: ${snapshotModule.moduleKey}`,
    `Source: ${snapshotModule.sourceMode}`,
    `Truth: ${snapshotModule.truthState}`,
    snapshotModule.lastVerifiedAt ? `Last verified: ${snapshotModule.lastVerifiedAt}` : "No verified snapshot yet",
    snapshotModule.unavailableReason ? `Reason: ${snapshotModule.unavailableReason}` : null,
    `Debug: ${snapshotModule.debugPath}`,
  ].filter(Boolean).join(" | ");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await snapshotModule.refresh({ force: false });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5" title={title} aria-label={title}>
      <span className="max-w-[5.25rem] truncate rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-gray-200">
        {refreshing || snapshotModule.refreshStatus === "refreshing" ? "SYNC" : label}
      </span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing || snapshotModule.refreshStatus === "refreshing"}
        className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
}

function getClientPerformanceMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function buildOverviewSnapshotStorageKey(url: string) {
  return `${ADMIN_ANALYTICS_STORAGE_PREFIX}.overview.lastValidatedBackendSnapshot:${url}`;
}

function buildLegacyOverviewSnapshotStorageKey(url: string) {
  return `${ADMIN_ANALYTICS_OVERVIEW_SNAPSHOT_STORAGE_PREFIX}:${url}`;
}

function buildVersionedAnalyticsFilterStorageKey(baseKey: string) {
  return `${ADMIN_ANALYTICS_STORAGE_PREFIX}.filters:${baseKey}`;
}

function clearLegacyAdminAnalyticsStorage(input: {
  analyticsFilterStorageKey: string;
  historicalUrl: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(input.analyticsFilterStorageKey);
    window.sessionStorage.removeItem(
      buildLegacyOverviewSnapshotStorageKey(input.historicalUrl),
    );
  } catch (error) {
    reportStorageIssue("admin analytics legacy storage cleanup", error, {
      analyticsFilterStorageKey: input.analyticsFilterStorageKey,
      historicalStorageKey: buildLegacyOverviewSnapshotStorageKey(input.historicalUrl),
    });
  }
}

function hasOverviewSnapshotValue(response: HistoricalAnalyticsResponse | undefined) {
  return Boolean(
    response &&
      (
        (response.devices?.length ?? 0) > 0 ||
        response.commerce ||
        response.funnel
      ),
  );
}

function compactHistoricalOverviewSnapshot(
  response: HistoricalAnalyticsResponse,
): HistoricalAnalyticsResponse {
  return {
    success: response.success,
    generatedAtMs: response.generatedAtMs,
    cacheState: "refresh_due",
    cacheAgeMs: response.generatedAtMs
      ? Math.max(0, Date.now() - response.generatedAtMs)
      : response.cacheAgeMs,
    cacheSourceLabel: "Last verified data",
    cacheRevalidating: true,
    devices: response.devices,
    funnel: response.funnel,
    commerce: response.commerce,
    totals: response.totals,
    truthState: response.truthState,
    issues: [],
  };
}

function readStoredHistoricalOverviewSnapshot(
  url: string,
): HistoricalAnalyticsResponse | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(buildOverviewSnapshotStorageKey(url));
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as Partial<StoredHistoricalOverviewSnapshot>;
    if (
      parsed.appVersion !== ADMIN_ANALYTICS_STORAGE_VERSION ||
      !hasOverviewSnapshotValue(parsed.response)
    ) {
      return undefined;
    }

    return compactHistoricalOverviewSnapshot(parsed.response as HistoricalAnalyticsResponse);
  } catch (error) {
    reportStorageIssue("admin analytics overview snapshot read", error, {
      storageKey: buildOverviewSnapshotStorageKey(url),
    });
    return undefined;
  }
}

function writeStoredHistoricalOverviewSnapshot(
  url: string,
  response: HistoricalAnalyticsResponse | undefined,
) {
  if (typeof window === "undefined" || !hasOverviewSnapshotValue(response)) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      buildOverviewSnapshotStorageKey(url),
      JSON.stringify({
        appVersion: ADMIN_ANALYTICS_STORAGE_VERSION,
        savedAtMs: Date.now(),
        response: compactHistoricalOverviewSnapshot(response as HistoricalAnalyticsResponse),
      }),
    );
  } catch (error) {
    reportStorageIssue("admin analytics overview snapshot write", error, {
      storageKey: buildOverviewSnapshotStorageKey(url),
    });
  }
}

function resolveRealtimeBackendSnapshotSourceMode(
  response: RealtimeAnalyticsResponse,
): AdminAnalyticsDisplaySnapshotState["sourceMode"] {
  if (response.cacheState === "refresh_due" || response.liveTruthLabel === "stale") {
    return "stale_cache";
  }
  if (response.liveTruthLabel === "fallback") {
    return "fallback";
  }
  if (response.liveTruthLabel === "partial") {
    return "mixed";
  }
  return "verified_cache";
}

function resolveLivePulseSnapshotState(input: {
  liveResponse?: RealtimeAnalyticsResponse;
  snapshotModule?: AdminAnalyticsSnapshotModuleState;
}): AdminAnalyticsDisplaySnapshotState | null {
  if (input.liveResponse?.generatedAtMs) {
    const hasValues =
      typeof input.liveResponse.totalActive === "number" ||
      (input.liveResponse.data?.length ?? 0) > 0 ||
      (input.liveResponse.activeUsers?.length ?? 0) > 0 ||
      (input.liveResponse.surfaceMix?.length ?? 0) > 0;

    return {
      exists: true,
      sourceMode: resolveRealtimeBackendSnapshotSourceMode(input.liveResponse),
      truthState: input.liveResponse.liveTruthLabel === "stale"
        ? "stale"
        : input.liveResponse.liveTruthLabel === "partial"
          ? "partial"
          : "verified",
      lastVerifiedAt: input.liveResponse.generatedAtMs,
      stale: input.liveResponse.liveTruthLabel === "stale",
      hasValues,
      sourceLabel: input.liveResponse.cacheSourceLabel ?? input.liveResponse.liveSourceLabel ?? "admin realtime hot cache",
    };
  }

  if (input.snapshotModule?.hasVerifiedSnapshot) {
    return {
      exists: true,
      sourceMode: input.snapshotModule.sourceMode,
      truthState: input.snapshotModule.truthState === "missing"
        ? "unavailable"
        : input.snapshotModule.truthState,
      lastVerifiedAt: input.snapshotModule.lastVerifiedAt,
      stale: input.snapshotModule.sourceMode === "stale_cache",
      hasValues: true,
      sourceLabel: input.snapshotModule.debugPath,
      unavailableReason: input.snapshotModule.unavailableReason,
    };
  }

  return null;
}

function readDisplaySnapshotAgeMs(
  snapshot: AdminAnalyticsDisplaySnapshotState | null,
  nowMs: number,
) {
  if (!snapshot?.lastVerifiedAt) {
    return null;
  }

  const timestampMs =
    typeof snapshot.lastVerifiedAt === "number"
      ? snapshot.lastVerifiedAt
      : Date.parse(snapshot.lastVerifiedAt);
  return Number.isFinite(timestampMs) ? Math.max(0, nowMs - timestampMs) : null;
}

function mapDisplayStateToAdminSurfaceState(
  displayState: AdminAnalyticsDisplayState,
): AdminSurfaceState {
  if (displayState.truthState === "failed") return "failed";
  if (displayState.truthState === "unavailable") return "unavailable";
  if (displayState.truthState === "refreshing") return "degraded";
  if (displayState.sourceMode === "live") return "live";
  if (displayState.sourceMode === "verified_cache") return "cached";
  if (displayState.sourceMode === "stale_cache") return "cached";
  if (displayState.sourceMode === "fallback") return "fallback";
  if (displayState.sourceMode === "mixed" || displayState.sourceMode === "intraday") return "degraded";
  return displayState.truthState === "partial" ? "degraded" : "cached";
}

function getHistoricalEstimationReason(issues: string[]) {
  return issues.find((issue) =>
    issue.toLowerCase().includes("guest/public traffic is estimated"),
  ) ?? null;
}

function toOverviewGeneratedAtUtc(response: AdminOverviewResponse | undefined) {
  if (!response?.generatedAt) {
    return null;
  }

  return new Date(response.generatedAt).toISOString();
}

function mapOverviewFreshnessState(
  freshnessState: "live" | "review" | "stale" | "unknown" | "blocked" | "unavailable" | undefined,
): AnalyticsOverviewCard["freshnessState"] {
  switch (freshnessState) {
    case "live":
      return "live";
    case "review":
      return "recent";
    case "stale":
      return "stale";
    default:
      return "unknown";
  }
}

function isUnavailableOverviewDisplayLabel(value: string | null) {
  return Boolean(value && /unavailable|waiting|snapshot pending|source missing/i.test(value));
}

function toOverviewPrimaryNumber(value: string | number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatOverviewGeneratedAtLine(
  generatedAtUtc: string | null,
  nowMs: number,
  fallback: string,
) {
  if (!generatedAtUtc) {
    return fallback;
  }

  const generatedAtMs = Date.parse(generatedAtUtc);
  if (!Number.isFinite(generatedAtMs)) {
    return fallback;
  }

  return `Updated ${formatRelativeTime(generatedAtMs, nowMs)}`;
}

function buildAdminAnalyticsOverviewDisplayMetric(input: {
  id: AdminAnalyticsOverviewDisplayMetric["id"];
  label: string;
  displayValue: string;
  primaryValue: number | null;
  truthState: AdminSurfaceState;
  sourceTruth: AnalyticsOverviewCard["sourceTruth"];
  generatedAtUtc: string | null;
  nowMs: number;
  debugReason: string;
  debugSource: string;
  compactFreshnessLine?: string;
  unavailableLine?: string;
  loading?: boolean;
  badgeLabel?: string;
  showBadgeInPrimary?: boolean;
}): AdminAnalyticsOverviewDisplayMetric {
  const { displayState, exactness } = resolveAdminAnalyticsOverviewMetricState({
    primaryValue: input.primaryValue,
    truthState: input.truthState,
    sourceTruth: input.sourceTruth,
    loading: input.loading,
  });
  const compactFreshnessLine =
    input.compactFreshnessLine ??
    (displayState === "unavailable"
      ? input.unavailableLine ?? "Unavailable"
      : displayState === "loading"
        ? "No verified snapshot yet."
        : formatOverviewGeneratedAtLine(input.generatedAtUtc, input.nowMs, "Last verified data"));

  return {
    id: input.id,
    label: input.label,
    displayValue: input.displayValue,
    primaryValue: input.primaryValue,
    displayState,
    exactness,
    compactFreshnessLine,
    debugReason: input.debugReason,
    debugSource: input.debugSource,
    badgeLabel: input.badgeLabel,
    showBadgeInPrimary: input.showBadgeInPrimary ?? false,
  };
}


export function useAdminAnalyticsState() {
  const hydrationStartedAtRef = useRef(getClientPerformanceMs());
  const [analyticsOverviewHydrationMarks, setAnalyticsOverviewHydrationMarks] =
    useState<AnalyticsOverviewHydrationMarks>(() => ({
      ...EMPTY_ANALYTICS_OVERVIEW_HYDRATION_MARKS,
      shellRenderMs: 0,
      firstMetricCardRenderMs: 0,
    }));
  const { user } = useAuth();
  const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);
  const [activeTab, setActiveTab] = useState<ViewTab>("operations");
  const [topDropConversionPage, setTopDropConversionPage] = useState(1);
  const [topDropConversionPageSize, setTopDropConversionPageSize] = useState(10);
  const range: RangeOption = ADMIN_ANALYTICS_DEFAULT_RANGE;
  const nowMs = useNow({ intervalMs: 60_000, initialNowMs: 0 });
  const [viewerUserDraft, setViewerUserDraft] = useState("");
  const [viewerUserFilter, setViewerUserFilter] = useState("");
  const [moduleRanges, setModuleRanges] =
    useState<AdminAnalyticsModuleRangeMap>({});
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const baseAnalyticsFilterStorageKey = user
    ? `${ANALYTICS_FILTER_STORAGE_KEY}:${user.uid}`
    : ANALYTICS_FILTER_STORAGE_KEY;
  const analyticsFilterStorageKey = buildVersionedAnalyticsFilterStorageKey(
    baseAnalyticsFilterStorageKey,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timerId = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(analyticsFilterStorageKey);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as Partial<{
          activeTab: ViewTab;
          viewerUserDraft: string;
          viewerUserFilter: string;
        }>;

        if (
          parsed.activeTab &&
          TAB_OPTIONS.some((item) => item.id === parsed.activeTab)
        ) {
          setActiveTab(parsed.activeTab);
        }
        if (typeof parsed.viewerUserDraft === "string") {
          setViewerUserDraft(parsed.viewerUserDraft);
        }
        if (typeof parsed.viewerUserFilter === "string") {
          setViewerUserFilter(parsed.viewerUserFilter);
        }
      } catch (error) {
        reportStorageIssue("admin analytics filters read", error, {
          storageKey: analyticsFilterStorageKey,
        });
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [analyticsFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        analyticsFilterStorageKey,
        JSON.stringify({
          activeTab,
          viewerUserDraft,
          viewerUserFilter,
        }),
      );
    } catch (error) {
      reportStorageIssue("admin analytics filters write", error, {
        storageKey: analyticsFilterStorageKey,
      });
    }
  }, [activeTab, analyticsFilterStorageKey, viewerUserDraft, viewerUserFilter]);

  const {
    data: analyticsPreferencesResponse,
    mutate: mutateAnalyticsPreferences,
  } = useAdminPollingSWR<AnalyticsPreferencesResponse>(
    isLocalAdminUiTestSession ? null : "/api/admin/analytics/preferences",
    ADMIN_ANALYTICS_PREFERENCES_REFRESH_INTERVAL_MS,
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setModuleRanges(
      normalizeAdminAnalyticsModuleRangeMap(
        analyticsPreferencesResponse?.preferences?.moduleRanges,
      ),
    );
  }, [analyticsPreferencesResponse?.preferences?.moduleRanges]);

  const getSectionRange = (sectionKey: string): RangeOption =>
    moduleRanges[sectionKey] ?? ADMIN_ANALYTICS_DEFAULT_RANGE;

  const handleSectionRangeChange = async (
    sectionKey: string,
    nextRange: RangeOption,
  ) => {
    const previousRanges = moduleRanges;
    setModuleRanges((current) => ({
      ...current,
      [sectionKey]: nextRange,
    }));
    setSavingSectionKey(sectionKey);

    try {
      if (isLocalAdminUiTestSession) {
        toast.info("Analytics preferences are source_missing in local UI review.");
        return;
      }

      const response = await authFetch("/api/admin/analytics/preferences", {
        method: "PUT",
        body: JSON.stringify({
          section: sectionKey,
          range: nextRange,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Analytics range update failed");
      }

      const nextRanges = normalizeAdminAnalyticsModuleRangeMap(
        result.preferences?.moduleRanges,
      );
      setModuleRanges(nextRanges);
      await mutateAnalyticsPreferences(
        {
          success: true,
          preferences: {
            moduleRanges: nextRanges,
          },
        },
        { revalidate: false },
      );
    } catch (error) {
      setModuleRanges(previousRanges);
      toast.error(
        error instanceof Error
          ? error.message
          : "Analytics range update failed",
      );
    } finally {
      setSavingSectionKey((current) =>
        current === sectionKey ? null : current,
      );
    }
  };

  const renderBaseSectionRangeControl = (sectionKey: string) => (
    <SectionRangeControl
      sectionKey={sectionKey}
      range={getSectionRange(sectionKey)}
      saving={savingSectionKey === sectionKey}
      onChange={handleSectionRangeChange}
    />
  );

  const historicalUrl = `/api/admin/analytics/historical?period=${ADMIN_ANALYTICS_DEFAULT_RANGE}`;
  const {
    data: liveResponse,
    error: liveError,
    isLoading: liveLoading,
  } = useAdminPollingSWR<RealtimeAnalyticsResponse>(
    isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime",
    ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS,
    {
      keepPreviousData: true,
    },
  );

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
  } = useAdminPollingSWR<HistoricalAnalyticsResponse>(isLocalAdminUiTestSession ? null : historicalUrl, ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS, {
    keepPreviousData: true,
  });
  const {
    data: adminOverviewResponse,
  } = useAdminPollingSWR<AdminOverviewResponse>(isLocalAdminUiTestSession ? null : "/api/admin/overview", ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS, {
    keepPreviousData: true,
  });

  useEffect(() => {
    clearLegacyAdminAnalyticsStorage({
      analyticsFilterStorageKey: baseAnalyticsFilterStorageKey,
      historicalUrl,
    });
  }, [baseAnalyticsFilterStorageKey, historicalUrl]);
  const [seededHistoricalOverviewResponse, setSeededHistoricalOverviewResponse] =
    useState<HistoricalAnalyticsResponse | undefined>(() =>
      readStoredHistoricalOverviewSnapshot(historicalUrl),
    );
  const historicalOverviewResponse =
    historicalResponse ?? seededHistoricalOverviewResponse;
  const usedHistoricalOverviewFallbackSnapshot =
    !historicalResponse && Boolean(seededHistoricalOverviewResponse);
  const markAnalyticsOverviewHydration = (
    key: keyof AnalyticsOverviewHydrationMarks,
  ) => {
    setAnalyticsOverviewHydrationMarks((current) => {
      if (current[key] !== null) {
        return current;
      }

      return {
        ...current,
        [key]: Math.round(getClientPerformanceMs() - hydrationStartedAtRef.current),
      };
    });
  };

  useEffect(() => {
    if (!historicalResponse) {
      return;
    }

    writeStoredHistoricalOverviewSnapshot(historicalUrl, historicalResponse);
    setSeededHistoricalOverviewResponse(undefined);
  }, [historicalResponse, historicalUrl]);

  useEffect(() => {
    if (usedHistoricalOverviewFallbackSnapshot) {
      markAnalyticsOverviewHydration("lastValidatedSnapshotRenderMs");
    }
  }, [usedHistoricalOverviewFallbackSnapshot]);

  useEffect(() => {
    if (historicalLoading) {
      markAnalyticsOverviewHydration("backendRefreshStartMs");
    }
  }, [historicalLoading]);

  useEffect(() => {
    if (historicalResponse) {
      markAnalyticsOverviewHydration("backendRefreshCompleteMs");
    }
  }, [historicalResponse]);

  useEffect(() => {
    if (historicalError) {
      markAnalyticsOverviewHydration("backendRefreshFailMs");
    }
  }, [historicalError]);

  const livePulseRange = getSectionRange("livePulse");
  const livePulseOverride = useHistoricalSectionOverride(
    "livePulse",
    livePulseRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const journeyFunnelRange = getSectionRange("journeyFunnel");
  const journeyFunnelOverride = useHistoricalSectionOverride(
    "journeyFunnel",
    journeyFunnelRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const authOutcomeSplitRange = getSectionRange("authOutcomeSplit");
  const authOutcomeSplitOverride = useHistoricalSectionOverride(
    "authOutcomeSplit",
    authOutcomeSplitRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const onboardingVelocityRange = getSectionRange("onboardingVelocity");
  const onboardingVelocityOverride = useHistoricalSectionOverride(
    "onboardingVelocity",
    onboardingVelocityRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const onboardingStepFlowRange = getSectionRange("onboardingStepFlow");
  const onboardingStepFlowOverride = useHistoricalSectionOverride(
    "onboardingStepFlow",
    onboardingStepFlowRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const guestBounceQualityRange = getSectionRange("categorySemantics");
  const guestBounceQualityOverride = useHistoricalSectionOverride(
    "categorySemantics",
    guestBounceQualityRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const eventMixRange = getSectionRange("eventMix");
  const eventMixOverride = useHistoricalSectionOverride(
    "eventMix",
    eventMixRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const liveInteractionStreamRange = getSectionRange("liveInteractionStream");
  const liveInteractionStreamOverride = useHistoricalSectionOverride(
    "liveInteractionStream",
    liveInteractionStreamRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const audienceSnapshotRange = getSectionRange("audienceSnapshot");
  const audienceSnapshotOverride = useHistoricalSectionOverride(
    "audienceSnapshot",
    audienceSnapshotRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const returnCadenceRange = getSectionRange("returnCadence");
  const returnCadenceOverride = useHistoricalSectionOverride(
    "returnCadence",
    returnCadenceRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const navigationDestinationsRange = getSectionRange("navigationDestinations");
  const navigationDestinationsOverride = useHistoricalSectionOverride(
    "navigationDestinations",
    navigationDestinationsRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const deviceMixRange = getSectionRange("deviceMix");
  const deviceMixOverride = useHistoricalSectionOverride(
    "deviceMix",
    deviceMixRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const topPathsRange = getSectionRange("topPaths");
  const topPathsOverride = useHistoricalSectionOverride(
    "topPaths",
    topPathsRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const regionsRange = getSectionRange("regions");
  const regionsOverride = useHistoricalSectionOverride("regions", regionsRange, undefined, isLocalAdminUiTestSession);
  const commerceSnapshotRange = getSectionRange("commerceSnapshot");
  const commerceSnapshotOverride = useHistoricalSectionOverride(
    "commerceSnapshot",
    commerceSnapshotRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const packagePerformanceRange = getSectionRange("packagePerformance");
  const packagePerformanceOverride = useHistoricalSectionOverride(
    "packagePerformance",
    packagePerformanceRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const contentConversionRange = getSectionRange("contentConversion");
  const contentConversionOverride = useHistoricalSectionOverride(
    "contentConversion",
    contentConversionRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const topDropConversionRange = getSectionRange("topDropConversion");
  const topDropConversionOverride = useHistoricalSectionOverride(
    "topDropConversion",
    topDropConversionRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const recentCommerceFeedRange = getSectionRange("recentCommerceFeed");
  const recentCommerceFeedOverride = useHistoricalSectionOverride(
    "recentCommerceFeed",
    recentCommerceFeedRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const viewerDrilldownRange = getSectionRange("viewerDrilldown");
  const viewerDrilldownOverride = useHistoricalSectionOverride(
    "viewerDrilldown",
    viewerDrilldownRange,
    viewerUserFilter,
    isLocalAdminUiTestSession,
  );
  const viewerJourneyRange = getSectionRange("viewerJourney");
  const viewerJourneyOverride = useHistoricalSectionOverride(
    "viewerJourney",
    viewerJourneyRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const watchDepthTagsRange = getSectionRange("watchDepthTags");
  const watchDepthTagsOverride = useHistoricalSectionOverride(
    "watchDepthTags",
    watchDepthTagsRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const dailyTaskPipelineRange = getSectionRange("dailyTaskPipeline");
  const dailyTaskPipelineOverride = useHistoricalSectionOverride(
    "dailyTaskPipeline",
    dailyTaskPipelineRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const notificationFunnelRange = getSectionRange("notificationFunnel");
  const notificationFunnelOverride = useHistoricalSectionOverride(
    "notificationFunnel",
    notificationFunnelRange,
    undefined,
    isLocalAdminUiTestSession,
  );
  const analyticsSnapshotRegistry = useAdminAnalyticsSnapshotRegistry({
    platformPulse: ADMIN_ANALYTICS_DEFAULT_RANGE,
    audienceSnapshot: audienceSnapshotRange,
    commerceSnapshot: commerceSnapshotRange,
    livePulse: livePulseRange,
    journeyFunnel: journeyFunnelRange,
    authOutcomeSplit: authOutcomeSplitRange,
    onboardingVelocity: onboardingVelocityRange,
    dailyTaskPipeline: dailyTaskPipelineRange,
    notificationFunnel: notificationFunnelRange,
    eventMix: eventMixRange,
    liveInteractionStream: liveInteractionStreamRange,
    dataHealthSummary: ADMIN_ANALYTICS_DEFAULT_RANGE,
  });
  const renderSectionRangeControl = (sectionKey: string) => {
    const snapshotModule = isSnapshotSectionKey(sectionKey)
      ? analyticsSnapshotRegistry.bySectionKey[sectionKey]
      : null;

    return (
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {renderBaseSectionRangeControl(sectionKey)}
        <SnapshotRefreshControl snapshotModule={snapshotModule} />
      </div>
    );
  };
  const liveRealtime = useMemo(
    () => buildSnapshotFirstRealtimeState({ liveResponse, nowMs }),
    [liveResponse, nowMs],
  );
  const effectiveLiveResponse = useMemo<RealtimeAnalyticsResponse | undefined>(
    () => {
      if (liveRealtime.feedStatus === "failed" && liveResponse) {
        return {
          ...liveResponse,
          liveTruthLabel: liveResponse.liveTruthLabel ?? "cached",
          liveSourceLabel: liveResponse.cacheSourceLabel ?? liveResponse.liveSourceLabel ?? "snapshot_first_route",
          issues: [
            ...(liveResponse.issues ?? []),
            ...liveRealtime.issues,
            liveRealtime.feedDetail,
          ].filter(
            (issue, index, array): issue is string =>
              Boolean(issue) && array.indexOf(issue) === index,
          ),
        };
      }

      if (!liveResponse && liveRealtime.feedStatus === "failed") {
        return undefined;
      }

      const base = liveResponse ?? {
        success: liveRealtime.feedStatus !== "failed",
        issues: [liveRealtime.feedDetail],
      };
      return {
        ...base,
        generatedAtMs:
          Math.max(base.generatedAtMs ?? 0, liveRealtime.generatedAtMs ?? 0) ||
          base.generatedAtMs ||
          nowMs,
        totalActive: liveRealtime.totalActive,
        deepTrackerActive: liveRealtime.deepTrackerActive,
        data: liveRealtime.data,
        activeUsers: liveRealtime.activeUsers,
        surfaceMix: liveRealtime.surfaceMix,
        liveTruthLabel: liveRealtime.liveTruthLabel,
        liveSourceLabel: liveRealtime.liveSourceLabel,
        activeUsersTruthLabel: liveRealtime.activeUsersTruthLabel,
        activeUsersSourceLabel: liveRealtime.activeUsersSourceLabel,
        cacheState: base.cacheState,
        cacheAgeMs: base.cacheAgeMs,
        cacheSourceLabel: base.cacheSourceLabel,
        cacheRevalidating: base.cacheRevalidating,
        issues: [
          ...(base.issues ?? []),
          ...liveRealtime.issues,
        ].filter(
          (issue, index, array): issue is string =>
            Boolean(issue) && array.indexOf(issue) === index,
        ),
      };
    },
    [liveRealtime, liveResponse, nowMs],
  );

  useEffect(() => {
    if (effectiveLiveResponse && effectiveLiveResponse.liveTruthLabel !== "fallback") {
      markAnalyticsOverviewHydration("firstRealtimeServerConfirmedUpdateMs");
    }
  }, [effectiveLiveResponse]);

  const liveSeries = useMemo(
    () =>
      (effectiveLiveResponse?.data ?? []).map((point) => ({
        ...point,
        label: point.minute === 0 ? "Now" : `${point.minute}m`,
      })),
    [effectiveLiveResponse],
  );

  const historySeries = historicalResponse?.data ?? [];
  const totals = historicalResponse?.totals ?? {
    users: 0,
    views: 0,
    sessions: 0,
    newUsers: 0,
    avgSessionDuration: 0,
    engagementRate: 0,
  };
  const eventBreakdown = historicalResponse?.eventBreakdown ?? [];
  const eventsData = historicalResponse?.events ?? {};
  const funnel = historicalResponse?.funnel ?? {
    authModalOpens: 0,
    authSignIns: 0,
    authSignUps: 0,
    previewOpens: 0,
    viewerOpens: 0,
    assetSwitches: 0,
    unlocks: 0,
    shares: 0,
    walletOpens: 0,
    checkoutStarts: 0,
    purchases: 0,
    checkIns: 0,
    experienceViews: 0,
  };
  const devices = historicalResponse?.devices ?? [];
  const pages = historicalResponse?.pages ?? [];
  const geo = historicalResponse?.geo ?? [];
  const topDrops = useMemo(
    () => historicalResponse?.topDrops ?? [],
    [historicalResponse?.topDrops],
  );
  const commerce = historicalResponse?.commerce ?? {
    revenueUsd: 0,
    adjustedProfitUsd: 0,
    bonusValueUsd: 0,
    deliveredGumDrops: 0,
    bonusGumDrops: 0,
    effectiveUsdPer100Gd: 0,
    gdSpent: 0,
    feed: [],
  };
  const security = historicalResponse?.security ?? [];
  const rawEvents = historicalResponse?.rawEvents ?? [];
  const onboardingStats =
    historicalResponse?.onboardingStats ?? EMPTY_ONBOARDING_STATS;
  const onboardingStepStats =
    historicalResponse?.onboardingStepStats ?? EMPTY_ONBOARDING_STEP_STATS;
  const authBreakdown = useMemo(
    () => historicalResponse?.authBreakdown ?? [],
    [historicalResponse?.authBreakdown],
  );
  const onboardingDurationBuckets =
    historicalResponse?.onboardingDurationBuckets ?? EMPTY_COUNT_BUCKETS;
  const repeatVisitSegments =
    normalizeAdminAnalyticsReturnCadenceSegments(historicalResponse);
  const destinationMix = historicalResponse?.destinationMix ?? [];
  const notificationFunnel = useMemo(
    () => historicalResponse?.notificationFunnel ?? [],
    [historicalResponse?.notificationFunnel],
  );
  const notificationActions = historicalResponse?.notificationActions ?? [];
  const taskPipeline = historicalResponse?.taskPipeline ?? [];
  const taskLeaderboard = historicalResponse?.taskLeaderboard ?? EMPTY_TASK_LEADERBOARD;
  const taskDurationBuckets = historicalResponse?.taskDurationBuckets ?? [];
  const reminderReasons = historicalResponse?.reminderReasons ?? [];
  const packagePerformance = historicalResponse?.packagePerformance ?? [];
  const unlockCategoryMix = historicalResponse?.unlockCategoryMix ?? [];
  const watchDepthBuckets = historicalResponse?.watchDepthBuckets ?? [];
  const contentJourney = historicalResponse?.contentJourney ?? [];
  const contentTagDemand = historicalResponse?.contentTagDemand ?? [];
  const viewerOverview = historicalResponse?.viewerOverview ?? {
    viewCount: 0,
    sessionCount: 0,
    uniqueViewerCount: 0,
    repeatSessionCount: 0,
    returnSessionCount: 0,
    totalWatchSeconds: 0,
    avgSessionSeconds: 0,
    avgWatchSeconds: 0,
    avgLoadMs: 0,
    assetCompletionRate: 0,
    meaningfulSessionCount: 0,
    openedWithoutDepthCount: 0,
    bounceSessionCount: 0,
    abandonedSessionCount: 0,
    stalledSessionCount: 0,
    convertedSessionCount: 0,
    completedSessionCount: 0,
    assetSwitches: 0,
    downloads: 0,
    relatedClicks: 0,
  };
  const viewerDropInsights = historicalResponse?.viewerDropInsights ?? [];
  const viewerUsers = historicalResponse?.viewerUsers ?? [];
  const watchCaptureHealth =
    historicalResponse?.watchCaptureHealth ?? EMPTY_WATCH_CAPTURE_HEALTH;
  const activeViewerFilter = historicalResponse?.viewerFilter ?? viewerUserFilter;
  const semanticCategories = historicalResponse?.semanticCategories ?? [];
  const componentContexts = historicalResponse?.componentContexts ?? [];
  const userJourneys = historicalResponse?.userJourneys ?? [];
  const experienceContexts = historicalResponse?.experienceContexts ?? [];
  const securityReasons = historicalResponse?.securityReasons ?? [];
  const liveActiveUsers = effectiveLiveResponse?.activeUsers ?? [];
  const liveSurfaceMix = effectiveLiveResponse?.surfaceMix ?? [];
  const liveWatchCaptureHealth =
    effectiveLiveResponse?.watchCaptureHealth ?? EMPTY_WATCH_CAPTURE_HEALTH;

  const needsSetup =
    effectiveLiveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info
      ?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)
      ?.info?.requiresSetup;
  const backgroundAnalyticsIssues = [
    effectiveLiveResponse && liveError
      ? `Realtime analytics: ${liveError.message || "Background refresh failed."}`
      : null,
    historicalResponse && historicalError
      ? `Historical analytics: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(effectiveLiveResponse?.issues || []).map(
      (issue) => `Realtime analytics: ${issue}`,
    ),
    ...(liveRealtime.feedStatus === "partial" || liveRealtime.feedStatus === "failed"
      ? [`Realtime analytics: ${liveRealtime.feedDetail}`]
      : []),
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics: ${issue}`,
    ),
  ].filter(
    (issue, index, array): issue is string =>
      Boolean(issue) && array.indexOf(issue) === index,
  );
  const commerceSnapshotModule = analyticsSnapshotRegistry.bySectionKey.commerceSnapshot;
  const audienceSnapshotModule = analyticsSnapshotRegistry.bySectionKey.audienceSnapshot;
  const livePulseSnapshotModule = analyticsSnapshotRegistry.bySectionKey.livePulse;
  const snapshotRevenueValue = readAdminSnapshotNumberValue(commerceSnapshotModule.snapshot, [
    "revenueUsd",
    "revenue",
    "totalRevenueUsd",
    "grossRevenueUsd",
  ]);
  const snapshotPurchasesValue = readAdminSnapshotNumberValue(commerceSnapshotModule.snapshot, [
    "purchases",
    "purchaseCount",
    "purchaseCompletions",
    "completedPurchases",
  ]);
  const snapshotMobileShareValue = normalizeAdminSnapshotRatio(readAdminSnapshotNumberValue(audienceSnapshotModule.snapshot, [
    "mobileShare",
    "mobileShareRate",
    "mobileUsersShare",
    "mobileTrafficShare",
  ]));
  const snapshotMobileUsersValue = readAdminSnapshotNumberValue(audienceSnapshotModule.snapshot, [
    "mobileUsers",
    "mobileUserCount",
  ]);
  const snapshotClassifiedUsersValue = readAdminSnapshotNumberValue(audienceSnapshotModule.snapshot, [
    "classifiedUsers",
    "totalDeviceClassifiedUsers",
    "deviceClassifiedUsers",
    "deviceUsers",
  ]);
  const snapshotUnknownDeviceUsersValue = readAdminSnapshotNumberValue(audienceSnapshotModule.snapshot, [
    "unknownDeviceUsers",
    "unclassifiedUsers",
  ]);
  const snapshotLiveActiveValue = readAdminSnapshotNumberValue(livePulseSnapshotModule.snapshot, [
    "activeCount",
    "activeUsers",
    "totalActive",
    "liveActive",
  ]);
  const overviewRevenueMetric = adminOverviewResponse?.platformPulse?.find((metric) => metric.id === "revenue");
  const overviewPurchasesMetric = adminOverviewResponse?.platformPulse?.find((metric) => metric.id === "purchases30d");
  const overviewFallbackRevenueUsd =
    typeof overviewRevenueMetric?.current30dValue === "number"
      ? overviewRevenueMetric.current30dValue / 100
      : null;
  const overviewFallbackRevenueDisplay =
    typeof overviewRevenueMetric?.primaryValue === "string" &&
    !isUnavailableOverviewDisplayLabel(overviewRevenueMetric.primaryValue)
      ? overviewRevenueMetric.primaryValue
      : overviewFallbackRevenueUsd !== null
        ? formatMoney(overviewFallbackRevenueUsd)
        : null;
  const overviewFallbackPurchasesValue =
    typeof overviewPurchasesMetric?.current30dValue === "number"
      ? overviewPurchasesMetric.current30dValue
      : null;
  const overviewFallbackPurchasesDisplay =
    typeof overviewPurchasesMetric?.primaryValue === "number"
      ? formatCompactNumber(overviewPurchasesMetric.primaryValue)
      : typeof overviewPurchasesMetric?.primaryValue === "string" &&
        !isUnavailableOverviewDisplayLabel(overviewPurchasesMetric.primaryValue)
        ? overviewPurchasesMetric.primaryValue
        : overviewFallbackPurchasesValue !== null
          ? formatCompactNumber(overviewFallbackPurchasesValue)
          : null;
  const hasOverviewSnapshotFirstValue =
    snapshotRevenueValue !== null ||
    snapshotPurchasesValue !== null ||
    snapshotMobileShareValue !== null ||
    snapshotLiveActiveValue !== null;
  const blockingAnalyticsError =
    (!effectiveLiveResponse &&
      !historicalOverviewResponse &&
      !hasOverviewSnapshotFirstValue &&
      ((liveError as Error | undefined) ||
        (liveRealtime.feedStatus === "failed"
          ? new Error(liveRealtime.feedDetail)
          : undefined))) ||
    (!historicalOverviewResponse && !hasOverviewSnapshotFirstValue && (historicalError as Error | undefined)) ||
    null;
  const isPrimingAnalytics =
    !effectiveLiveResponse &&
    !historicalOverviewResponse &&
    !hasOverviewSnapshotFirstValue &&
    (liveLoading || historicalLoading);
  const isBackgroundSyncing =
    historicalLoading && Boolean(effectiveLiveResponse || historicalOverviewResponse || hasOverviewSnapshotFirstValue);
  const analyticsWarmState = isPrimingAnalytics
    ? "Refreshing"
    : liveRealtime.feedStatus === "realtime"
      ? "Live updates active"
      : liveRealtime.feedStatus === "partial"
        ? "Live updates partial"
        : liveRealtime.feedStatus === "failed"
          ? "Live updates delayed"
          : isBackgroundSyncing
            ? "Refreshing"
            : "Showing last verified data";

  const historicalOverviewIssues = historicalOverviewResponse?.issues ?? [];
  const historicalEstimationReason =
    getHistoricalEstimationReason(historicalOverviewIssues);

  // Honest truth state for historical-sourced overview cards (Revenue, Purchases, Mobile Share)
  const historicalTruthState: AdminSurfaceState | undefined =
    historicalOverviewResponse && historicalError
      ? "cached"
      : historicalOverviewResponse?.cacheState === "refresh_due"
        ? "cached"
      : historicalOverviewResponse?.truthState?.fail
        ? "failed"
        : historicalOverviewResponse?.truthState?.warn || historicalOverviewIssues.length > 0
          ? "degraded"
          : historicalOverviewResponse?.cacheState === "fresh"
            ? "cached"
          : historicalOverviewResponse ? "live" : historicalLoading ? "loading" : "failed";

  const historicalSourceLabel =
    historicalOverviewResponse && !historicalError
      ? historicalOverviewResponse.cacheSourceLabel
        ? `${range.toUpperCase()} ${historicalOverviewResponse.cacheSourceLabel}`
        : `Server-confirmed ${range.toUpperCase()} snapshot`
      : historicalOverviewResponse && historicalError
        ? `Previous ${range.toUpperCase()} snapshot (revalidation failed)`
        : historicalLoading
          ? "Waiting for first analytics snapshot"
          : "Historical data unavailable";
  const historicalOverviewSourceLabel =
    usedHistoricalOverviewFallbackSnapshot
      ? "Last validated snapshot; refresh in progress"
      : historicalSourceLabel;

  const overviewDevices = historicalOverviewResponse?.devices ?? [];
  const overviewCommerce = historicalOverviewResponse?.commerce ?? commerce;
  const overviewFunnel = historicalOverviewResponse?.funnel ?? funnel;
  const overviewCheckoutStarts = overviewFunnel.checkoutStarts;
  const totalDeviceUsers = overviewDevices.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers =
    overviewDevices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const mobileShare = totalDeviceUsers > 0 ? mobileUsers / totalDeviceUsers : 0;

  const historicalSnapshotSurfaceState =
    resolveAdminSnapshotSurfaceState(commerceSnapshotModule.snapshot) ??
    resolveAdminSnapshotSurfaceState(audienceSnapshotModule.snapshot);
  const historicalOverviewWaitingState = resolveAdminAnalyticsWaitingCopy({
    hasVerifiedValue:
      snapshotRevenueValue !== null ||
      snapshotPurchasesValue !== null ||
      snapshotMobileShareValue !== null,
    loading: historicalLoading || commerceSnapshotModule.isLoading || audienceSnapshotModule.isLoading,
    error: historicalError instanceof Error
      ? historicalError.message
      : commerceSnapshotModule.error ?? audienceSnapshotModule.error,
  });
  const resolvedHistoricalOverviewTruthState: AdminSurfaceState =
    historicalTruthState === "live" ? "live"
    : historicalTruthState === "cached" ? "cached"
    : historicalTruthState === "degraded" ? "degraded"
    : historicalTruthState === "failed" ? "failed"
    : historicalSnapshotSurfaceState
      ? historicalSnapshotSurfaceState
    : historicalLoading ? "loading"
    : "unavailable";
  const analyticsSnapshotPending =
    !historicalOverviewResponse &&
    !usedHistoricalOverviewFallbackSnapshot &&
    (historicalLoading || !historicalError);
  const mobileSampleCount = historicalOverviewResponse
    ? totalDeviceUsers
    : snapshotClassifiedUsersValue ?? 0;
  const mobileUnknownDeviceUsers = historicalOverviewResponse
    ? 0
    : snapshotUnknownDeviceUsersValue ?? 0;
  const resolvedMobileUsers = historicalOverviewResponse
    ? mobileUsers
    : snapshotMobileUsersValue ?? 0;
  const hasMobileSample =
    historicalOverviewResponse
      ? totalDeviceUsers > 0
      : (snapshotClassifiedUsersValue ?? 0) > 0 || snapshotMobileShareValue !== null;
  const resolvedMobileShare = historicalOverviewResponse
    ? mobileShare
    : snapshotMobileShareValue;
  const checkoutStartsAvailable = historicalOverviewResponse
    ? overviewCheckoutStarts > 0
    : false;
  const checkoutStartsHint = checkoutStartsAvailable
    ? `${overviewCheckoutStarts.toLocaleString()} checkout starts`
    : "Checkout starts unavailable";
  const revenueFallbackAvailable =
    overviewFallbackRevenueUsd !== null && overviewFallbackRevenueDisplay !== null;
  const purchasesFallbackAvailable =
    overviewFallbackPurchasesValue !== null && overviewFallbackPurchasesDisplay !== null;
  const sharedFallbackExplanation = analyticsSnapshotPending
    ? "Analytics snapshot pending; showing canonical fallback truth."
    : "Realtime analytics snapshot missing; showing canonical fallback truth.";
  const overviewUnavailableDisplay = historicalLoading ? "No snapshot yet" : "Unavailable";

  const revenueCard: AnalyticsOverviewCardViewModel = historicalOverviewResponse
    ? {
      id: "revenue",
      label: "Revenue",
      primaryValue: overviewCommerce.revenueUsd,
      displayValue: formatMoney(overviewCommerce.revenueUsd),
      state:
        resolvedHistoricalOverviewTruthState === "stale"
          ? "stale"
          : resolvedHistoricalOverviewTruthState === "failed"
            ? "error"
            : resolvedHistoricalOverviewTruthState === "degraded"
              ? "partial"
              : resolvedHistoricalOverviewTruthState === "cached"
                ? "snap"
                : "live",
      truthState: resolvedHistoricalOverviewTruthState,
      sourceTruth:
        historicalOverviewResponse.cacheState === "refresh_due"
          ? "last_verified_snapshot"
          : "realtime_snapshot",
      freshnessState:
        resolvedHistoricalOverviewTruthState === "stale"
          ? "stale"
          : resolvedHistoricalOverviewTruthState === "cached"
            ? "recent"
            : "live",
      windowLabel: range.toUpperCase(),
      generatedAtUtc: historicalOverviewResponse.generatedAtMs
        ? new Date(historicalOverviewResponse.generatedAtMs).toISOString()
        : null,
      explanation: "Server-confirmed revenue from the historical analytics snapshot.",
      hint: historicalOverviewSourceLabel,
      warnings: historicalOverviewIssues,
    }
    : revenueFallbackAvailable
      ? {
        id: "revenue",
        label: "Revenue",
        primaryValue: overviewFallbackRevenueUsd,
        displayValue: overviewFallbackRevenueDisplay,
        state: "partial",
        truthState: "degraded",
        statusBadgeLabel: "PARTIAL",
        sourceTruth: "server_transactions",
        freshnessState: mapOverviewFreshnessState(overviewRevenueMetric?.freshnessState),
        windowLabel: "30D",
        generatedAtUtc: toOverviewGeneratedAtUtc(adminOverviewResponse),
        explanation: `${sharedFallbackExplanation} Fallback source: server-confirmed transactions.`,
        hint: "Fallback source: server-confirmed transactions",
        warnings: ["analytics_snapshot_pending"],
      }
      : {
        id: "revenue",
        label: "Revenue",
        primaryValue: null,
        displayValue: overviewUnavailableDisplay,
        state: historicalLoading ? "waiting" : "unavailable",
        truthState: historicalLoading ? "loading" : "unavailable",
        sourceTruth: "missing",
        freshnessState: "unknown",
        windowLabel: range.toUpperCase(),
        generatedAtUtc: null,
        explanation: "No verified revenue snapshot or accepted commerce fallback is available.",
        hint: historicalLoading ? "No verified snapshot yet." : "No verified revenue snapshot.",
        warnings: ["missing_revenue_snapshot"],
      };

  const purchasesCard: AnalyticsOverviewCardViewModel = historicalOverviewResponse
    ? {
      id: "purchases",
      label: "Purchases",
      primaryValue: overviewFunnel.purchases,
      displayValue: formatCompactNumber(overviewFunnel.purchases),
      state:
        resolvedHistoricalOverviewTruthState === "stale"
          ? "stale"
          : resolvedHistoricalOverviewTruthState === "failed"
            ? "error"
            : resolvedHistoricalOverviewTruthState === "degraded"
              ? "partial"
              : resolvedHistoricalOverviewTruthState === "cached"
                ? "snap"
                : "live",
      truthState: resolvedHistoricalOverviewTruthState,
      sourceTruth:
        historicalOverviewResponse.cacheState === "refresh_due"
          ? "last_verified_snapshot"
          : "realtime_snapshot",
      freshnessState:
        resolvedHistoricalOverviewTruthState === "stale"
          ? "stale"
          : resolvedHistoricalOverviewTruthState === "cached"
            ? "recent"
            : "live",
      windowLabel: range.toUpperCase(),
      generatedAtUtc: historicalOverviewResponse.generatedAtMs
        ? new Date(historicalOverviewResponse.generatedAtMs).toISOString()
        : null,
      explanation: checkoutStartsAvailable
        ? "Purchase completions from the historical analytics snapshot."
        : "Purchase completions are available, but checkout starts do not have a verified telemetry sample in this window.",
      hint: `${checkoutStartsHint} · ${historicalOverviewSourceLabel}`,
      warnings: checkoutStartsAvailable ? historicalOverviewIssues : [...historicalOverviewIssues, "checkout_starts_unavailable"],
    }
    : purchasesFallbackAvailable
      ? {
        id: "purchases",
        label: "Purchases",
        primaryValue: overviewFallbackPurchasesValue,
        displayValue: overviewFallbackPurchasesDisplay,
        state: "partial",
        truthState: "degraded",
        statusBadgeLabel: "PARTIAL",
        sourceTruth: "server_transactions",
        freshnessState: mapOverviewFreshnessState(overviewPurchasesMetric?.freshnessState),
        windowLabel: "30D",
        generatedAtUtc: toOverviewGeneratedAtUtc(adminOverviewResponse),
        explanation: `${sharedFallbackExplanation} Fallback source: completed purchase transactions.`,
        hint: "Checkout starts unavailable · Fallback source: completed transactions",
        warnings: ["analytics_snapshot_pending", "checkout_starts_unavailable"],
      }
      : {
        id: "purchases",
        label: "Purchases",
        primaryValue: null,
        displayValue: overviewUnavailableDisplay,
        state: historicalLoading ? "waiting" : "unavailable",
        truthState: historicalLoading ? "loading" : "unavailable",
        sourceTruth: "missing",
        freshnessState: "unknown",
        windowLabel: range.toUpperCase(),
        generatedAtUtc: null,
        explanation: "No verified purchase snapshot or accepted transaction fallback is available.",
        hint: historicalLoading ? "No verified snapshot yet." : "No verified purchase snapshot.",
        warnings: ["missing_purchase_snapshot"],
      };

  const mobileShareCard: AnalyticsOverviewCardViewModel = hasMobileSample && resolvedMobileShare !== null
    ? {
      id: "mobile_share",
      label: "Mobile Share",
      primaryValue: resolvedMobileShare,
      displayValue: formatPercent(resolvedMobileShare),
      state:
        historicalOverviewResponse && resolvedHistoricalOverviewTruthState === "stale"
          ? "stale"
          : historicalOverviewResponse && resolvedHistoricalOverviewTruthState === "cached"
            ? "snap"
            : "live",
      truthState:
        historicalOverviewResponse
          ? resolvedHistoricalOverviewTruthState
          : "cached",
      statusBadgeLabel:
        historicalOverviewResponse
          ? undefined
          : "SNAP",
      sourceTruth: historicalOverviewResponse ? "realtime_snapshot" : "device_sample",
      freshnessState:
        historicalOverviewResponse
          ? resolvedHistoricalOverviewTruthState === "stale"
            ? "stale"
            : resolvedHistoricalOverviewTruthState === "cached"
              ? "recent"
              : "live"
          : "recent",
      windowLabel: range.toUpperCase(),
      generatedAtUtc: historicalOverviewResponse?.generatedAtMs
        ? new Date(historicalOverviewResponse.generatedAtMs).toISOString()
        : null,
      explanation: "Mobile share is based on device-classified visitor samples only.",
      hint:
        mobileSampleCount > 0
          ? `${resolvedMobileUsers.toLocaleString()} mobile users · ${mobileSampleCount.toLocaleString()} classified`
          : "Last verified device sample",
      warnings: mobileUnknownDeviceUsers > 0 ? ["unknown_device_users_present"] : [],
    }
    : {
      id: "mobile_share",
      label: "Mobile Share",
      primaryValue: null,
      displayValue: "No device sample",
      state: "unavailable",
      truthState: "degraded",
      statusBadgeLabel: "NO SAMPLE",
      sourceTruth: "missing",
      freshnessState: "not_observed",
      windowLabel: range.toUpperCase(),
      generatedAtUtc: null,
      explanation: "Mobile share needs a device-classified traffic sample.",
      hint: "No device-classified traffic sample in this range",
      warnings: ["device_sample_missing"],
    };
  const revenueDisplay = revenueCard.displayValue;
  const purchasesDisplay = purchasesCard.displayValue;
  const mobileShareDisplay = mobileShareCard.displayValue;
  const livePulseLatestVerifiedSnapshot = resolveLivePulseSnapshotState({
    liveResponse,
    snapshotModule: livePulseSnapshotModule,
  });
  const livePulseDisplayState = resolveAdminAnalyticsDisplayState({
    latestVerifiedSnapshot: livePulseLatestVerifiedSnapshot,
    realtimeState: {
      status: liveRealtime.feedStatus,
      hasData:
        liveRealtime.feedStatus === "realtime" ||
        liveRealtime.activeUsers.length > 0 ||
        liveRealtime.data.some((point) => point.users > 0 || point.views > 0),
      sourceMode: liveRealtime.feedStatus === "realtime"
        ? "live"
        : liveRealtime.feedStatus === "snapshot"
          ? "fallback"
          : liveRealtime.feedStatus === "partial"
            ? "mixed"
            : "unavailable",
      error: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null,
      graphAvailable: liveSeries.some((point) => point.users > 0 || point.views > 0),
    },
    refreshState: {
      status: liveLoading || livePulseSnapshotModule.refreshStatus === "refreshing"
        ? "refreshing"
        : livePulseSnapshotModule.refreshStatus,
    },
    errorState: {
      realtimeError: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null,
      snapshotError: livePulseSnapshotModule.error,
      refreshError: liveError instanceof Error ? liveError.message : null,
    },
    moduleConfig: {
      moduleKey: "live_pulse",
      title: "Activity Snapshot",
      refreshAvailable: true,
      metricValue: effectiveLiveResponse?.totalActive ?? null,
      serverConfirmedZero:
        effectiveLiveResponse?.totalActive === 0 &&
        Boolean(liveResponse?.generatedAtMs || liveRealtime.feedStatus === "realtime"),
      graphSourceAvailable: liveSeries.some((point) => point.users > 0 || point.views > 0),
    },
  });
  const liveActiveWaitingState = resolveAdminAnalyticsWaitingCopy({
    hasVerifiedValue: snapshotLiveActiveValue !== null,
    loading: liveLoading || livePulseSnapshotModule.isLoading,
    error: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : livePulseSnapshotModule.error,
  });
  const liveActiveDisplay =
    livePulseDisplayState.fakeZeroPrevented && livePulseDisplayState.shouldShowUnavailable
      ? liveActiveWaitingState.label ?? "No verified snapshot yet"
      : effectiveLiveResponse?.totalActive === undefined || effectiveLiveResponse?.totalActive === null
        ? snapshotLiveActiveValue !== null
          ? formatCompactNumber(snapshotLiveActiveValue)
          : liveActiveWaitingState.label ?? "No verified snapshot yet"
        : formatCompactNumber(effectiveLiveResponse.totalActive);
  const liveActiveTruthState: AdminSurfaceState | undefined =
    mapDisplayStateToAdminSurfaceState(livePulseDisplayState);
  const livePulseFeedStatus =
    livePulseDisplayState.shouldRenderSnapshot && !livePulseDisplayState.shouldRenderRealtimeUpgrade
      ? "snapshot"
      : liveRealtime.feedStatus;
  const livePulseTruthStateForModel = mapDisplayStateToAdminSurfaceState(livePulseDisplayState);
  const livePulseGuestTraffic = historicalResponse?.guestTraffic;
  const livePulseModel = buildAdminAnalyticsLivePulseModel({
    activeUsers: liveActiveUsers,
    surfaceMix: liveSurfaceMix,
    liveSeries,
    feedStatus: livePulseFeedStatus,
    feedDetail: liveRealtime.feedDetail,
    truthState: livePulseTruthStateForModel,
    activeUsersTruthState: effectiveLiveResponse?.activeUsersTruthLabel
      ? coerceAdminSurfaceState(effectiveLiveResponse.activeUsersTruthLabel)
      : livePulseTruthStateForModel,
    listenerDebugMeta: liveRealtime.listenerDebugMeta,
    nowMs,
    liveLoading,
    cacheRevalidating: effectiveLiveResponse?.cacheRevalidating,
    displayState: livePulseDisplayState,
    latestVerifiedSnapshotAgeMs: readDisplaySnapshotAgeMs(livePulseLatestVerifiedSnapshot, nowMs),
    refreshStatus: livePulseSnapshotModule.refreshStatus,
    laneFailures: liveRealtime.issues,
    guestEstimateState: livePulseGuestTraffic?.truthLabel === "estimated"
      ? "estimated"
      : livePulseGuestTraffic?.truthLabel === "exact"
        ? "observed"
        : livePulseGuestTraffic?.truthLabel === "unknown"
          ? "unknown"
          : liveActiveUsers.some((item) => item.actorType === "guest")
            ? "observed"
            : "not_observed",
    guestEstimateConfidence: livePulseGuestTraffic?.truthLabel === "estimated"
      ? livePulseGuestTraffic.qualityAvailable
        ? 0.8
        : 0.55
      : livePulseGuestTraffic?.truthLabel === "exact"
        ? 1
        : null,
    guestEstimateSourceLabel: livePulseGuestTraffic?.sourceLabel ?? null,
    guestAnalyticsSnapshot: effectiveLiveResponse?.guestAnalyticsSnapshot ?? null,
  });
  const liveActivePrimaryValue =
    effectiveLiveResponse?.totalActive ?? snapshotLiveActiveValue ?? null;
  const analyticsOverviewDisplayMetrics: Record<
    AdminAnalyticsOverviewDisplayMetric["id"],
    AdminAnalyticsOverviewDisplayMetric
  > = {
    liveActive: buildAdminAnalyticsOverviewDisplayMetric({
      id: "liveActive",
      label: "Active Users",
      displayValue:
        liveActiveWaitingState.reason === "first_snapshot_pending" &&
        liveActiveDisplay === liveActiveWaitingState.label
          ? "No snapshot yet"
          : liveActiveDisplay,
      primaryValue: liveActivePrimaryValue,
      truthState: liveActiveTruthState ?? (liveLoading ? "loading" : "unavailable"),
      sourceTruth: effectiveLiveResponse && (
        liveRealtime.feedStatus === "realtime" || liveRealtime.feedStatus === "partial"
      )
        ? "realtime_snapshot"
        : snapshotLiveActiveValue !== null
          ? "last_verified_snapshot"
          : "missing",
      generatedAtUtc: effectiveLiveResponse?.generatedAtMs
        ? new Date(effectiveLiveResponse.generatedAtMs).toISOString()
        : livePulseLatestVerifiedSnapshot?.lastVerifiedAt
          ? new Date(livePulseLatestVerifiedSnapshot.lastVerifiedAt).toISOString()
          : null,
      nowMs,
      debugReason: livePulseDisplayState.debugReason,
      debugSource: livePulseDisplayState.visibleValueSource,
      compactFreshnessLine:
        liveActivePrimaryValue === null
          ? "Unavailable"
          : effectiveLiveResponse?.generatedAtMs
            ? `Updated ${formatRelativeTime(effectiveLiveResponse.generatedAtMs, nowMs)}`
            : "Last verified data",
      unavailableLine: "Unavailable",
      loading: liveLoading && liveActivePrimaryValue === null,
      badgeLabel: liveActiveTruthState ? ANALYTICS_OVERVIEW_BADGE_LABELS[liveActiveTruthState] : undefined,
    }),
    mobileShare: buildAdminAnalyticsOverviewDisplayMetric({
      id: "mobileShare",
      label: "Mobile Share",
      displayValue: mobileShareCard.displayValue,
      primaryValue: toOverviewPrimaryNumber(mobileShareCard.primaryValue),
      truthState: mobileShareCard.truthState,
      sourceTruth: mobileShareCard.sourceTruth,
      generatedAtUtc: mobileShareCard.generatedAtUtc,
      nowMs,
      debugReason: mobileShareCard.explanation,
      debugSource: mobileShareCard.sourceTruth,
      compactFreshnessLine:
        mobileShareCard.primaryValue === null
          ? "No classified traffic sample."
          : formatOverviewGeneratedAtLine(mobileShareCard.generatedAtUtc, nowMs, "Last verified device sample"),
      unavailableLine: "No classified traffic sample.",
      badgeLabel: mobileShareCard.statusBadgeLabel,
    }),
    revenue: buildAdminAnalyticsOverviewDisplayMetric({
      id: "revenue",
      label: "Revenue",
      displayValue: revenueCard.displayValue,
      primaryValue: toOverviewPrimaryNumber(revenueCard.primaryValue),
      truthState: revenueCard.truthState,
      sourceTruth: revenueCard.sourceTruth,
      generatedAtUtc: revenueCard.generatedAtUtc,
      nowMs,
      debugReason: revenueCard.explanation,
      debugSource: revenueFallbackAvailable && !historicalOverviewResponse
        ? "server_transaction_fallback"
        : revenueCard.sourceTruth,
      compactFreshnessLine:
        revenueFallbackAvailable && !historicalOverviewResponse
          ? "From confirmed transactions - updated 30d"
          : revenueCard.primaryValue === null
            ? "No verified snapshot yet."
            : formatOverviewGeneratedAtLine(revenueCard.generatedAtUtc, nowMs, historicalOverviewSourceLabel),
      unavailableLine: "No verified snapshot yet.",
      loading: historicalLoading && revenueCard.primaryValue === null,
      badgeLabel: revenueCard.statusBadgeLabel,
    }),
    purchases: buildAdminAnalyticsOverviewDisplayMetric({
      id: "purchases",
      label: "Purchases",
      displayValue: purchasesCard.displayValue,
      primaryValue: toOverviewPrimaryNumber(purchasesCard.primaryValue),
      truthState: purchasesCard.truthState,
      sourceTruth: purchasesCard.sourceTruth,
      generatedAtUtc: purchasesCard.generatedAtUtc,
      nowMs,
      debugReason: purchasesCard.explanation,
      debugSource: purchasesFallbackAvailable && !historicalOverviewResponse
        ? "server_transaction_fallback"
        : purchasesCard.sourceTruth,
      compactFreshnessLine:
        purchasesFallbackAvailable && !historicalOverviewResponse
          ? "Confirmed purchases - fallback"
          : purchasesCard.primaryValue === null
            ? "No verified snapshot yet."
            : formatOverviewGeneratedAtLine(purchasesCard.generatedAtUtc, nowMs, historicalOverviewSourceLabel),
      unavailableLine: "No verified snapshot yet.",
      loading: historicalLoading && purchasesCard.primaryValue === null,
      badgeLabel: purchasesCard.statusBadgeLabel,
    }),
  };
  const historicalOverviewTruthState: AdminSurfaceState | undefined =
    resolvedHistoricalOverviewTruthState;

  const firstHistoricalOverviewValueMs =
    analyticsOverviewHydrationMarks.lastValidatedSnapshotRenderMs ??
    analyticsOverviewHydrationMarks.backendRefreshCompleteMs ??
    null;
  const overviewMetricHydrationMs: Record<AdminAnalyticsOverviewMetricKey, number | null> = {
    liveActive:
      analyticsOverviewHydrationMarks.firstRealtimeServerConfirmedUpdateMs ??
      analyticsOverviewHydrationMarks.backendRefreshCompleteMs ??
      null,
    mobileShare: firstHistoricalOverviewValueMs,
    revenue: firstHistoricalOverviewValueMs,
    purchases: firstHistoricalOverviewValueMs,
  };
  const overviewRefreshDeduped =
    historicalOverviewResponse?.cacheRevalidating === true && historicalLoading;
  const visibleDegradedMainCopy =
    backgroundAnalyticsIssues.length > 0
      ? "Live updates are delayed. Showing last verified data."
      : "";
  const visibleHistoricalEstimationCopy = historicalEstimationReason
    ? "Guest traffic is estimated for this range."
    : "";
  const visibleDegradedCopy = Array.from(new Set([
    visibleDegradedMainCopy,
    visibleHistoricalEstimationCopy,
    ...backgroundAnalyticsIssues.map(summarizeAdminIssueForOperator),
  ].filter(Boolean)));

  const buildOverviewMetricDebugMeta = ({
    metricKey,
    visibleValue,
    value,
    valueSource,
    truthState,
    sourceTruth,
    freshnessState,
    statusBadgeLabel,
    realtimeLaneStatus,
    snapshotModule,
    waitingShownBecause,
    waitingAllowed,
    blocksOnRealtime = false,
    blocksOnRefresh = false,
    waterfallDetected = false,
  }: {
    metricKey: AdminAnalyticsOverviewMetricKey;
    visibleValue: string;
    value: number | null;
    valueSource: string;
    truthState: AdminSurfaceState;
    sourceTruth: AnalyticsOverviewCard["sourceTruth"];
    freshnessState: AnalyticsOverviewCard["freshnessState"];
    statusBadgeLabel?: string;
    realtimeLaneStatus: string | null;
    snapshotModule: AdminAnalyticsSnapshotModuleState | null;
    waitingShownBecause: string | null;
    waitingAllowed: boolean;
    blocksOnRealtime?: boolean;
    blocksOnRefresh?: boolean;
    waterfallDetected?: boolean;
  }) => {
    const hydrationMs = overviewMetricHydrationMs[metricKey];
    const sourceUnavailable = value === null;
    const snapshotUsedOnFirstRender = valueSource === "verified_snapshot";
    const refreshStatus =
      snapshotModule?.refreshStatus ??
      (historicalLoading || liveLoading ? "refreshing" : "idle");

    return {
      metricKey,
      visibleValue,
      value,
      valueSource,
      truthState,
      badgeLabel: statusBadgeLabel ?? ANALYTICS_OVERVIEW_BADGE_LABELS[truthState],
      sourceTruth,
      freshnessState,
      fullStatusLabel: metricKey === "liveActive"
        ? liveRealtime.feedDetail
        : valueSource === "server_transaction_fallback"
          ? "Analytics snapshot pending; fallback source: server-confirmed transactions"
          : historicalOverviewSourceLabel,
      fromCache: metricKey === "liveActive" ? null : historicalOverviewResponse?.cacheState !== undefined,
      serverConfirmed: metricKey === "liveActive"
        ? Boolean(effectiveLiveResponse && effectiveLiveResponse.liveTruthLabel !== "fallback")
        : sourceTruth === "server_transactions" || Boolean(historicalResponse),
      stale: false,
      lastValidatedAt: metricKey === "liveActive"
        ? effectiveLiveResponse?.generatedAtMs ?? null
        : historicalOverviewResponse?.generatedAtMs ?? adminOverviewResponse?.generatedAt ?? null,
      realtimeLaneStatus,
      backendSnapshotStatus: metricKey === "liveActive"
        ? liveResponse?.cacheState ?? null
        : historicalOverviewResponse?.cacheState ?? null,
      backendRefreshStatus: historicalLoading
        ? "running"
        : historicalError
          ? "failed"
          : historicalResponse
            ? "complete"
            : "waiting",
      hydrationMs,
      firstTruthyValueMs: hydrationMs,
      exceededHydrationBudget:
        Boolean(usedHistoricalOverviewFallbackSnapshot) &&
        (hydrationMs ?? Number.POSITIVE_INFINITY) > ADMIN_ANALYTICS_OVERVIEW_HYDRATION_BUDGET_MS,
      usedFallbackSnapshot: metricKey !== "liveActive" && usedHistoricalOverviewFallbackSnapshot,
      fakeZeroPrevented: sourceUnavailable,
      cacheKey: snapshotModule?.snapshot?.cacheKey ?? `${snapshotModule?.moduleKey ?? metricKey}:${snapshotModule?.rangeKey ?? range}`,
      refreshVersion: snapshotModule?.snapshot?.refreshVersion ?? 0,
      sourceVersion: snapshotModule?.snapshot?.sourceVersion ?? null,
      firstSnapshotMs: snapshotModule?.firstSnapshotMs ?? null,
      firstUsefulValueMs: hydrationMs ?? snapshotModule?.firstSnapshotMs ?? null,
      lastRefreshRequestedAt: snapshotModule?.snapshot?.lastRefreshRequestedAt ?? null,
      refreshStartedAt: snapshotModule?.snapshot?.refreshStartedAt ?? null,
      refreshCompletedAt: snapshotModule?.snapshot?.refreshCompletedAt ?? null,
      refreshStatus,
      snapshotUsedOnFirstRender,
      displaySource: valueSource,
      displayAllowedBecause: value !== null
        ? valueSource === "verified_snapshot"
          ? "last_verified_snapshot_exists"
          : "server_or_realtime_value_exists"
        : null,
      displayBlockedBecause: value === null
        ? waitingShownBecause ?? snapshotModule?.unavailableReason ?? "no_verified_snapshot"
        : null,
      waitingShownBecause,
      waitingAllowed,
      blocksOnRealtime,
      blocksOnRefresh,
      blocksOnTimeExpiry: false,
      fallbackSnapshotUsed:
        snapshotUsedOnFirstRender ||
        (metricKey !== "liveActive" && usedHistoricalOverviewFallbackSnapshot),
      fakeWaitingPrevented: snapshotUsedOnFirstRender,
      waterfallDetected,
      refreshDedupeHit: snapshotModule?.duplicateRefreshPrevented === true,
      staleButVerified: false,
      invalidationReason: snapshotModule?.snapshot?.invalidationReason ?? null,
      estimatedGuestTraffic: metricKey === "mobileShare" && Boolean(historicalEstimationReason),
      anonymousBatchStatus: historicalEstimationReason ? "estimated_until_batches_arrive" : "not_applicable",
      routerRefreshUsed: false,
      revalidationUsed: false,
      parityWarnings: snapshotModule?.snapshot?.parity?.filter((entry) => entry.status === "warn" || entry.status === "fail") ?? [],
      slowSource: hydrationMs && hydrationMs > ADMIN_ANALYTICS_OVERVIEW_HYDRATION_BUDGET_MS
        ? { key: valueSource, timingMs: hydrationMs }
        : null,
      cacheControlMode: metricKey === "liveActive" ? "private-no-store-hot-cache" : "private-no-store-stale-while-revalidate",
    };
  };

  // Debug meta registry for admin instrumentation
  const analyticsOverviewDebugMeta = {
    metrics: {
      liveActive: buildOverviewMetricDebugMeta({
        metricKey: "liveActive",
        visibleValue: liveActiveDisplay,
        value: effectiveLiveResponse?.totalActive ?? snapshotLiveActiveValue,
        valueSource: effectiveLiveResponse?.totalActive !== undefined && effectiveLiveResponse?.totalActive !== null
          ? liveRealtime.feedStatus === "realtime" ? "firestore_realtime" : liveRealtime.feedStatus === "partial" ? "firestore_partial" : "verified_snapshot"
          : snapshotLiveActiveValue !== null ? "verified_snapshot" : liveLoading ? "hydrating" : "unavailable",
        truthState: liveActiveTruthState ?? (liveLoading ? "loading" : "unavailable"),
        sourceTruth: effectiveLiveResponse ? "realtime_snapshot" : snapshotLiveActiveValue !== null ? "last_verified_snapshot" : "missing",
        freshnessState: liveActiveTruthState === "live" ? "live" : liveActiveTruthState === "cached" ? "recent" : liveActiveTruthState === "stale" ? "stale" : "unknown",
        realtimeLaneStatus: liveRealtime.feedStatus,
        snapshotModule: livePulseSnapshotModule,
        waitingShownBecause: effectiveLiveResponse?.totalActive === undefined || effectiveLiveResponse?.totalActive === null
          ? liveActiveWaitingState.reason
          : null,
        waitingAllowed: liveActiveWaitingState.allowed,
        blocksOnRealtime: false,
        blocksOnRefresh: false,
      }),
      mobileShare: buildOverviewMetricDebugMeta({
        metricKey: "mobileShare",
        visibleValue: mobileShareDisplay,
        value: typeof mobileShareCard.primaryValue === "number" ? mobileShareCard.primaryValue : null,
        valueSource: historicalOverviewResponse?.cacheState === "fresh" ? "server_cache"
          : historicalOverviewResponse?.cacheState === "refresh_due" ? "refresh_due_server_cache"
          : hasMobileSample ? "verified_snapshot" : historicalLoading ? "hydrating" : "unavailable",
        truthState: mobileShareCard.truthState,
        sourceTruth: mobileShareCard.sourceTruth,
        freshnessState: mobileShareCard.freshnessState,
        statusBadgeLabel: mobileShareCard.statusBadgeLabel,
        realtimeLaneStatus: null,
        snapshotModule: audienceSnapshotModule,
        waitingShownBecause: historicalOverviewResponse || hasMobileSample
          ? null
          : historicalOverviewWaitingState.reason,
        waitingAllowed: historicalOverviewWaitingState.allowed,
        blocksOnRefresh: false,
      }),
      revenue: buildOverviewMetricDebugMeta({
        metricKey: "revenue",
        visibleValue: revenueDisplay,
        value: typeof revenueCard.primaryValue === "number" ? revenueCard.primaryValue : null,
        valueSource: historicalOverviewResponse?.cacheState === "fresh" ? "server_cache"
          : historicalOverviewResponse?.cacheState === "refresh_due" ? "refresh_due_server_cache"
          : revenueFallbackAvailable ? "server_transaction_fallback" : snapshotRevenueValue !== null ? "verified_snapshot" : historicalLoading ? "hydrating" : "unavailable",
        truthState: revenueCard.truthState,
        sourceTruth: revenueCard.sourceTruth,
        freshnessState: revenueCard.freshnessState,
        statusBadgeLabel: revenueCard.statusBadgeLabel,
        realtimeLaneStatus: null,
        snapshotModule: commerceSnapshotModule,
        waitingShownBecause: historicalOverviewResponse || snapshotRevenueValue !== null || revenueFallbackAvailable
          ? null
          : historicalOverviewWaitingState.reason,
        waitingAllowed: historicalOverviewWaitingState.allowed,
        blocksOnRefresh: false,
      }),
      purchases: buildOverviewMetricDebugMeta({
        metricKey: "purchases",
        visibleValue: purchasesDisplay,
        value: typeof purchasesCard.primaryValue === "number" ? purchasesCard.primaryValue : null,
        valueSource: historicalOverviewResponse?.cacheState === "fresh" ? "server_cache"
          : historicalOverviewResponse?.cacheState === "refresh_due" ? "refresh_due_server_cache"
          : purchasesFallbackAvailable ? "server_transaction_fallback" : snapshotPurchasesValue !== null ? "verified_snapshot" : historicalLoading ? "hydrating" : "unavailable",
        truthState: purchasesCard.truthState,
        sourceTruth: purchasesCard.sourceTruth,
        freshnessState: purchasesCard.freshnessState,
        statusBadgeLabel: purchasesCard.statusBadgeLabel,
        realtimeLaneStatus: null,
        snapshotModule: commerceSnapshotModule,
        waitingShownBecause: historicalOverviewResponse || snapshotPurchasesValue !== null || purchasesFallbackAvailable
          ? null
          : historicalOverviewWaitingState.reason,
        waitingAllowed: historicalOverviewWaitingState.allowed,
        blocksOnRefresh: false,
      }),
    },
    realtimeListenerDebug: liveRealtime.listenerDebugMeta ?? null,
    realtimeLaneFailures: backgroundAnalyticsIssues.filter((issue) =>
      issue.toLowerCase().includes("realtime analytics"),
    ),
    historicalEstimationReason,
    cards: {
      liveActive: {
        sourceTruth: effectiveLiveResponse && (
          liveRealtime.feedStatus === "realtime" || liveRealtime.feedStatus === "partial"
        ) ? "realtime_snapshot" : snapshotLiveActiveValue !== null ? "last_verified_snapshot" : "missing",
        freshnessState: liveActiveTruthState === "live" ? "live" : liveActiveTruthState === "cached" ? "recent" : liveActiveTruthState === "stale" ? "stale" : "unknown",
      },
      mobileShare: mobileShareCard,
      revenue: revenueCard,
      purchases: purchasesCard,
    },
    visibleDegradedCopy,
    fullDegradedReasons: backgroundAnalyticsIssues,
    refreshDeduped: overviewRefreshDeduped,
    duplicateRefreshPrevented: overviewRefreshDeduped,
    hydrationBudgetMs: ADMIN_ANALYTICS_OVERVIEW_HYDRATION_BUDGET_MS,
    hydrationMarks: analyticsOverviewHydrationMarks,
    totalHydrationMs: Math.max(
      ...Object.values(analyticsOverviewHydrationMarks).filter(
        (value): value is number => typeof value === "number",
      ),
      0,
    ),
    historicalTruthState: historicalOverviewTruthState,
    historicalSourceLabel: historicalOverviewSourceLabel,
    backgroundIssueCount: backgroundAnalyticsIssues.length,
    analyticsWarmState,
  } as const;
  const previewToUnlockRate =
    funnel.previewOpens > 0 ? funnel.unlocks / funnel.previewOpens : 0;
  const checkoutToPurchaseRate =
    funnel.checkoutStarts > 0 ? funnel.purchases / funnel.checkoutStarts : 0;
  const securityAlerts = security.filter((item) =>
    isRecentViolation(item.lastViolation, nowMs),
  ).length;
  const onboardingStartCount = onboardingStats.starts ?? 0;
  const onboardingCompletionRate =
    onboardingStats.completionRate ??
    (onboardingStartCount > 0
      ? onboardingStats.completions / Math.max(1, onboardingStartCount)
      : 0);
  const onboardingDropOffCount = Math.max(
    0,
    onboardingStartCount - onboardingStats.completions,
  );
  const historicalOnboardingModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        stats: onboardingStats,
        durationBuckets: onboardingDurationBuckets,
        steps: onboardingStepStats,
        authSignUps: funnel.authSignUps,
      }),
    [funnel.authSignUps, onboardingDurationBuckets, onboardingStats, onboardingStepStats],
  );
  const globalSemantics = semanticCategories.find(
    (item) => item.key === "global",
  );
  const userSemantics = semanticCategories.find((item) => item.key === "user");
  const adminSemantics = semanticCategories.find(
    (item) => item.key === "admin",
  );
  const dropSemantics = semanticCategories.find((item) => item.key === "drop");
  const guestTraffic = livePulseGuestTraffic;
  const guestViewsDisplayCount =
    guestTraffic?.truthLabel === "estimated"
      ? guestTraffic.estimatedGuestViews
      : guestTraffic?.exactGuestViews ?? globalSemantics?.viewCount ?? 0;
  const guestViewsHint =
    guestTraffic?.truthLabel === "estimated"
      ? `Estimated from GA totals minus identified first-party traffic (${formatCompactNumber(guestTraffic.estimatedGuestViews)} views)`
      : `${(globalSemantics?.clickCount ?? 0).toLocaleString()} tracked public clicks`;
  const guestQualityUnavailable =
    guestTraffic?.truthLabel === "estimated" && !guestTraffic.qualityAvailable;
  const guestBounceRate =
    globalSemantics && globalSemantics.viewCount > 0
      ? globalSemantics.bounceCount / Math.max(1, globalSemantics.viewCount)
      : 0;
  const guestEngagedRate = globalSemantics?.engagedRate ?? 0;
  const guestBounceRateDisplay = guestQualityUnavailable
    ? "Unknown"
    : formatPercent(guestBounceRate);
  const guestEngagedRateDisplay = guestQualityUnavailable
    ? "Unknown"
    : formatPercent(guestEngagedRate);
  const guestBounceHint = guestQualityUnavailable
    ? "Anonymous quality metrics are unavailable because consented guest semantic batches did not land in this window."
    : `${(globalSemantics?.bounceCount ?? 0).toLocaleString()} bounced exits`;
  const guestEngagedHint = guestQualityUnavailable
    ? "Guest engagement quality is unavailable without consented guest semantic batches."
    : `${(globalSemantics?.engagedViewCount ?? 0).toLocaleString()} engaged sessions`;
  const identifiedBounceRate =
    userSemantics && userSemantics.viewCount > 0
      ? userSemantics.bounceCount / Math.max(1, userSemantics.viewCount)
      : 0;
  const semanticQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views: guestViewsDisplayCount,
      engaged: globalSemantics?.engagedViewCount ?? 0,
      bounced: globalSemantics?.bounceCount ?? 0,
      exits: globalSemantics?.exitCount ?? 0,
      truthLabel: guestTraffic?.truthLabel ?? "unknown",
    },
    {
      key: "user",
      label: "Signed-in",
      views: userSemantics?.viewCount ?? 0,
      engaged: userSemantics?.engagedViewCount ?? 0,
      bounced: userSemantics?.bounceCount ?? 0,
      exits: userSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: adminSemantics?.viewCount ?? 0,
      engaged: adminSemantics?.engagedViewCount ?? 0,
      bounced: adminSemantics?.bounceCount ?? 0,
      exits: adminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: dropSemantics?.viewCount ?? 0,
      engaged: dropSemantics?.engagedViewCount ?? 0,
      bounced: dropSemantics?.bounceCount ?? 0,
      exits: dropSemantics?.exitCount ?? 0,
    },
  ];

  const topEvents = eventBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const topComponentContexts = componentContexts.slice(0, 6);
  const topUserJourneys = userJourneys.slice(0, 6);
  const topExperienceContexts = experienceContexts.slice(0, 6);
  const topSecurityReasons = securityReasons.slice(0, 8);
  const liveSnapshotLabel = effectiveLiveResponse?.generatedAtMs
    ? formatRelativeTime(effectiveLiveResponse.generatedAtMs, nowMs)
    : liveLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const historicalSnapshotLabel = historicalResponse?.generatedAtMs
    ? formatRelativeTime(historicalResponse.generatedAtMs, nowMs)
    : historicalLoading
      ? "Fetching..."
      : "Awaiting snapshot";
  const livePulseData =
    livePulseRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : livePulseOverride.data;
  const livePulseFunnel = livePulseData?.funnel ?? funnel;
  const livePulseOnboardingStats =
    livePulseData?.onboardingStats ?? onboardingStats;
  const livePulseOnboardingStartCount = livePulseOnboardingStats.starts ?? 0;
  const livePulseOnboardingCompletionRate =
    livePulseOnboardingStats.completionRate ??
    (livePulseOnboardingStartCount > 0
      ? livePulseOnboardingStats.completions /
        Math.max(1, livePulseOnboardingStartCount)
      : 0);
  const journeyFunnelData =
    journeyFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : journeyFunnelOverride.data;
  const journeyFunnelMetrics = journeyFunnelData?.funnel ?? funnel;
  const journeyFunnelModel = buildAdminAnalyticsJourneyFunnelModel({
    selectedRange: journeyFunnelRange,
    response: journeyFunnelData,
    funnel: journeyFunnelMetrics,
    onboardingStats: journeyFunnelData?.onboardingStats ?? onboardingStats,
    loading: journeyFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalLoading
      : journeyFunnelOverride.isLoading,
    error: journeyFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalError
      : journeyFunnelOverride.error,
    overviewTruthState: historicalOverviewTruthState,
  });
  const authOutcomeData =
    authOutcomeSplitRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : authOutcomeSplitOverride.data;
  const authOutcomeBreakdown = authOutcomeData?.authBreakdown ?? authBreakdown;
  const authOutcomeChartModel = useMemo(
    () => buildAuthOutcomeChartModel(authOutcomeBreakdown),
    [authOutcomeBreakdown],
  );
  const authOutcomeModel = useMemo(
    () => buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: authOutcomeSplitRange,
      response: authOutcomeData,
      authBreakdown: authOutcomeBreakdown,
      loading: authOutcomeSplitRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : authOutcomeSplitOverride.isLoading,
      error: (authOutcomeSplitRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalError
        : authOutcomeSplitOverride.error) ?? undefined,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      authOutcomeBreakdown,
      authOutcomeData,
      authOutcomeSplitOverride.error,
      authOutcomeSplitOverride.isLoading,
      authOutcomeSplitRange,
      historicalError,
      historicalLoading,
      historicalOverviewTruthState,
    ],
  );
  const authOutcomeChartItems = authOutcomeChartModel.items;
  const authOutcomeTotals = authOutcomeChartModel.totals;
  const authOutcomeHasData = authOutcomeChartModel.hasData;
  const onboardingStepFlowData =
    onboardingStepFlowRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingStepFlowOverride.data;
  const onboardingStepFlowStats =
    onboardingStepFlowData?.onboardingStepStats ?? onboardingStepStats;
  const onboardingVelocityData =
    onboardingVelocityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : onboardingVelocityOverride.data;
  const onboardingVelocityStats =
    onboardingVelocityData?.onboardingStats ?? onboardingStats;
  const onboardingVelocityBuckets =
    onboardingVelocityData?.onboardingDurationBuckets ??
    onboardingDurationBuckets;
  const onboardingVelocityModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        selectedRange: onboardingVelocityRange,
        response: onboardingVelocityData,
        stats: onboardingVelocityStats,
        durationBuckets: onboardingVelocityBuckets,
        steps: onboardingStepFlowStats,
        authSignUps: journeyFunnelMetrics.authSignUps,
        loading: onboardingVelocityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
          ? historicalLoading
          : onboardingVelocityOverride.isLoading,
        error: (onboardingVelocityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
          ? historicalError
          : onboardingVelocityOverride.error) ?? undefined,
        overviewTruthState: historicalOverviewTruthState,
      }),
    [
      historicalError,
      historicalLoading,
      historicalOverviewTruthState,
      journeyFunnelMetrics.authSignUps,
      onboardingStepFlowStats,
      onboardingVelocityBuckets,
      onboardingVelocityData,
      onboardingVelocityOverride.error,
      onboardingVelocityOverride.isLoading,
      onboardingVelocityRange,
      onboardingVelocityStats,
    ],
  );
  const onboardingStepFlowModel = useMemo(
    () =>
      buildAdminOnboardingVelocityModel({
        stats: onboardingVelocityStats,
        durationBuckets: [],
        steps: onboardingStepFlowStats,
        authSignUps: journeyFunnelMetrics.authSignUps,
      }),
    [journeyFunnelMetrics.authSignUps, onboardingStepFlowStats, onboardingVelocityStats],
  );
  const onboardingStepFlowItems = onboardingStepFlowModel.steps;
  const onboardingVelocityStartCount = onboardingVelocityModel.starts;
  const onboardingVelocityCompletionRate = onboardingVelocityModel.completionRate;
  const onboardingVelocityDropOffCount = onboardingVelocityModel.dropOffCount;
  const onboardingVelocityHasData = onboardingVelocityModel.hasVelocityData;
  const onboardingVelocityCompletionCount = onboardingVelocityModel.completions;
  const authOnboardingDiscrepancies = onboardingVelocityModel.discrepancies;
  const onboardingVelocityStartSourceHint =
    onboardingVelocityStats.startSource === "tracked"
      ? "Canonical starts"
      : onboardingVelocityStats.startSource === "completion_fallback"
        ? "Backfilled from completions"
        : "No start signals";
  const guestBounceQualityData =
    guestBounceQualityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : guestBounceQualityOverride.data;
  const guestBounceTraffic = guestBounceQualityData?.guestTraffic ?? guestTraffic;
  const guestBounceSemantics =
    guestBounceQualityData?.semanticCategories ?? semanticCategories;
  const guestBounceGlobalSemantics = guestBounceSemantics.find(
    (item) => item.key === "global",
  );
  const guestBounceUserSemantics = guestBounceSemantics.find(
    (item) => item.key === "user",
  );
  const guestBounceAdminSemantics = guestBounceSemantics.find(
    (item) => item.key === "admin",
  );
  const guestBounceDropSemantics = guestBounceSemantics.find(
    (item) => item.key === "drop",
  );
  const guestBounceGuestRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.bounceCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceIdentifiedRate =
    guestBounceUserSemantics && guestBounceUserSemantics.viewCount > 0
      ? guestBounceUserSemantics.bounceCount /
        Math.max(1, guestBounceUserSemantics.viewCount)
      : 0;
  const guestBounceEngagedRate =
    guestBounceGlobalSemantics && guestBounceGlobalSemantics.viewCount > 0
      ? guestBounceGlobalSemantics.engagedViewCount /
        Math.max(1, guestBounceGlobalSemantics.viewCount)
      : 0;
  const guestBounceQualityUnavailable =
    guestBounceTraffic?.truthLabel === "estimated"
      && !guestBounceTraffic.qualityAvailable;
  const guestBounceQualityCards = [
    {
      key: "global",
      label: "Guest / Public",
      views:
        guestBounceTraffic?.truthLabel === "estimated"
          ? guestBounceTraffic.estimatedGuestViews
          : guestBounceGlobalSemantics?.viewCount ?? 0,
      engaged: guestBounceGlobalSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceGlobalSemantics?.bounceCount ?? 0,
      exits: guestBounceGlobalSemantics?.exitCount ?? 0,
      truthLabel: guestBounceTraffic?.truthLabel ?? "unknown",
    },
    {
      key: "user",
      label: "Signed-in",
      views: guestBounceUserSemantics?.viewCount ?? 0,
      engaged: guestBounceUserSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceUserSemantics?.bounceCount ?? 0,
      exits: guestBounceUserSemantics?.exitCount ?? 0,
    },
    {
      key: "admin",
      label: "Admin",
      views: guestBounceAdminSemantics?.viewCount ?? 0,
      engaged: guestBounceAdminSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceAdminSemantics?.bounceCount ?? 0,
      exits: guestBounceAdminSemantics?.exitCount ?? 0,
    },
    {
      key: "drop",
      label: "Viewer",
      views: guestBounceDropSemantics?.viewCount ?? 0,
      engaged: guestBounceDropSemantics?.engagedViewCount ?? 0,
      bounced: guestBounceDropSemantics?.bounceCount ?? 0,
      exits: guestBounceDropSemantics?.exitCount ?? 0,
    },
  ];
  const guestBounceQualityModel = useMemo(
    () => buildAdminAnalyticsGuestBounceQualityModel({
      selectedRange: guestBounceQualityRange,
      response: guestBounceQualityData,
      guestTraffic: guestBounceTraffic,
      semanticCategories: guestBounceSemantics,
      loading: guestBounceQualityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : guestBounceQualityOverride.isLoading,
      error: (guestBounceQualityRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalError
        : guestBounceQualityOverride.error) ?? undefined,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      guestBounceQualityRange,
      guestBounceQualityData,
      guestBounceTraffic,
      guestBounceSemantics,
      historicalLoading,
      guestBounceQualityOverride.isLoading,
      historicalError,
      guestBounceQualityOverride.error,
      historicalOverviewTruthState,
    ],
  );
  const eventMixData =
    eventMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : eventMixOverride.data;
  const eventMixBreakdown = eventMixData?.eventBreakdown ?? eventBreakdown;
  const eventMixComponentContexts =
    eventMixData?.componentContexts ?? componentContexts;
  const eventMixTopEvents = eventMixBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label:
      EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));
  const eventMixTopComponentContexts = eventMixComponentContexts.slice(0, 6);
  const eventMixModel = useMemo(
    () => buildAdminAnalyticsEventMixModel({
      selectedRange: eventMixRange,
      response: eventMixData,
      eventBreakdown: eventMixBreakdown,
      componentContexts: eventMixComponentContexts,
      eventLabels: EVENT_LABELS,
      loading: eventMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : eventMixOverride.isLoading,
      error: (eventMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalError
        : eventMixOverride.error) ?? undefined,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      eventMixRange,
      eventMixData,
      eventMixBreakdown,
      eventMixComponentContexts,
      historicalLoading,
      eventMixOverride.isLoading,
      historicalError,
      eventMixOverride.error,
      historicalOverviewTruthState,
    ],
  );
  const liveInteractionData =
    liveInteractionStreamRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : liveInteractionStreamOverride.data;
  const liveInteractionStreamData = liveInteractionData;
  const liveInteractionEvents = liveInteractionData?.rawEvents ?? rawEvents;
  const liveInteractionStreamModel = useMemo(
    () => buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: liveInteractionStreamRange,
      response: liveInteractionData,
      rawEvents: liveInteractionEvents,
      describeEvent,
      loading: liveInteractionStreamRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : liveInteractionStreamOverride.isLoading,
      error: (liveInteractionStreamRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalError
        : liveInteractionStreamOverride.error) ?? undefined,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      liveInteractionStreamRange,
      liveInteractionData,
      liveInteractionEvents,
      historicalLoading,
      liveInteractionStreamOverride.isLoading,
      historicalError,
      liveInteractionStreamOverride.error,
      historicalOverviewTruthState,
    ],
  );
  const audienceSnapshotData =
    audienceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : audienceSnapshotOverride.data;
  const audienceHistorySeries = audienceSnapshotData?.data ?? historySeries;
  const audienceTotals = audienceSnapshotData?.totals ?? totals;
  const audienceDevices = audienceSnapshotData?.devices ?? devices;
  const returnCadenceData =
    returnCadenceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : returnCadenceOverride.data;
  const returnCadenceSegments = returnCadenceData
    ? normalizeAdminAnalyticsReturnCadenceSegments(returnCadenceData)
    : repeatVisitSegments;
  const returnCadenceSummary =
    buildAdminAnalyticsReturnCadenceSummary(returnCadenceSegments);
  const returnCadenceModel = useMemo(
    () => buildAdminAnalyticsReturnCadenceModel({
      response: returnCadenceData,
      selectedRange: returnCadenceRange,
      loading: returnCadenceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : returnCadenceOverride.isLoading,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      returnCadenceData,
      returnCadenceRange,
      historicalLoading,
      returnCadenceOverride.isLoading,
      historicalOverviewTruthState,
    ],
  );
  const navigationDestinationsData =
    navigationDestinationsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : navigationDestinationsOverride.data;
  const navigationDestinationsMix =
    navigationDestinationsData?.destinationMix ?? destinationMix;
  const navigationDestinationsModel = useMemo(
    () => buildAdminAnalyticsNavigationDestinationsModel({
      response: navigationDestinationsData,
      selectedRange: navigationDestinationsRange,
      loading: navigationDestinationsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : navigationDestinationsOverride.isLoading,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      navigationDestinationsData,
      navigationDestinationsRange,
      historicalLoading,
      navigationDestinationsOverride.isLoading,
      historicalOverviewTruthState,
    ],
  );
  const deviceMixData =
    deviceMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : deviceMixOverride.data;
  const deviceMixDevices = deviceMixData?.devices ?? devices;
  const deviceMixModel = useMemo(
    () => buildAdminAnalyticsDeviceMixModel({
      response: deviceMixData,
      selectedRange: deviceMixRange,
      loading: deviceMixRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : deviceMixOverride.isLoading,
    }),
    [
      deviceMixData,
      deviceMixRange,
      historicalLoading,
      deviceMixOverride.isLoading,
    ],
  );
  const topPathsData =
    topPathsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topPathsOverride.data;
  const topPathsPages = topPathsData?.pages ?? pages;
  const topPathsModel = useMemo(
    () => buildAdminAnalyticsTopPathsModel({
      response: topPathsData,
      selectedRange: topPathsRange,
      loading: topPathsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : topPathsOverride.isLoading,
    }),
    [
      topPathsData,
      topPathsRange,
      historicalLoading,
      topPathsOverride.isLoading,
    ],
  );
  const regionsData =
    regionsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : regionsOverride.data;
  const regionsGeo = regionsData?.geo ?? geo;
  const regionsModel = useMemo(
    () => buildAdminAnalyticsRegionDemandModel({
      response: regionsData,
      selectedRange: regionsRange,
      loading: regionsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : regionsOverride.isLoading,
    }),
    [
      regionsData,
      regionsRange,
      historicalLoading,
      regionsOverride.isLoading,
    ],
  );
  const commerceSnapshotData =
    commerceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : commerceSnapshotOverride.data;
  const commerceSnapshotCommerce = commerceSnapshotData?.commerce ?? commerce;
  const commerceSnapshotFunnel = commerceSnapshotData?.funnel ?? funnel;
  const packagePerformanceData =
    packagePerformanceRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : packagePerformanceOverride.data;
  const packagePerformanceItems =
    packagePerformanceData?.packagePerformance ?? packagePerformance;
  const packagePerformancePanelState = packagePerformanceData?.packagePerformanceState;
  const contentConversionData =
    contentConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : contentConversionOverride.data;
  const contentConversionItems =
    contentConversionData?.unlockCategoryMix ?? unlockCategoryMix;
  const contentConversionModel = useMemo(
    () => buildAdminAnalyticsContentConversionModel({
      response: contentConversionData,
      selectedRange: contentConversionRange,
      loading: contentConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : contentConversionOverride.isLoading,
    }),
    [
      contentConversionData,
      contentConversionRange,
      historicalLoading,
      contentConversionOverride.isLoading,
    ],
  );
  const topDropConversionData =
    topDropConversionRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : topDropConversionOverride.data;
  const topDropConversionItems = topDropConversionData?.topDrops ?? topDrops;
  const topDropConversionModel = useMemo(
    () => buildAdminAnalyticsTopDropConversionModel({
      response: topDropConversionData,
      selectedRange: topDropConversionRange,
      page: topDropConversionPage,
      pageSize: topDropConversionPageSize,
    }),
    [
      topDropConversionData,
      topDropConversionRange,
      topDropConversionPage,
      topDropConversionPageSize,
    ],
  );
  const recentCommerceFeedData =
    recentCommerceFeedRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : recentCommerceFeedOverride.data;
  const recentCommerceFeedItems = useMemo(
    () => recentCommerceFeedData?.commerce?.feed ?? commerce.feed ?? [],
    [commerce.feed, recentCommerceFeedData?.commerce?.feed],
  );
  const recentCommerceFeedModel = useMemo(
    () => buildAdminAnalyticsRecentCommerceFeedState({
      items: recentCommerceFeedItems,
      selectedRange: recentCommerceFeedRange,
      generatedAtMs: recentCommerceFeedData?.generatedAtMs ?? historicalResponse?.generatedAtMs,
      nowMs,
    }),
    [
      recentCommerceFeedItems,
      recentCommerceFeedRange,
      recentCommerceFeedData?.generatedAtMs,
      historicalResponse?.generatedAtMs,
      nowMs,
    ],
  );
  const viewerDrilldownData =
    viewerDrilldownRange === ADMIN_ANALYTICS_DEFAULT_RANGE && !viewerUserFilter
      ? historicalResponse
      : viewerDrilldownOverride.data;
  const viewerDrilldownOverview =
    viewerDrilldownData?.viewerOverview ?? viewerOverview;
  const viewerDrilldownInsights =
    viewerDrilldownData?.viewerDropInsights ?? viewerDropInsights;
  const viewerDrilldownUsers = viewerDrilldownData?.viewerUsers ?? viewerUsers;
  const viewerDrilldownCaptureHealth =
    viewerDrilldownData?.watchCaptureHealth ?? watchCaptureHealth;
  const viewerDrilldownFilter =
    viewerDrilldownData?.viewerFilter ?? activeViewerFilter;
  const viewerDrilldownGeneratedAtMs =
    viewerDrilldownData?.generatedAtMs ?? historicalResponse?.generatedAtMs ?? 0;
  const viewerDrilldownJourneys = (
    viewerDrilldownData?.userJourneys ?? userJourneys
  ).slice(0, 6);
  const viewerDropChartData = viewerDrilldownInsights
    .slice(0, 8)
    .map((item) => ({
      ...item,
      shortLabel:
        item.dropTitle.length > 16
          ? `${item.dropTitle.slice(0, 16)}...`
          : item.dropTitle,
    }));
  const viewerJourneyData =
    viewerJourneyRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : viewerJourneyOverride.data;
  const viewerJourneyItems =
    viewerJourneyData?.contentJourney ?? contentJourney;
  const watchDepthTagsData =
    watchDepthTagsRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : watchDepthTagsOverride.data;
  const watchDepthTagBuckets =
    watchDepthTagsData?.watchDepthBuckets ?? watchDepthBuckets;
  const watchDepthTagDemand =
    watchDepthTagsData?.contentTagDemand ?? contentTagDemand;
  const dailyTaskPipelineData =
    dailyTaskPipelineRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : dailyTaskPipelineOverride.data;
  const dailyTaskPipelineItems =
    dailyTaskPipelineData?.taskPipeline ?? taskPipeline;
  const dailyTaskPipelineDurationBuckets =
    dailyTaskPipelineData?.taskDurationBuckets ?? taskDurationBuckets;
  const dailyTaskPipelineModel = useMemo(
    () => buildAdminTaskPipelineModel({
      selectedRange: dailyTaskPipelineRange,
      response: dailyTaskPipelineData,
      items: dailyTaskPipelineItems,
      taskDurationBuckets: dailyTaskPipelineDurationBuckets,
      taskLeaderboard: dailyTaskPipelineData?.taskLeaderboard ?? taskLeaderboard,
      loading: dailyTaskPipelineRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalLoading
        : dailyTaskPipelineOverride.isLoading,
      error: (dailyTaskPipelineRange === ADMIN_ANALYTICS_DEFAULT_RANGE
        ? historicalError
        : dailyTaskPipelineOverride.error) ?? undefined,
      overviewTruthState: historicalOverviewTruthState,
    }),
    [
      dailyTaskPipelineRange,
      dailyTaskPipelineData,
      dailyTaskPipelineItems,
      dailyTaskPipelineDurationBuckets,
      taskLeaderboard,
      historicalLoading,
      dailyTaskPipelineOverride.isLoading,
      historicalError,
      dailyTaskPipelineOverride.error,
      historicalOverviewTruthState,
    ],
  );
  const notificationFunnelData =
    notificationFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalResponse
      : notificationFunnelOverride.data;
  const notificationFunnelItems =
    notificationFunnelData?.notificationFunnel ?? notificationFunnel;
  const notificationActionItems =
    notificationFunnelData?.notificationActions ?? notificationActions;
  const notificationReminderReasons =
    notificationFunnelData?.reminderReasons ?? reminderReasons;
  const notificationFunnelModel = useMemo(
    () =>
      buildAdminNotificationFunnelModel({
        funnelItems: notificationFunnelItems,
        actionItems: notificationActionItems,
        reminderReasons: notificationReminderReasons,
        selectedRange: notificationFunnelRange,
        response: notificationFunnelData,
        loading: notificationFunnelRange === ADMIN_ANALYTICS_DEFAULT_RANGE
          ? historicalLoading
          : notificationFunnelOverride.isLoading,
      }),
    [
      historicalLoading,
      notificationActionItems,
      notificationFunnelData,
      notificationFunnelItems,
      notificationFunnelOverride.isLoading,
      notificationReminderReasons,
      notificationFunnelRange,
    ],
  );
  const deviceMixTotalUsers = deviceMixDevices.reduce(
    (sum, item) => sum + item.users,
    0,
  );
  const historicalHasSignals =
    historySeries.some(
      (point) =>
        point.users > 0 ||
        point.views > 0 ||
        point.sessions > 0 ||
        point.newUsers > 0,
    ) ||
    eventBreakdown.length > 0 ||
    semanticCategories.some(
      (item) =>
        item.viewCount > 0 ||
        item.clickCount > 0 ||
        item.hoverCount > 0 ||
        item.watchSessionCount > 0 ||
        item.signInCount > 0 ||
        item.returnCount > 0 ||
        item.logoutCount > 0,
    ) ||
    devices.length > 0 ||
    pages.length > 0 ||
    geo.length > 0 ||
    topDrops.length > 0 ||
    (commerce.feed?.length ?? 0) > 0 ||
    historicalOnboardingModel.starts > 0 ||
    historicalOnboardingModel.completions > 0 ||
    viewerDropInsights.length > 0 ||
    viewerUsers.length > 0 ||
    taskLeaderboard.length > 0 ||
    packagePerformance.length > 0;
  const showHistoricalEmptyState =
    Boolean(historicalResponse) &&
    !historicalLoading &&
    !blockingAnalyticsError &&
    !historicalHasSignals;
  const adminAnalyticsSourceHierarchy = buildAdminAnalyticsSourceHierarchy({
    sourceAgreementState: historicalOverviewResponse?.analyticsSourceHealth?.sourceAgreement.state ?? (showHistoricalEmptyState ? "not_enough_sources" : "pass"),
    chartReadinessState: historicalOverviewResponse?.analyticsSourceHealth?.chartReadiness.state ?? (showHistoricalEmptyState ? "unavailable" : "ready"),
    analyticsTabHasData: historicalHasSignals,
    debugHasData: Boolean(historicalOverviewResponse?.analyticsSourceHealth) || showHistoricalEmptyState,
    sourceUsedByAnalyticsTab: historicalOverviewResponse ? "admin_analytics_canonical_snapshot" : "local_fallback_empty_state",
  });
  const liveBlockingIssues =
    !effectiveLiveResponse && liveError
      ? [liveError.message || "Realtime analytics request failed."]
      : [];
  const historicalBlockingIssues =
    !historicalResponse && historicalError
      ? [historicalError.message || "Historical analytics request failed."]
      : [];
  const liveBackgroundIssues = [
    effectiveLiveResponse && liveError
      ? `Realtime analytics refresh failed: ${liveError.message || "Background refresh failed."}`
      : null,
    ...(effectiveLiveResponse?.issues || []).map(
      (issue) => `Realtime analytics issue: ${issue}`,
    ),
    ...(liveRealtime.feedStatus === "partial" || liveRealtime.feedStatus === "failed"
      ? [`Realtime analytics issue: ${liveRealtime.feedDetail}`]
      : []),
  ].filter((issue): issue is string => Boolean(issue));
  const historicalBackgroundIssues = [
    historicalResponse && historicalError
      ? `Historical analytics refresh failed: ${historicalError.message || "Background refresh failed."}`
      : null,
    ...(historicalResponse?.issues || []).map(
      (issue) => `Historical analytics issue: ${issue}`,
    ),
  ].filter((issue): issue is string => Boolean(issue));
  const liveUpdatedAtMs = effectiveLiveResponse?.generatedAtMs ?? 0;
  const historicalUpdatedAtMs = historicalResponse?.generatedAtMs ?? 0;
  const buildHistoricalSectionState = (
    sectionLabel: string,
    sectionRange: RangeOption,
    overrideRequest: {
      data?: HistoricalAnalyticsResponse;
      error?: Error;
      isLoading: boolean;
    },
  ) => {
    if (sectionRange === ADMIN_ANALYTICS_DEFAULT_RANGE) {
      return {
        updatedAtMs: historicalUpdatedAtMs,
        hasLoaded: Boolean(historicalResponse) || Boolean(historicalError),
        loading: historicalLoading,
        blockingIssues: historicalBlockingIssues,
        backgroundIssues: historicalBackgroundIssues,
      };
    }

    const overrideErrorMessage =
      overrideRequest.error?.message ||
      `${sectionLabel} analytics request failed.`;
    return {
      updatedAtMs: overrideRequest.data?.generatedAtMs ?? 0,
      hasLoaded:
        Boolean(overrideRequest.data) || Boolean(overrideRequest.error),
      loading: overrideRequest.isLoading,
      blockingIssues:
        !overrideRequest.data && overrideRequest.error
          ? [`${sectionLabel}: ${overrideErrorMessage}`]
          : [],
      backgroundIssues: [
        overrideRequest.data && overrideRequest.error
          ? `${sectionLabel}: ${overrideErrorMessage}`
          : null,
        ...(overrideRequest.data?.issues || []).map(
          (issue) => `${sectionLabel}: ${issue}`,
        ),
      ].filter((issue): issue is string => Boolean(issue)),
    };
  };
  const authOutcomeSplitState = buildHistoricalSectionState(
    "Auth outcome split",
    authOutcomeSplitRange,
    authOutcomeSplitOverride,
  );
  const onboardingVelocityState = buildHistoricalSectionState(
    "Onboarding velocity",
    onboardingVelocityRange,
    onboardingVelocityOverride,
  );
  const onboardingStepFlowState = buildHistoricalSectionState(
    "Onboarding step flow",
    onboardingStepFlowRange,
    onboardingStepFlowOverride,
  );
  const guestBounceQualityState = buildHistoricalSectionState(
    "Guest and bounce quality",
    guestBounceQualityRange,
    guestBounceQualityOverride,
  );
  const eventMixState = buildHistoricalSectionState(
    "Event mix",
    eventMixRange,
    eventMixOverride,
  );
  const liveInteractionStreamState = buildHistoricalSectionState(
    "Live interaction stream",
    liveInteractionStreamRange,
    liveInteractionStreamOverride,
  );
  const audienceSnapshotState = buildHistoricalSectionState(
    "Audience snapshot",
    audienceSnapshotRange,
    audienceSnapshotOverride,
  );
  const audienceSnapshotModel = buildAdminAnalyticsAudienceSnapshotModel({
    selectedRange: audienceSnapshotRange,
    response: audienceSnapshotData,
    loading: audienceSnapshotState.loading,
    error: audienceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalError
      : audienceSnapshotOverride.error,
    overviewTruthState: historicalOverviewTruthState,
  });
  const returnCadenceState = buildHistoricalSectionState(
    "Return cadence",
    returnCadenceRange,
    returnCadenceOverride,
  );
  const navigationDestinationsState = buildHistoricalSectionState(
    "Navigation destinations",
    navigationDestinationsRange,
    navigationDestinationsOverride,
  );
  const deviceMixState = buildHistoricalSectionState(
    "Device mix",
    deviceMixRange,
    deviceMixOverride,
  );
  const topPathsState = buildHistoricalSectionState(
    "Top paths",
    topPathsRange,
    topPathsOverride,
  );
  const regionsState = buildHistoricalSectionState(
    "Regions",
    regionsRange,
    regionsOverride,
  );
  const commerceSnapshotState = buildHistoricalSectionState(
    "Commerce snapshot",
    commerceSnapshotRange,
    commerceSnapshotOverride,
  );
  const commerceSnapshotModel = buildAdminAnalyticsCommerceSnapshotModel({
    selectedRange: commerceSnapshotRange,
    response: commerceSnapshotData,
    commerce: commerceSnapshotCommerce,
    funnel: commerceSnapshotFunnel,
    loading: commerceSnapshotState.loading,
    error: commerceSnapshotRange === ADMIN_ANALYTICS_DEFAULT_RANGE
      ? historicalError
      : commerceSnapshotOverride.error,
    overviewTruthState: historicalOverviewTruthState,
  });
  const packagePerformanceState = buildHistoricalSectionState(
    "Package performance",
    packagePerformanceRange,
    packagePerformanceOverride,
  );
  const contentConversionState = buildHistoricalSectionState(
    "Content conversion",
    contentConversionRange,
    contentConversionOverride,
  );
  const topDropConversionState = buildHistoricalSectionState(
    "Top drop conversion",
    topDropConversionRange,
    topDropConversionOverride,
  );
  const recentCommerceFeedState = buildHistoricalSectionState(
    "Recent commerce feed",
    recentCommerceFeedRange,
    recentCommerceFeedOverride,
  );
  const viewerDrilldownState = buildHistoricalSectionState(
    "Viewer drilldown",
    viewerDrilldownRange,
    viewerDrilldownOverride,
  );
  const viewerJourneyState = buildHistoricalSectionState(
    "Viewer journey",
    viewerJourneyRange,
    viewerJourneyOverride,
  );
  const watchDepthTagsState = buildHistoricalSectionState(
    "Watch depth and tags",
    watchDepthTagsRange,
    watchDepthTagsOverride,
  );
  const dailyTaskPipelineState = buildHistoricalSectionState(
    "Daily task pipeline",
    dailyTaskPipelineRange,
    dailyTaskPipelineOverride,
  );
  const notificationFunnelState = buildHistoricalSectionState(
    "Notification funnel",
    notificationFunnelRange,
    notificationFunnelOverride,
  );
  const panelHydration = useMemo(
    () => {
      const report = buildAnalyticsPanelHydrationReport({
        runtimeSignals: [
          {
            panelId: "traffic_overview",
            hasData: historicalHasSignals,
            sourceLoaded: Boolean(historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "active_users",
            hasData: liveRealtime.totalActive > 0 || liveRealtime.activeUsers.length > 0,
            sourceLoaded: Boolean(effectiveLiveResponse),
            lastSeenAt: liveUpdatedAtMs ? new Date(liveUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "new_users_signups",
            hasData: historicalOnboardingModel.starts > 0 || authBreakdown.length > 0,
            sourceLoaded: Boolean(historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "returning_users",
            hasData: returnCadenceSegments.length > 0,
            sourceLoaded: Boolean(returnCadenceData ?? historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "journey_funnel",
            hasData: Object.values(journeyFunnelMetrics).some((value) => Number(value) > 0),
            sourceLoaded: Boolean(historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "drop_opens",
            hasData: topDrops.length > 0 || contentConversionItems.length > 0,
            sourceLoaded: Boolean(historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "watch_time",
            hasData: viewerDrilldownInsights.length > 0 || watchDepthTagBuckets.length > 0,
            sourceLoaded: Boolean(viewerDrilldownData ?? historicalResponse),
            lastSeenAt: viewerDrilldownGeneratedAtMs ? new Date(viewerDrilldownGeneratedAtMs).toISOString() : null,
          },
          {
            panelId: "wallet_opens",
            hasData: packagePerformanceItems.length > 0 || recentCommerceFeedItems.length > 0,
            sourceLoaded: Boolean(commerceSnapshotData ?? historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "task_starts",
            hasData: dailyTaskPipelineItems.length > 0,
            sourceLoaded: Boolean(dailyTaskPipelineData ?? historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "notification_prompts",
            hasData: notificationFunnelItems.length > 0 || notificationActionItems.length > 0,
            sourceLoaded: Boolean(notificationFunnelData ?? historicalResponse),
            lastSeenAt: historicalUpdatedAtMs ? new Date(historicalUpdatedAtMs).toISOString() : null,
          },
          {
            panelId: "realtime_health",
            hasData: liveRealtime.feedStatus === "snapshot" || liveRealtime.feedStatus === "partial",
            sourceLoaded: Boolean(effectiveLiveResponse),
            lastSeenAt: liveUpdatedAtMs ? new Date(liveUpdatedAtMs).toISOString() : null,
            error: liveRealtime.feedStatus === "failed" ? liveRealtime.feedDetail : null,
          },
        ],
      });

      return {
        summary: report.debugLane,
        panelStatus: report.panelStatus,
        topPanelHydrationFailures: report.topPanelHydrationFailures,
      };
    },
    [
      historicalHasSignals,
      historicalResponse,
      historicalUpdatedAtMs,
      liveRealtime.totalActive,
      liveRealtime.activeUsers,
      liveRealtime.feedStatus,
      liveRealtime.feedDetail,
      effectiveLiveResponse,
      liveUpdatedAtMs,
      historicalOnboardingModel.starts,
      authBreakdown,
      returnCadenceSegments,
      returnCadenceData,
      journeyFunnelMetrics,
      topDrops,
      contentConversionItems,
      viewerDrilldownInsights,
      watchDepthTagBuckets,
      viewerDrilldownData,
      viewerDrilldownGeneratedAtMs,
      packagePerformanceItems,
      recentCommerceFeedItems,
      commerceSnapshotData,
      dailyTaskPipelineItems,
      dailyTaskPipelineData,
      notificationFunnelItems,
      notificationActionItems,
      notificationFunnelData,
    ],
  );

  const applyViewerFilter = () => {
    setViewerUserFilter(viewerUserDraft.trim());
  };

  const clearViewerFilter = () => {
    setViewerUserDraft("");
    setViewerUserFilter("");
  };

  const clearAllFilters = () => {
    clearViewerFilter();
  };

  const setActiveTabDeferred = (nextTab: ViewTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  };

  
  return {
    user, isLocalAdminUiTestSession, activeTab, setActiveTab: setActiveTabDeferred, range, nowMs, viewerUserDraft, setViewerUserDraft, viewerUserFilter, setViewerUserFilter,
    moduleRanges, setModuleRanges, savingSectionKey, setSavingSectionKey, analyticsFilterStorageKey, analyticsSnapshotRegistry, analyticsSnapshotMigrationDebug: analyticsSnapshotRegistry.debug,
    liveResponse: effectiveLiveResponse, historicalResponse, liveError, historicalError, liveLoading, historicalLoading,
    needsSetup, blockingAnalyticsError, isPrimingAnalytics, backgroundAnalyticsIssues, getSectionRange, renderSectionRangeControl,
    EVENT_LABELS, funnel, onboardingStats, onboardingDurationBuckets, onboardingStepStats, authBreakdown, historySeries,
    rawEvents, componentContexts, semanticCategories, devices, pages, geo, totals, commerce, activeViewerFilter,
    clearAllFilters, clearViewerFilter,
    showHistoricalEmptyState, liveSnapshotLabel, historicalSnapshotLabel, analyticsWarmState, isBackgroundSyncing, historicalTruthState, historicalSourceLabel, historicalOverviewSourceLabel, visibleDegradedCopy,
    adminAnalyticsSourceHierarchy, panelHydration,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals, authOutcomeModel,
    authOnboardingDiscrepancies, onboardingVelocityModel, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    guestBounceQualityCards, guestBounceQualityModel, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    guestViewsDisplayCount, guestViewsHint, guestBounceRateDisplay, guestBounceHint, guestEngagedRateDisplay, guestEngagedHint, guestQualityUnavailable,
    topEvents, liveInteractionStreamRange, liveInteractionStreamData, liveInteractionEvents, liveInteractionStreamModel,
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    audienceTotals, audienceHistorySeries, audienceSnapshotModel,
    returnCadenceRange, returnCadenceData, returnCadenceSegments, returnCadenceSummary, returnCadenceModel,
    navigationDestinationsRange, destinationMix, navigationDestinationsMix, navigationDestinationsModel, deviceMixRange, getDeviceIcon, deviceMixDevices, deviceMixTotalUsers, deviceMixModel, topPathsRange, topPathsPages, topPathsModel, regionsRange, regionsGeo, regionsModel,
    commerceSnapshotRange, commerceSnapshotCommerce, commerceSnapshotFunnel, commerceSnapshotModel, packagePerformanceRange, packagePerformance, packagePerformanceItems, packagePerformancePanelState,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, contentConversionItems, contentConversionModel, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops, topDropConversionItems, topDropConversionModel, topDropConversionPage, setTopDropConversionPage, topDropConversionPageSize, setTopDropConversionPageSize, recentCommerceFeedRange, recentCommerceFeedItems, recentCommerceFeedModel, describeEvent, formatAbsoluteDateTime,
    formatMoney, formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, livePulseModel, journeyFunnelMetrics, journeyFunnelModel,
    liveFeedStatus: liveRealtime.feedStatus, liveFeedDetail: liveRealtime.feedDetail, liveGuestActiveCount: liveRealtime.guestActive
,
    revenueDisplay, purchasesDisplay, mobileShareDisplay, liveActiveDisplay, liveActiveTruthState, historicalOverviewTruthState, analyticsOverviewDebugMeta, overviewCheckoutStarts, analyticsOverviewDisplayMetrics,
    analyticsOverviewCards: {
      mobileShare: mobileShareCard,
      revenue: revenueCard,
      purchases: purchasesCard,
    },
    viewerDrilldownRange, viewerDrilldownGeneratedAtMs, viewerDrilldownFilter, viewerDrilldownOverview, applyViewerFilter, viewerDrilldownUsers, viewerDrilldownCaptureHealth, liveWatchCaptureHealth, viewerDrilldownJourneys, viewerDrilldownInsights, viewerDropChartData, viewerJourneyRange, viewerJourneyItems, watchDepthTagsRange, watchDepthTagBuckets, watchDepthTagDemand,
    getJourneyStateClasses, getJourneyStateLabel, topExperienceContexts, topComponentContexts, eventMixTopEvents, eventMixTopComponentContexts, eventMixModel,
    dailyTaskPipelineModel, notificationFunnelModel
  };
}

export type AdminAnalyticsState = ReturnType<typeof useAdminAnalyticsState>;

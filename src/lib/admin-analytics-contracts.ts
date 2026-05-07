import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminAnalyticsCommerceSnapshotModel } from "@/lib/admin-analytics-commerce-snapshot";
import type { AdminAnalyticsLivePulseModel } from "@/lib/admin-analytics-live-pulse";
import type { AdminAnalyticsReturnCadenceModel } from "@/lib/admin-analytics-return-cadence";
import type { ContentConversionRow } from "@/types/admin-analytics";

export type AdminAnalyticsContractKey =
  | "badge_labels"
  | "live_pulse"
  | "commerce_snapshot"
  | "return_cadence"
  | "content_conversion"
  | "top_drop_conversion"
  | "viewer_drilldown"
  | "journey_funnel";

export type AdminAnalyticsContractRegistryEntry = {
  key: AdminAnalyticsContractKey;
  label: string;
  ownerFile: string;
  formulas: string[];
  denominators?: string[];
  badgePolicy?: string;
};

export const ADMIN_ANALYTICS_MODULE_CONTRACT_REGISTRY: readonly AdminAnalyticsContractRegistryEntry[] = [
  {
    key: "badge_labels",
    label: "Analytics badge labels",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: ["Admin analytics badge labels come from contract-owned surface state mapping."],
    badgePolicy: "Contract owns LIVE/SNAP/REVIEW/DELAYED/WAIT/ERROR label mapping.",
  },
  {
    key: "live_pulse",
    label: "Live Pulse",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: [
      "Badge labels derive from live pulse mode and presence source status.",
      "Journey denominator copy is contract-owned.",
    ],
    badgePolicy: "Tabs must not map live pulse mode to badges inline.",
  },
  {
    key: "commerce_snapshot",
    label: "Commerce Snapshot",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: [
      "Commerce cache-state badge labels are contract-owned.",
      "Server transaction truth owns revenue and purchase language.",
    ],
    denominators: ["Checkout conversion uses completed purchases / checkout starts only when source and range match."],
    badgePolicy: "Tabs must not map cacheState or refreshStatus to LIVE/ERROR/WAIT inline.",
  },
  {
    key: "return_cadence",
    label: "Return Cadence",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: ["Return cadence bucket percentages use tracked authenticated users as the canonical denominator."],
    denominators: ["tracked authenticated users"],
  },
  {
    key: "content_conversion",
    label: "Content Conversion",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: ["Content conversion row truth state is contract-owned and derived from conversionState."],
    denominators: ["preview count", "server unlock truth", "watch session viewer truth"],
  },
  {
    key: "top_drop_conversion",
    label: "Top Drop Conversion",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: ["Top-drop identity badge truth is contract-owned."],
    denominators: ["validated views"],
  },
  {
    key: "viewer_drilldown",
    label: "Viewer Drilldown",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: [
      "Verified vs estimated watch split is contract-owned.",
      "Early-exit breakdown uses abandoned + stalled + shallow bounces.",
      "Viewer-capture pulse labels are contract-owned.",
    ],
    denominators: ["viewer sessions", "completed assets", "watch-session capture rows"],
  },
  {
    key: "journey_funnel",
    label: "Journey Funnel",
    ownerFile: "src/lib/admin-analytics-contracts.ts",
    formulas: ["Journey denominator mode copy is contract-owned."],
    denominators: ["prior-step events", "base events", "unique users", "sessions"],
  },
] as const;

export const ADMIN_ANALYTICS_BADGE_LABELS: Record<AdminSurfaceState, string> = {
  loading: "WAIT",
  live: "LIVE",
  cached: "SNAP",
  degraded: "REVIEW",
  fallback: "SNAP",
  stale: "DELAYED",
  unavailable: "UNAVAILABLE",
  failed: "ERROR",
};

export function resolveAdminAnalyticsBadgeLabel(state: AdminSurfaceState) {
  return ADMIN_ANALYTICS_BADGE_LABELS[state];
}

export function resolveAdminAnalyticsLivePulseBadgeLabel(
  model: Pick<AdminAnalyticsLivePulseModel, "mode" | "presenceSourceStatus">,
) {
  if (model.mode === "delayed_snapshot") return "SNAP";
  if (model.presenceSourceStatus === "failed") return "ERROR";
  if (model.presenceSourceStatus === "fallback") return "SNAP";
  if (model.presenceSourceStatus === "waiting") return "WAIT";
  if (model.presenceSourceStatus === "cache") return "DELAYED";
  return "LIVE";
}

export function resolveAdminAnalyticsCommerceBadgeLabel(
  model: Pick<AdminAnalyticsCommerceSnapshotModel, "cacheState" | "refreshStatus">,
) {
  if (model.cacheState === "live") return "LIVE";
  if (model.cacheState === "delayed") return "DELAYED";
  if (model.cacheState === "partial") return "REVIEW";
  if (model.cacheState === "stale") return "DELAYED";
  if (model.refreshStatus === "running") return "WAIT";
  return "ERROR";
}

export function resolveAdminAnalyticsCommerceConversionFooter(input: {
  checkoutConversionWarning: string | null;
  checkoutConversionLabel: string;
}) {
  if (input.checkoutConversionWarning) {
    return input.checkoutConversionWarning;
  }
  return `Checkout conversion: completed purchases / checkout starts = ${input.checkoutConversionLabel}`;
}

export function resolveAdminAnalyticsGuestEstimateBadgeLabel(guestEstimateFormulaUsed: boolean) {
  return guestEstimateFormulaUsed ? "EST" : undefined;
}

export function formatAdminAnalyticsJourneyDenominatorMode(mode: string) {
  if (mode === "prior_step_events") return "Prior-step event denominator";
  if (mode === "base_events") return "Base event denominator";
  if (mode === "unique_users") return "Unique-user denominator";
  if (mode === "sessions") return "Session denominator";
  return "Unknown denominator";
}

export function buildAdminAnalyticsReturnCadenceBuckets(
  model: Pick<
    AdminAnalyticsReturnCadenceModel,
    "buckets" | "trackedAuthenticatedUsers" | "fakeZeroPrevented"
  >,
) {
  const rawBuckets = [
    { label: "1 day", count: model.buckets.oneDay },
    { label: "2 days", count: model.buckets.twoDays },
    { label: "3-4 days", count: model.buckets.threeToFourDays },
    { label: "5+ days", count: model.buckets.fivePlusDays },
  ];

  return rawBuckets.map((bucket) => ({
    ...bucket,
    pct:
      model.trackedAuthenticatedUsers > 0
        ? bucket.count / model.trackedAuthenticatedUsers
        : 0,
    countDisplay: model.fakeZeroPrevented ? "[unavailable]" : null,
    percentDisplay: model.fakeZeroPrevented ? "No verified denominator" : null,
  }));
}

export function resolveAdminAnalyticsContentConversionRowTruthState(
  conversionState: ContentConversionRow["conversionState"],
): AdminSurfaceState {
  if (conversionState === "healthy") return "live";
  if (conversionState === "no_data") return "unavailable";
  return "degraded";
}

export function resolveAdminAnalyticsTopDropIdentityTruthState(
  dropIdentityState: "resolved" | "fallback" | "fallback_id" | "missing",
): AdminSurfaceState {
  return dropIdentityState === "resolved" ? "cached" : "degraded";
}

type ViewerDrilldownInput = {
  nowMs: number;
  formatDuration: (value: number) => string;
  viewerDrilldownOverview: {
    watchScoreSource?: string | null;
    totalWatchSeconds: number;
    sessionCount: number;
    bounceSessionCount: number;
    abandonedSessionCount: number;
    stalledSessionCount: number;
    openedWithoutDepthCount: number;
    meaningfulSessionCount: number;
  };
  viewerDrilldownCaptureHealth: {
    lastSeenAtMs: number;
    transportBreakdown: Array<{ transport?: string | null; count: number }>;
  };
  liveWatchCaptureHealth: {
    sessionCount: number;
    lastSeenAtMs: number;
  };
  viewerDrilldownUsers: Array<{
    uid?: string | null;
    username?: string | null;
    lastSeenAtMs?: number | null;
  }>;
};

export function buildAdminAnalyticsViewerDrilldownContract(input: ViewerDrilldownInput) {
  const viewerSourceTruth =
    input.viewerDrilldownOverview.watchScoreSource === "watch_session_rollup"
      ? "watch_sessions"
      : input.viewerDrilldownOverview.watchScoreSource === "legacy_page_duration"
        ? "estimated"
        : input.viewerDrilldownOverview.watchScoreSource || "mixed";
  const viewerFreshnessState =
    input.viewerDrilldownCaptureHealth.lastSeenAtMs <= 0
      ? "unknown"
      : input.nowMs - input.viewerDrilldownCaptureHealth.lastSeenAtMs > 24 * 60 * 60 * 1000
        ? "stale"
        : input.nowMs - input.viewerDrilldownCaptureHealth.lastSeenAtMs > 15 * 60 * 1000
          ? "recent"
          : "live";
  const verifiedWatchSeconds =
    input.viewerDrilldownOverview.watchScoreSource === "watch_session_rollup"
      ? input.viewerDrilldownOverview.totalWatchSeconds
      : 0;
  const estimatedWatchSeconds =
    input.viewerDrilldownOverview.watchScoreSource === "watch_session_rollup"
      ? 0
      : input.viewerDrilldownOverview.totalWatchSeconds;
  const totalViewerWatchSeconds = verifiedWatchSeconds + estimatedWatchSeconds;
  const avgWatchDenominator = input.viewerDrilldownOverview.sessionCount > 0
    ? `${input.formatDuration(Math.round(totalViewerWatchSeconds / input.viewerDrilldownOverview.sessionCount))} avg / session`
    : "Avg unavailable: no viewer sessions";
  const shallowBounceCount = Math.max(
    0,
    input.viewerDrilldownOverview.bounceSessionCount
      - input.viewerDrilldownOverview.abandonedSessionCount
      - input.viewerDrilldownOverview.stalledSessionCount,
  );
  const earlyExitFormula = `${input.viewerDrilldownOverview.abandonedSessionCount.toLocaleString()} abandoned + ${input.viewerDrilldownOverview.stalledSessionCount.toLocaleString()} stalled + ${shallowBounceCount.toLocaleString()} shallow bounces`;
  const captureUnknownTransportCount =
    input.viewerDrilldownCaptureHealth.transportBreakdown.find((item) => item.transport === "unknown")?.count ?? 0;
  const captureUnknownTransportWarning =
    captureUnknownTransportCount > 0
      ? `REVIEW: ${captureUnknownTransportCount.toLocaleString()} watch sessions have unknown capture transport.`
      : null;
  const captureHealthExplanation = "Full capture means the session closed or recovered cleanly. Replay recovery can still count as full when replay repaired missing capture segments. Avg gap is the mean max capture gap across sessions.";
  const viewerCapturePulseState =
    input.liveWatchCaptureHealth.sessionCount <= 0
      ? "quiet"
      : input.liveWatchCaptureHealth.lastSeenAtMs > 0 && input.nowMs - input.liveWatchCaptureHealth.lastSeenAtMs > 15 * 60 * 1000
        ? "stale"
        : "live";
  const viewerCapturePulseBadgeLabel =
    viewerCapturePulseState === "quiet"
      ? "QUIET"
      : viewerCapturePulseState === "stale"
        ? "STALE"
        : "LIVE";
  const viewerCapturePulseExplanation =
    viewerCapturePulseState === "quiet"
      ? "Monitor live - no recent viewer sessions."
      : viewerCapturePulseState === "stale"
        ? "Viewer capture sample is stale; newest recent session is outside the live window."
        : "Viewer capture sample has recent sessions inside the live window.";
  const viewerUserJourneyRows = input.viewerDrilldownUsers.slice(0, 6).map((item) => {
    const username = item.username
      ? (item.username.startsWith("@") ? item.username : `@${item.username}`)
      : `uid:${String(item.uid || "unknown").slice(0, 8)}`;
    return {
      ...item,
      displayName: username,
      lastSeenAtMs: item.lastSeenAtMs || 0,
      freshnessState:
        item.lastSeenAtMs && input.nowMs - item.lastSeenAtMs <= 15 * 60 * 1000
          ? "live"
          : item.lastSeenAtMs && input.nowMs - item.lastSeenAtMs <= 24 * 60 * 60 * 1000
            ? "recent"
            : item.lastSeenAtMs
              ? "stale"
              : "unknown",
    };
  });
  const viewerPanelWarnings = [
    viewerSourceTruth === "estimated"
      ? "Watch time is estimated from fallback page/session duration and is not verified watch-session truth."
      : null,
    input.viewerDrilldownOverview.openedWithoutDepthCount > input.viewerDrilldownOverview.meaningfulSessionCount
      ? "Opened-no-depth is high: many viewer opens did not reach meaningful consumption."
      : null,
    captureUnknownTransportWarning,
  ].filter(Boolean) as string[];

  return {
    viewerSourceTruth,
    viewerFreshnessState,
    verifiedWatchSeconds,
    estimatedWatchSeconds,
    totalViewerWatchSeconds,
    avgWatchDenominator,
    shallowBounceCount,
    earlyExitFormula,
    captureUnknownTransportCount,
    captureUnknownTransportWarning,
    captureHealthExplanation,
    viewerCapturePulseState,
    viewerCapturePulseBadgeLabel,
    viewerCapturePulseExplanation,
    viewerUserJourneyRows,
    viewerPanelWarnings,
  };
}

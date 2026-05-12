import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminAnalyticsDisplayState } from "@/lib/analytics/admin-analytics-display-state";
import type {
  RealtimeActiveUserItem,
  RealtimeAnalyticsResponse,
  RealtimePoint,
  SurfaceMixItem,
} from "@/types/admin-analytics";

type AnalyticsRealtimeDebugMeta = {
  listeners: Record<
    string,
    {
      fromCache: boolean;
      lastServerConfirmedAtMs: number | null;
    }
  >;
};

type LivePulseSource =
  | "firestore_realtime"
  | "firestore_realtime_cache"
  | "presence_derived"
  | "backend_snapshot"
  | "ga_intraday"
  | "waiting"
  | "unavailable";

type GuestAnalyticsSnapshot = NonNullable<RealtimeAnalyticsResponse["guestAnalyticsSnapshot"]>;
type GuestSnapshotDisplayState = "live" | "stale" | "unavailable" | "needs_review";

export type AdminAnalyticsLivePulseIdentity = {
  rawId: string;
  shortUserId: string;
  displayLabel: string;
  username?: string;
  identityState: "resolved" | "fallback_uid" | "guest" | "missing" | "unknown";
  actorType: "guest" | "user" | "admin" | "creator";
  routeLabel: string;
  actionLabel: string;
  purposeLabel: string;
  lastActionPurpose: "identity_linkage" | "meaningful_activity" | "viewer_activity" | "admin_activity" | "unknown";
  lastSeenAt: number;
  lastSeenLabel: string;
  truthState: AdminSurfaceState;
  statusLabel: "LIVE" | "DELAYED" | "SNAP" | "WAIT" | "ERROR";
  actorBadgeLabel: "GUEST" | "AUTH";
  source: LivePulseSource;
  sourceTruth: "presence" | "event_fact" | "snapshot" | "estimated";
  fullDebugId: string;
};

export type AdminAnalyticsLivePulseModel = {
  generatedAtUtc: string;
  mode: "live" | "snapshot" | "delayed_snapshot" | "estimated" | "unavailable";
  refreshState: "ready" | "refreshing" | "failed" | "stale";
  livePulseEnabled: boolean;
  selectedWindow: "30m";
  canonicalPresenceSource: LivePulseSource;
  activeCount: { value: number | null; source: LivePulseSource };
  guestCount: { value: number | null; source: LivePulseSource };
  authenticatedCount: { value: number | null; source: LivePulseSource };
  adminCount: { value: number | null; source: LivePulseSource };
  guestEstimateState: "observed" | "estimated" | "not_observed" | "unknown";
  guestEstimateConfidence: number | null;
  guestEstimateSourceLabel: string | null;
  guestSnapshotTruthState: GuestSnapshotDisplayState;
  guestSnapshotSourceLabel: string;
  guestSnapshotReason: string | null;
  guestMixLabel: string;
  topWarning: string;
  topWarningDetail: string | null;
  topSurface: { value: string | null; source: LivePulseSource };
  surfaces: Array<SurfaceMixItem & { source: LivePulseSource; freshness: AdminSurfaceState }>;
  activeIdentities: AdminAnalyticsLivePulseIdentity[];
  rawIdentityIds: string[];
  presenceSourceStatus: "live" | "partial" | "cache" | "fallback" | "failed" | "waiting";
  rtdbPresenceStatus: "not_used_by_this_surface";
  onDisconnectRegistered: "unknown";
  reconnectReestablishesOnDisconnect: "unknown";
  firestoreFromCache: boolean | null;
  includeMetadataChanges: true;
  backendSnapshotStatus: "available" | "not_used" | "waiting" | "unavailable";
  gaIntradayStatus: "not_primary_for_presence";
  graphSource: LivePulseSource;
  graphPoints: Array<RealtimePoint & { label: string }>;
  graphSourceLabel: string;
  graphLegendLabel: string;
  graphPointCount: number;
  graphHydrated: boolean;
  graphHydratedMs: number | null;
  graphSourceMismatch: boolean;
  graphDerivedFromPresence: boolean;
  firstPresenceRowMs: number | null;
  firstGraphPointMs: number | null;
  livePulseShellRenderMs: number;
  stalePresenceRows: number;
  fakeZeroPrevented: boolean;
  duplicateRefreshPrevented: boolean;
  hydrationBudgetExceeded: boolean;
  compactChartHeightClass: "h-36 md:h-56";
  visibleCopy: string;
  displayStatePolicyApplied: true;
  pureRealtimeDependencyRemoved: true;
  primaryDisplaySource: AdminAnalyticsDisplayState["visibleValueSource"];
  latestVerifiedSnapshotExists: boolean;
  latestVerifiedSnapshotAgeMs: number | null;
  realtimeListenerState: string;
  realtimeBlocksFirstRender: false;
  fallbackSnapshotUsed: boolean;
  refreshStatus: string;
  unavailableReason: string | null;
  laneFailures: string[];
};

const GRAPH_HYDRATION_BUDGET_MS = 3_000;
const LIVE_PRESENCE_MS = 5 * 60 * 1000;
const DELAYED_PRESENCE_MS = 15 * 60 * 1000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function shortId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  return trimmed.length <= 6 ? trimmed : trimmed.slice(-6);
}

function resolveFreshnessState(nowMs: number, timestampMs: number) {
  const ageMs = nowMs - timestampMs;
  if (!isFiniteNumber(timestampMs) || timestampMs <= 0) return "stale" as const;
  if (ageMs <= LIVE_PRESENCE_MS) return "live" as const;
  if (ageMs <= DELAYED_PRESENCE_MS) return "delayed" as const;
  return "stale" as const;
}

function resolveStatusLabel(freshnessState: "live" | "delayed" | "stale") {
  if (freshnessState === "live") return "LIVE" as const;
  return "DELAYED" as const;
}

function readableRoute(path: string) {
  if (!path || path === "/") return "Home";
  if (path.startsWith("/admin/analytics")) return "Admin Analytics";
  if (path.startsWith("/admin")) return "Admin";
  if (path.startsWith("/dashboard/viewer")) return "Viewer";
  if (path.startsWith("/dashboard/library")) return "Library";
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/drops")) return "Drops";
  if (path.startsWith("/experiences")) return "Experiences";
  if (path.startsWith("/creators")) return "Creators";
  return path.replaceAll("/", " ").replace(/\s+/g, " ").trim() || "Site";
}

function readableAction(eventName: string) {
  const action = eventName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return action ? action.replace(/\b\w/g, (char) => char.toUpperCase()) : "Live activity";
}

function readablePurposeLabel(
  purpose: "identity_linkage" | "meaningful_activity" | "viewer_activity" | "admin_activity" | "unknown",
) {
  switch (purpose) {
    case "identity_linkage":
      return "Identity linked";
    case "meaningful_activity":
      return "Meaningful activity";
    case "viewer_activity":
      return "Viewer activity";
    case "admin_activity":
      return "Admin activity";
    default:
      return "Signal";
  }
}

function resolveActorType(item: RealtimeActiveUserItem): AdminAnalyticsLivePulseIdentity["actorType"] {
  if (item.actorType === "guest") return "guest";
  if (item.lastPagePath?.startsWith("/admin")) return "admin";
  if (item.lastPagePath?.startsWith("/creators")) return "creator";
  return "user";
}

function resolveDisplayLabel(item: RealtimeActiveUserItem, actorType: AdminAnalyticsLivePulseIdentity["actorType"]) {
  const displayName = item.displayName?.trim();
  const username = item.username?.trim();
  const rawId = item.uid || item.sessionKey || "";
  if (actorType === "guest") {
    return "Guest session";
  }

  if (displayName && displayName !== rawId && !displayName.startsWith("guest:")) {
    return displayName;
  }

  if (username && username !== rawId && !username.startsWith("guest:")) {
    if (username.includes("@")) return username.split("@")[0] || "User";
    return username;
  }

  return shortId(rawId);
}

function relativeTime(timestampMs: number, nowMs: number) {
  if (!isFiniteNumber(timestampMs) || timestampMs <= 0) return "No verified timestamp";
  const deltaMs = Math.max(0, nowMs - timestampMs);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function deriveGraphFromPresence(
  activeUsers: RealtimeActiveUserItem[],
  nowMs: number,
): Array<RealtimePoint & { label: string }> {
  const buckets = new Map<number, Set<string>>();
  activeUsers.forEach((item) => {
    if (!isFiniteNumber(item.lastSeenAt) || item.lastSeenAt <= 0 || item.lastSeenAt > nowMs) {
      return;
    }
    const minute = Math.floor((nowMs - item.lastSeenAt) / 60_000);
    if (minute < 0 || minute >= 30) {
      return;
    }
    const actorKey = item.actorType === "guest"
      ? `guest:${item.sessionKey || item.uid}`
      : `user:${item.uid}`;
    const actors = buckets.get(minute) ?? new Set<string>();
    actors.add(actorKey);
    buckets.set(minute, actors);
  });

  return Array.from({ length: 30 }, (_, minute) => ({
    minute,
    users: buckets.get(minute)?.size ?? 0,
    views: 0,
    label: minute === 0 ? "Now" : `${minute}m`,
  })).sort((left, right) => right.minute - left.minute);
}

function resolveFirestoreFromCache(listenerDebugMeta?: AnalyticsRealtimeDebugMeta | null) {
  if (!listenerDebugMeta) return null;
  const entries = Object.values(listenerDebugMeta.listeners);
  if (entries.length === 0) return null;
  return entries.some((entry) => entry.fromCache);
}

function resolveGuestSnapshotDisplay(snapshot?: GuestAnalyticsSnapshot | null): {
  state: GuestSnapshotDisplayState;
  count: number | null;
  sourceLabel: string;
  reason: string | null;
  sampleEvidence: boolean;
} {
  if (!snapshot) {
    return {
      state: "unavailable",
      count: null,
      sourceLabel: "guest snapshot missing",
      reason: "Guest samples unavailable",
      sampleEvidence: false,
    };
  }

  const sampledBatchCount = snapshot.sourceSampleCounts.analytics_guest_batches ?? 0;
  const sampleEvidence = snapshot.guestSamplesAvailable === true || sampledBatchCount > 0;
  if (!sampleEvidence) {
    return {
      state: "unavailable",
      count: null,
      sourceLabel: snapshot.sourceCollectionsUsed.join(", ") || "guest snapshot",
      reason: snapshot.notes[0] ?? "Guest samples unavailable",
      sampleEvidence,
    };
  }

  if (snapshot.guestTruthState === "needs_review") {
    return {
      state: "needs_review",
      count: snapshot.uniqueAnonymousVisitorCount,
      sourceLabel: snapshot.sourceCollectionsUsed.join(", ") || "guest snapshot",
      reason: snapshot.notes[0] ?? "Guest identity link evidence needs review",
      sampleEvidence,
    };
  }

  if (snapshot.guestTruthState === "stale") {
    return {
      state: "stale",
      count: snapshot.uniqueAnonymousVisitorCount,
      sourceLabel: snapshot.sourceCollectionsUsed.join(", ") || "guest snapshot",
      reason: "Guest snapshot stale",
      sampleEvidence,
    };
  }

  return {
    state: snapshot.guestTruthState === "live" ? "live" : "unavailable",
    count: snapshot.guestTruthState === "live" ? snapshot.uniqueAnonymousVisitorCount : null,
    sourceLabel: snapshot.sourceCollectionsUsed.join(", ") || "guest snapshot",
    reason: snapshot.guestTruthState === "live" ? null : snapshot.notes[0] ?? "Guest samples unavailable",
    sampleEvidence,
  };
}

export function buildAdminAnalyticsLivePulseModel(input: {
  activeUsers: RealtimeActiveUserItem[];
  surfaceMix: SurfaceMixItem[];
  liveSeries: Array<RealtimePoint & { label: string }>;
  feedStatus: "realtime" | "partial" | "polled" | "failed";
  feedDetail: string;
  truthState: AdminSurfaceState;
  activeUsersTruthState: AdminSurfaceState;
  listenerDebugMeta?: AnalyticsRealtimeDebugMeta | null;
  nowMs: number;
  liveLoading: boolean;
  cacheRevalidating?: boolean;
  displayState?: AdminAnalyticsDisplayState;
  latestVerifiedSnapshotAgeMs?: number | null;
  refreshStatus?: string | null;
  laneFailures?: string[];
  guestEstimateState?: "observed" | "estimated" | "not_observed" | "unknown";
  guestEstimateConfidence?: number | null;
  guestEstimateSourceLabel?: string | null;
  guestAnalyticsSnapshot?: GuestAnalyticsSnapshot | null;
}): AdminAnalyticsLivePulseModel {
  const firestoreFromCache = resolveFirestoreFromCache(input.listenerDebugMeta);
  const hasPresenceRows = input.activeUsers.length > 0;
  const originalGraphPointCount = input.liveSeries.filter((point) => point.users > 0 || point.views > 0).length;
  const graphSourceMismatch = hasPresenceRows && originalGraphPointCount === 0;
  const graphDerivedFromPresence = graphSourceMismatch;
  const graphPoints = graphDerivedFromPresence
    ? deriveGraphFromPresence(input.activeUsers, input.nowMs)
    : input.liveSeries;
  const graphPointCount = graphPoints.filter((point) => point.users > 0 || point.views > 0).length;
  const snapshotDisplayActive = input.displayState?.shouldRenderSnapshot === true;
  const canonicalPresenceSource: LivePulseSource =
    snapshotDisplayActive
      ? "backend_snapshot"
      : input.feedStatus === "realtime"
      ? firestoreFromCache
        ? "firestore_realtime_cache"
        : "firestore_realtime"
      : input.feedStatus === "partial"
        ? "firestore_realtime"
        : input.feedStatus === "polled"
          ? "backend_snapshot"
          : input.liveLoading
            ? "waiting"
            : "unavailable";
  const graphSource: LivePulseSource = graphDerivedFromPresence
    ? "presence_derived"
    : graphPointCount > 0
      ? canonicalPresenceSource
      : input.liveLoading
        ? "waiting"
        : "unavailable";
  const stalePresenceRows = input.activeUsers.filter(
    (item) => resolveFreshnessState(input.nowMs, item.lastSeenAt) === "stale",
  ).length;
  const identities = input.activeUsers.slice(0, 8).map((item) => {
    const actorType = resolveActorType(item);
    const freshnessState = resolveFreshnessState(input.nowMs, item.lastSeenAt);
    return {
      rawId: item.uid,
      shortUserId: shortId(item.uid || item.sessionKey || ""),
      displayLabel: resolveDisplayLabel(item, actorType),
      username: item.username?.trim() || undefined,
      identityState: actorType === "guest"
        ? "guest"
        : item.userIdentityState === "resolved" || item.userIdentityState === "fallback_uid" || item.userIdentityState === "missing"
          ? item.userIdentityState
          : "unknown",
      actorType,
      routeLabel: readableRoute(item.lastPagePath),
      actionLabel: readableAction(item.lastEventName),
      purposeLabel: readablePurposeLabel(item.lastActionPurpose ?? "unknown"),
      lastActionPurpose: item.lastActionPurpose ?? "unknown",
      lastSeenAt: item.lastSeenAt,
      lastSeenLabel: relativeTime(item.lastSeenAt, input.nowMs),
      truthState: freshnessState === "stale" ? "stale" : freshnessState === "delayed" ? "degraded" : input.activeUsersTruthState,
      statusLabel: input.activeUsersTruthState === "failed" ? "ERROR" : resolveStatusLabel(freshnessState),
      actorBadgeLabel: actorType === "guest" ? "GUEST" : "AUTH",
      source: item.sourceLabel?.includes("fallback") ? "backend_snapshot" : canonicalPresenceSource,
      sourceTruth: item.sourceTruth ?? (item.sourceLabel?.includes("fallback") ? "snapshot" : "presence"),
      fullDebugId: item.uid,
    } satisfies AdminAnalyticsLivePulseIdentity;
  });
  const guestCount = input.activeUsers.filter((item) => item.actorType === "guest").length;
  const authCount = input.activeUsers.length - guestCount;
  const adminCount = identities.filter((item) => item.actorType === "admin").length;
  const guestEstimateState = input.guestEstimateState ?? "unknown";
  const guestEstimateConfidence = input.guestEstimateConfidence ?? null;
  const guestEstimateSourceLabel = input.guestEstimateSourceLabel ?? null;
  const guestSnapshotDisplay = resolveGuestSnapshotDisplay(input.guestAnalyticsSnapshot);
  const graphHydrated = graphPointCount > 0;
  const hasServerConfirmation = Object.values(input.listenerDebugMeta?.listeners ?? {}).some(
    (entry) => entry.lastServerConfirmedAtMs !== null,
  );
  const visibleCopy = input.displayState?.visibleMessage ?? (input.feedStatus === "polled"
    ? "Showing last verified snapshot."
    : input.feedStatus === "failed"
      ? "No verified snapshot yet."
      : graphSourceMismatch
        ? "Pulse chart is using verified presence while the chart source catches up."
        : guestCount === 0 && authCount > 0
          ? "Identified activity only. Guest presence is unavailable."
          : "Showing first-party live presence.");
  const laneFailures = input.laneFailures ?? [];
  const graphSourceLabel = graphSource === "presence_derived"
    ? "Derived presence timeline"
    : graphSource === "backend_snapshot"
      ? "Snapshot timeline"
      : graphSource === "firestore_realtime" || graphSource === "firestore_realtime_cache"
        ? "Live presence timeline"
        : graphSource === "waiting"
          ? "Waiting for graph source"
          : "Graph unavailable";
  const graphLegendLabel = graphSource === "backend_snapshot"
    ? "Last verified snapshots"
    : graphSource === "presence_derived"
      ? "Derived from last-seen presence rows"
      : "Live or verified counts";
  const mode: AdminAnalyticsLivePulseModel["mode"] =
    input.feedStatus === "failed" && !snapshotDisplayActive
      ? "unavailable"
      : snapshotDisplayActive && (input.displayState?.sourceMode === "stale_cache" || input.feedStatus === "polled")
        ? "delayed_snapshot"
        : snapshotDisplayActive
          ? "snapshot"
          : guestEstimateState === "estimated"
            ? "estimated"
            : "live";
  const refreshState: AdminAnalyticsLivePulseModel["refreshState"] =
    input.refreshStatus === "refreshing" || input.liveLoading
      ? "refreshing"
      : input.feedStatus === "failed"
        ? "failed"
        : mode === "delayed_snapshot"
          ? "stale"
          : "ready";
  const topWarning = mode === "delayed_snapshot"
    ? "Live updates are delayed. Showing last verified snapshot."
    : visibleCopy;
  const topWarningDetail = guestSnapshotDisplay.state === "unavailable"
    ? guestSnapshotDisplay.reason
    : guestSnapshotDisplay.state === "stale"
      ? "Guest snapshot stale. Showing last verified guest sample."
      : guestSnapshotDisplay.state === "needs_review"
        ? guestSnapshotDisplay.reason
        : guestEstimateState === "estimated" && !guestSnapshotDisplay.sampleEvidence
    ? `Guest traffic is estimated from ${guestEstimateSourceLabel ?? "event facts"}${guestEstimateConfidence !== null ? ` (${Math.round(guestEstimateConfidence * 100)}% confidence)` : ""}.`
    : adminCount > 0
      ? `Admin activity is labeled separately and included in auth count (${adminCount}).`
      : null;
  const guestMixLabel =
    guestSnapshotDisplay.state === "unavailable"
      ? `Auth ${authCount} · Guest unavailable`
      : guestSnapshotDisplay.state === "stale"
        ? `Auth ${authCount} · Guest stale ${guestSnapshotDisplay.count ?? "unknown"}`
        : guestSnapshotDisplay.state === "needs_review"
          ? `Auth ${authCount} · Guest review ${guestSnapshotDisplay.count ?? "unknown"}`
          : guestSnapshotDisplay.sampleEvidence
            ? `Auth ${authCount} · Guest ${guestSnapshotDisplay.count ?? "unknown"}`
            : guestEstimateState === "estimated"
      ? `Auth ${authCount} · Guest estimate ${guestCount}`
      : guestEstimateState === "not_observed"
        ? `Auth ${authCount} · Guest not observed`
        : `Auth ${authCount} · Guest ${guestCount}`;

  return {
    generatedAtUtc: new Date(input.nowMs).toISOString(),
    mode,
    refreshState,
    livePulseEnabled: input.feedStatus !== "failed" || snapshotDisplayActive,
    selectedWindow: "30m",
    canonicalPresenceSource,
    activeCount: {
      value: hasPresenceRows || hasServerConfirmation ? input.activeUsers.length : null,
      source: canonicalPresenceSource,
    },
    guestCount: {
      value: hasPresenceRows || hasServerConfirmation ? guestCount : null,
      source: canonicalPresenceSource,
    },
    authenticatedCount: {
      value: hasPresenceRows || hasServerConfirmation ? authCount : null,
      source: canonicalPresenceSource,
    },
    adminCount: {
      value: hasPresenceRows || hasServerConfirmation ? adminCount : null,
      source: canonicalPresenceSource,
    },
    guestEstimateState,
    guestEstimateConfidence,
    guestEstimateSourceLabel,
    guestSnapshotTruthState: guestSnapshotDisplay.state,
    guestSnapshotSourceLabel: guestSnapshotDisplay.sourceLabel,
    guestSnapshotReason: guestSnapshotDisplay.reason,
    guestMixLabel,
    topWarning,
    topWarningDetail,
    topSurface: {
      value: input.surfaceMix[0]?.label ?? null,
      source: canonicalPresenceSource,
    },
    surfaces: input.surfaceMix.slice(0, 6).map((surface) => ({
      ...surface,
      source: canonicalPresenceSource,
      freshness: resolveFreshnessState(input.nowMs, surface.lastSeenAt) === "stale"
        ? "stale"
        : resolveFreshnessState(input.nowMs, surface.lastSeenAt) === "delayed"
          ? "degraded"
          : input.truthState,
    })),
    activeIdentities: identities,
    rawIdentityIds: input.activeUsers.map((item) => item.uid),
    presenceSourceStatus:
      snapshotDisplayActive
        ? canonicalPresenceSource === "backend_snapshot" && input.displayState?.sourceMode === "stale_cache" ? "cache" : "fallback"
        : input.feedStatus === "realtime"
        ? firestoreFromCache ? "cache" : "live"
        : input.feedStatus === "partial"
          ? "partial"
          : input.feedStatus === "polled"
            ? "fallback"
            : input.liveLoading
              ? "waiting"
              : "failed",
    rtdbPresenceStatus: "not_used_by_this_surface",
    onDisconnectRegistered: "unknown",
    reconnectReestablishesOnDisconnect: "unknown",
    firestoreFromCache,
    includeMetadataChanges: true,
    backendSnapshotStatus: snapshotDisplayActive || input.feedStatus === "polled" ? "available" : input.liveLoading ? "waiting" : "not_used",
    gaIntradayStatus: "not_primary_for_presence",
    graphSource,
    graphPoints,
    graphSourceLabel,
    graphLegendLabel,
    graphPointCount,
    graphHydrated,
    graphHydratedMs: graphHydrated ? 0 : null,
    graphSourceMismatch,
    graphDerivedFromPresence,
    firstPresenceRowMs: hasPresenceRows ? 0 : null,
    firstGraphPointMs: graphHydrated ? 0 : null,
    livePulseShellRenderMs: 0,
    stalePresenceRows,
    fakeZeroPrevented: input.displayState?.fakeZeroPrevented ?? (!hasPresenceRows && !hasServerConfirmation),
    duplicateRefreshPrevented: Boolean(input.cacheRevalidating),
    hydrationBudgetExceeded: graphSourceMismatch || (!graphHydrated && hasPresenceRows && GRAPH_HYDRATION_BUDGET_MS > 0),
    compactChartHeightClass: "h-36 md:h-56",
    visibleCopy,
    displayStatePolicyApplied: true,
    pureRealtimeDependencyRemoved: true,
    primaryDisplaySource: input.displayState?.visibleValueSource ?? (input.feedStatus === "polled" ? "verified_snapshot" : hasPresenceRows ? "realtime_upgrade" : "unavailable"),
    latestVerifiedSnapshotExists: snapshotDisplayActive,
    latestVerifiedSnapshotAgeMs: input.latestVerifiedSnapshotAgeMs ?? null,
    realtimeListenerState: input.feedStatus,
    realtimeBlocksFirstRender: false,
    fallbackSnapshotUsed: snapshotDisplayActive || input.feedStatus === "polled",
    refreshStatus: input.refreshStatus ?? (input.liveLoading ? "refreshing" : "idle"),
    unavailableReason: input.displayState?.shouldShowUnavailable ? input.displayState.debugReason : null,
    laneFailures,
  };
}

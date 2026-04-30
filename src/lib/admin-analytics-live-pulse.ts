import type { AdminSurfaceState } from "@/lib/admin-parity";
import type {
  RealtimeActiveUserItem,
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

export type AdminAnalyticsLivePulseIdentity = {
  rawId: string;
  displayLabel: string;
  actorType: "guest" | "user" | "admin" | "creator";
  routeLabel: string;
  actionLabel: string;
  lastSeenAt: number;
  lastSeenLabel: string;
  truthState: AdminSurfaceState;
  statusLabel: "LIVE" | "STALE" | "SNAP" | "WAIT" | "ERROR";
  actorBadgeLabel: "GUEST" | "AUTH";
  source: LivePulseSource;
  fullDebugId: string;
};

export type AdminAnalyticsLivePulseModel = {
  livePulseEnabled: boolean;
  selectedWindow: "30m";
  canonicalPresenceSource: LivePulseSource;
  activeCount: { value: number | null; source: LivePulseSource };
  guestCount: { value: number | null; source: LivePulseSource };
  authenticatedCount: { value: number | null; source: LivePulseSource };
  adminCount: { value: number | null; source: LivePulseSource };
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
};

const GRAPH_HYDRATION_BUDGET_MS = 3_000;
const STALE_PRESENCE_MS = 10 * 60 * 1000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function shortId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  return trimmed.length <= 6 ? trimmed : trimmed.slice(-6);
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

function resolveActorType(item: RealtimeActiveUserItem): AdminAnalyticsLivePulseIdentity["actorType"] {
  if (item.actorType === "guest") return "guest";
  if (item.lastPagePath?.startsWith("/admin")) return "admin";
  if (item.lastPagePath?.startsWith("/creators")) return "creator";
  return "user";
}

function resolveDisplayLabel(item: RealtimeActiveUserItem, actorType: AdminAnalyticsLivePulseIdentity["actorType"]) {
  const username = item.username?.trim();
  const rawId = item.uid || item.sessionKey || "";
  if (actorType === "guest") {
    return `Guest session • ${shortId(item.sessionKey || rawId)}`;
  }

  if (username && username !== rawId && !username.startsWith("guest:")) {
    if (username.includes("@")) return username.split("@")[0] || `User • ${shortId(rawId)}`;
    return username;
  }

  return `User • ${shortId(rawId)}`;
}

function relativeTime(timestampMs: number, nowMs: number) {
  if (!isFiniteNumber(timestampMs) || timestampMs <= 0) return "Waiting";
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
  const canonicalPresenceSource: LivePulseSource =
    input.feedStatus === "realtime"
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
    (item) => input.nowMs - item.lastSeenAt > STALE_PRESENCE_MS,
  ).length;
  const identities = input.activeUsers.slice(0, 8).map((item) => {
    const actorType = resolveActorType(item);
    const stale = input.nowMs - item.lastSeenAt > STALE_PRESENCE_MS;
    return {
      rawId: item.uid,
      displayLabel: resolveDisplayLabel(item, actorType),
      actorType,
      routeLabel: readableRoute(item.lastPagePath),
      actionLabel: readableAction(item.lastEventName),
      lastSeenAt: item.lastSeenAt,
      lastSeenLabel: relativeTime(item.lastSeenAt, input.nowMs),
      truthState: stale ? "stale" : input.activeUsersTruthState,
      statusLabel: stale ? "STALE" : input.activeUsersTruthState === "failed" ? "ERROR" : "LIVE",
      actorBadgeLabel: actorType === "guest" ? "GUEST" : "AUTH",
      source: item.sourceLabel?.includes("fallback") ? "backend_snapshot" : canonicalPresenceSource,
      fullDebugId: item.uid,
    } satisfies AdminAnalyticsLivePulseIdentity;
  });
  const guestCount = input.activeUsers.filter((item) => item.actorType === "guest").length;
  const authCount = input.activeUsers.length - guestCount;
  const adminCount = identities.filter((item) => item.actorType === "admin").length;
  const graphHydrated = graphPointCount > 0;
  const hasServerConfirmation = Object.values(input.listenerDebugMeta?.listeners ?? {}).some(
    (entry) => entry.lastServerConfirmedAtMs !== null,
  );
  const visibleCopy = input.feedStatus === "polled"
    ? "Live Pulse is showing a backend snapshot."
    : input.feedStatus === "failed"
      ? "Live Pulse is unavailable."
      : graphSourceMismatch
        ? "Pulse graph is derived from presence while the graph source catches up."
        : guestCount === 0 && authCount > 0
          ? "Identified activity only. Guest presence is unavailable."
          : "Showing first-party realtime presence.";

  return {
    livePulseEnabled: input.feedStatus !== "failed",
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
    topSurface: {
      value: input.surfaceMix[0]?.label ?? null,
      source: canonicalPresenceSource,
    },
    surfaces: input.surfaceMix.slice(0, 6).map((surface) => ({
      ...surface,
      source: canonicalPresenceSource,
      freshness: input.nowMs - surface.lastSeenAt > STALE_PRESENCE_MS ? "stale" : input.truthState,
    })),
    activeIdentities: identities,
    rawIdentityIds: input.activeUsers.map((item) => item.uid),
    presenceSourceStatus:
      input.feedStatus === "realtime"
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
    backendSnapshotStatus: input.feedStatus === "polled" ? "available" : input.liveLoading ? "waiting" : "not_used",
    gaIntradayStatus: "not_primary_for_presence",
    graphSource,
    graphPoints,
    graphPointCount,
    graphHydrated,
    graphHydratedMs: graphHydrated ? 0 : null,
    graphSourceMismatch,
    graphDerivedFromPresence,
    firstPresenceRowMs: hasPresenceRows ? 0 : null,
    firstGraphPointMs: graphHydrated ? 0 : null,
    livePulseShellRenderMs: 0,
    stalePresenceRows,
    fakeZeroPrevented: !hasPresenceRows && !hasServerConfirmation,
    duplicateRefreshPrevented: Boolean(input.cacheRevalidating),
    hydrationBudgetExceeded: graphSourceMismatch || (!graphHydrated && hasPresenceRows && GRAPH_HYDRATION_BUDGET_MS > 0),
    compactChartHeightClass: "h-36 md:h-56",
    visibleCopy,
  };
}

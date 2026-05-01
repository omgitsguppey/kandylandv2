import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption, RawEventItem } from "@/types/admin-analytics";

type ActorType = "guest" | "user" | "creator" | "admin" | "system" | "unknown";
type StreamSourceMode = "first_party_snapshot" | "stale_snapshot" | "waiting" | "unavailable";
type TruthBadge = "LIVE" | "SNAP" | "STALE" | "MIXED" | "WAIT" | "ERROR";

export type AdminAnalyticsLiveInteractionRow = {
  eventKey: string;
  eventDisplayLabel: string;
  displayLabel: string;
  compactTypeLabel: string;
  actorType: ActorType;
  actorDisplayLabel: string;
  rawActorId: string;
  route: string;
  surface: string;
  timestamp: number;
  source: StreamSourceMode;
  truthState: AdminSurfaceState;
  shouldAppearInUserStream: boolean;
  exclusionReason: string | null;
  duplicateGroupKey: string;
  duplicateCount: number;
  adminExclusionRuleApplied: boolean;
  actorClassificationRules: string[];
  missingSurfaceMapping: boolean;
  fallback: boolean;
  stale: boolean;
  realtime: boolean;
  serverConfirmed: boolean;
  fromCache: boolean | null;
  hasPendingWrites: boolean | null;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsLiveInteractionStreamModel = {
  selectedRange: RangeOption;
  streamSourceMode: StreamSourceMode;
  truthState: AdminSurfaceState;
  badgeLabel: TruthBadge;
  visibleEventCount: number | null;
  rawEventCount: number | null;
  adminExcludedCount: number;
  systemExcludedCount: number;
  unknownActorCount: number;
  uniqueActorCount: number | null;
  failureCount: number | null;
  duplicateGroupedCount: number;
  topSurface: string | null;
  lastEventAt: number | null;
  streamHydratedMs: number | null;
  streamSourceStatus: "available" | "waiting" | "unavailable";
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  realtime: boolean;
  fromCache: boolean | null;
  hasPendingWrites: boolean | null;
  eventRows: AdminAnalyticsLiveInteractionRow[];
  excludedRows: AdminAnalyticsLiveInteractionRow[];
  rawRows: AdminAnalyticsLiveInteractionRow[];
  actorClassificationRules: string[];
  missingSurfaceMappings: string[];
  fakeZeroPrevented: boolean;
  duplicateRefreshPrevented: boolean;
  recommendation: string;
  visibleCopy: string;
  streamSourceStatusDetail: string;
};

const SYSTEM_EVENT_PATTERNS = [/^system_/i, /^internal_/i, /internal/i];
const ADMIN_EVENT_PATTERNS = [/^admin_/i, /admin/i];
const CREATOR_EVENT_PATTERNS = [/creator/i];

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function classifyActor(event: RawEventItem): {
  actorType: ActorType;
  excluded: boolean;
  reason: string | null;
  rules: string[];
} {
  const path = normalizeText(event.path);
  const type = normalizeText(event.type);
  const username = normalizeText(event.username);
  const uid = normalizeText(event.uid);
  const lowerUsername = username.toLowerCase();
  const rules: string[] = [];

  if (path.startsWith("/admin") || ADMIN_EVENT_PATTERNS.some((pattern) => pattern.test(type))) {
    rules.push("admin route or admin event excluded");
    return { actorType: "admin", excluded: true, reason: "admin_action", rules };
  }

  if (SYSTEM_EVENT_PATTERNS.some((pattern) => pattern.test(type))) {
    rules.push("system/internal event excluded");
    return { actorType: "system", excluded: true, reason: "system_internal", rules };
  }

  if (CREATOR_EVENT_PATTERNS.some((pattern) => pattern.test(type)) || path.startsWith("/creator")) {
    rules.push("creator event or route classified as creator");
    return { actorType: "creator", excluded: false, reason: null, rules };
  }

  if (username && lowerUsername !== "guest") {
    rules.push("username maps to user");
    return { actorType: "user", excluded: false, reason: null, rules };
  }

  if (!uid || uid.toLowerCase() === "guest" || lowerUsername === "guest") {
    rules.push("missing or guest actor maps to guest");
    return { actorType: "guest", excluded: false, reason: null, rules };
  }

  rules.push("raw actor id without display identity maps to unknown");
  return { actorType: "unknown", excluded: false, reason: null, rules };
}

function compactEventLabel(type: string) {
  const lowered = type.toLowerCase();
  if (lowered.includes("task_failed")) return "Task failed";
  if (lowered.includes("task_assigned")) return "Task";
  if (lowered.includes("unlock")) return "Unlock";
  if (lowered.includes("daily")) return "Reward";
  if (lowered.includes("checkout")) return "Checkout";
  if (lowered.includes("purchase")) return "Purchase";
  if (lowered.includes("share")) return "Share";
  if (lowered.includes("auth")) return "Auth";
  return "Event";
}

function displayEventType(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function actorLabel(event: RawEventItem, actorType: ActorType) {
  const username = normalizeText(event.username);
  if (username && username.toLowerCase() !== "guest") {
    return username.length > 28 ? `${username.slice(0, 25)}...` : username;
  }

  const raw = normalizeText(event.uid);
  if (actorType === "guest") {
    return raw && raw.toLowerCase() !== "guest"
      ? `Guest session ${raw.slice(0, 4)}`
      : "Guest";
  }

  if (!raw) return "Unknown actor";
  return raw.length > 8 ? `Session ${raw.slice(0, 6)}` : `Session ${raw}`;
}

function surfaceForRoute(path: string, componentName?: string) {
  const route = normalizeText(path);
  const component = normalizeText(componentName);
  if (component) return component;
  if (!route) return "unknown surface";
  if (route.startsWith("/dashboard")) return "Dashboard";
  if (route.startsWith("/experiences")) return "Experiences";
  if (route.startsWith("/drops")) return "Drops";
  if (route.startsWith("/wallet")) return "Wallet";
  if (route.startsWith("/creator")) return "Creator";
  if (route.startsWith("/auth")) return "Auth";
  if (route === "/") return "Home";
  return route.split("?")[0] || "unknown surface";
}

function duplicateGroupKey(event: RawEventItem) {
  const minuteBucket = Math.floor((event.timestamp || 0) / 120_000);
  return [
    normalizeText(event.uid) || normalizeText(event.username) || "unknown",
    normalizeText(event.type),
    normalizeText(event.detail),
    normalizeText(event.path),
    minuteBucket,
  ].join("|");
}

function buildRecommendation(input: {
  failureCount: number;
  adminExcludedCount: number;
  duplicateGroupedCount: number;
  loading: boolean;
  hasResponse: boolean;
}) {
  if (!input.hasResponse && input.loading) return "Waiting for first snapshot.";
  if (!input.hasResponse) return "User interaction stream unavailable for this range.";
  if (input.failureCount > 0) return "Recent task failures are present.";
  if (input.duplicateGroupedCount > 0) return "Repeated task events are grouped.";
  if (input.adminExcludedCount > 0) return "Admin events are excluded from this stream.";
  return "Recent user interactions are grouped by actor and route.";
}

export function buildAdminAnalyticsLiveInteractionStreamModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  rawEvents: RawEventItem[];
  describeEvent: (event: RawEventItem) => string;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsLiveInteractionStreamModel {
  const hasResponse = Boolean(input.response);
  const cache = Boolean(input.response?.cacheState && input.response.cacheState !== "miss");
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const fakeZeroPrevented = !hasResponse;
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : input.overviewTruthState ?? "live";
  const sourceMode: StreamSourceMode = !hasResponse
    ? input.loading ? "waiting" : "unavailable"
    : stale
      ? "stale_snapshot"
      : "first_party_snapshot";
  const serverConfirmed = hasResponse && !input.error && input.response?.cacheState !== "stale";
  const fallback = Boolean(input.error || input.response?.cacheRevalidating);
  const fromCache = input.response?.cacheState ? input.response.cacheState !== "miss" : null;

  const rawRows = input.rawEvents
    .slice()
    .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
    .map<AdminAnalyticsLiveInteractionRow>((event) => {
      const actor = classifyActor(event);
      const route = normalizeText(event.path) || "unknown surface";
      const displayLabel = normalizeText(input.describeEvent(event)) || displayEventType(event.type);
      const surface = surfaceForRoute(route, event.componentName);

      return {
        eventKey: event.type,
        eventDisplayLabel: displayEventType(event.type),
        displayLabel,
        compactTypeLabel: compactEventLabel(event.type),
        actorType: actor.actorType,
        actorDisplayLabel: actorLabel(event, actor.actorType),
        rawActorId: normalizeText(event.uid),
        route,
        surface,
        timestamp: event.timestamp,
        source: sourceMode,
        truthState,
        shouldAppearInUserStream: !actor.excluded,
        exclusionReason: actor.reason,
        duplicateGroupKey: duplicateGroupKey(event),
        duplicateCount: 1,
        adminExclusionRuleApplied: actor.actorType === "admin",
        actorClassificationRules: actor.rules,
        missingSurfaceMapping: surface === "unknown surface",
        fallback,
        stale,
        realtime: false,
        serverConfirmed,
        fromCache,
        hasPendingWrites: null,
        fakeZeroPrevented,
      };
    });

  const excludedRows = rawRows.filter((row) => !row.shouldAppearInUserStream);
  const grouped = new Map<string, AdminAnalyticsLiveInteractionRow>();
  let duplicateGroupedCount = 0;

  for (const row of rawRows.filter((candidate) => candidate.shouldAppearInUserStream)) {
    const existing = grouped.get(row.duplicateGroupKey);
    if (existing) {
      existing.duplicateCount += 1;
      duplicateGroupedCount += 1;
      continue;
    }
    grouped.set(row.duplicateGroupKey, { ...row });
  }

  const eventRows = Array.from(grouped.values()).slice(0, 10);
  const actorIds = new Set(eventRows.map((row) => row.rawActorId || row.actorDisplayLabel).filter(Boolean));
  const failureCount = eventRows.reduce(
    (count, row) => count + (/fail|error/i.test(row.eventKey) || /fail|error/i.test(row.displayLabel) ? 1 : 0),
    0,
  );
  const surfaceCounts = eventRows.reduce<Map<string, number>>((map, row) => {
    map.set(row.surface, (map.get(row.surface) ?? 0) + 1);
    return map;
  }, new Map());
  const topSurface = Array.from(surfaceCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const adminExcludedCount = excludedRows.filter((row) => row.actorType === "admin").length;
  const systemExcludedCount = excludedRows.filter((row) => row.actorType === "system").length;
  const missingSurfaceMappings = eventRows
    .filter((row) => row.missingSurfaceMapping)
    .map((row) => row.eventKey);
  const badgeLabel: TruthBadge = sourceMode === "waiting"
    ? "WAIT"
    : sourceMode === "unavailable"
      ? "ERROR"
      : stale
        ? "STALE"
        : fallback
          ? "MIXED"
          : "SNAP";

  return {
    selectedRange: input.selectedRange,
    streamSourceMode: sourceMode,
    truthState,
    badgeLabel,
    visibleEventCount: fakeZeroPrevented ? null : eventRows.length,
    rawEventCount: fakeZeroPrevented ? null : input.rawEvents.length,
    adminExcludedCount,
    systemExcludedCount,
    unknownActorCount: eventRows.filter((row) => row.actorType === "unknown").length,
    uniqueActorCount: fakeZeroPrevented ? null : actorIds.size,
    failureCount: fakeZeroPrevented ? null : failureCount,
    duplicateGroupedCount,
    topSurface,
    lastEventAt: eventRows[0]?.timestamp ?? null,
    streamHydratedMs: null,
    streamSourceStatus: hasResponse ? "available" : input.loading ? "waiting" : "unavailable",
    stale,
    cache,
    serverConfirmed,
    fallback,
    realtime: false,
    fromCache,
    hasPendingWrites: null,
    eventRows,
    excludedRows,
    rawRows,
    actorClassificationRules: [
      "admin route or admin event excluded",
      "system/internal event excluded",
      "creator event or route classified as creator",
      "username maps to user",
      "raw actor id without display identity maps to unknown",
      "missing or guest actor maps to guest",
    ],
    missingSurfaceMappings,
    fakeZeroPrevented,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    recommendation: buildRecommendation({
      failureCount,
      adminExcludedCount,
      duplicateGroupedCount,
      loading: input.loading,
      hasResponse,
    }),
    visibleCopy: stale
      ? "Showing the latest validated interaction snapshot."
      : sourceMode === "waiting"
        ? "Waiting for first snapshot."
        : "Showing recent user and guest interactions. Admin events are excluded.",
    streamSourceStatusDetail: hasResponse
      ? "First-party backend interaction snapshot; realtime is not claimed unless the source upgrades."
      : input.loading
        ? "Interaction stream is waiting for first snapshot."
        : "Interaction stream has no validated snapshot for this range.",
  };
}

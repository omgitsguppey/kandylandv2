import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse, RangeOption, RawEventItem } from "@/types/admin-analytics";

type ActorType = "guest" | "user" | "creator" | "admin" | "system" | "unknown";
type StreamSourceMode = "live" | "snapshot" | "stale_snapshot" | "unavailable";
type TruthBadge = "LIVE" | "SNAP" | "REFRESH" | "WAIT" | "ERROR";
type StreamSourceTruth = "realtime_presence" | "event_facts" | "backend_snapshot" | "mixed" | "unknown";
type StreamFreshnessState = "live" | "recent" | "stale" | "expired" | "unknown";
type RowEventType = "event" | "reward" | "task" | "task_failed" | "message" | "purchase" | "unlock" | "unknown";
type RowSourceTruth = "telemetry" | "canonical" | "ledger" | "task_engine" | "message" | "snapshot" | "unknown";

export type AdminAnalyticsLiveInteractionRow = {
  eventId: string;
  eventKey: string;
  eventDisplayLabel: string;
  displayLabel: string;
  compactTypeLabel: string;
  eventType: RowEventType;
  actorType: ActorType;
  actorDisplayLabel: string;
  rawActorId: string;
  route: string | null;
  surface: string;
  surfaceState: "verified" | "inferred" | "missing";
  timestamp: number;
  createdAtUtc: string;
  ageLabel: string;
  source: StreamSourceMode;
  sourceTruth: RowSourceTruth;
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
  failureReason: string | null;
  taskId: string | null;
  taskStatus: "assigned" | "completed" | "failed" | "expired" | null;
  explanation: string;
};

export type AdminAnalyticsLiveInteractionStreamModel = {
  selectedRange: RangeOption;
  generatedAtUtc: string | null;
  streamSourceMode: StreamSourceMode;
  sourceTruth: StreamSourceTruth;
  freshnessState: StreamFreshnessState;
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
  warnings: string[];
};

const SYSTEM_EVENT_PATTERNS = [/^system_/i, /^internal_/i, /internal/i];
const ADMIN_EVENT_PATTERNS = [/^admin_/i, /admin/i];
const CREATOR_EVENT_PATTERNS = [/creator/i];
const REFRESH_DUE_INTERACTION_COPY =
  "Refresh due. Showing the latest verified interaction snapshot until new events arrive.";

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

function inferEventType(type: string, detail: string): RowEventType {
  const lowered = `${type} ${detail}`.toLowerCase();
  if (lowered.includes("task_failed") || lowered.includes("task failed")) return "task_failed";
  if (lowered.includes("task_") || lowered.includes("daily task") || lowered.includes("guided onboarding") || lowered.includes("watch 2 unlocked files") || lowered.includes("top up your gum drops") || lowered.includes("preview 3 live drops") || lowered.includes("unwrap a spicy drop")) return "task";
  if (lowered.includes("daily check")) return "reward";
  if (lowered.includes("creator_message") || lowered.includes("text message") || lowered.includes("chat_message")) return "message";
  if (lowered.includes("purchase") || lowered.includes("checkout")) return "purchase";
  if (lowered.includes("unlock")) return "unlock";
  return "event";
}

function compactEventLabel(type: RowEventType) {
  switch (type) {
    case "task_failed":
      return "Task failed";
    case "task":
      return "Task";
    case "reward":
      return "Reward";
    case "message":
      return "Message";
    case "purchase":
      return "Purchase";
    case "unlock":
      return "Unlock";
    default:
      return "Event";
  }
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
  if (component) return { surface: component, state: "verified" as const };
  if (!route) return { surface: "surface missing", state: "missing" as const };
  if (route.startsWith("/dashboard")) return { surface: "Dashboard", state: "verified" as const };
  if (route.startsWith("/experiences")) return { surface: "Experiences", state: "verified" as const };
  if (route.startsWith("/drops")) return { surface: "Drops", state: "verified" as const };
  if (route.startsWith("/wallet")) return { surface: "Wallet", state: "verified" as const };
  if (route.startsWith("/creator")) return { surface: "Creator", state: "verified" as const };
  if (route.startsWith("/auth")) return { surface: "Auth", state: "verified" as const };
  if (route === "/") return { surface: "Home", state: "verified" as const };
  return { surface: route.split("?")[0] || "surface missing", state: "inferred" as const };
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

function resolveSourceTruth(event: RawEventItem, eventType: RowEventType): RowSourceTruth {
  if (eventType === "message") return "message";
  if (eventType === "purchase" || eventType === "unlock") return "canonical";
  if (eventType === "task" || eventType === "task_failed" || eventType === "reward") return "task_engine";
  return "snapshot";
}

function resolveTaskStatus(eventType: RowEventType): "assigned" | "completed" | "failed" | "expired" | null {
  if (eventType === "task_failed") return "failed";
  if (eventType === "task") return "assigned";
  return null;
}

function resolveFailureReason(event: RawEventItem): string | null {
  const detail = normalizeText(event.detail).toLowerCase();
  const type = normalizeText(event.type).toLowerCase();
  const combined = `${type} ${detail}`;
  if (!combined.includes("fail")) {
    return null;
  }
  if (combined.includes("inactive") || combined.includes("reset")) {
    return "Failed due to previous reset or inactivity policy";
  }
  if (combined.includes("window") || combined.includes("expired")) {
    return "daily_window_expired";
  }
  if (combined.includes("validation")) {
    return "validation_failed";
  }
  if (combined.includes("runtime") || combined.includes("unsupported")) {
    return "unsupported_runtime";
  }
  return "unknown";
}

function ageState(ageMs: number | null): StreamFreshnessState {
  if (ageMs === null || ageMs < 0) return "unknown";
  if (ageMs <= 5 * 60_000) return "live";
  if (ageMs <= 15 * 60_000) return "recent";
  if (ageMs <= 60 * 60_000) return "stale";
  return "expired";
}

function buildRecommendation(input: {
  hasResponse: boolean;
  loading: boolean;
  freshnessState: StreamFreshnessState;
  failureCount: number;
}) {
  if (!input.hasResponse && input.loading) return "Waiting for first snapshot.";
  if (!input.hasResponse) return "Interaction snapshot unavailable for this range.";
  if (input.freshnessState === "stale") {
    return REFRESH_DUE_INTERACTION_COPY;
  }
  if (input.freshnessState === "expired") {
    return "Interaction snapshot expired. Refresh or wait for a new verified source.";
  }
  if (input.failureCount > 0) return "Recent task failures are present.";
  return "Showing recent interaction snapshot with grouped duplicate events.";
}

function buildRowExplanation(input: {
  row: Pick<AdminAnalyticsLiveInteractionRow, "eventType" | "duplicateCount" | "sourceTruth" | "surfaceState" | "failureReason" | "taskStatus">;
}) {
  const grouped = input.row.duplicateCount > 1 ? `Grouped from ${input.row.duplicateCount} similar events.` : "Single recent event sample.";
  const surface = input.row.surfaceState === "verified"
    ? "Surface verified from route or source component."
    : input.row.surfaceState === "inferred"
      ? "Surface inferred from route path."
      : "Surface missing from this row.";
  if (input.row.eventType === "task_failed") {
    return `${grouped} Task status failed. ${input.row.failureReason ?? "Failure reason unavailable."} ${surface}`;
  }
  if (input.row.eventType === "message") {
    return `${grouped} Message activity source: ${input.row.sourceTruth}. Paid-source state is not available in this stream. ${surface}`;
  }
  return `${grouped} Source: ${input.row.sourceTruth}. ${surface}`;
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
  const generatedAtMs = input.response?.generatedAtMs ?? null;
  const fakeZeroPrevented = !hasResponse;

  const rawRows = input.rawEvents
    .slice()
    .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
    .map<AdminAnalyticsLiveInteractionRow>((event) => {
      const actor = classifyActor(event);
      const route = normalizeText(event.path) || null;
      const displayLabel = normalizeText(input.describeEvent(event)) || displayEventType(event.type);
      const eventType = inferEventType(event.type, displayLabel);
      const surfaceInfo = surfaceForRoute(route ?? "", event.componentName);
      const sourceTruth = resolveSourceTruth(event, eventType);
      const failureReason = resolveFailureReason(event);
      return {
        eventId: duplicateGroupKey(event),
        eventKey: event.type,
        eventDisplayLabel: displayEventType(event.type),
        displayLabel,
        compactTypeLabel: compactEventLabel(eventType),
        eventType,
        actorType: actor.actorType,
        actorDisplayLabel: actorLabel(event, actor.actorType),
        rawActorId: normalizeText(event.uid),
        route,
        surface: surfaceInfo.surface,
        surfaceState: surfaceInfo.state,
        timestamp: event.timestamp,
        createdAtUtc: new Date(event.timestamp).toISOString(),
        ageLabel: "",
        source: "snapshot",
        sourceTruth,
        truthState: "live",
        shouldAppearInUserStream: !actor.excluded,
        exclusionReason: actor.reason,
        duplicateGroupKey: duplicateGroupKey(event),
        duplicateCount: 1,
        adminExclusionRuleApplied: actor.actorType === "admin",
        actorClassificationRules: actor.rules,
        missingSurfaceMapping: surfaceInfo.state === "missing",
        fallback: false,
        stale: false,
        realtime: false,
        serverConfirmed: false,
        fromCache: input.response?.cacheState ? input.response.cacheState !== "miss" : null,
        hasPendingWrites: null,
        fakeZeroPrevented,
        failureReason,
        taskId: eventType === "task" || eventType === "task_failed" ? normalizeText(event.targetId) || null : null,
        taskStatus: resolveTaskStatus(eventType),
        explanation: "",
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

  const provisionalRows = Array.from(grouped.values()).slice(0, 10);
  const lastEventAt = provisionalRows[0]?.timestamp ?? null;
  const freshnessState = generatedAtMs && lastEventAt
    ? ageState(Math.max(0, generatedAtMs - lastEventAt))
    : ageState(lastEventAt ? Date.now() - lastEventAt : null);
  const streamSourceMode: StreamSourceMode = !hasResponse
    ? input.loading ? "unavailable" : "unavailable"
    : freshnessState === "live"
      ? "live"
      : freshnessState === "recent"
        ? "snapshot"
        : "stale_snapshot";
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : freshnessState === "expired" || input.error || input.response?.cacheState === "stale"
      ? "stale"
      : freshnessState === "stale"
        ? "cached"
      : input.overviewTruthState ?? "live";
  const sourceTruth: StreamSourceTruth = hasResponse ? "backend_snapshot" : "unknown";
  const serverConfirmed = hasResponse && !input.error && freshnessState !== "expired";
  const fallback = Boolean(input.error || input.response?.cacheRevalidating);

  const eventRows = provisionalRows.map((row) => {
    const age = generatedAtMs ? Math.max(0, generatedAtMs - row.timestamp) : null;
    const rowFreshness = ageState(age ?? (row.timestamp ? Date.now() - row.timestamp : null));
    const updatedRow: AdminAnalyticsLiveInteractionRow = {
      ...row,
      ageLabel: rowFreshness === "unknown"
        ? "unknown age"
        : rowFreshness === "live"
          ? "live"
          : rowFreshness === "recent"
            ? "recent"
            : rowFreshness === "stale"
              ? "refresh due"
              : "expired",
      source: streamSourceMode,
      truthState,
      fallback,
      stale: truthState === "stale",
      realtime: streamSourceMode === "live",
      serverConfirmed,
      explanation: "",
    };
    updatedRow.explanation = buildRowExplanation({ row: updatedRow });
    return updatedRow;
  });

  const actorIds = new Set(eventRows.map((row) => row.rawActorId || row.actorDisplayLabel).filter(Boolean));
  const failureCount = eventRows.reduce((count, row) => count + (row.eventType === "task_failed" ? 1 : 0), 0);
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
  const badgeLabel: TruthBadge = !hasResponse && input.loading
    ? "WAIT"
    : !hasResponse
      ? "ERROR"
      : streamSourceMode === "live"
        ? "LIVE"
        : streamSourceMode === "snapshot"
          ? "SNAP"
          : "REFRESH";
  const warnings: string[] = [];
  if (streamSourceMode === "stale_snapshot") {
    warnings.push(
      freshnessState === "expired"
        ? "Interaction snapshot expired. Refresh or wait for a new verified source."
        : REFRESH_DUE_INTERACTION_COPY,
    );
  }
  if (failureCount > 0) {
    warnings.push("Recent task failures are present.");
  }
  if (adminExcludedCount === 0) {
    warnings.push("Admin events are excluded from normal user activity. No admin rows were excluded in this sample.");
  }

  return {
    selectedRange: input.selectedRange,
    generatedAtUtc: generatedAtMs ? new Date(generatedAtMs).toISOString() : null,
    streamSourceMode,
    sourceTruth,
    freshnessState,
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
    lastEventAt,
    streamHydratedMs: null,
    streamSourceStatus: hasResponse ? "available" : input.loading ? "waiting" : "unavailable",
    stale: truthState === "stale",
    cache,
    serverConfirmed,
    fallback,
    realtime: streamSourceMode === "live",
    fromCache: input.response?.cacheState ? input.response.cacheState !== "miss" : null,
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
      freshnessState,
      loading: input.loading,
      hasResponse,
    }),
    visibleCopy: streamSourceMode === "live"
      ? "First-party backend interaction snapshot; realtime is not claimed unless the source upgrades."
      : streamSourceMode === "snapshot"
        ? "First-party backend interaction snapshot; realtime is not claimed unless the source upgrades."
        : streamSourceMode === "stale_snapshot"
          ? freshnessState === "expired"
            ? "Interaction snapshot expired. Refresh or wait for a new verified source."
            : REFRESH_DUE_INTERACTION_COPY
          : input.loading
            ? "Waiting for first snapshot."
            : "Interaction snapshot unavailable for this range.",
    streamSourceStatusDetail: hasResponse
      ? `Source ${sourceTruth}. Last event ${lastEventAt ? new Date(lastEventAt).toISOString() : "unknown"}. Generated ${generatedAtMs ? new Date(generatedAtMs).toISOString() : "unknown"}.`
      : input.loading
        ? "Interaction stream is waiting for first snapshot."
        : "Interaction stream has no validated snapshot for this range.",
    warnings,
  };
}

import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { ComponentContextItem, EventBreakdownItem, HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

type EventMixSourceMode = "first_party" | "ga_daily" | "ga_intraday" | "backend_snapshot" | "stale_cache" | "mixed" | "waiting" | "error";

export type AdminAnalyticsEventMixRow = {
  rank: number;
  eventKey: string;
  displayLabel: string;
  rawCount: number | null;
  uniqueActorCount: number | null;
  uniqueSessionCount: number | null;
  share: number | null;
  shareFormula: "event count / total counted events in selected range" | null;
  source: EventMixSourceMode;
  truthState: AdminSurfaceState;
  stale: boolean;
  cache: boolean;
  serverConfirmed: boolean;
  fallback: boolean;
  estimated: boolean;
  mappedSurface: string | null;
  mappedComponent: string | null;
  mappingSource: "component_context" | "fallback_event_catalog" | "missing";
  mappedByFallbackCatalog: boolean;
  fakeZeroPrevented: boolean;
};

export type AdminAnalyticsEventMixModel = {
  selectedRange: RangeOption;
  eventMixSourceMode: EventMixSourceMode;
  truthState: AdminSurfaceState;
  badgeLabel: "RAW" | "LIVE" | "STALE" | "GA" | "FIRST" | "MIXED" | "WAIT" | "ERROR";
  totalEventsInRange: number | null;
  denominatorAvailable: boolean;
  topEvent: AdminAnalyticsEventMixRow | null;
  topEventShare: number | null;
  eventRows: AdminAnalyticsEventMixRow[];
  componentContextStatus: "available" | "waiting" | "unavailable";
  mappedSurfaceCount: number | null;
  unmappedEventCount: number | null;
  missingSurfaceMappings: string[];
  contextHydrationStatus: "hydrated" | "waiting" | "unavailable";
  contextHydrationMs: number | null;
  refreshStatus: "idle" | "refreshing" | "failed";
  staleSnapshotUsed: boolean;
  fakeZeroPrevented: boolean;
  duplicateRefreshPrevented: boolean;
  visibleCopy: string;
  recommendation: string;
  fullTechnicalReason: string;
};

const EVENT_SURFACE_FALLBACKS: Array<{ pattern: RegExp; surface: string; component: string }> = [
  { pattern: /onboarding/i, surface: "Onboarding", component: "Guided onboarding" },
  { pattern: /drop|viewer|unlock/i, surface: "Drops", component: "Drop interaction" },
  { pattern: /semantic/i, surface: "Semantic tracking", component: "Semantic target" },
  { pattern: /auth|sign|registered/i, surface: "Auth", component: "Auth flow" },
  { pattern: /checkout|purchase|wallet/i, surface: "Commerce", component: "Checkout flow" },
];

function fallbackMapping(eventName: string) {
  return EVENT_SURFACE_FALLBACKS.find((entry) => entry.pattern.test(eventName)) ?? null;
}

function normalizeLabel(eventName: string, labels: Record<string, string>) {
  return labels[eventName] || eventName.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildAdminAnalyticsEventMixModel(input: {
  selectedRange: RangeOption;
  response?: HistoricalAnalyticsResponse;
  eventBreakdown: EventBreakdownItem[];
  componentContexts: ComponentContextItem[];
  eventLabels: Record<string, string>;
  loading: boolean;
  error?: Error;
  overviewTruthState?: AdminSurfaceState;
}): AdminAnalyticsEventMixModel {
  const hasResponse = Boolean(input.response);
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const cache = Boolean(input.response?.cacheState && input.response.cacheState !== "miss");
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : input.overviewTruthState ?? "live";
  const sourceMode: EventMixSourceMode = !hasResponse
    ? input.loading ? "waiting" : "error"
    : stale
      ? "stale_cache"
      : "backend_snapshot";
  const fakeZeroPrevented = !hasResponse;
  const totalEvents = fakeZeroPrevented
    ? null
    : input.eventBreakdown.reduce((sum, event) => sum + Math.max(0, event.count), 0);
  const denominatorAvailable = totalEvents !== null && totalEvents > 0;
  const contextByEvent = new Map(input.componentContexts.map((context) => [context.exampleEvent, context]));
  const rows = input.eventBreakdown
    .slice()
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map<AdminAnalyticsEventMixRow>((event, index) => {
      const context = contextByEvent.get(event.eventName);
      const fallback = fallbackMapping(event.eventName);
      const mappedSurface = context?.label ?? fallback?.surface ?? null;
      const mappedComponent = context?.label ?? fallback?.component ?? null;
      return {
        rank: index + 1,
        eventKey: event.eventName,
        displayLabel: normalizeLabel(event.eventName, input.eventLabels),
        rawCount: fakeZeroPrevented ? null : event.count,
        uniqueActorCount: context?.uniqueUsers ?? null,
        uniqueSessionCount: null,
        share: denominatorAvailable ? event.count / Math.max(1, totalEvents ?? 0) : null,
        shareFormula: denominatorAvailable ? "event count / total counted events in selected range" : null,
        source: sourceMode,
        truthState,
        stale,
        cache,
        serverConfirmed: hasResponse && !input.error,
        fallback: Boolean(input.error || input.response?.cacheRevalidating),
        estimated: false,
        mappedSurface,
        mappedComponent,
        mappingSource: context ? "component_context" : fallback ? "fallback_event_catalog" : "missing",
        mappedByFallbackCatalog: !context && Boolean(fallback),
        fakeZeroPrevented,
      };
    });
  const missingSurfaceMappings = rows
    .filter((row) => row.mappingSource === "missing")
    .map((row) => row.eventKey);
  const mappedSurfaceCount = !hasResponse
    ? null
    : input.componentContexts.length > 0
      ? new Set(input.componentContexts.map((context) => context.key)).size
      : null;
  const componentContextStatus = !hasResponse || input.loading
    ? "waiting"
    : input.componentContexts.length > 0
      ? "available"
      : "unavailable";
  const topEvent = rows[0] ?? null;
  const badgeLabel =
    sourceMode === "waiting"
      ? "WAIT"
      : sourceMode === "error"
        ? "ERROR"
        : stale
          ? "STALE"
          : rows.some((row) => row.mappedByFallbackCatalog || row.mappingSource === "missing")
            ? "MIXED"
            : "RAW";

  return {
    selectedRange: input.selectedRange,
    eventMixSourceMode: sourceMode,
    truthState,
    badgeLabel,
    totalEventsInRange: totalEvents,
    denominatorAvailable,
    topEvent,
    topEventShare: topEvent?.share ?? null,
    eventRows: rows,
    componentContextStatus,
    mappedSurfaceCount,
    unmappedEventCount: fakeZeroPrevented ? null : missingSurfaceMappings.length,
    missingSurfaceMappings,
    contextHydrationStatus: componentContextStatus === "available" ? "hydrated" : componentContextStatus,
    contextHydrationMs: null,
    refreshStatus: input.error ? "failed" : input.response?.cacheRevalidating ? "refreshing" : "idle",
    staleSnapshotUsed: stale,
    fakeZeroPrevented,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    visibleCopy: componentContextStatus === "available"
      ? "Showing raw event counts with mapped surface context."
      : "Showing raw event counts. Surface context unavailable for this range.",
    recommendation: topEvent
      ? `${topEvent.displayLabel} is driving ${topEvent.share === null ? "the most" : `${Math.round(topEvent.share * 100)}% of`} counted events.`
      : input.loading
        ? "Waiting for event mix."
        : "Event mix unavailable for this range.",
    fullTechnicalReason: componentContextStatus === "available"
      ? "Event counts are backend snapshot raw counts with component context rows joined by example event where available."
      : "Component context did not hydrate for the selected range; event counts remain raw and surface mapping uses fallback catalog only when safe.",
  };
}

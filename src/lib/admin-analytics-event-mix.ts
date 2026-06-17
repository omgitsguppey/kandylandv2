import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { ComponentContextItem, EventBreakdownItem, HistoricalAnalyticsResponse, RangeOption } from "@/types/admin-analytics";

type EventMixSourceMode = "first_party" | "ga_daily" | "ga_intraday" | "backend_snapshot" | "stale_cache" | "mixed" | "waiting" | "error";
type EventPurpose =
  | "onboarding"
  | "drops"
  | "dashboard"
  | "task_lifecycle"
  | "commerce"
  | "watch"
  | "notification"
  | "semantic_ux"
  | "unknown";

type CatalogInference = {
  purpose: EventPurpose;
  category: string | null;
};

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
  eventPurpose: EventPurpose;
  catalogCategory: string | null;
  catalogCategoryState: "inferred" | "verified" | "missing";
  actualSurface: string | null;
  actualSurfaceState: "verified" | "missing" | "partial" | "not_required";
  route: string | null;
  routeState: "verified" | "missing" | "not_required";
  mappingState: "mapped" | "inferred_only" | "unmapped" | "needs_surface_context";
  explanation: string;
};

export type AdminAnalyticsEventMixModel = {
  selectedRange: RangeOption;
  eventMixSourceMode: EventMixSourceMode;
  truthState: AdminSurfaceState;
  badgeLabel: "LIVE" | "UPDATED" | "DELAYED" | "PARTIAL" | "WAIT" | "ERROR";
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
  generatedAtUtc: string | null;
  actualSurfaceContextState: "available" | "partial" | "unavailable" | "unknown";
  catalogInferenceState: "available" | "partial" | "unavailable";
  eventsNeedingCatalogMapping: number | null;
  eventsMissingSurfaceContext: number | null;
};

const EVENT_CATALOG_INFERENCE: Array<{ pattern: RegExp; purpose: EventPurpose; category: string }> = [
  { pattern: /guided_onboarding|onboarding/i, purpose: "onboarding", category: "Onboarding" },
  { pattern: /drop|viewer|unlock/i, purpose: "drops", category: "Drops" },
  { pattern: /dashboard/i, purpose: "dashboard", category: "Dashboard" },
  { pattern: /task/i, purpose: "task_lifecycle", category: "Tasks" },
  { pattern: /checkout|purchase|wallet|gumdrops/i, purpose: "commerce", category: "Commerce" },
  { pattern: /watch|video|file_viewed/i, purpose: "watch", category: "Watch" },
  { pattern: /notification/i, purpose: "notification", category: "Notifications" },
  { pattern: /semantic|hover|click|impression/i, purpose: "semantic_ux", category: "Semantic UX" },
];

function inferCatalog(eventName: string): CatalogInference {
  const match = EVENT_CATALOG_INFERENCE.find((entry) => entry.pattern.test(eventName));
  if (!match) {
    return {
      purpose: "unknown",
      category: null,
    };
  }

  return {
    purpose: match.purpose,
    category: match.category,
  };
}

function normalizeLabel(eventName: string, labels: Record<string, string>) {
  return labels[eventName] || eventName.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildRowExplanation(input: {
  category: string | null;
  hasComponentContext: boolean;
  actualSurfaceState: AdminAnalyticsEventMixRow["actualSurfaceState"];
  routeState: AdminAnalyticsEventMixRow["routeState"];
}) {
  if (!input.category) {
    return "No catalog category mapping is available for this event, and verified route or surface context is missing.";
  }

  if (!input.hasComponentContext) {
    return `Category inferred from the event catalog as ${input.category}. Verified route and surface context are missing for this range.`;
  }

  if (input.actualSurfaceState !== "verified" || input.routeState !== "verified") {
    return `Category inferred from the event catalog as ${input.category}. Aggregated context exists in the snapshot, but verified per-event route or surface context is not available here.`;
  }

  return `Category and verified route or surface context are both available for ${input.category}.`;
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
  const inferredCategoryGuardrail = "Catalog-inferred categories must not be shown as verified route or surface context.";
  const hasResponse = Boolean(input.response);
  const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
  const cacheRefreshDue = Boolean(
    input.response &&
      (input.response.cacheState === "refresh_due" ||
        input.response.staleButVerified ||
        input.response.cacheRevalidating),
  );
  const cache = Boolean(input.response?.cacheState && input.response?.cacheState !== "miss");
  const truthState: AdminSurfaceState = !hasResponse
    ? input.loading ? "loading" : "unavailable"
    : stale
      ? "stale"
      : cacheRefreshDue
        ? "cached"
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

  const eventRows = input.eventBreakdown
    .slice()
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map<AdminAnalyticsEventMixRow>((event, index) => {
      const context = contextByEvent.get(event.eventName);
      const catalog = inferCatalog(event.eventName);
      const catalogCategoryState: AdminAnalyticsEventMixRow["catalogCategoryState"] = catalog.category ? "inferred" : "missing";
      const actualSurfaceState: AdminAnalyticsEventMixRow["actualSurfaceState"] = "missing";
      const routeState: AdminAnalyticsEventMixRow["routeState"] = "missing";
      const mappingState: AdminAnalyticsEventMixRow["mappingState"] = !catalog.category
        ? "unmapped"
        : context
          ? "needs_surface_context"
          : "inferred_only";
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
        mappedSurface: catalog.category,
        mappedComponent: context?.label ?? null,
        mappingSource: context ? "component_context" : catalog.category ? "fallback_event_catalog" : "missing",
        mappedByFallbackCatalog: !context && Boolean(catalog.category),
        fakeZeroPrevented,
        eventPurpose: catalog.purpose,
        catalogCategory: catalog.category,
        catalogCategoryState,
        actualSurface: null,
        actualSurfaceState,
        route: null,
        routeState,
        mappingState,
        explanation: buildRowExplanation({
          category: catalog.category,
          hasComponentContext: Boolean(context),
          actualSurfaceState,
          routeState,
        }),
      };
    });

  const eventsNeedingCatalogMapping = fakeZeroPrevented
    ? null
    : eventRows.filter((row) => row.catalogCategoryState === "missing").length;
  const eventsMissingSurfaceContext = fakeZeroPrevented
    ? null
    : eventRows.filter((row) => row.actualSurfaceState !== "verified").length;
  const missingSurfaceMappings = eventRows
    .filter((row) => row.catalogCategoryState === "missing")
    .map((row) => row.eventKey);
  const catalogInferenceState: AdminAnalyticsEventMixModel["catalogInferenceState"] = !hasResponse || input.loading
    ? "unavailable"
    : eventsNeedingCatalogMapping === 0
      ? "available"
      : eventRows.some((row) => row.catalogCategoryState === "inferred")
        ? "partial"
        : "unavailable";
  const actualSurfaceContextState: AdminAnalyticsEventMixModel["actualSurfaceContextState"] = !hasResponse || input.loading
    ? "unknown"
    : eventsMissingSurfaceContext === 0
      ? "available"
      : "unavailable";
  const componentContextStatus = !hasResponse || input.loading
    ? "waiting"
    : input.componentContexts.length > 0
      ? "available"
      : "unavailable";
  const topEvent = eventRows[0] ?? null;
  const badgeLabel =
    sourceMode === "waiting"
      ? "WAIT"
      : sourceMode === "error"
        ? "ERROR"
        : stale || cacheRefreshDue
          ? "DELAYED"
          : actualSurfaceContextState !== "available" || (eventsNeedingCatalogMapping ?? 0) > 0
            ? "PARTIAL"
            : "UPDATED";

  return {
    selectedRange: input.selectedRange,
    eventMixSourceMode: sourceMode,
    truthState,
    badgeLabel,
    totalEventsInRange: totalEvents,
    denominatorAvailable,
    topEvent,
    topEventShare: topEvent?.share ?? null,
    eventRows,
    componentContextStatus,
    mappedSurfaceCount: actualSurfaceContextState === "available" ? eventRows.length : null,
    unmappedEventCount: eventsNeedingCatalogMapping,
    missingSurfaceMappings,
    contextHydrationStatus: componentContextStatus === "available" ? "hydrated" : componentContextStatus,
    contextHydrationMs: null,
    refreshStatus: input.error ? "failed" : input.response?.cacheRevalidating ? "refreshing" : "idle",
    staleSnapshotUsed: stale,
    fakeZeroPrevented,
    duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
    visibleCopy: actualSurfaceContextState === "available"
      ? "Showing event activity with verified route and surface context."
      : "Showing event activity. Categories are inferred from the event catalog; verified route and surface context is missing for this range.",
    recommendation: topEvent
      ? `${topEvent.displayLabel} is the top tracked event for this range.`
      : input.loading
        ? "Waiting for first snapshot."
        : "Event mix unavailable for this range.",
    fullTechnicalReason: actualSurfaceContextState === "available"
      ? "Event counts are backend snapshot raw counts with verified route and surface context."
      : `Event counts are backend snapshot raw counts. ${inferredCategoryGuardrail} Category labels come from the event catalog, while verified per-event route and surface context are not available in this range.`,
    generatedAtUtc: input.response?.generatedAtMs ? new Date(input.response.generatedAtMs).toISOString() : null,
    actualSurfaceContextState,
    catalogInferenceState,
    eventsNeedingCatalogMapping,
    eventsMissingSurfaceContext,
  };
}

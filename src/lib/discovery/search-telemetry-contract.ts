import { normalizeSearchQueryTokens, type SearchIntentClass } from "@/lib/behavioral/search-intent-profile";
import {
  SEARCH_COST_POLICY,
  type SearchCostPolicy,
  type SearchExecutionMode,
  validateSearchCostPolicy,
} from "@/lib/discovery/search-cost-contract";

export const SEARCH_DISCOVERY_DEBUG_LANE = "Search/discovery";

export const SEARCH_DISCOVERY_EVENTS = [
  "search_focused",
  "search_query_changed",
  "search_submitted",
  "search_results_loaded",
  "search_zero_results",
  "search_result_clicked",
  "search_failed",
  "search_cleared",
] as const;

export type SearchDiscoveryEventName = typeof SEARCH_DISCOVERY_EVENTS[number];

export type SearchResultType =
  | "drop"
  | "creator"
  | "content"
  | "faq"
  | "mixed"
  | "unknown";

export type SearchTelemetryInput = {
  eventName: SearchDiscoveryEventName;
  surface: string;
  sourceComponent: string;
  queryText?: string | null;
  queryLength?: number | null;
  queryCategory?: SearchIntentClass | string | null;
  resultCount?: number | null;
  resultType?: SearchResultType;
  resultId?: string | null;
  resultPosition?: number | null;
  executionMode?: SearchExecutionMode;
  failureReason?: string | null;
  debounced?: boolean | null;
  minQueryLength?: number | null;
  pageSize?: number | null;
  cacheHit?: boolean | null;
};

export type SearchTelemetryPayload = {
  event_name: SearchDiscoveryEventName;
  surface: string;
  source_component: string;
  query_length: number;
  query_hash: string;
  query_category: string;
  raw_query_stored: false;
  result_count?: number;
  result_type?: SearchResultType;
  result_id?: string;
  result_position?: number;
  execution_mode?: SearchExecutionMode;
  failure_reason?: string;
  debounced?: boolean;
  min_query_length?: number;
  page_size?: number;
  cache_hit?: boolean;
  debug_lane: typeof SEARCH_DISCOVERY_DEBUG_LANE;
  privacy_class: "product_behavior_redacted";
};

export type SearchDiscoveryDebugEvent = {
  eventName: SearchDiscoveryEventName;
  resultCount?: number | null;
  queryLength?: number | null;
  resultType?: SearchResultType;
  resultPosition?: number | null;
  failureReason?: string | null;
  broadReadRisk?: boolean | null;
};

export type SearchDiscoveryDebugLane = {
  label: typeof SEARCH_DISCOVERY_DEBUG_LANE;
  lane: typeof SEARCH_DISCOVERY_DEBUG_LANE;
  zeroResultCount: number;
  failedSearchCount: number;
  clickedResultCount: number;
  debouncePolicyMs: number;
  broadReadRiskCount: number;
  costPolicyStatus: "ok" | "review";
};

export type SearchDiscoveryCostReport = {
  generatedAtUtc?: string;
  events: readonly SearchDiscoveryEventName[];
  costPolicy: SearchCostPolicy;
  debugLane: string | SearchDiscoveryDebugLane;
  scoreDimensions?: {
    before?: Record<string, number>;
    after?: Record<string, number>;
  };
  remainingGaps?: readonly string[];
};

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

function cleanString(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function cleanNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hashSearchQuery(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/gu, " ");
  if (!normalized) {
    return "q_empty";
  }

  let hash = FNV_OFFSET;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return `q_${hash.toString(36)}`;
}

function classifyQueryCategory(queryText: string | null | undefined, fallback: string | null | undefined) {
  const fallbackCategory = cleanString(fallback);
  if (fallbackCategory) {
    return fallbackCategory;
  }

  const tokens = normalizeSearchQueryTokens(queryText ?? "");
  if (tokens.length === 0) {
    return cleanString(queryText) ? "sensitive_redacted" : "empty";
  }
  if (tokens.some((token) => token.includes("creator") || token.includes("artist"))) {
    return "creator";
  }
  if (tokens.some((token) => token.includes("new") || token.includes("latest"))) {
    return "freshness";
  }

  return "general";
}

export function buildSearchTelemetryPayload(input: SearchTelemetryInput): SearchTelemetryPayload {
  const queryText = input.queryText ?? "";
  const queryLength = cleanNumber(input.queryLength) ?? queryText.trim().length;
  const payload: SearchTelemetryPayload = {
    event_name: input.eventName,
    surface: cleanString(input.surface) ?? "search",
    source_component: cleanString(input.sourceComponent) ?? "search_discovery",
    query_length: queryLength,
    query_hash: hashSearchQuery(queryText),
    query_category: classifyQueryCategory(queryText, input.queryCategory),
    raw_query_stored: false,
    debug_lane: SEARCH_DISCOVERY_DEBUG_LANE,
    privacy_class: "product_behavior_redacted",
  };

  const resultCount = cleanNumber(input.resultCount);
  if (resultCount !== undefined) payload.result_count = resultCount;
  if (input.resultType) payload.result_type = input.resultType;
  const resultId = cleanString(input.resultId ?? undefined);
  if (resultId) payload.result_id = resultId;
  const resultPosition = cleanNumber(input.resultPosition);
  if (resultPosition !== undefined) payload.result_position = resultPosition;
  if (input.executionMode) payload.execution_mode = input.executionMode;
  const failureReason = cleanString(input.failureReason ?? undefined);
  if (failureReason) payload.failure_reason = failureReason;
  if (typeof input.debounced === "boolean") payload.debounced = input.debounced;
  const minQueryLength = cleanNumber(input.minQueryLength);
  if (minQueryLength !== undefined) payload.min_query_length = minQueryLength;
  const pageSize = cleanNumber(input.pageSize);
  if (pageSize !== undefined) payload.page_size = pageSize;
  if (typeof input.cacheHit === "boolean") payload.cache_hit = input.cacheHit;

  return payload;
}

export function buildSearchDiscoveryDebugLane(
  events: readonly SearchDiscoveryDebugEvent[],
): SearchDiscoveryDebugLane {
  const zeroResultCount = events.filter((event) => event.eventName === "search_zero_results" || event.resultCount === 0).length;
  const failedSearchCount = events.filter((event) => event.eventName === "search_failed").length;
  const clickedResultCount = events.filter((event) => event.eventName === "search_result_clicked").length;
  const broadReadRiskCount = events.filter((event) => event.broadReadRisk === true).length;

  return {
    label: SEARCH_DISCOVERY_DEBUG_LANE,
    lane: SEARCH_DISCOVERY_DEBUG_LANE,
    zeroResultCount,
    failedSearchCount,
    clickedResultCount,
    debouncePolicyMs: SEARCH_COST_POLICY.clientDebounceMs,
    broadReadRiskCount,
    costPolicyStatus: broadReadRiskCount > 0 || failedSearchCount > 0 ? "review" : "ok",
  };
}

export function validateSearchDiscoveryCostReport(report: SearchDiscoveryCostReport): string[] {
  const failures: string[] = [];
  const eventSet = new Set(report.events);

  for (const eventName of SEARCH_DISCOVERY_EVENTS) {
    if (!eventSet.has(eventName)) failures.push(`missing search event: ${eventName}`);
  }

  failures.push(...validateSearchCostPolicy(report.costPolicy));

  const debugLane = typeof report.debugLane === "string" ? report.debugLane : report.debugLane.lane;
  if (debugLane !== SEARCH_DISCOVERY_DEBUG_LANE) failures.push("search discovery debug lane missing");

  if (!report.scoreDimensions?.before || !report.scoreDimensions?.after) {
    failures.push("score dimension before/after missing");
  }

  if ((report.remainingGaps ?? []).some((gap) => gap.trim().length > 0)) {
    failures.push("search discovery report has remaining gaps");
  }

  return failures;
}

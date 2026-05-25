export const SEARCH_COST_DEBUG_LANE = "Search/discovery";

export type SearchExecutionMode =
  | "local_filter"
  | "cached_results"
  | "backend_query"
  | "materialized_snapshot";

export type SearchRouteCostRisk =
  | "cost_safe_local_filter"
  | "cost_safe_cached_backend"
  | "bounded_backend_query"
  | "broad_read_risk"
  | "unsafe_unknown";

export type SearchCostPolicy = {
  version: 1;
  debugLane: typeof SEARCH_COST_DEBUG_LANE;
  clientDebounceMs: number;
  backendMinQueryLength: number;
  backendCallPerKeystrokeAllowed: boolean;
  localFilterMayRunPerKeystroke: boolean;
  cacheReuseRequired: boolean;
  pageSizeMax: number;
  paginationRequired: boolean;
  broadUnboundedReadsAllowed: boolean;
  rawQueryTextInBroadTelemetryAllowed: boolean;
  zeroResultSummaryTracked: boolean;
  clickedResultTracked: boolean;
  queryTextPolicy: "length_hash_category_only";
};

export type SearchRouteCostInput = {
  route: string;
  executionMode: SearchExecutionMode;
  debounced: boolean;
  minQueryLength: number;
  paged: boolean;
  broadRawRead: boolean;
  cacheReused?: boolean;
};

export const SEARCH_COST_POLICY: SearchCostPolicy = {
  version: 1,
  debugLane: SEARCH_COST_DEBUG_LANE,
  clientDebounceMs: 350,
  backendMinQueryLength: 3,
  backendCallPerKeystrokeAllowed: false,
  localFilterMayRunPerKeystroke: true,
  cacheReuseRequired: true,
  pageSizeMax: 24,
  paginationRequired: true,
  broadUnboundedReadsAllowed: false,
  rawQueryTextInBroadTelemetryAllowed: false,
  zeroResultSummaryTracked: true,
  clickedResultTracked: true,
  queryTextPolicy: "length_hash_category_only",
};

export function isBackendSearchAllowed(input: {
  queryLength: number;
  debounced: boolean;
  paged: boolean;
  policy?: SearchCostPolicy;
}) {
  const policy = input.policy ?? SEARCH_COST_POLICY;
  return (
    input.debounced
    && input.paged
    && input.queryLength >= policy.backendMinQueryLength
    && !policy.backendCallPerKeystrokeAllowed
  );
}

export function classifySearchRouteCostRisk(input: SearchRouteCostInput): SearchRouteCostRisk {
  if (input.broadRawRead) {
    return "broad_read_risk";
  }
  if (input.executionMode === "local_filter") {
    return input.debounced || input.minQueryLength >= 0 ? "cost_safe_local_filter" : "unsafe_unknown";
  }
  if (input.executionMode === "cached_results" || input.executionMode === "materialized_snapshot") {
    return input.paged && input.cacheReused !== false ? "cost_safe_cached_backend" : "unsafe_unknown";
  }
  if (input.executionMode === "backend_query") {
    if (input.debounced && input.paged && input.minQueryLength >= SEARCH_COST_POLICY.backendMinQueryLength) {
      return "bounded_backend_query";
    }
    return "broad_read_risk";
  }

  return "unsafe_unknown";
}

export function validateSearchCostPolicy(policy: SearchCostPolicy): string[] {
  const failures: string[] = [];

  if (policy.debugLane !== SEARCH_COST_DEBUG_LANE) failures.push("search cost debug lane missing");
  if (policy.clientDebounceMs < 250) failures.push("client debounce below cost-safe threshold");
  if (policy.backendMinQueryLength < 3) failures.push("backend minimum query length below 3");
  if (policy.backendCallPerKeystrokeAllowed) failures.push("backend search can run per keystroke");
  if (!policy.localFilterMayRunPerKeystroke) failures.push("local filter exception missing");
  if (!policy.cacheReuseRequired) failures.push("cached/reused results policy missing");
  if (!policy.paginationRequired || policy.pageSizeMax <= 0 || policy.pageSizeMax > 50) failures.push("paged result policy missing or too broad");
  if (policy.broadUnboundedReadsAllowed) failures.push("broad unbounded reads allowed");
  if (policy.rawQueryTextInBroadTelemetryAllowed) failures.push("raw query text can leak to broad telemetry");
  if (!policy.zeroResultSummaryTracked) failures.push("zero-result summary tracking missing");
  if (!policy.clickedResultTracked) failures.push("clicked result tracking missing");
  if (policy.queryTextPolicy !== "length_hash_category_only") failures.push("query redaction/hash policy missing");

  return failures;
}

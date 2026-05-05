import { clamp01, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export const SEARCH_INTENT_EVENT_NAMES = [
  "search_query_submitted",
  "filter_selected",
  "sort_changed",
  "category_clicked",
  "creator_search_selected",
] as const;

export type SearchIntentEventName = typeof SEARCH_INTENT_EVENT_NAMES[number];

export type SearchIntentClass =
  | "creator"
  | "category"
  | "style"
  | "price"
  | "freshness"
  | "general"
  | "sensitive_redacted";

export const SEARCH_INTENT_HALF_LIFE_HOURS = 24;
export const SEARCH_INTENT_MAX_TOKENS = 8;

export type SearchIntentProfile = {
  version: 1;
  halfLifeHours: typeof SEARCH_INTENT_HALF_LIFE_HOURS;
  latestAtMs: number;
  activeUntilMs: number;
  rawQueryStored: false;
  tokens: Record<string, number>;
  categories: Record<string, number>;
  creatorIds: Record<string, number>;
  filters: Record<string, number>;
  sorts: Record<string, number>;
  queryClusters: Record<string, number>;
  intentClasses: Record<SearchIntentClass | string, number>;
  queryLengths: {
    latest: number;
    average: number;
    samples: number;
  };
  sessionIds: string[];
};

export type SafeSearchIntentParams = Record<string, unknown> & {
  query?: never;
  q?: never;
  searchQuery?: never;
  rawQuery?: never;
  normalized_query_tokens: string[];
  normalizedQueryTokens: string[];
  normalized_query_cluster: string;
  normalizedQueryCluster: string;
  query_length: number;
  queryLength: number;
  intent_class: SearchIntentClass;
  intentClass: SearchIntentClass;
  raw_query_stored: false;
  rawQueryStored: false;
};

export type QueryIntentScoreInput = {
  exactCategoryMatch: number;
  creatorNameMatch: number;
  recentSearchRecency: number;
  repeatedQueryCluster: number;
  filterMatch: number;
};

const SENSITIVE_TOKEN_SET = new Set([
  "address",
  "bank",
  "card",
  "credit",
  "email",
  "login",
  "password",
  "paypal",
  "phone",
  "secret",
  "ssn",
  "token",
]);

function sanitizeQuerySource(value: string) {
  return value
    .replace(/https?:\/\/\S+/giu, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, " ")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/gu, " ")
    .replace(/\b\d{6,}\b/gu, " ");
}

export function isSearchIntentEventName(eventName: string): eventName is SearchIntentEventName {
  return (SEARCH_INTENT_EVENT_NAMES as readonly string[]).includes(eventName);
}

export function normalizeSearchIntentToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 40);
}

export function normalizeSearchQueryTokens(query: unknown) {
  if (typeof query !== "string") {
    return [] as string[];
  }

  return sanitizeQuerySource(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/gu)
    .map((token) => normalizeSearchIntentToken(token))
    .filter((token) => token.length >= 2 && !SENSITIVE_TOKEN_SET.has(token))
    .slice(0, SEARCH_INTENT_MAX_TOKENS);
}

export function buildSearchQueryCluster(tokens: string[]) {
  return Array.from(new Set(tokens))
    .sort()
    .slice(0, SEARCH_INTENT_MAX_TOKENS)
    .join("_")
    .slice(0, 120);
}

export function classifySearchIntent(input: {
  eventName: string;
  tokens: string[];
  category?: string;
  creatorId?: string;
  creatorName?: string;
  sort?: string;
  filterKey?: string;
  rawQuerySensitive?: boolean;
}): SearchIntentClass {
  const tokenSet = new Set(input.tokens);
  const filterKey = normalizeSearchIntentToken(input.filterKey || "");
  const sort = normalizeSearchIntentToken(input.sort || "");

  if (input.rawQuerySensitive) {
    return "sensitive_redacted";
  }
  if (input.eventName === "creator_search_selected" || input.creatorId || input.creatorName) {
    return "creator";
  }
  if (input.eventName === "category_clicked" || input.category || filterKey.includes("categor")) {
    return "category";
  }
  if (tokenSet.has("new") || tokenSet.has("fresh") || tokenSet.has("latest") || sort.includes("new")) {
    return "freshness";
  }
  if (tokenSet.has("cheap") || tokenSet.has("free") || tokenSet.has("sale") || tokenSet.has("price")) {
    return "price";
  }
  if (tokenSet.has("art") || tokenSet.has("music") || tokenSet.has("style") || tokenSet.has("aesthetic")) {
    return "style";
  }
  return "general";
}

export function sanitizeSearchIntentParams(params: Record<string, unknown>, eventName: string): SafeSearchIntentParams {
  const rawQuery = params.query ?? params.q ?? params.searchQuery ?? params.rawQuery ?? "";
  const queryLength = typeof rawQuery === "string" ? rawQuery.trim().length : 0;
  const tokens = normalizeSearchQueryTokens(rawQuery);
  const normalizedCategory = normalizeSearchIntentToken(String(params.category ?? params.drop_category ?? params.dropCategory ?? ""));
  const normalizedCreatorId = normalizeSearchIntentToken(String(params.creator_id ?? params.creatorId ?? params.target_creator_id ?? params.targetCreatorId ?? ""));
  const normalizedCreatorName = normalizeSearchIntentToken(String(params.creator_name ?? params.creatorName ?? ""));
  const intentClass = classifySearchIntent({
    eventName,
    tokens,
    category: normalizedCategory,
    creatorId: normalizedCreatorId,
    creatorName: normalizedCreatorName,
    sort: String(params.sort ?? ""),
    filterKey: String(params.filter_key ?? params.filterKey ?? ""),
    rawQuerySensitive: queryLength > 0 && tokens.length === 0,
  });
  const cluster = buildSearchQueryCluster(tokens);
  const sanitized = { ...params };

  delete sanitized.query;
  delete sanitized.q;
  delete sanitized.searchQuery;
  delete sanitized.rawQuery;

  return {
    ...sanitized,
    normalized_query_tokens: tokens,
    normalizedQueryTokens: tokens,
    normalized_query_cluster: cluster,
    normalizedQueryCluster: cluster,
    query_length: queryLength,
    queryLength,
    intent_class: intentClass,
    intentClass,
    raw_query_stored: false,
    rawQueryStored: false,
  };
}

export function computeSearchIntentDecay(input: {
  latestAtMs?: number;
  nowMs?: number;
  halfLifeHours?: number;
}) {
  const latestAtMs = Math.max(0, input.latestAtMs || 0);
  if (latestAtMs <= 0) {
    return 0;
  }

  const nowMs = input.nowMs ?? Date.now();
  const halfLifeHours = Math.max(1, input.halfLifeHours ?? SEARCH_INTENT_HALF_LIFE_HOURS);
  const ageHours = Math.max(0, (nowMs - latestAtMs) / (60 * 60 * 1000));
  return clamp01(0.5 ** (ageHours / halfLifeHours));
}

export function computeQueryIntentScore(input: QueryIntentScoreInput) {
  return roundScore(clamp01(
    (0.40 * clamp01(input.exactCategoryMatch)) +
    (0.25 * clamp01(input.creatorNameMatch)) +
    (0.20 * clamp01(input.recentSearchRecency)) +
    (0.10 * clamp01(input.repeatedQueryCluster)) +
    (0.05 * clamp01(input.filterMatch)),
  ));
}

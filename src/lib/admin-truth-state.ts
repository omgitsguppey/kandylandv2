import type { AdminSurfaceState } from "@/lib/admin-parity";

export const ADMIN_TRUTH_STATES = [
  "live",
  "cached",
  "refreshing",
  "stale",
  "degraded",
  "failed",
  "unavailable",
  "delayed",
  "privacy_limited",
  "legacy_fallback",
  "blocked",
  "review",
] as const;

export type AdminTruthState = (typeof ADMIN_TRUTH_STATES)[number];

type TruthLikeState =
  | AdminTruthState
  | AdminSurfaceState
  | "healthy"
  | "partial"
  | "empty"
  | "unknown"
  | "warn"
  | "error"
  | "privacy_limited"
  | "legacy_fallback"
  | "blocked";

const LEGACY_TRUTH_STATE_MAP: Record<TruthLikeState, AdminTruthState> = {
  live: "live",
  cached: "cached",
  refreshing: "refreshing",
  stale: "stale",
  degraded: "degraded",
  failed: "failed",
  unavailable: "unavailable",
  delayed: "delayed",
  privacy_limited: "privacy_limited",
  legacy_fallback: "legacy_fallback",
  blocked: "blocked",
  review: "review",
  loading: "unavailable",
  fallback: "cached",
  healthy: "live",
  partial: "review",
  empty: "unavailable",
  unknown: "unavailable",
  warn: "review",
  error: "failed",
};

export function isAdminTruthState(value: unknown): value is AdminTruthState {
  return typeof value === "string" && (ADMIN_TRUTH_STATES as readonly string[]).includes(value);
}

export function coerceAdminTruthState(value: unknown): AdminTruthState | null {
  if (typeof value !== "string") {
    return null;
  }

  return LEGACY_TRUTH_STATE_MAP[value as TruthLikeState] ?? null;
}

export function hasUsableAdminTruthValue(...values: unknown[]) {
  return values.some((value) => {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (typeof value === "string") {
      return value.trim().length > 0 && value !== "[unavailable]";
    }

    return value !== null && value !== undefined;
  });
}

export function resolveAdminTruthState(input: {
  hasUsableValue: boolean;
  sourceConfigured?: boolean;
  refreshInFlight?: boolean;
  transportState?: unknown;
  valueState?: unknown;
  delayed?: boolean;
  reviewRequired?: boolean;
  sourceIssue?: boolean;
  confidence?: number | null;
  confidenceThreshold?: number;
}): AdminTruthState {
  const transportState = coerceAdminTruthState(input.transportState);
  const valueState = coerceAdminTruthState(input.valueState);
  const sourceConfigured = input.sourceConfigured ?? true;
  const confidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? input.confidence
      : null;
  const confidenceThreshold =
    typeof input.confidenceThreshold === "number" && Number.isFinite(input.confidenceThreshold)
      ? input.confidenceThreshold
      : null;

  if (!sourceConfigured) {
    return "unavailable";
  }

  if (transportState === "blocked" || valueState === "blocked") {
    return "blocked";
  }

  if (transportState === "privacy_limited" || valueState === "privacy_limited") {
    return input.hasUsableValue ? "privacy_limited" : "unavailable";
  }

  if (transportState === "unavailable" || valueState === "unavailable") {
    return "unavailable";
  }

  if (!input.hasUsableValue) {
    if (transportState === "failed" || valueState === "failed") {
      return "failed";
    }

    return "unavailable";
  }

  if (input.delayed || transportState === "delayed" || valueState === "delayed") {
    return "delayed";
  }

  if (transportState === "legacy_fallback" || valueState === "legacy_fallback") {
    return "legacy_fallback";
  }

  if (input.reviewRequired || transportState === "review" || valueState === "review") {
    return "review";
  }

  if (transportState === "failed" || valueState === "failed") {
    return "degraded";
  }

  if (input.refreshInFlight || transportState === "refreshing") {
    return "refreshing";
  }

  if (transportState === "cached" || valueState === "cached") {
    return "cached";
  }

  if (input.sourceIssue || transportState === "degraded" || valueState === "degraded") {
    return "degraded";
  }

  if (transportState === "stale" || valueState === "stale") {
    return "stale";
  }

  if (confidenceThreshold !== null && (confidence === null || confidence < confidenceThreshold)) {
    return "review";
  }

  return "live";
}

export function resolveAdminInputTruthState(input: {
  truthState?: unknown;
  value?: unknown;
  sourceConfigured?: boolean;
  pendingInitialLoad?: boolean;
  refreshInFlight?: boolean;
  delayed?: boolean;
  reviewRequired?: boolean;
  sourceIssue?: boolean;
  confidence?: number | null;
  confidenceThreshold?: number;
}) {
  const hasUsableValue = hasUsableAdminTruthValue(input.value);
  return {
    truthState: resolveAdminTruthState({
      hasUsableValue,
      sourceConfigured: input.sourceConfigured ?? true,
      transportState: input.truthState,
      valueState: input.truthState,
      refreshInFlight: input.refreshInFlight,
      delayed: input.delayed,
      reviewRequired: input.reviewRequired,
      sourceIssue: input.sourceIssue,
      confidence: input.confidence,
      confidenceThreshold: input.confidenceThreshold,
    }),
    hasUsableValue,
    pendingInitialLoad: Boolean(input.pendingInitialLoad && !hasUsableValue),
  };
}

export function resolveAdminMetricTruthState(input: {
  truthState?: unknown;
  value?: unknown;
  reviewRequired?: boolean;
  confidence?: number | null;
  confidenceThreshold?: number;
}) {
  return resolveAdminTruthState({
    hasUsableValue: hasUsableAdminTruthValue(input.value),
    sourceConfigured: true,
    transportState: input.truthState,
    valueState: input.truthState,
    reviewRequired: input.reviewRequired,
    confidence: input.confidence,
    confidenceThreshold: input.confidenceThreshold,
  });
}

export function resolveAdminVerificationTruthState(input: {
  status?: unknown;
  canonicalSource?: string | null;
  fallbackSource?: string | null;
  freshnessTimestamp?: number | null;
  countComposition?: Record<string, number> | null;
  verificationState?: unknown;
  degradedReason?: string | null;
}) {
  const hasUsableFallback = Boolean(
    input.fallbackSource
      || input.freshnessTimestamp
      || (input.countComposition && Object.keys(input.countComposition).length > 0),
  );
  const hasUsableValue = input.status === "failed" ? hasUsableFallback : true;
  const normalizedStatus = coerceAdminTruthState(input.status) ?? "unavailable";

  return {
    truthState: resolveAdminTruthState({
      hasUsableValue,
      sourceConfigured: Boolean(input.canonicalSource),
      transportState: normalizedStatus,
      valueState: input.verificationState === "fallback" ? "legacy_fallback" : normalizedStatus,
      reviewRequired: Boolean(input.degradedReason),
      sourceIssue: input.status === "degraded" || input.status === "failed",
    }),
    hasUsableValue,
    pendingInitialLoad: input.status === "loading" && !hasUsableValue,
  };
}

export function getAdminTruthStateBadgeLabel(
  state: AdminTruthState,
  options?: {
    pendingInitialLoad?: boolean;
    hasUsableValue?: boolean;
  },
) {
  if (state === "unavailable" && options?.pendingInitialLoad && !options.hasUsableValue) {
    return "WAIT";
  }

  if (state === "live") return "LIVE";
  if (state === "cached") return "CACHED";
  if (state === "refreshing") return "REFRESHING";
  if (state === "stale") return "STALE";
  if (state === "degraded") return "DEGRADED";
  if (state === "failed") return "FAILED";
  if (state === "delayed") return "DELAYED";
  if (state === "privacy_limited") return "PRIVACY";
  if (state === "legacy_fallback") return "LEGACY";
  if (state === "blocked") return "BLOCKED";
  if (state === "review") return "REVIEW";
  return "UNAVAILABLE";
}

export function getAdminTruthStateDescription(state: AdminTruthState) {
  if (state === "live") return "Fresh source succeeded and current values are usable.";
  if (state === "cached") return "A usable verified cache or snapshot value is showing.";
  if (state === "refreshing") return "A usable value is showing while a refresh is in flight.";
  if (state === "stale") return "A usable value is showing, but freshness has expired.";
  if (state === "degraded") return "A usable value is showing, but the source reported an issue.";
  if (state === "failed") return "No usable value exists because the source failed.";
  if (state === "delayed") return "A usable value is showing, but payment or settlement timing is delayed.";
  if (state === "privacy_limited") return "A usable value is showing, but privacy limits prevent full attribution.";
  if (state === "legacy_fallback") return "A usable value is showing from a labeled legacy fallback source.";
  if (state === "blocked") return "This surface is blocked from acting as canonical truth.";
  if (state === "review") return "A usable value is showing, but the data needs operator review.";
  return "No configured source or no usable value is available yet.";
}

export function getAdminTruthStateClasses(state: AdminTruthState) {
  if (state === "live") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (state === "cached") return "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]";
  if (state === "refreshing") return "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]";
  if (state === "stale") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  if (state === "degraded") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (state === "failed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (state === "delayed") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (state === "privacy_limited") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  if (state === "legacy_fallback") return "border-stone-500/30 bg-stone-500/10 text-stone-200";
  if (state === "blocked") return "border-red-700/40 bg-red-950/30 text-red-200";
  if (state === "review") return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
  return "border-gray-500/30 bg-gray-500/10 text-gray-300";
}

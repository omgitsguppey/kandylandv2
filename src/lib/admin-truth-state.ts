import type { AdminSurfaceState } from "@/lib/admin-parity";

export const ADMIN_TRUTH_STATES = [
  "live",
  "refreshing",
  "stale",
  "degraded",
  "failed",
  "unavailable",
  "delayed",
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
  | "error";

const LEGACY_TRUTH_STATE_MAP: Record<TruthLikeState, AdminTruthState> = {
  live: "live",
  refreshing: "refreshing",
  stale: "stale",
  degraded: "degraded",
  failed: "failed",
  unavailable: "unavailable",
  delayed: "delayed",
  review: "review",
  loading: "unavailable",
  cached: "stale",
  fallback: "stale",
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
}): AdminTruthState {
  const transportState = coerceAdminTruthState(input.transportState);
  const valueState = coerceAdminTruthState(input.valueState);
  const sourceConfigured = input.sourceConfigured ?? true;

  if (!sourceConfigured) {
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

  if (input.reviewRequired || transportState === "review" || valueState === "review") {
    return "review";
  }

  if (transportState === "failed" || valueState === "failed") {
    return "degraded";
  }

  if (input.refreshInFlight || transportState === "refreshing") {
    return "refreshing";
  }

  if (input.sourceIssue || transportState === "degraded" || valueState === "degraded") {
    return "degraded";
  }

  if (transportState === "stale" || valueState === "stale") {
    return "stale";
  }

  return "live";
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
  if (state === "refreshing") return "REFRESHING";
  if (state === "stale") return "STALE";
  if (state === "degraded") return "DEGRADED";
  if (state === "failed") return "FAILED";
  if (state === "delayed") return "DELAYED";
  if (state === "review") return "REVIEW";
  return "UNAVAILABLE";
}

export function getAdminTruthStateDescription(state: AdminTruthState) {
  if (state === "live") return "Fresh source succeeded and current values are usable.";
  if (state === "refreshing") return "A usable value is showing while a refresh is in flight.";
  if (state === "stale") return "A usable value is showing, but freshness has expired.";
  if (state === "degraded") return "A usable value is showing, but the source reported an issue.";
  if (state === "failed") return "No usable value exists because the source failed.";
  if (state === "delayed") return "A usable value is showing, but payment or settlement timing is delayed.";
  if (state === "review") return "A usable value is showing, but the data needs operator review.";
  return "No configured source or no usable value is available yet.";
}

export function getAdminTruthStateClasses(state: AdminTruthState) {
  if (state === "live") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (state === "refreshing") return "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]";
  if (state === "stale") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  if (state === "degraded") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (state === "failed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (state === "delayed") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (state === "review") return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
  return "border-gray-500/30 bg-gray-500/10 text-gray-300";
}

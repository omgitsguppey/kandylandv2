import type { AdminSurfaceState } from "@/lib/admin-parity";

export type AdminMetricState =
  | "live"
  | "stale"
  | "refreshing"
  | "degraded"
  | "failed"
  | "unavailable";

export function hasUsableAdminMetricValue(...values: unknown[]) {
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

export function resolveAdminMetricState(input: {
  hasUsableValue: boolean;
  transportState: AdminSurfaceState;
  refreshInFlight?: boolean;
  valueTruthState?: AdminSurfaceState | null;
}): AdminMetricState {
  if (!input.hasUsableValue) {
    return input.transportState === "failed" ? "failed" : "unavailable";
  }

  if (input.transportState === "failed") {
    return "degraded";
  }

  if (input.refreshInFlight || input.transportState === "loading") {
    return "refreshing";
  }

  if (input.valueTruthState === "failed") {
    return "degraded";
  }

  if (input.valueTruthState === "stale" || input.transportState === "stale") {
    return "stale";
  }

  if (
    input.valueTruthState === "degraded" ||
    input.valueTruthState === "fallback" ||
    input.transportState === "degraded" ||
    input.transportState === "fallback"
  ) {
    return "degraded";
  }

  if (input.valueTruthState === "cached" || input.transportState === "cached" || input.transportState === "unavailable") {
    return "stale";
  }

  return "live";
}

export function adminMetricStateToSurfaceState(state: AdminMetricState): AdminSurfaceState {
  if (state === "refreshing") {
    return "cached";
  }

  return state;
}

export function getAdminMetricStateBadgeLabel(state: AdminMetricState) {
  if (state === "refreshing") {
    return "REFRESHING";
  }

  return undefined;
}

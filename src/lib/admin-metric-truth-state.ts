import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  getAdminTruthStateBadgeLabel,
  hasUsableAdminTruthValue,
  resolveAdminTruthState,
  type AdminTruthState,
} from "@/lib/admin-truth-state";

export type AdminMetricState = AdminTruthState;

export function hasUsableAdminMetricValue(...values: unknown[]) {
  return hasUsableAdminTruthValue(...values);
}

export function resolveAdminMetricState(input: {
  hasUsableValue: boolean;
  transportState: AdminSurfaceState;
  refreshInFlight?: boolean;
  valueTruthState?: AdminSurfaceState | null;
}): AdminMetricState {
  return resolveAdminTruthState({
    hasUsableValue: input.hasUsableValue,
    transportState: input.transportState,
    refreshInFlight: input.refreshInFlight,
    valueState: input.valueTruthState,
  });
}

export function adminMetricStateToSurfaceState(state: AdminMetricState): AdminSurfaceState {
  if (state === "refreshing") return "cached";
  if (state === "review" || state === "delayed") return "degraded";
  return state as AdminSurfaceState;
}

export function getAdminMetricStateBadgeLabel(state: AdminMetricState) {
  return getAdminTruthStateBadgeLabel(state);
}

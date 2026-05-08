import type { AdminSurfaceState } from "@/lib/admin-parity";

export type AdminRealtimeMetricScope = "operational_pulse_only";
export type AdminRealtimeCostRisk = "low" | "moderate" | "high";

export type AdminRealtimePolicy = {
  id: string;
  owner: string;
  purpose: "operational_pulse_only";
  metricScope: AdminRealtimeMetricScope;
  businessTruthSource: "refresh_based_hot_cache";
  snapshotRefreshCadenceMs?: number;
  heartbeatIntervalMs?: number;
  reconnectBackoffMaxMs?: number;
  costRisk: AdminRealtimeCostRisk;
  explicitCostJustification?: string;
};

export const ADMIN_REALTIME_FIRST_CLASS_POLICIES = {
  businessTruthSource: "refresh_based_hot_cache" as const,
  missingSnapshotFailureState: "failed" as const,
  usableSnapshotFailureState: "degraded" as const,
};

export const ADMIN_OVERVIEW_REALTIME_POLICY: AdminRealtimePolicy = {
  id: "admin_overview_operational_pulse",
  owner: "admin_overview",
  purpose: "operational_pulse_only",
  metricScope: "operational_pulse_only",
  businessTruthSource: "refresh_based_hot_cache",
  snapshotRefreshCadenceMs: 60_000,
  reconnectBackoffMaxMs: 10_000,
  costRisk: "moderate",
  explicitCostJustification:
    "One-minute snapshot refresh keeps canonical admin totals current without letting realtime listeners become business truth.",
};

export const ADMIN_USERS_REALTIME_POLICY: AdminRealtimePolicy = {
  id: "admin_users_operational_pulse",
  owner: "admin_users",
  purpose: "operational_pulse_only",
  metricScope: "operational_pulse_only",
  businessTruthSource: "refresh_based_hot_cache",
  snapshotRefreshCadenceMs: 60_000,
  heartbeatIntervalMs: 25_000,
  reconnectBackoffMaxMs: 15_000,
  costRisk: "moderate",
  explicitCostJustification:
    "One-minute users snapshot refresh keeps business metrics stable while the realtime SSE lane only signals invalidate pulses.",
};

export const ADMIN_ANALYTICS_REALTIME_POLICY: AdminRealtimePolicy = {
  id: "admin_analytics_operational_live_pulse",
  owner: "admin_analytics",
  purpose: "operational_pulse_only",
  metricScope: "operational_pulse_only",
  businessTruthSource: "refresh_based_hot_cache",
  snapshotRefreshCadenceMs: 60_000,
  costRisk: "moderate",
  explicitCostJustification:
    "Realtime analytics observers are limited to operational live pulse and never replace canonical admin snapshot totals.",
};

export function resolveAdminRealtimeFailureState(hasSnapshotValue: boolean): AdminSurfaceState {
  return hasSnapshotValue
    ? ADMIN_REALTIME_FIRST_CLASS_POLICIES.usableSnapshotFailureState
    : ADMIN_REALTIME_FIRST_CLASS_POLICIES.missingSnapshotFailureState;
}

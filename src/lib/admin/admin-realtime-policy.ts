import type { AdminSurfaceState } from "@/lib/admin-parity";
import { ADMIN_HEARTBEAT_INTERVAL_MS } from "@/lib/admin/admin-heartbeat-contract";

export type AdminRealtimeMetricScope = "operational_pulse_only";
export type AdminRealtimeCostRisk = "low" | "moderate" | "high";

export type AdminRealtimePolicy = {
  id: string;
  owner: string;
  purpose: "operational_pulse_only";
  metricScope: AdminRealtimeMetricScope;
  businessTruthSource: "hot_cache" | "refresh_based_hot_cache";
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
  snapshotRefreshCadenceMs: ADMIN_HEARTBEAT_INTERVAL_MS,
  reconnectBackoffMaxMs: 10_000,
  costRisk: "low",
  explicitCostJustification:
    "Hourly hot-cache refresh keeps canonical admin totals current without page-load raw reads or realtime listeners.",
};

export const ADMIN_USERS_REALTIME_POLICY: AdminRealtimePolicy = {
  id: "admin_users_operational_pulse",
  owner: "admin_users",
  purpose: "operational_pulse_only",
  metricScope: "operational_pulse_only",
  businessTruthSource: "refresh_based_hot_cache",
  snapshotRefreshCadenceMs: ADMIN_HEARTBEAT_INTERVAL_MS,
  heartbeatIntervalMs: ADMIN_HEARTBEAT_INTERVAL_MS,
  reconnectBackoffMaxMs: 15_000,
  costRisk: "low",
  explicitCostJustification:
    "Hourly users snapshot refresh keeps business metrics stable; raw user lists are explicit bounded drilldowns.",
};

export const ADMIN_ANALYTICS_REALTIME_POLICY: AdminRealtimePolicy = {
  id: "admin_analytics_operational_live_pulse",
  owner: "admin_analytics",
  purpose: "operational_pulse_only",
  metricScope: "operational_pulse_only",
  businessTruthSource: "refresh_based_hot_cache",
  snapshotRefreshCadenceMs: ADMIN_HEARTBEAT_INTERVAL_MS,
  costRisk: "low",
  explicitCostJustification:
    "Hourly analytics snapshot refresh is the default; live observers require explicit operator debug exceptions.",
};

export function resolveAdminRealtimeFailureState(hasSnapshotValue: boolean): AdminSurfaceState {
  return hasSnapshotValue
    ? ADMIN_REALTIME_FIRST_CLASS_POLICIES.usableSnapshotFailureState
    : ADMIN_REALTIME_FIRST_CLASS_POLICIES.missingSnapshotFailureState;
}

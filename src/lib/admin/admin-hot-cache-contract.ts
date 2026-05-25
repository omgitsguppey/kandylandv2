export const ADMIN_HOT_CACHE_TTL_SECONDS = 60 * 60;

export type AdminHotCacheSnapshotId =
  | "admin_overview_snapshot"
  | "admin_analytics_snapshot"
  | "admin_debug_snapshot"
  | "admin_users_snapshot"
  | "admin_roster_snapshot"
  | "admin_queue_snapshot"
  | "admin_settings_snapshot"
  | "admin_creator_snapshot"
  | "admin_support_bug_snapshot"
  | "admin_runtime_snapshot";

export type AdminHotCacheFreshnessState =
  | "fresh"
  | "refreshing"
  | "stale"
  | "missing"
  | "failed"
  | "disabled";

export type AdminHotCacheSourceTruth =
  | "hot_cache"
  | "materialized_snapshot"
  | "runtime_heartbeat"
  | "formal_evidence"
  | "manual_operator";

export type AdminHotCacheCostClass =
  | "cheap_doc_read"
  | "bounded_aggregation"
  | "expensive_raw_query"
  | "provider_api";

export type AdminHotCacheSnapshotContract = {
  snapshotId: AdminHotCacheSnapshotId;
  sourceCollections: string[];
  generatedAtUtc: string | null;
  sourceWindowStartUtc: string | null;
  sourceWindowEndUtc: string | null;
  heartbeatAtUtc: string | null;
  ttlSeconds: number;
  owner: string;
  freshnessState: AdminHotCacheFreshnessState;
  sourceTruth: AdminHotCacheSourceTruth;
  costClass: AdminHotCacheCostClass;
  allowedRealtime: boolean;
  realtimeExceptionReason: string | null;
  drilldownRoute: string;
  refreshCommand: string;
  nextAction: string;
};

export const ADMIN_HOT_CACHE_COLLECTION = "admin_hot_cache_snapshots";
export const ADMIN_HEARTBEAT_COLLECTION = "admin_surface_heartbeats";

const DEFAULT_SOURCE_WINDOW = {
  generatedAtUtc: null,
  sourceWindowStartUtc: null,
  sourceWindowEndUtc: null,
  heartbeatAtUtc: null,
} as const;

function snapshot(input: Omit<AdminHotCacheSnapshotContract, keyof typeof DEFAULT_SOURCE_WINDOW | "ttlSeconds" | "freshnessState" | "allowedRealtime" | "realtimeExceptionReason">): AdminHotCacheSnapshotContract {
  return {
    ...input,
    ...DEFAULT_SOURCE_WINDOW,
    ttlSeconds: ADMIN_HOT_CACHE_TTL_SECONDS,
    freshnessState: "missing",
    allowedRealtime: false,
    realtimeExceptionReason: null,
  };
}

export const ADMIN_HOT_CACHE_SNAPSHOTS: readonly AdminHotCacheSnapshotContract[] = [
  snapshot({
    snapshotId: "admin_overview_snapshot",
    sourceCollections: ["admin_hot_cache_snapshots", "admin_surface_heartbeats"],
    owner: "admin_overview",
    sourceTruth: "hot_cache",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/overview/refresh",
    refreshCommand: "scheduled hourly admin overview materializer",
    nextAction: "Render cached overview immediately; if missing, show source-missing state and operator refresh guidance.",
  }),
  snapshot({
    snapshotId: "admin_analytics_snapshot",
    sourceCollections: ["admin_metric_snapshots", "admin_analytics_snapshot_registry"],
    owner: "admin_analytics",
    sourceTruth: "materialized_snapshot",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/analytics/historical",
    refreshCommand: "scheduled hourly admin analytics materializer",
    nextAction: "Use snapshot authority first; reserve raw analytics facts for explicit drilldown or refresh jobs.",
  }),
  snapshot({
    snapshotId: "admin_debug_snapshot",
    sourceCollections: ["admin_debug_snapshots", "route_runtime_health"],
    owner: "admin_debug",
    sourceTruth: "formal_evidence",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/debug?detail=1",
    refreshCommand: "scheduled hourly admin debug evidence materializer",
    nextAction: "Render latest debug evidence without cold full-domain diagnostics on page load.",
  }),
  snapshot({
    snapshotId: "admin_users_snapshot",
    sourceCollections: ["admin_user_truth_snapshots", "admin_user_metrics_snapshots"],
    owner: "admin_users",
    sourceTruth: "materialized_snapshot",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/users?mode=detail",
    refreshCommand: "scheduled hourly admin users materializer",
    nextAction: "Load user summary counts from snapshot; keep raw user lists as bounded drilldowns.",
  }),
  snapshot({
    snapshotId: "admin_roster_snapshot",
    sourceCollections: ["creator_roster_snapshots", "creator_applications"],
    owner: "admin_roster",
    sourceTruth: "materialized_snapshot",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/roster?includeOps=1",
    refreshCommand: "scheduled hourly admin roster materializer",
    nextAction: "Use creator roster summary first; require explicit drilldown for raw application rows.",
  }),
  snapshot({
    snapshotId: "admin_queue_snapshot",
    sourceCollections: ["admin_queue_snapshots", "queue_job_heartbeats"],
    owner: "admin_queue",
    sourceTruth: "runtime_heartbeat",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/queue",
    refreshCommand: "scheduled hourly queue summary materializer",
    nextAction: "Show queue state and heartbeat freshness; do not scan queue heartbeats on page load.",
  }),
  snapshot({
    snapshotId: "admin_settings_snapshot",
    sourceCollections: ["admin_settings_snapshots"],
    owner: "admin_settings",
    sourceTruth: "hot_cache",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/settings",
    refreshCommand: "manual operator settings refresh",
    nextAction: "Render cached setting status and show disabled/missing state explicitly.",
  }),
  snapshot({
    snapshotId: "admin_creator_snapshot",
    sourceCollections: ["creator_admin_snapshots", "creator_lifecycle_events"],
    owner: "admin_creator",
    sourceTruth: "materialized_snapshot",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/creator-account-controls",
    refreshCommand: "scheduled hourly creator admin materializer",
    nextAction: "Load creator control summaries from snapshots before any raw lifecycle drilldown.",
  }),
  snapshot({
    snapshotId: "admin_support_bug_snapshot",
    sourceCollections: ["support_bug_snapshots"],
    owner: "admin_support",
    sourceTruth: "materialized_snapshot",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/debug/bug-reports",
    refreshCommand: "scheduled hourly support and bug materializer",
    nextAction: "Summarize user-reported support and bug counts only; keep bodies out of compact admin surfaces.",
  }),
  snapshot({
    snapshotId: "admin_runtime_snapshot",
    sourceCollections: ["route_runtime_health", "admin_runtime_snapshots"],
    owner: "admin_runtime",
    sourceTruth: "runtime_heartbeat",
    costClass: "cheap_doc_read",
    drilldownRoute: "/api/admin/debug/control-tower",
    refreshCommand: "scheduled hourly runtime materializer",
    nextAction: "Show runtime freshness from heartbeat evidence without triggering broad diagnostics from page load.",
  }),
];

export function getAdminHotCacheSnapshotContract(snapshotId: AdminHotCacheSnapshotId) {
  return ADMIN_HOT_CACHE_SNAPSHOTS.find((entry) => entry.snapshotId === snapshotId) ?? null;
}

export function classifyAdminHotCacheFreshness(input: {
  generatedAtMs: number | null;
  nowMs: number;
  ttlSeconds?: number;
  failed?: boolean;
  disabled?: boolean;
}): AdminHotCacheFreshnessState {
  if (input.disabled) return "disabled";
  if (input.failed) return "failed";
  if (!input.generatedAtMs || !Number.isFinite(input.generatedAtMs)) return "missing";
  const ttlMs = (input.ttlSeconds ?? ADMIN_HOT_CACHE_TTL_SECONDS) * 1000;
  return input.nowMs - input.generatedAtMs > ttlMs ? "stale" : "fresh";
}

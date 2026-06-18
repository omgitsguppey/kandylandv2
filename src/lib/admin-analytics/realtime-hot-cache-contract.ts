export type AdminAnalyticsRealtimeHotCacheMigrationStatus =
  | "current_direct_realtime"
  | "hot_cache_ready"
  | "migration_plan_required"
  | "intentionally_live_debug_only"
  | "retired_snapshot_first"
  | "unsafe_unknown";

export type AdminAnalyticsRealtimeHotCacheListener = {
  listenerName: string;
  collectionPath: string;
  limit: number;
  purpose: string;
  currentSourceTruth: string;
  hotCacheTarget: string;
  migrationStatus: AdminAnalyticsRealtimeHotCacheMigrationStatus;
  costRisk: "medium" | "high";
  reconnectRisk: "bounded_exponential_backoff";
  fallbackPolicy: string;
  sampleWindow: string;
  debugVisibility: boolean;
  listenerCleanup: "required";
  nextAction: string;
};

export const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS: AdminAnalyticsRealtimeHotCacheListener[] = [
  {
    listenerName: "eventFacts",
    collectionPath: "analytics_event_facts",
    limit: 80,
    purpose: "Retired direct listener lane kept as a cost-history classification for admin live-pulse review.",
    currentSourceTruth: "snapshot_first_route_default",
    hotCacheTarget: "analytics_event_fact_hot_cache",
    migrationStatus: "retired_snapshot_first",
    costRisk: "high",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Default admin display uses the verified current-activity snapshot route and snapshot metadata.",
    sampleWindow: "latest 80 event facts",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Keep the retired direct event-fact listener out of default state; use the snapshot-first route and Admin Debug raw evidence instead.",
  },
  {
    listenerName: "guestBatches",
    collectionPath: "analytics_guest_batches",
    limit: 50,
    purpose: "Retired direct listener lane kept as a cost-history classification for guest-batch debug review.",
    currentSourceTruth: "snapshot_first_route_default",
    hotCacheTarget: "analytics_guest_batch_hot_cache",
    migrationStatus: "retired_snapshot_first",
    costRisk: "medium",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Default admin display uses admin analytics snapshots and verified guest snapshot metadata.",
    sampleWindow: "latest 50 guest batches",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Keep recurring guest-batch totals on hot-cache summaries; direct batch listeners stay retired.",
  },
  {
    listenerName: "guestSessions",
    collectionPath: "analytics_sessions",
    limit: 50,
    purpose: "Retired direct listener lane kept as a cost-history classification for session debug review.",
    currentSourceTruth: "snapshot_first_route_default",
    hotCacheTarget: "analytics_session_hot_cache",
    migrationStatus: "retired_snapshot_first",
    costRisk: "medium",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Default admin display uses admin analytics snapshots and verified session metadata.",
    sampleWindow: "latest 50 sessions",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Keep direct session reads out of default analytics truth; use snapshots for compact admin display.",
  },
  {
    listenerName: "watchSessions",
    collectionPath: "analytics_watch_sessions",
    limit: 50,
    purpose: "Retired direct listener lane kept as a cost-history classification for watch-session diagnostics.",
    currentSourceTruth: "snapshot_first_route_default",
    hotCacheTarget: "watch_session_rollup",
    migrationStatus: "retired_snapshot_first",
    costRisk: "high",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Do not claim persisted watch-time truth from this listener; use watch-session evidence artifacts for score truth.",
    sampleWindow: "latest 50 watch sessions",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Use watch-session rollups and Admin Debug evidence; do not restore direct Admin Analytics watch listeners without an explicit realtime contract.",
  },
];

export function validateAdminAnalyticsRealtimeHotCacheContract(
  listeners: readonly AdminAnalyticsRealtimeHotCacheListener[] = ADMIN_ANALYTICS_REALTIME_HOT_CACHE_LISTENERS,
) {
  const failures: string[] = [];
  const expectedLimits = new Map([
    ["analytics_event_facts", 80],
    ["analytics_guest_batches", 50],
    ["analytics_sessions", 50],
    ["analytics_watch_sessions", 50],
  ]);

  for (const [collectionPath, limit] of expectedLimits) {
    const listener = listeners.find((entry) => entry.collectionPath === collectionPath);
    if (!listener) {
      failures.push(`${collectionPath} realtime listener is unclassified.`);
      continue;
    }
    if (listener.limit !== limit) failures.push(`${collectionPath} listener limit must be ${limit}.`);
    if (!listener.debugVisibility) failures.push(`${collectionPath} listener lacks debug visibility.`);
    if (listener.listenerCleanup !== "required") failures.push(`${collectionPath} listener cleanup is not required.`);
    if (listener.reconnectRisk !== "bounded_exponential_backoff") failures.push(`${collectionPath} reconnect risk is not bounded.`);
    if (!listener.hotCacheTarget) failures.push(`${collectionPath} lacks hot-cache target.`);
    if (listener.migrationStatus !== "migration_plan_required" && listener.migrationStatus !== "intentionally_live_debug_only" && listener.migrationStatus !== "hot_cache_ready" && listener.migrationStatus !== "retired_snapshot_first") {
      failures.push(`${collectionPath} lacks acceptable migration status.`);
    }
    if (!listener.nextAction) failures.push(`${collectionPath} lacks next action.`);
  }

  if (listeners.some((listener) => listener.collectionPath === "analytics_watch_sessions" && listener.migrationStatus !== "intentionally_live_debug_only" && listener.migrationStatus !== "retired_snapshot_first")) {
    failures.push("analytics_watch_sessions must not be treated as persisted watch-time truth or default Admin Analytics realtime.");
  }

  return failures;
}

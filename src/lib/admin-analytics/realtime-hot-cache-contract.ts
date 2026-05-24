export type AdminAnalyticsRealtimeHotCacheMigrationStatus =
  | "current_direct_realtime"
  | "hot_cache_ready"
  | "migration_plan_required"
  | "intentionally_live_debug_only"
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
    purpose: "Admin live pulse and recent identified telemetry debug visibility.",
    currentSourceTruth: "current_direct_realtime",
    hotCacheTarget: "analytics_event_fact_hot_cache",
    migrationStatus: "migration_plan_required",
    costRisk: "high",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Fall back to server snapshots and listener debug metadata when the realtime feed fails.",
    sampleWindow: "latest 80 event facts",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Plan a hot-cache/materialized summary before treating realtime event facts as the long-term default source truth.",
  },
  {
    listenerName: "guestBatches",
    collectionPath: "analytics_guest_batches",
    limit: 50,
    purpose: "Admin live pulse for recent guest batch visibility.",
    currentSourceTruth: "current_direct_realtime",
    hotCacheTarget: "analytics_guest_batch_hot_cache",
    migrationStatus: "migration_plan_required",
    costRisk: "medium",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Fall back to admin analytics snapshots and listener debug metadata when the realtime feed fails.",
    sampleWindow: "latest 50 guest batches",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Move recurring guest batch totals toward hot-cache summaries before making this a default analytics truth source.",
  },
  {
    listenerName: "guestSessions",
    collectionPath: "analytics_sessions",
    limit: 50,
    purpose: "Admin live pulse for recent guest and anonymous session visibility.",
    currentSourceTruth: "current_direct_realtime",
    hotCacheTarget: "analytics_session_hot_cache",
    migrationStatus: "migration_plan_required",
    costRisk: "medium",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Fall back to admin analytics snapshots and listener debug metadata when the realtime feed fails.",
    sampleWindow: "latest 50 sessions",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Keep realtime sessions bounded until a materialized hot-cache source can own default session truth.",
  },
  {
    listenerName: "watchSessions",
    collectionPath: "analytics_watch_sessions",
    limit: 50,
    purpose: "Live debug-only watch-session visibility for admin analytics diagnostics.",
    currentSourceTruth: "current_direct_realtime",
    hotCacheTarget: "watch_session_rollup",
    migrationStatus: "intentionally_live_debug_only",
    costRisk: "high",
    reconnectRisk: "bounded_exponential_backoff",
    fallbackPolicy: "Do not claim persisted watch-time truth from this listener; use watch-session evidence artifacts for score truth.",
    sampleWindow: "latest 50 watch sessions",
    debugVisibility: true,
    listenerCleanup: "required",
    nextAction: "Keep as live debug-only until persisted watch-time evidence proves runtime watch truth.",
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
    if (listener.migrationStatus !== "migration_plan_required" && listener.migrationStatus !== "intentionally_live_debug_only" && listener.migrationStatus !== "hot_cache_ready") {
      failures.push(`${collectionPath} lacks acceptable migration status.`);
    }
    if (!listener.nextAction) failures.push(`${collectionPath} lacks next action.`);
  }

  if (listeners.some((listener) => listener.collectionPath === "analytics_watch_sessions" && listener.migrationStatus !== "intentionally_live_debug_only")) {
    failures.push("analytics_watch_sessions must not be treated as persisted watch-time truth.");
  }

  return failures;
}

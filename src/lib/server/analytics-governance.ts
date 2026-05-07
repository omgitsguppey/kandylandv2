export const ANALYTICS_CANONICAL_COLLECTIONS = {
  guestBatches: "analytics_guest_batches",
  runtimeFacts: "analytics_event_facts",
  identifiedEventFacts: "analytics_event_facts",
  watchObservations: "analytics_watch_observations",
  watchSessions: "analytics_watch_sessions",
  watchAssets: "analytics_watch_assets",
  taskEvents: "daily_task_events",
  securityEvents: "security_events",
  transactions: "transactions",
} as const;

export const ANALYTICS_OPERATIONAL_COLLECTIONS = {
  guestSessions: "analytics_sessions",
  activeUsers: "analytics_active_users",
  aggregateStats: "analytics_aggregate_stats",
  exportStatus: "analytics_export_status",
  adminMetricSnapshots: "analytics_admin_metric_snapshots",
} as const;

export const ANALYTICS_ROUTE_POLICIES = {
  guestIngest: {
    routeName: "analytics/ingest",
    preAuthRouteName: "analytics/ingest/preauth",
    requireTrustedOrigin: true,
  },
  identifiedIngest: {
    routeName: "analytics/ingest-identified",
    preAuthRouteName: "analytics/ingest-identified/preauth",
    requireTrustedOrigin: true,
    auth: "user" as const,
    scopeToCaller: true,
  },
  identifiedTrack: {
    routeName: "telemetry/track",
    preAuthRouteName: "telemetry/track/preauth",
    requireTrustedOrigin: true,
    auth: "user" as const,
    scopeToCaller: true,
  },
  viewerWatchSession: {
    routeName: "viewer/watch-session",
    preAuthRouteName: "viewer/watch-session/preauth",
    requireTrustedOrigin: true,
    auth: "user" as const,
    scopeToCaller: true,
  },
} as const;

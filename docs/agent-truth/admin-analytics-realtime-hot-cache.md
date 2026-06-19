# Admin Analytics Realtime Hot Cache

Generated: 2026-06-19T01:19:00.416Z

```json
{
  "generatedAtUtc": "2026-06-19T01:19:00.416Z",
  "currentHead": "c4932ed34f02ddb9fc5ad5c24a503ff9f478f051",
  "status": "retired_snapshot_first",
  "realtimeListeners": [
    {
      "listenerName": "eventFacts",
      "collectionPath": "analytics_event_facts",
      "limit": 80,
      "purpose": "Retired direct listener lane kept as a cost-history classification for admin live-pulse review.",
      "currentSourceTruth": "snapshot_first_route_default",
      "hotCacheTarget": "analytics_event_fact_hot_cache",
      "migrationStatus": "retired_snapshot_first",
      "costRisk": "high",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Default admin display uses the verified current-activity snapshot route and snapshot metadata.",
      "sampleWindow": "latest 80 event facts",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep the retired direct event-fact listener out of default state; use the snapshot-first route and Admin Debug raw evidence instead."
    },
    {
      "listenerName": "guestBatches",
      "collectionPath": "analytics_guest_batches",
      "limit": 50,
      "purpose": "Retired direct listener lane kept as a cost-history classification for guest-batch debug review.",
      "currentSourceTruth": "snapshot_first_route_default",
      "hotCacheTarget": "analytics_guest_batch_hot_cache",
      "migrationStatus": "retired_snapshot_first",
      "costRisk": "medium",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Default admin display uses admin analytics snapshots and verified guest snapshot metadata.",
      "sampleWindow": "latest 50 guest batches",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep recurring guest-batch totals on hot-cache summaries; direct batch listeners stay retired."
    },
    {
      "listenerName": "guestSessions",
      "collectionPath": "analytics_sessions",
      "limit": 50,
      "purpose": "Retired direct listener lane kept as a cost-history classification for session debug review.",
      "currentSourceTruth": "snapshot_first_route_default",
      "hotCacheTarget": "analytics_session_hot_cache",
      "migrationStatus": "retired_snapshot_first",
      "costRisk": "medium",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Default admin display uses admin analytics snapshots and verified session metadata.",
      "sampleWindow": "latest 50 sessions",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep direct session reads out of default analytics truth; use snapshots for compact admin display."
    },
    {
      "listenerName": "watchSessions",
      "collectionPath": "analytics_watch_sessions",
      "limit": 50,
      "purpose": "Retired direct listener lane kept as a cost-history classification for watch-session diagnostics.",
      "currentSourceTruth": "snapshot_first_route_default",
      "hotCacheTarget": "watch_session_rollup",
      "migrationStatus": "retired_snapshot_first",
      "costRisk": "high",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Do not claim persisted watch-time truth from this listener; use watch-session evidence artifacts for score truth.",
      "sampleWindow": "latest 50 watch sessions",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Use watch-session rollups and Admin Debug evidence; do not restore direct Admin Analytics watch listeners without an explicit realtime contract."
    }
  ],
  "reconnectRisk": "bounded_exponential_backoff",
  "uiBehaviorChanged": false,
  "defaultTruthPolicy": "Use the snapshot-first route, refresh-based hot-cache, and verified snapshots for default admin analytics truth; keep direct realtime listeners out of default display.",
  "productionReadsRun": false,
  "retiredHookPath": "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts",
  "nextAction": "Keep the retired direct listener hook deleted; use Admin Debug raw evidence for explicit live investigation."
}
```

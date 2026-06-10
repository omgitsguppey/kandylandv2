# Admin Analytics Realtime Hot Cache

Generated: 2026-06-10T04:46:11.456Z

```json
{
  "generatedAtUtc": "2026-06-10T04:46:11.456Z",
  "currentHead": "c7d71be250a089c91e14875aa44d9c7bf81d039c",
  "status": "migration_plan_required",
  "realtimeListeners": [
    {
      "listenerName": "eventFacts",
      "collectionPath": "analytics_event_facts",
      "limit": 80,
      "purpose": "Admin live pulse and recent identified telemetry debug visibility.",
      "currentSourceTruth": "current_direct_realtime",
      "hotCacheTarget": "analytics_event_fact_hot_cache",
      "migrationStatus": "migration_plan_required",
      "costRisk": "high",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Fall back to server snapshots and listener debug metadata when the realtime feed fails.",
      "sampleWindow": "latest 80 event facts",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Plan a hot-cache/materialized summary before treating realtime event facts as the long-term default source truth."
    },
    {
      "listenerName": "guestBatches",
      "collectionPath": "analytics_guest_batches",
      "limit": 50,
      "purpose": "Admin live pulse for recent guest batch visibility.",
      "currentSourceTruth": "current_direct_realtime",
      "hotCacheTarget": "analytics_guest_batch_hot_cache",
      "migrationStatus": "migration_plan_required",
      "costRisk": "medium",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Fall back to admin analytics snapshots and listener debug metadata when the realtime feed fails.",
      "sampleWindow": "latest 50 guest batches",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Move recurring guest batch totals toward hot-cache summaries before making this a default analytics truth source."
    },
    {
      "listenerName": "guestSessions",
      "collectionPath": "analytics_sessions",
      "limit": 50,
      "purpose": "Admin live pulse for recent guest and anonymous session visibility.",
      "currentSourceTruth": "current_direct_realtime",
      "hotCacheTarget": "analytics_session_hot_cache",
      "migrationStatus": "migration_plan_required",
      "costRisk": "medium",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Fall back to admin analytics snapshots and listener debug metadata when the realtime feed fails.",
      "sampleWindow": "latest 50 sessions",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep realtime sessions bounded until a materialized hot-cache source can own default session truth."
    },
    {
      "listenerName": "watchSessions",
      "collectionPath": "analytics_watch_sessions",
      "limit": 50,
      "purpose": "Live debug-only watch-session visibility for admin analytics diagnostics.",
      "currentSourceTruth": "current_direct_realtime",
      "hotCacheTarget": "watch_session_rollup",
      "migrationStatus": "intentionally_live_debug_only",
      "costRisk": "high",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Do not claim persisted watch-time truth from this listener; use watch-session evidence artifacts for score truth.",
      "sampleWindow": "latest 50 watch sessions",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep as live debug-only until persisted watch-time evidence proves runtime watch truth."
    }
  ],
  "reconnectRisk": "bounded_exponential_backoff",
  "uiBehaviorChanged": false,
  "defaultTruthPolicy": "Prefer summary/hot-cache sources for default admin analytics truth; keep direct realtime as bounded debug/live pulse until migrated.",
  "productionReadsRun": false,
  "nextAction": "Create section-specific hot-cache summaries before removing bounded realtime listeners."
}
```

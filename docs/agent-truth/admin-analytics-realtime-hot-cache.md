# Admin Analytics Realtime Hot Cache

Generated: 2026-06-17T13:43:08.259Z

```json
{
  "generatedAtUtc": "2026-06-17T13:43:08.259Z",
  "currentHead": "0a7026e9fd98fa7ae3dc4d53365204e9faae4e7a",
  "status": "hot_cache_ready",
  "realtimeListeners": [
    {
      "listenerName": "eventFacts",
      "collectionPath": "analytics_event_facts",
      "limit": 80,
      "purpose": "Legacy direct listener source kept visible for admin live-pulse debug review.",
      "currentSourceTruth": "refresh_based_hot_cache_default",
      "hotCacheTarget": "analytics_event_fact_hot_cache",
      "migrationStatus": "hot_cache_ready",
      "costRisk": "high",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Default admin display uses the snapshot-first realtime route and verified snapshot metadata.",
      "sampleWindow": "latest 80 event facts",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep the direct event-fact listener out of default state unless an explicit operator live-debug exception is approved."
    },
    {
      "listenerName": "guestBatches",
      "collectionPath": "analytics_guest_batches",
      "limit": 50,
      "purpose": "Legacy direct listener source kept visible for guest-batch debug review.",
      "currentSourceTruth": "refresh_based_hot_cache_default",
      "hotCacheTarget": "analytics_guest_batch_hot_cache",
      "migrationStatus": "hot_cache_ready",
      "costRisk": "medium",
      "reconnectRisk": "bounded_exponential_backoff",
      "fallbackPolicy": "Default admin display uses admin analytics snapshots and verified guest snapshot metadata.",
      "sampleWindow": "latest 50 guest batches",
      "debugVisibility": true,
      "listenerCleanup": "required",
      "nextAction": "Keep recurring guest-batch totals on hot-cache summaries; direct batches remain debug-only."
    },
    {
      "listenerName": "guestSessions",
      "collectionPath": "analytics_sessions",
      "limit": 50,
      "purpose": "Legacy direct listener source kept visible for session debug review.",
      "currentSourceTruth": "refresh_based_hot_cache_default",
      "hotCacheTarget": "analytics_session_hot_cache",
      "migrationStatus": "hot_cache_ready",
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
  "defaultTruthPolicy": "Use refresh-based hot-cache and verified snapshots for default admin analytics truth; keep direct realtime listeners out of default display unless an explicit operator debug exception is approved.",
  "productionReadsRun": false,
  "nextAction": "Keep the legacy direct listener hook source-visible but disconnected from default admin analytics state; use explicit live-debug approval before reconnecting it."
}
```

# Debug Cockpit Batch 14 Cleanup

Generated: 2026-05-24T19:58:02.040Z

```json
{
  "generatedAtUtc": "2026-05-24T19:58:02.040Z",
  "currentHead": "93000a572a2968f72f0e3f3f400ee9a82acc78c9",
  "orphanedLogicAgeBefore": 301.2,
  "orphanedLogicAgeAfter": 0,
  "adminRealtimeHotCacheStatus": "migration_plan_required",
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
  "telemetryDuplicateIntentStatus": "telemetry_alias_classified",
  "recommendedActionsBefore": 18,
  "recommendedActionsAfter": 9,
  "duplicateActionsCollapsed": 9,
  "unresolvedSecurityActions": [
    "admin_balance_body_cap",
    "creator_account_controls_body_cap",
    "creator_account_controls_typed_errors",
    "creator_agreements_typed_errors",
    "viewer_entitlement",
    "ai_budget_guard"
  ],
  "systemHealthScoreStatusBefore": "score_0_percent_penalties_0",
  "systemHealthScoreStatusAfter": "unavailable_no_sample",
  "downstreamWriterSampleStatus": "materializer_sample_missing",
  "analyticsRecoveryStatus": "backfill_disabled_by_policy",
  "creatorLaneFreshnessBefore": "freshness_not_recorded",
  "creatorLaneFreshnessAfter": "source_ready_no_sample_loaded",
  "creatorLaneMaterializerStatus": "materializer_completion_missing",
  "refreshedArtifacts": [
    "agent/state/orphaned-logic-score.generated.json",
    "agent/state/orphaned-logic-refresh.generated.json",
    "agent/state/admin-analytics-realtime-hot-cache.generated.json",
    "agent/state/telemetry-duplicate-intent-classification.generated.json",
    "agent/state/recommended-action-dedupe.generated.json",
    "agent/state/system-health-materializer-cleanup.generated.json",
    "agent/state/creator-lane-freshness-cleanup.generated.json"
  ],
  "remainingFindings": [
    "Admin analytics realtime remains migration_plan_required; listeners were classified, not removed.",
    "Drop preview telemetry events remain history-preserved aliases until materializers consume the alias policy.",
    "Creator Lane still requires a materializer completion timestamp before full freshness can be claimed."
  ],
  "scoreBefore": 79.25,
  "scoreAfter": 79.25,
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "nextExactSteps": [
    "Build admin analytics hot-cache/materialized summaries before replacing direct realtime debug listeners.",
    "Apply drop preview intent aliases in materializers before consolidating future emitters.",
    "Load current materializer and creator lane samples before claiming healthy live freshness."
  ],
  "dirtyFilesClassified": true,
  "openPrsClassified": true
}
```

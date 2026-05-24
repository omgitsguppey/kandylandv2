# Orphaned Logic Refresh

Generated: 2026-05-24T19:58:00.887Z

```json
{
  "generatedAtUtc": "2026-05-24T19:58:00.887Z",
  "currentHead": "93000a572a2968f72f0e3f3f400ee9a82acc78c9",
  "ageBefore": 301.2,
  "ageAfter": 0,
  "statusBefore": "stale_orphaned_logic_artifact_to_refresh",
  "statusAfter": "refreshed_current",
  "sourceHeadMatchesCurrent": true,
  "findings": [
    {
      "id": "orphaned-logic-1dbxby0",
      "category": "realtime_hot_cache",
      "filePath": "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts",
      "owner": "admin-analytics",
      "nextAction": "Classify the realtime listener under hot-cache doctrine before migration."
    },
    {
      "id": "orphaned-logic-fkhhcg",
      "category": "telemetry_duplicate_intent",
      "filePath": "src/lib/telemetry-catalog.ts",
      "owner": "telemetry",
      "nextAction": "Classify drop preview events as telemetry aliases and preserve history."
    }
  ],
  "missingScriptTreatedAsPass": false
}
```

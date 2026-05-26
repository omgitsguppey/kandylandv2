# cost accuracy hardening

Source-only hardening artifact. It does not run production reads, provider calls, exports, deploys, or mutate legacy/production data.

```json
{
  "reportKey": "cost-accuracy-hardening",
  "generatedAtUtc": "2026-05-26T12:24:12.748Z",
  "productionReadsPerformed": false,
  "providerCallsPerformed": false,
  "exportsRun": false,
  "deployPerformed": false,
  "externalBillingProofClaimed": false,
  "accuracyPreserved": true,
  "doctrine": {
    "nonCriticalAnalyticsRefreshHours": 24,
    "realtimeSummaryMinimumMinutes": 5,
    "debugSummaryFirst": true,
    "bigQueryPerEventExportAllowed": false,
    "cloudSqlMirrorManualOnly": true,
    "paidAiRuntimeAllowedByDefault": false,
    "canonicalFactsCanBeDroppedForCost": false
  },
  "lanes": [
    {
      "laneId": "cloud_run_app_hosting",
      "classification": "source_guarded_external_review_remaining",
      "sourceGuard": "route 4xx nonretryable mapping, batching, hot cache, debug summary-first, no runaway realtime loops",
      "externalBillingRequirement": "Cloud Run/App Hosting billing review remains operator/provider artifact.",
      "accuracyPreserved": true,
      "costRisk": "medium",
      "exactNextAction": "Review external billing after source route guards; do not infer dollar savings from source-only checks."
    },
    {
      "laneId": "cloud_sql_data_connect",
      "classification": "manual_cost_approval_required",
      "sourceGuard": "Data Connect is an agent-context mirror and SQL sync is manual/cost-approved only.",
      "externalBillingRequirement": "Cloud SQL billing status requires provider console or billing artifact.",
      "accuracyPreserved": true,
      "costRisk": "high",
      "exactNextAction": "Keep SQL mirror out of runtime user/payment/drop/chat/support/creator paths unless an ApiCostContract promotes it."
    },
    {
      "laneId": "gemini_cloud_assist_vertex_ai",
      "classification": "source_guarded_external_review_remaining",
      "sourceGuard": "debug/critic lanes are source-only unless explicitly approved and must not call paid AI runtime by default.",
      "externalBillingRequirement": "AI usage/billing proof requires external artifact.",
      "accuracyPreserved": true,
      "costRisk": "high",
      "exactNextAction": "Keep AI repair workbench fed by deterministic findings and block paid AI runtime calls without approval."
    },
    {
      "laneId": "bigquery_export",
      "classification": "source_guarded_external_review_remaining",
      "sourceGuard": "exports are batch/watermark based, never per-event hot path.",
      "externalBillingRequirement": "BigQuery job/billing review remains external.",
      "accuracyPreserved": true,
      "costRisk": "medium",
      "exactNextAction": "Keep export facts canonical and use watermark batches rather than per-event export triggers."
    },
    {
      "laneId": "firestore_reads_writes",
      "classification": "source_ready",
      "sourceGuard": "summary documents, bounded reads, and rollups are preferred before raw collection scans.",
      "externalBillingRequirement": "External billing can confirm volume but is not claimed here.",
      "accuracyPreserved": true,
      "costRisk": "medium",
      "exactNextAction": "Keep materializers accurate and reduce duplicate reads rather than dropping facts."
    },
    {
      "laneId": "realtime_listeners",
      "classification": "source_guarded_external_review_remaining",
      "sourceGuard": "summary-first admin lanes and bounded realtime usage; raw firehose belongs behind drilldowns.",
      "externalBillingRequirement": "Runtime listener volume needs deployed sample or provider artifact.",
      "accuracyPreserved": true,
      "costRisk": "medium",
      "exactNextAction": "Keep admin/debug defaults compact and page raw drilldowns."
    },
    {
      "laneId": "admin_debug",
      "classification": "source_ready",
      "sourceGuard": "debug summary-first and raw evidence drilldown.",
      "externalBillingRequirement": "No provider proof claimed.",
      "accuracyPreserved": true,
      "costRisk": "low",
      "exactNextAction": "Keep self-revealing findings compact and route raw details behind drilldowns."
    },
    {
      "laneId": "diagnostics",
      "classification": "source_ready",
      "sourceGuard": "invalid/duplicate diagnostics roll up hourly by fingerprint.",
      "externalBillingRequirement": "No provider proof claimed.",
      "accuracyPreserved": true,
      "costRisk": "low",
      "exactNextAction": "Keep diagnostics rollups fingerprinted and do not spam raw repeated warnings."
    }
  ]
}
```

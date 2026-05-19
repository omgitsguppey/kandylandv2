# Analytics Cadence Cost Policy

Generated: 2026-05-19T15:23:57.765Z
Current head: f0bde91b407eac578e3d8e948437bdb8cb575e85

This report locks source policy for analytics cadence and cost. It does not prove provider billing reduction and does not downgrade priority-live tracking.

## Summary

- Non-priority TTL: 86400000 ms
- Priority live preserved: true
- BigQuery export detected: true
- BigQuery daily cadence: true
- BigQuery query cost guards: true
- Cloud SQL detected: true
- Cloud SQL pool/batch classified: true
- Admin evidence cadence guarded: true
- P0/P1/P2: 0/0/4

## Priority Map

| Task | Priority | Cadence |
| --- | --- | --- |
| analytics_ingest | priority_live | immediate |
| identity_link | priority_live | immediate |
| runtime_watch_heartbeat | priority_live | 10s playback heartbeat |
| creator_dashboard_stats | priority_user_visible | on demand / user-visible |
| bigquery_raw_events_export | non_priority_evidence | 24h minimum |
| admin_evidence_refresh | non_priority_evidence | 24h minimum |
| debug_panel_source_evidence | debug_only | 24h minimum unless operator-forced |

## Findings

| Id | Severity | Status | Next action |
| --- | --- | --- | --- |
| bigquery-raw-events-daily-cadence | P2 | daily_cadence_guarded_partitioned_query_cost_guard_documented | Keep raw-events export as non-priority evidence and do not promote BigQuery rows to product truth without reconciliation. |
| cloud-sql-dataconnect-batch-classification | P2 | cloud_sql_dataconnect_agent_context_mirror_batch_classified_external_billing_observed | Inspect GCP Cloud SQL instance/process externally; do not add runtime SQL code in product paths. |
| non-priority-analytics-24h-ttl | P2 | non_priority_evidence_24h_cadence_guarded | Keep non-priority evidence refresh/export/check work at daily cadence unless a user-visible owner promotes it. |
| priority-live-telemetry-preserved | P2 | priority_live_not_downgraded | Do not block core event ingest, identity linking, or runtime watch heartbeat behind the 24h evidence TTL. |

## Next Fix Order

1. Move any remaining non-priority export/evidence route that performs cold reads to ANALYTICS_NON_PRIORITY_TTL_MS.
2. Inspect Cloud SQL/Data Connect provider process externally because source only classifies it as agent-context mirror.
3. If warehouse query code is added later, enforce dryRun, maximumBytesBilled, and partition filters before execution.

# BigQuery Cloud Pipeline Closure

Generated: 2026-05-24T04:43:41.518Z
Current code version: b375acf9361858bfb97d9e3fac8877bb230a596c

## Summary

- Export contract created: yes
- Scheduled/windowed export enabled: yes
- Event-triggered export disabled: yes
- Watermark defined: yes
- Failure TTL defined: yes
- Config-missing state defined: yes
- Missing BigQuery treated as zero traffic: no
- Exported status requires insert path: yes
- Query cost guard defined: yes
- Event facts export eligible: yes
- First-party summaries remain product truth: yes

## Export Contract

- Source collection: analytics_event_facts
- Destination: kandydrops_canonical_analytics.raw_events
- Watermark: analytics_export_status/bigquery_raw_events
- Cadence: daily_windowed (0 4 * * *)
- Max rows per batch: 500
- Truth class: analytics_evidence_only
- Missing config behavior: unavailable_not_zero

## Findings

- fixed: BigQuery export contract validates with no open findings.
- fixed: Functions index exposes scheduledBigQueryRawEventsExport and the source keeps the daily window.
- fixed: Event-fact-created BigQuery export trigger is no longer an active export claim path.
- fixed: BigQuery export uses analytics_export_status watermark fields.
- fixed: Healthy/exported status is only recorded through the batch insert path.
- fixed: Missing BigQuery env produces config_missing instead of a default export claim.
- fixed: Missing BigQuery evidence is unavailable_not_zero and first-party summaries remain product truth.
- fixed: Readiness and status failures are TTL-capped.
- fixed: Future query lanes require dry-run, maximumBytesBilled, and partition filters.
- fixed: analytics_event_facts is explicitly marked as a BigQuery export candidate.
- fixed: BigQuery remains analytics evidence only; first-party summaries remain product truth.

## Fixes Applied

- fixed: Added src/lib/analytics/bigquery-export-contract.ts.
- fixed: Exposed scheduledBigQueryRawEventsExport as the active Functions export lane.
- fixed: Removed the event-triggered BigQuery export claim from source.
- fixed: Added config_missing status handling for missing BigQuery export env.

## Next Fix Order

1. After deployment, verify scheduledBigQueryRawEventsExport heartbeat in Firebase/Cloud console before treating warehouse evidence as active.
2. If owner approves BigQuery queries, add dry-run and maximumBytesBilled validation before any query executes.
3. Keep first-party Firestore summaries as product truth even when BigQuery evidence is configured.

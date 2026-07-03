# Runtime Smoke Substitute Matrix

Status: source-only deployed route substitute matrix. It reduces optional checks to rows that cannot be truthfully sourced, but it does not clear deployed route evidence.

## Summary

- Status: source_ready_runtime_smoke_substitute_matrix
- Runtime health credit: 75.56
- Runtime/provider activity credit: 73.45
- Observed real-usage signals: 6
- Evidence completeness credit: 70.17
- Source-proven rows: 11
- Telemetry-proven rows: 7
- Debug-proven rows: 0
- Deployed route evidence rows: 10
- Deployed runtime gate cleared: false

## Rows

- route_loads: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=84; next=Attach deployed route-load evidence before clearing the deployed route evidence lane.
- auth_state: proof=source_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=80; next=Attach deployed auth-state evidence before clearing the deployed route evidence lane.
- wallet_balance_display: proof=source_proven; types=source; formalRuntime=false; score=45; next=Keep wallet balance display covered by deterministic source/UI coverage; do not change wallet runtime or GumDrop math.
- gumdrop_refill_source_readiness: proof=operator_confirmed; types=source,telemetry,operator,formal_runtime; formalRuntime=true; score=92; next=Attach provider-backed refill evidence and deployed route evidence before clearing protected source-evidence lanes.
- creator_dashboard_load: proof=telemetry_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=72; next=Attach deployed creator dashboard evidence before clearing the deployed route evidence lane.
- creator_settings_save: proof=source_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=58; next=Attach deployed creator settings save evidence before clearing the deployed route evidence lane.
- creator_drop_manager_load: proof=telemetry_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=76; next=Attach deployed creator drop manager evidence before clearing the deployed route evidence lane.
- creator_drop_status_metrics: proof=telemetry_proven; types=source,telemetry; formalRuntime=false; score=76; next=Keep creator drop status metrics refreshed through source telemetry evidence.
- profile_timeline_source: proof=source_proven; types=source; formalRuntime=false; score=45; next=Keep unknown legacy profile/timeline data excluded until dry-run recovery maps it with confidence.
- broadcast_source: proof=source_proven; types=source,telemetry; formalRuntime=false; score=55; next=Keep broadcast source readiness separate from observed runtime proof until a concrete event is confirmed.
- notification_queue_source: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed notification queue evidence before clearing the deployed route evidence lane.
- telemetry_ingest: proof=telemetry_proven; types=source,telemetry,debug; formalRuntime=false; score=85; next=Keep telemetry ingest closure refreshed and source-labelled.
- behavior_math: proof=telemetry_proven; types=source,telemetry; formalRuntime=false; score=100; next=Keep behavior math confidence current and exclude disabled/legacy unknown events.
- bigquery_export_readiness: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed BigQuery export evidence before clearing protected source-evidence lanes.
- ga4_external_truth: proof=telemetry_proven; types=source,telemetry,debug; formalRuntime=false; score=60; next=Keep GA4 labelled as vendor evidence only; never promote it over first-party truth.
- admin_debug_control_tower: proof=source_proven; types=source,debug; formalRuntime=false; score=85; next=Keep admin debug control tower source evidence fresh and do not show unknown as healthy.
- admin_truth_sample: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed admin source sample evidence before clearing the deployed route evidence lane.
- watch_time_runtime_source: proof=telemetry_proven; types=source,telemetry,formal_runtime; formalRuntime=true; score=78; next=Attach deployed watch-time evidence before clearing the deployed route evidence lane.
- error_dictionary_route_diagnostics: proof=source_proven; types=source,debug; formalRuntime=false; score=88; next=Keep route diagnostics and error dictionary mapped before deployed route evidence triage.

## Evidence Lanes

- Deployed route evidence remains required.
- Provider-backed site activity remains separate.
- Visual/device evidence is optional diagnostic unless a source row requests it.

## Next Action

Use this matrix to substitute source/debug/telemetry checks only where truthfully supported; attach deployed route evidence before clearing the deployed route lane.

# Runtime Smoke Substitute Matrix

Status: source-only runtime smoke substitute matrix. It reduces manual testing to rows that cannot be truthfully automated, but it does not clear deployed runtime smoke.

## Summary

- Status: source_ready_runtime_smoke_substitute_matrix
- Runtime health credit: 75.56
- Evidence completeness credit: 70.17
- Source-proven rows: 11
- Telemetry-proven rows: 7
- Debug-proven rows: 0
- Formal runtime rows: 10
- Deployed runtime gate cleared: false

## Rows

- route_loads: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=84; next=Attach deployed runtime route-load smoke before clearing the formal deployed runtime gate.
- auth_state: proof=source_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=80; next=Attach deployed runtime auth-state smoke before clearing the formal deployed runtime gate.
- wallet_balance_display: proof=source_proven; types=source; formalRuntime=false; score=45; next=Keep wallet balance display covered by deterministic source/UI coverage; do not change wallet runtime or GumDrop math.
- gumdrop_refill_source_readiness: proof=operator_confirmed; types=source,telemetry,operator,formal_runtime; formalRuntime=true; score=92; next=Attach deployed runtime/provider refill smoke before clearing the formal deployed runtime gate.
- creator_dashboard_load: proof=telemetry_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=72; next=Attach deployed runtime creator dashboard smoke before clearing the formal deployed runtime gate.
- creator_settings_save: proof=source_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=58; next=Attach deployed runtime creator settings save smoke before clearing the formal deployed runtime gate.
- creator_drop_manager_load: proof=telemetry_proven; types=source,telemetry,debug,formal_runtime; formalRuntime=true; score=76; next=Attach deployed runtime creator drop manager smoke before clearing the formal deployed runtime gate.
- creator_drop_status_metrics: proof=telemetry_proven; types=source,telemetry; formalRuntime=false; score=76; next=Keep creator drop status metrics refreshed through source telemetry evidence.
- profile_timeline_source: proof=source_proven; types=source; formalRuntime=false; score=45; next=Keep unknown legacy profile/timeline data excluded until dry-run recovery maps it with confidence.
- broadcast_source: proof=source_proven; types=source,telemetry; formalRuntime=false; score=55; next=Keep broadcast source readiness separate from observed runtime proof until a concrete event is confirmed.
- notification_queue_source: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed runtime notification queue smoke before clearing the formal deployed runtime gate.
- telemetry_ingest: proof=telemetry_proven; types=source,telemetry,debug; formalRuntime=false; score=85; next=Keep telemetry ingest closure refreshed and source-labelled.
- behavior_math: proof=telemetry_proven; types=source,telemetry; formalRuntime=false; score=100; next=Keep behavior math confidence current and exclude disabled/legacy unknown events.
- bigquery_export_readiness: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed runtime/provider BigQuery export evidence before clearing the formal deployed runtime gate.
- ga4_external_truth: proof=telemetry_proven; types=source,telemetry,debug; formalRuntime=false; score=60; next=Keep GA4 labelled as vendor evidence only; never promote it over first-party truth.
- admin_debug_control_tower: proof=source_proven; types=source,debug; formalRuntime=false; score=85; next=Keep admin debug control tower source evidence fresh and do not show unknown as healthy.
- admin_truth_sample: proof=source_proven; types=source,debug,formal_runtime; formalRuntime=true; score=55; next=Attach deployed runtime admin truth sample before clearing the formal deployed runtime gate.
- watch_time_runtime_source: proof=telemetry_proven; types=source,telemetry,formal_runtime; formalRuntime=true; score=78; next=Attach deployed runtime watch-time smoke before clearing the formal deployed runtime gate.
- error_dictionary_route_diagnostics: proof=source_proven; types=source,debug; formalRuntime=false; score=88; next=Keep route diagnostics and error dictionary mapped before runtime smoke triage.

## Formal Gates

- Deployed runtime smoke remains required.
- Provider smoke remains separate.
- Manual visual evidence applies only to manual UI rows.

## Next Action

Use this matrix to substitute source/debug/telemetry checks only where truthfully supported; attach deployed runtime smoke before clearing the formal runtime gate.

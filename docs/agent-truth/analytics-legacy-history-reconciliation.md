# Analytics Legacy History Reconciliation

Generated: 2026-06-19T02:45:29.650Z
Current head: dce9a0375029cb24b4b79f2dbb5b3707cb31e3ea

This is a dry-run source artifact. It maps legacy history into current truth lanes with confidence and duplicate-risk labels. It does not read production data, write production data, run BigQuery jobs, or promote legacy evidence into current totals.

## Summary

- Candidates: 10
- Exact matches: 0
- Probable matches: 0
- Weak matches: 7
- Unknown legacy rows: 3
- Purgatory queue rows: 10
- High duplicate risk: 0
- Current totals eligible: 0
- Overwrites current truth: no

## Candidate Mappings

| Legacy source | Legacy id | Target truth layer | Purgatory classification | Identity confidence | Duplicate risk | Suggested recovery action | Current totals eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| analytics_event_facts | fixture_evt_drop_click | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| analytics_guest_batches | fixture_guest_batch | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| transactions | fixture_txn_completed | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| unlocks | fixture_unlock | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| daily_task_events | fixture_task_complete | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| task_lifecycle_logs | fixture_task_start | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| notifications | fixture_notification_read | debug_truth | unknown | unknown | unknown | archive_as_debug_evidence | no |
| onboarding_steps | fixture_onboarding_step | product_truth | weak_match | weak_match | low | manual_review_identity_bridge | no |
| admin_audit_logs | fixture_admin_action | debug_truth | unknown | unknown | unknown | archive_as_debug_evidence | no |
| ga4_intraday | fixture_ga_intraday | evidence_only | unknown | unknown | unknown | require_first_party_fact_or_ledger | no |

## Purgatory Queue

| Legacy source | Legacy id | Classification | Reason codes | Suggested action | Manual review |
| --- | --- | --- | --- | --- | --- |
| analytics_event_facts | fixture_evt_drop_click | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| analytics_guest_batches | fixture_guest_batch | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| transactions | fixture_txn_completed | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| unlocks | fixture_unlock | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| daily_task_events | fixture_task_complete | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| task_lifecycle_logs | fixture_task_start | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| notifications | fixture_notification_read | unknown | unknown_identity, debug_only_source, current_totals_blocked | archive_as_debug_evidence | yes |
| onboarding_steps | fixture_onboarding_step | weak_match | partial_identity_or_route_match, missing_first_party_corroboration, current_totals_blocked | manual_review_identity_bridge | yes |
| admin_audit_logs | fixture_admin_action | unknown | unknown_identity, debug_only_source, current_totals_blocked | archive_as_debug_evidence | yes |
| ga4_intraday | fixture_ga_intraday | unknown | unknown_identity, external_evidence_only, current_totals_blocked | require_first_party_fact_or_ledger | yes |

## Source Cleanup

| Source | Status | Action |
| --- | --- | --- |
| analytics_event_facts | product_truth | Current first-party event facts remain the current truth lane. |
| analytics_admin_metric_snapshots | snapshot_display_truth | Admin Analytics should prefer verified materialized snapshots over raw realtime logs. |
| analytics_aggregate_stats/realtime_summary | debug_only_or_fallback | Legacy realtime summary stays fallback/live-pulse evidence and cannot drive current totals. |
| GA4 / BigQuery / PostHog | evidence_only | External analytics sources remain evidence-only until reconciled against first-party facts. |

## Cost Lanes

| Lane | Status | Action |
| --- | --- | --- |
| cloud_run | dry_run_artifact_only | Reconciliation consumes checked-in artifacts and does not run a request-path backfill. |
| cloud_sql | cloud_sql_not_used_by_reconciler | No SQL or Data Connect calls are used for legacy history recovery. |
| bigquery | bigquery_not_queried_by_reconciler | BigQuery remains evidence-only; this pass runs no warehouse jobs. |
| gemini_cloud_assist | gemini_cloud_assist_not_used | No AI identity matching or model calls are used. |
| route_4xx | no_user_facing_route_added | This source-only pass adds no user-facing route and no retry path. |

## Next Fix Order

1. Review exact and probable link candidates before any future write-mode migration proposal.
2. Keep weak and unknown legacy rows in Debug/archive-only evidence until identity improves.
3. Retire realtime/raw-log display authority module by module after verified snapshot parity.

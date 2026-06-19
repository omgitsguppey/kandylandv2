# Analytics Legacy Recovery Reconciliation

Generated: 2026-06-19T02:45:29.821Z
Current head: dce9a0375029cb24b4b79f2dbb5b3707cb31e3ea

## Summary

- Candidate mappings: 10
- Exact matches: 0
- High duplicate risk: 0
- Evidence-only candidates: 1
- Product truth sources: 2
- Overwrites current truth: no
- Dry run only: yes
- Production mutation allowed: no
- External evidence can promote product truth: no
- Cloud SQL status: cloud_sql_not_detected_in_reconciliation_runtime
- Gemini/Cloud Assist status: gemini_cloud_assist_not_used

## Candidate Mappings

| Legacy source | Legacy id | Target truth layer | Identity confidence | Duplicate risk | Recovery action | Recovery mode | Production mutation | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| analytics_event_facts | fixture_evt_drop_click | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| analytics_guest_batches | fixture_guest_batch | product_truth | weak_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| transactions | fixture_txn_completed | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| unlocks | fixture_unlock | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| daily_task_events | fixture_task_complete | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| task_lifecycle_logs | fixture_task_start | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| notifications | fixture_notification_read | debug_truth | unknown | unknown | archive_only | dry_run_manual_review | no | Candidate lacks enough identity evidence, so it stays archived/debug-only until an owner reviews it. |
| onboarding_steps | fixture_onboarding_step | product_truth | probable_match | low | import_candidate | dry_run_manual_review | no | Candidate has enough first-party shape for dry-run manual review; no production import is allowed without a separate approved backfill plan. |
| admin_audit_logs | fixture_admin_action | debug_truth | unknown | unknown | archive_only | dry_run_manual_review | no | Candidate lacks enough identity evidence, so it stays archived/debug-only until an owner reviews it. |
| ga4_intraday | fixture_ga_intraday | evidence_only | unknown | unknown | archive_only | dry_run_manual_review | no | External analytics evidence remains evidence-only until first-party reconciliation promotes it. |

## Source Truth

| Source | Truth layer | Current product truth | Notes |
| --- | --- | --- | --- |
| analytics_event_facts | product_truth | yes | Current first-party event facts are not overwritten by legacy recovery. |
| analytics_guest_batches | product_truth | yes | Guest batches stay guest-lane product truth until identity links reconcile them. |
| GA4 / BigQuery / PostHog | evidence_only | no | External provider sources remain evidence-only and cannot define product truth. |

## Cost Lanes

| Lane | Status | Severity | Action |
| --- | --- | --- | --- |
| cloud_run | source_safe | p2 | No broad production backfill runs in a request path; candidates are derived from checked-in artifacts. |
| cloud_sql | cloud_sql_not_detected_in_reconciliation_runtime | p2 | Do not add SQL assumptions to legacy recovery. |
| gemini_cloud_assist | gemini_cloud_assist_not_used | p2 | No AI identity matching or model calls are used for reconciliation. |
| route_4xx | not_user_facing | p2 | Dry-run reconciliation adds no user-facing route and no new 4xx path. |

## Next Fix Order

1. Review candidate mappings in Debug/source artifacts before any write-mode backfill proposal.
2. Keep exact/probable first-party candidates in dry-run review until a separate approved backfill plan exists.
3. Keep GA4, BigQuery, and PostHog as evidence-only unless first-party reconciliation proves identity and dedupe.

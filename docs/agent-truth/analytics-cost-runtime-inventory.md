# Analytics Cost Runtime Inventory

Generated: 2026-07-14T04:40:54.415Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa

This is a source-only inventory. Operator billing screenshots are context only and are not treated as source truth or proof of cost reduction.

## Summary

- Cloud Run findings: 2
- Cloud SQL detected: true; findings: 1
- BigQuery detected: true; findings: 1
- Gemini/Cloud Assist/Vertex detected: true; findings: 1
- Non-priority analytics cadence findings: 1
- 4xx/retry findings: 2
- Guest tracking findings: 1
- User tracking findings: 1
- Watch-time findings: 2
- P0/P1/P2: 0/3/10

## Cost Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
| analytics-ingest-cloud-run-request-work | P2 | source_bounded_outbox_external_runtime_evidence_required | repo_detected | Collect scheduler, shadow-window, and billing evidence before claiming deployed cost or runtime improvement. |
| guest-analytics-flush-cadence | P2 | source_bounded_event_triggered_15s_batch | repo_detected | Keep runtime request-volume and billing evidence external until measured; retain the source batch budget. |
| cloud-sql-dataconnect-agent-context-mirror | P1 | repo_detected_agent_context_mirror_external_billing_observed_operator_context | repo_detected | Inventory Data Connect execution cadence, generated mirror refreshes, connection pooling/reuse, and provider-side instance state with owner evidence. |
| bigquery-analytics-event-fact-export | P1 | repo_detected_export_lane_external_billing_unknown | repo_detected | Keep BigQuery raw-events export non-priority and require dry-run bytes estimate, maximumBytesBilled, daily quotas, and staged materialization before adding warehouse queries. |
| gemini-vertex-admin-ai-cost-lane | P1 | repo_detected_admin_ai_external_billing_observed_operator_context | repo_detected | Gate Gemini/Vertex calls with explicit admin budget controls and separate analytics runtime from AI cost review. |

## Retry And Analytics Runtime Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
| analytics-ingest-503-retryable | P2 | source_classifies_permanent_4xx_and_transient_retry | repo_detected | Verify deployed response classifications through bounded runtime evidence; do not infer provider/runtime behavior from source. |
| expected-product-4xx-inventory | P2 | repo_detected_expected_4xx_mixed_with_runtime_scan | repo_detected | Separate expected product 4xx from unexpected analytics/client retry 4xx before fixes. |
| deeptracker-non-priority-cadence | P2 | source_bounded_event_triggered_guest_batch | repo_detected | Monitor deployed request volume before changing the source-owned 15-second batch budget. |
| admin-analytics-cold-sources | P2 | repo_detected_cached_but_broad_admin_sources | repo_detected | Confirm admin analytics views read hot snapshots first and reserve cold reads for explicit refresh/drill-down. |
| guest-tracking-source | P2 | repo_detected_guest_queue_and_batch_identity | repo_detected | Keep guest data distinct until linked; future cost changes must not erase guest history. |
| user-tracking-source | P2 | repo_detected_identityState_userId_session_continuity | repo_detected | Review user index materialization cadence before moving it into any runtime hot path. |
| runtime-watch-time-v2-source-ready | P2 | repo_detected_source_ready_runtime_proof_required | repo_detected | Wire runtime watch tracker to selected media component and capture deployed evidence before claiming live accuracy. |
| legacy-watch-seconds-still-present | P2 | repo_detected_legacy_watch_seconds_rollup | repo_detected | Keep legacy watchSeconds as evidence/legacy fallback, not canonical playback truth. |

## Next Fix Order

1. Keep the event-triggered non-priority batch and permanent/transient retry classification covered by focused source tests.
2. Collect deployed scheduler, request-volume, and billing evidence without treating source readiness as runtime proof.
3. Owner-review Cloud SQL/Data Connect billing and BigQuery/Gemini provider cost lanes before source changes.
4. Wire runtime watch-time v2 to media playback only after cost/idempotency route review.

# Analytics Cost Runtime Inventory

Generated: 2026-05-21T00:16:05.084Z
Current head: 080ebb115fc9d917f52b2e38108634821a2712ce

This is a source-only inventory. Operator billing screenshots are context only and are not treated as source truth or proof of cost reduction.

## Summary

- Cloud Run findings: 2
- Cloud SQL detected: true; findings: 1
- BigQuery detected: true; findings: 1
- Gemini/Cloud Assist/Vertex detected: true; findings: 1
- Non-priority analytics cadence findings: 2
- 4xx/retry findings: 2
- Guest tracking findings: 1
- User tracking findings: 1
- Watch-time findings: 2
- P0/P1/P2: 0/7/6

## Cost Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
| analytics-ingest-cloud-run-request-work | P1 | repo_detected_external_billing_observed_operator_context | repo_detected | Review guest ingest request-path work, cache boundaries, and whether index materialization should move out of the hot request path. |
| guest-analytics-flush-cadence | P1 | repo_detected_non_priority_2_5s_flush | repo_detected | Classify priority vs non-priority analytics cadence and consider longer debounce/batch windows in a behavior-change pass. |
| cloud-sql-dataconnect-agent-context-mirror | P1 | repo_detected_agent_context_mirror_external_billing_observed_operator_context | repo_detected | Inventory Data Connect execution cadence, generated mirror refreshes, connection pooling/reuse, and provider-side instance state with owner evidence. |
| bigquery-analytics-event-fact-export | P1 | repo_detected_export_lane_external_billing_unknown | repo_detected | Keep BigQuery raw-events export non-priority and require dry-run bytes estimate, maximumBytesBilled, daily quotas, and staged materialization before adding warehouse queries. |
| gemini-vertex-admin-ai-cost-lane | P1 | repo_detected_admin_ai_external_billing_observed_operator_context | repo_detected | Gate Gemini/Vertex calls with explicit admin budget controls and separate analytics runtime from AI cost review. |

## Retry And Analytics Runtime Lanes

| Id | Severity | Status | Detection | Next action |
| --- | --- | --- | --- | --- |
| analytics-ingest-503-retryable | P1 | repo_detected_retryable_route_failure | repo_detected | Classify which analytics failures are retryable and make 4xx/validation failures calm, non-retried, and cheap. |
| expected-product-4xx-inventory | P2 | repo_detected_expected_4xx_mixed_with_runtime_scan | repo_detected | Separate expected product 4xx from unexpected analytics/client retry 4xx before fixes. |
| deeptracker-non-priority-cadence | P1 | repo_detected_high_cadence_guest_flush | repo_detected | Move non-priority cadence to a lower-frequency batch policy after source-owner review. |
| admin-analytics-cold-sources | P2 | repo_detected_cached_but_broad_admin_sources | repo_detected | Confirm admin analytics views read hot snapshots first and reserve cold reads for explicit refresh/drill-down. |
| guest-tracking-source | P2 | repo_detected_guest_queue_and_batch_identity | repo_detected | Keep guest data distinct until linked; future cost changes must not erase guest history. |
| user-tracking-source | P2 | repo_detected_identityState_userId_session_continuity | repo_detected | Review user index materialization cadence before moving it into any runtime hot path. |
| runtime-watch-time-v2-source-ready | P2 | repo_detected_source_ready_runtime_proof_required | repo_detected | Wire runtime watch tracker to selected media component and capture deployed evidence before claiming live accuracy. |
| legacy-watch-seconds-still-present | P2 | repo_detected_legacy_watch_seconds_rollup | repo_detected | Keep legacy watchSeconds as evidence/legacy fallback, not canonical playback truth. |

## Next Fix Order

1. Separate non-priority analytics cadence from product-critical telemetry and propose a lower-frequency batch policy.
2. Classify analytics/client retry failures so 4xx validation paths are calm, cheap, and non-retried.
3. Owner-review Cloud SQL/Data Connect billing and BigQuery/Gemini provider cost lanes before source changes.
4. Wire runtime watch-time v2 to media playback only after cost/idempotency route review.

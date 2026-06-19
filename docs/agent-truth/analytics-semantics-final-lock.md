# Analytics Semantics Final Lock

Generated: 2026-06-19T18:01:19.503Z
Current head: 79598a740b349732332b6e1751ca9d8f5b3933dc

## Status

- Guest tracking: source_ready_guest_data_remains_guest_until_linked
- Individual user tracking: source_ready_userId_identityState_session_continuity
- Guest to user transfer: source_ready_link_first_no_double_count
- Legacy recovery: source_ready_legacy_evidence_until_reconciled
- Runtime watch time: source_ready_runtime_watch_v2_runtime_proof_required
- Admin analytics readiness: source_ready_needs_fresh_admin_truth_sample_before_claiming_live_accuracy
- Beta score impact: score=70.79; status=External proof required; sourceReady=true; runtimeEvidenceComplete=false; betaExitReady=false

## Cost Lanes

- Cloud Run: cost_safe_10s_heartbeat_no_request_path_backfill; identity_transfer_bounded_link_first_no_history_fanout; owner_review_cost_backlog_visible
- Cloud SQL/Data Connect: cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency; cloud_sql_not_detected_in_transfer_runtime; cloud_sql_not_used_by_reconciler; cloud_sql_not_detected_in_runtime_watch_v2
- Gemini/Cloud Assist/Vertex: vertex_admin_ai_detected_outside_analytics_identity_transfer; gemini_cloud_assist_not_involved; gemini_cloud_assist_not_used; gemini_cloud_assist_not_involved
- 4xx: invalid_payload_returns_calm_non_retryable_422; identity_transfer_expected_auth_4xx_non_retryable; legacy_recovery_adds_no_user_facing_4xx

## Remaining Blockers

| Id | Severity | Status | Next action |
| --- | --- | --- | --- |
| runtime_watch_time_v2_runtime_proof_missing | P1 | runtime_evidence_required | Wire the runtime watch tracker into the selected media viewer and attach deployed runtime watch evidence before claiming live accuracy. |
| ui_provider_runtime_admin_evidence_missing | P1 | beta_exit_blocked | Run UI source coverage and attach provider smoke, runtime smoke, and admin truth sample evidence before beta exit review. |
| cost_owner_review_backlog_visible | P2 | owner_review_required | Keep Cloud Run, Cloud SQL/Data Connect mirror, Gemini/Vertex, and 4xx lanes visible until owner-reviewed evidence exists. |

## Next Exact Steps

1. Run deterministic UI source coverage before optional browser reproduction; keep analytics semantics source-ready only.
2. Wire runtime watch-time v2 into the selected media viewer and capture deployed runtime evidence before claiming live watch-time accuracy.
3. Refresh provider smoke, runtime smoke, admin truth sample, and beta score artifacts after real evidence is attached.

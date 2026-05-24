# Event Liveness Audit

Generated: 2026-05-24T04:21:57.886Z
Status: pass
Current head: 359c910b7f0d8edc3abc74e1c797229d4df41bfe

## Summary

- Expected daily visitors baseline: 100
- Raw quiet future count: 416
- True future-only quiet count: 389
- Suspicious idle count: 0
- Source missing count: 27
- Materializer missing count: 0
- Translation missing count: 0
- Hydration missing count: 0

## Debug Lane

- Event liveness is compact by default.
- The full quiet future catalog remains hidden behind drilldown.
- Suspicious idle and missing source/materializer/translation/hydration classifications are default-visible actionable groups.

## Common Visible Events With No Recent Liveness

- page_viewed: source_missing; Add or connect a safe lastSeen source for page_viewed; do not classify it as future-only quiet.
- semantic_page_viewed: source_missing; Add or connect a safe lastSeen source for semantic_page_viewed; do not classify it as future-only quiet.
- auth_session_established: source_missing; Add or connect a safe lastSeen source for auth_session_established; do not classify it as future-only quiet.
- dashboard_viewed: source_missing; Add or connect a safe lastSeen source for dashboard_viewed; do not classify it as future-only quiet.
- wallet_opened: source_missing; Add or connect a safe lastSeen source for wallet_opened; do not classify it as future-only quiet.
- drop_preview_opened: source_missing; Add or connect a safe lastSeen source for drop_preview_opened; do not classify it as future-only quiet.
- creator_profile_viewed: source_missing; Add or connect a safe lastSeen source for creator_profile_viewed; do not classify it as future-only quiet.
- notification_prompt_banner_viewed: source_missing; Add or connect a safe lastSeen source for notification_prompt_banner_viewed; do not classify it as future-only quiet.
- user_settings_viewed: source_missing; Add or connect a safe lastSeen source for user_settings_viewed; do not classify it as future-only quiet.
- daily_task_surface_viewed: source_missing; Add or connect a safe lastSeen source for daily_task_surface_viewed; do not classify it as future-only quiet.
- daily_task_started: source_missing; Add or connect a safe lastSeen source for daily_task_started; do not classify it as future-only quiet.
- daily_task_completed: source_missing; Add or connect a safe lastSeen source for daily_task_completed; do not classify it as future-only quiet.
- daily_task_reward_granted: source_missing; Add or connect a safe lastSeen source for daily_task_reward_granted; do not classify it as future-only quiet.
- chat_surface_viewed: source_missing; Add or connect a safe lastSeen source for chat_surface_viewed; do not classify it as future-only quiet.
- chat_thread_opened: source_missing; Add or connect a safe lastSeen source for chat_thread_opened; do not classify it as future-only quiet.
- chat_message_send_attempted: source_missing; Add or connect a safe lastSeen source for chat_message_send_attempted; do not classify it as future-only quiet.
- chat_message_sent: source_missing; Add or connect a safe lastSeen source for chat_message_sent; do not classify it as future-only quiet.

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 66 | 56 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 37.5 | 27.5 | below_target | 54 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 62.86 | 52.86 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| overallHealthScore | 61.45 | 52.01 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-debug-signal-actionability.ts: real_source_change_needs_review
- scripts/agent/validate-debug-signal-grouping.ts: real_source_change_needs_review
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-future-activity-signal-reclassification.ts: real_source_change_needs_review
- scripts/agent/validate-non-event-score-policy.ts: real_source_change_needs_review
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-contract.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-engine.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-debug/summary.ts: real_source_change_needs_review
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/event-liveness-audit.spec.ts: current_generated_artifact_to_commit

## Validation Failures

- none

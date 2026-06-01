# Event Liveness Audit

Generated: 2026-06-01T03:35:29.138Z
Status: pass
Current head: 39a5e4f484e18ff5eb78d1073c73d9d92e489ddb

## Summary

- Expected daily visitors baseline: 100
- Raw quiet future count: 416
- True future-only quiet count: 390
- Suspicious idle count: 17
- Source-ready waiting for activity count: 8
- Source missing count: 1
- Materializer missing count: 0
- Translation missing count: 0
- Hydration missing count: 0

## Debug Lane

- Event liveness is compact by default.
- The full quiet future catalog remains hidden behind drilldown.
- Suspicious idle and missing source/materializer/translation/hydration classifications are default-visible actionable groups.

## Common Visible Events With No Recent Liveness

- page_viewed: not_observed_but_expected; Verify the page_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- semantic_page_viewed: not_observed_but_expected; Verify the semantic_page_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- auth_session_established: not_observed_but_expected; Verify the auth_session_established route/component trigger and event-fact materializer with bounded recent summaries.
- dashboard_viewed: not_observed_but_expected; Verify the dashboard_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- wallet_opened: not_observed_but_expected; Verify the wallet_opened route/component trigger and event-fact materializer with bounded recent summaries.
- drop_preview_opened: not_observed_but_expected; Verify the drop_preview_opened route/component trigger and event-fact materializer with bounded recent summaries.
- creator_profile_viewed: not_observed_but_expected; Verify the creator_profile_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- notification_prompt_viewed: not_observed_but_expected; Verify the notification_prompt_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- user_settings_viewed: not_observed_but_expected; Verify the user_settings_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- daily_task_surface_viewed: not_observed_but_expected; Verify the daily_task_surface_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- daily_task_started: not_observed_but_expected; Verify the daily_task_started route/component trigger and event-fact materializer with bounded recent summaries.
- daily_task_completed: not_observed_but_expected; Verify the daily_task_completed route/component trigger and event-fact materializer with bounded recent summaries.
- daily_task_reward_granted: not_observed_but_expected; Verify the daily_task_reward_granted route/component trigger and event-fact materializer with bounded recent summaries.
- chat_surface_viewed: not_observed_but_expected; Verify the chat_surface_viewed route/component trigger and event-fact materializer with bounded recent summaries.
- chat_thread_opened: not_observed_but_expected; Verify the chat_thread_opened route/component trigger and event-fact materializer with bounded recent summaries.
- chat_message_send_attempted: not_observed_but_expected; Verify the chat_message_send_attempted route/component trigger and event-fact materializer with bounded recent summaries.
- chat_message_sent: not_observed_but_expected; Verify the chat_message_sent route/component trigger and event-fact materializer with bounded recent summaries.

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 92.5 | 92.5 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 84.2 | 74.2 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 69.6 | 59.6 | below_target | 36 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 75.63 | 65.63 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 86 | 76 | below_target | 17 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| overallHealthScore | 78.03 | 68.32 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-overnight-beta-readiness-lock.ts: validator_artifact_expected
- src/lib/admin-analytics/panel-hydration-contract.ts: real_source_change_needs_review
- src/lib/admin-analytics/panel-hydration-registry.ts: real_source_change_needs_review
- src/lib/admin-analytics/panel-hydration-resolver.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-contract.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-engine.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/release-readiness/live-evidence-resolver.ts: real_source_change_needs_review
- src/lib/release-readiness/live-panel-evidence-resolver.ts: real_source_change_needs_review
- tests/unit/analytics-panel-hydration.spec.ts: test_artifact_expected
- tests/unit/event-liveness-audit.spec.ts: current_generated_artifact_to_commit

## Validation Failures

- none

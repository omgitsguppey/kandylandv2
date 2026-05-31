# Event Liveness Audit

Generated: 2026-05-31T04:44:05.671Z
Status: pass
Current head: c2ec29f5a6c1d75ec8652e8eba92fab43e6ff718

## Summary

- Expected daily visitors baseline: 100
- Raw quiet future count: 416
- True future-only quiet count: 389
- Suspicious idle count: 16
- Source-ready waiting for activity count: 8
- Source missing count: 3
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
- notification_prompt_banner_viewed: source_missing; Add or connect a safe lastSeen source for notification_prompt_banner_viewed; do not classify it as future-only quiet.
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
| sourceHealth | 91.7 | 91.7 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 84.2 | 74.2 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 69.6 | 59.6 | below_target | 38 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 67.5 | 57.5 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 86 | 76 | below_target | 16 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| overallHealthScore | 76.61 | 66.83 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-user-dedupe-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/global-user-dedupe-normalization.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: validator_artifact_expected
- src/lib/admin-analytics/panel-hydration-contract.ts: real_source_change_needs_review
- src/lib/admin-analytics/panel-hydration-resolver.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/analytics-panel-hydration.spec.ts: test_artifact_expected

## Validation Failures

- none

# Event Liveness Audit

Generated: 2026-06-16T20:14:05.331Z
Status: pass
Current head: a4afc0c1369c3d8a1d847d26cb19f90af95d0502

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
| sourceHealth | 91.7 | 91.7 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 72.8 | 62.8 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 43.4 | 33.4 | below_target | 36 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 67.5 | 57.5 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 94 | 84 | target_met | No event liveness score action needed for this dimension. |
| overallHealthScore | 69.89 | 61.9 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- none

## Validation Failures

- none

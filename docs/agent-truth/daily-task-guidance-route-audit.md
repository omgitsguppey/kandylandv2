# Daily Task Guidance Route Audit

Generated: 2026-06-03T04:31:55.516Z
Current HEAD: 225f9e53
Status: fail

## Summary

- Total tasks: 47
- Active tasks: 47
- Hidden/deprecated tasks: 0
- Broken routes: 0
- Missing completion signals: 0
- Missing telemetry: 0
- Wrong surface tasks: 0

## Debug Lane

- Lane: Task guidance health
- Status: healthy
- Raw details collapsed by default: true

## Task Rows

| Task | Status | Route | Feature | Completion signal | Missing evidence |
| --- | --- | --- | --- | --- | --- |
| enable_notifications | active | /experiences#daily-tasks | notifications | task_notifications_enabled | none |
| open_notifications | active | /experiences#daily-tasks | notifications | notifications_dropdown_opened | none |
| read_notification | active | /experiences#daily-tasks | notifications | notification_read | none |
| visit_experiences | active | /experiences#daily-tasks | daily_checkin | experience_hub_viewed | none |
| check_in_today | active | /experiences#daily-reward | daily_checkin | daily_checkin_claimed | none |
| open_dashboard | active | /dashboard#dashboard-home | daily_checkin | dashboard_viewed | none |
| open_library | active | /dashboard/library#library-grid | library | library_viewed | none |
| preview_two_drops | active | /drops#live-drops | drops | drop_preview_opened | none |
| preview_three_drops | active | /drops#live-drops | drops | drop_preview_opened | none |
| view_three_drop_details | active | /drops#live-drops | drops | view_drop_details | none |
| open_wallet | active | /experiences#gumdrops-wallet | wallet | wallet_opened | none |
| start_checkout | active | /experiences#gumdrops-wallet | wallet | begin_checkout | none |
| buy_small_pack | active | /experiences#gumdrops-wallet | wallet | gumdrops_purchase_completed | none |
| buy_big_pack | active | /experiences#gumdrops-wallet | wallet | gumdrops_purchase_completed | none |
| unwrap_one_drop | active | /drops#live-drops | drops | unlock_drop_success | none |
| unwrap_two_drops | active | /drops#live-drops | drops | unlock_drop_success | none |
| unwrap_spicy | active | /drops#live-drops | drops | unlock_drop_success | none |
| open_viewer_once | active | /dashboard/library#library-grid | library | viewer_opened | none |
| watch_one_asset | active | /dashboard/library#library-grid | library | viewer_asset_consumed | none |
| watch_two_assets | active | /dashboard/library#library-grid | library | viewer_asset_consumed | none |
| watch_ninety_seconds | active | /dashboard/library#library-grid | library | viewer_watch_checkpoint | none |
| switch_three_assets | active | /dashboard/library#library-grid | library | file_viewed | none |
| share_one_drop | active | /drops#live-drops | drops | drop_share_copied | none |
| submit_feedback | active | /experiences#daily-tasks | daily_checkin | feedback_submitted | none |
| feature_request_feedback | active | /experiences#daily-tasks | daily_checkin | feedback_submitted | none |
| bug_report_feedback | active | /experiences#daily-tasks | daily_checkin | feedback_submitted | none |
| high_rating_feedback | active | /experiences#daily-tasks | daily_checkin | feedback_submitted | none |
| revisit_live_drops | active | /drops#live-drops | drops | drops_page_viewed | none |
| revisit_experiences_hub | active | /experiences#daily-tasks | daily_checkin | experience_hub_viewed | none |
| revisit_library_hub | active | /dashboard/library#library-grid | library | library_viewed | none |
| scout_four_drops | active | /drops#live-drops | drops | drop_preview_opened | none |
| inspect_six_drop_details | active | /drops#live-drops | drops | view_drop_details | none |
| unwrap_three_drops | active | /drops#live-drops | drops | unlock_drop_success | none |
| unwrap_four_drops | active | /drops#live-drops | drops | unlock_drop_success | none |
| unwrap_sweet_drop | active | /drops#live-drops | drops | unlock_drop_success | none |
| unwrap_raw_drop | active | /drops#live-drops | drops | unlock_drop_success | none |
| open_two_unwrapped_drops | active | /dashboard/library#library-grid | library | viewer_opened | none |
| complete_one_viewer_session | active | /dashboard/library#library-grid | library | viewer_session_completed | none |
| complete_two_viewer_sessions | active | /dashboard/library#library-grid | library | viewer_session_completed | none |
| watch_two_full_minutes | active | /dashboard/library#library-grid | library | viewer_session_completed | none |
| finish_two_files | active | /dashboard/library#library-grid | library | viewer_asset_completed | none |
| finish_four_files | active | /dashboard/library#library-grid | library | viewer_asset_completed | none |
| watch_three_unwrapped_files | active | /dashboard/library#library-grid | library | viewer_asset_consumed | none |
| hit_forty_five_seconds | active | /dashboard/library#library-grid | library | viewer_watch_checkpoint | none |
| download_one_unwrapped_file | active | /dashboard/library#library-grid | library | viewer_source_downloaded | none |
| chase_a_related_drop | active | /dashboard/library#library-grid | library | viewer_related_drop_clicked | none |
| open_a_notification_update | active | /experiences#daily-tasks | notifications | notification_opened | none |

## Score Impact

| Dimension | Effect |
| --- | --- |
| sourceHealth | Active task guidance now requires registered task, route, feature, telemetry, and reward source truth. |
| runtimeHealth | No runtime/provider proof is faked; unavailable tasks are hidden instead of treated as runtime success. |
| evidenceCompleteness | Adds deterministic route/completion-signal audit evidence and debug visibility. |
| freshness | Regenerated guidance audit and beta score artifacts report current HEAD. |
| costRisk | Static source audit only; no production reads or provider calls. |
| regressionRisk | Unsupported task guidance is hidden by contract before users can act on it. |
| overallHealthScore | Improves task guidance evidence without clearing formal gates falsely. |

## Old Logic Classification

- src/lib/task-guidance.ts route strings: still_required - Task guidance still owns runtime CTA navigation but is now audited by daily-task-guidance-contract.
- src/components/Dashboard/DailyTasksModule.tsx active task rendering: superseded - Rendering no longer treats every assigned task as claimable guidance; unsupported rows are filtered by the contract.

## Validation Failures

- dirty files are unclassified.
- dirty files unclassified: scripts/agent/score-public-beta-readiness.ts, scripts/agent/validate-analytics-hydration-consolidation.ts, scripts/agent/validate-analytics-panel-hydration.ts, scripts/agent/validate-creator-dashboard-error-cost-inventory.ts, scripts/agent/validate-creator-monetization-readiness-lock.ts, scripts/agent/validate-final-parity-telemetry-lock.ts, scripts/agent/validate-media-discovery-score-lock.ts, scripts/agent/validate-post-economy-creator-flow-qa.ts, scripts/agent/validate-public-beta-score.ts, scripts/agent/validate-regression-risk-high-blast-refresh.ts, scripts/agent/validate-score-80-reconciliation-lock.ts, scripts/agent/validate-score-80-refresh-pass.ts, scripts/agent/validate-user-facing-feature-connection-audit.ts, src/lib/agent-score/algorithmic-evidence-policy.ts, src/lib/agent-score/core.ts, src/lib/agent-score/evidence-quality.ts, src/lib/agent-score/formal-evidence-bridge.ts, src/lib/agent-score/regression-risk-refresh-plan.ts, tests/unit/creator-dashboard-error-cost-inventory.spec.ts, tests/unit/creator-experiences-panel.spec.tsx, tests/unit/post-economy-creator-flow-qa.spec.ts, tests/unit/public-beta-score.spec.ts, tests/unit/purchase-modal.spec.tsx

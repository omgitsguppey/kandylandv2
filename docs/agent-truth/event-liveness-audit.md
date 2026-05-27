# Event Liveness Audit

Generated: 2026-05-27T02:55:29.149Z
Status: fail
Current head: dd4b37320ddd4e920d6633c91d90b01243089231

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
| sourceHealth | 100 | 100 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 84.2 | 74.2 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 84.6 | 74.6 | below_target | 54 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 91.88 | 81.88 | target_met | No event liveness score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 86 | 86 | target_met | No event liveness score action needed for this dimension. |
| overallHealthScore | 85.34 | 76.45 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/analytics-hydration-consolidation-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation-audit.md: unsafe_unknown
- docs/agent-truth/analytics-hydration-consolidation.md: unsafe_unknown
- docs/agent-truth/analytics-panel-hydration.md: unsafe_unknown
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-analytics-hydration-consolidation.ts: unsafe_unknown
- scripts/agent/validate-analytics-panel-hydration.ts: unsafe_unknown
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx: unsafe_unknown
- src/lib/admin-analytics/panel-hydration-contract.ts: unsafe_unknown
- src/lib/admin-analytics/panel-hydration-registry.ts: unsafe_unknown
- src/lib/admin-analytics/panel-hydration-resolver.ts: unsafe_unknown
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-readiness/live-panel-evidence-resolver.ts: unsafe_unknown
- tests/unit/analytics-hydration-consolidation.spec.ts: unsafe_unknown
- tests/unit/analytics-panel-hydration.spec.ts: unsafe_unknown

## Validation Failures

- dirty files are unclassified.

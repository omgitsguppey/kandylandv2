# Event Liveness Audit

Generated: 2026-05-24T16:46:07.496Z
Status: pass
Current head: d02b8b2da859d47d880182fe2169db1ad6a40ad6

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
| sourceHealth | 92.5 | 92.5 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 84.2 | 74.2 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 69.6 | 59.6 | below_target | 54 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 83.75 | 73.75 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 86 | 86 | target_met | No event liveness score action needed for this dimension. |
| overallHealthScore | 79.25 | 71.34 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/chat-telemetry-admin-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/config-runtime-sample-status-classifier.generated.json: current_generated_artifact_to_commit
- agent/state/cost-4xx-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch5-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/final-signal-zero-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/future-activity-catalog-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/open-backlog-status-cleanup.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/chat-functionality-score-lock.md: documentation_artifact_expected
- docs/agent-truth/chat-gating-moderation.md: documentation_artifact_expected
- docs/agent-truth/chat-gating-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/chat-telemetry-admin-truth.md: documentation_artifact_expected
- docs/agent-truth/chat-telemetry-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/config-runtime-sample-status-classifier.md: documentation_artifact_expected
- docs/agent-truth/cost-4xx-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/cost-risk-owner-review-closure.md: documentation_artifact_expected
- docs/agent-truth/debug-backlog-engine.md: documentation_artifact_expected
- docs/agent-truth/debug-cockpit-batch5-cleanup.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/final-signal-zero-lock.md: documentation_artifact_expected
- docs/agent-truth/future-activity-catalog-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/open-backlog-status-cleanup.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/chat-cost-status-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-chat-functionality-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-chat-gating-moderation.ts: validator_artifact_expected
- scripts/agent/validate-chat-gating-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-chat-telemetry-admin-truth.ts: validator_artifact_expected
- scripts/agent/validate-chat-telemetry-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-config-runtime-sample-status-classifier.ts: validator_artifact_expected
- scripts/agent/validate-cost-4xx-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch5-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-final-signal-zero-lock.ts: validator_artifact_expected
- scripts/agent/validate-future-activity-catalog-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-open-backlog-status-cleanup.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx: real_source_change_needs_review
- src/lib/debug/config-runtime-sample-status-classifier.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/chat-gating-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/chat-telemetry-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/config-runtime-sample-status-classifier.spec.ts: test_artifact_expected
- tests/unit/cost-4xx-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch5-cleanup.spec.ts: test_artifact_expected
- tests/unit/future-activity-catalog-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/open-backlog-status-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

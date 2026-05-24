# Event Liveness Audit

Generated: 2026-05-24T15:32:39.293Z
Status: pass
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9

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
- agent/state/behavior-math-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/consent-tracking-mode-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-source-repair.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-telemetry-coverage-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/legacy-recovery-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/runtime-debug-signal-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/tracking-summary-lane-cleanup.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/behavior-math-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/consent-tracking-mode-cleanup.md: documentation_artifact_expected
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- docs/agent-truth/debug-tracking-simplification.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/event-liveness-source-repair.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/feature-telemetry-coverage-cleanup.md: documentation_artifact_expected
- docs/agent-truth/legacy-recovery-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/runtime-debug-signal-cleanup.md: documentation_artifact_expected
- docs/agent-truth/tracking-summary-lane-cleanup.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/tracking-summary-lane-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-behavior-math-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-consent-tracking-mode-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-signal-grouping.ts: real_source_change_needs_review
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-event-liveness-source-repair.ts: validator_artifact_expected
- scripts/agent/validate-feature-telemetry-coverage-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-legacy-recovery-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-runtime-debug-signal-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-tracking-summary-lane-cleanup.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/privacy/consent-tracking-policy.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/behavior-math-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/consent-tracking-mode-cleanup.spec.ts: test_artifact_expected
- tests/unit/event-liveness-source-repair.spec.ts: test_artifact_expected
- tests/unit/feature-telemetry-coverage-cleanup.spec.ts: test_artifact_expected
- tests/unit/legacy-recovery-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/runtime-debug-signal-cleanup.spec.ts: test_artifact_expected
- tests/unit/tracking-summary-lane-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

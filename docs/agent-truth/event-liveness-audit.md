# Event Liveness Audit

Generated: 2026-05-25T05:51:29.487Z
Status: pass
Current head: 9dc79a00f40df751841c8d8f10d98de636336397

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
| runtimeHealth | 84.2 | 74.2 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 69.6 | 59.6 | below_target | 54 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 75.63 | 65.63 | below_target | 27 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| costRisk | 42 | 42 | below_target | Quiet future-only and rare events do not reduce this dimension. |
| regressionRisk | 86 | 86 | target_met | No event liveness score action needed for this dimension. |
| overallHealthScore | 77.83 | 69.86 | below_target | Resolve liveness source gaps and formal beta score blockers before treating overall as ready. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/advanced-telemetry-parity-ui-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json: current_generated_artifact_to_commit
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/ingest-identified-parity-blocker.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/refresh-diagnostics-failure-clusters.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-parity-pass-gate.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-parity-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/debug-cockpit-batch30-telemetry-parity.md: documentation_artifact_expected
- docs/agent-truth/debug-runtime-evidence.md: documentation_artifact_expected
- docs/agent-truth/event-envelope-normalization.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/ingest-identified-parity-blocker.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/refresh-diagnostics-failure-clusters.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: documentation_artifact_expected
- docs/agent-truth/telemetry-parity-pass-gate.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts: validator_artifact_expected
- scripts/agent/validate-admin-debug-control-tower.ts: validator_artifact_expected
- scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch30-telemetry-parity.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: current_generated_artifact_to_commit
- scripts/agent/validate-ingest-identified-parity-blocker.ts: validator_artifact_expected
- scripts/agent/validate-refresh-diagnostics-failure-clusters.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-parity-pass-gate.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedDataValidation.tsx: real_source_change_needs_review
- src/app/api/admin/analytics/historical/route.ts: real_source_change_needs_review
- src/lib/analytics/advanced-telemetry-parity-ui.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/ingest-identified-parity-blocker.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/refresh-diagnostics-failure-clusters.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-parity-pass-gate.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/types/admin-analytics.ts: real_source_change_needs_review
- tests/unit/admin-data-validation.spec.ts: test_artifact_expected
- tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch30-telemetry-parity.spec.ts: test_artifact_expected
- tests/unit/ingest-identified-parity-blocker.spec.ts: test_artifact_expected
- tests/unit/refresh-diagnostics-failure-clusters.spec.ts: test_artifact_expected
- tests/unit/telemetry-parity-pass-gate.spec.ts: test_artifact_expected

## Validation Failures

- none

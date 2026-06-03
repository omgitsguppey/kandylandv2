# Event Liveness Audit

Generated: 2026-06-03T04:32:33.345Z
Status: fail
Current head: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

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
| sourceHealth | 100 | 100 | target_met | No event liveness score action needed for this dimension. |
| runtimeHealth | 87.4 | 77.4 | below_target | 35 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| evidenceCompleteness | 84.6 | 74.6 | below_target | 36 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| freshness | 91.88 | 81.88 | target_met | No event liveness score action needed for this dimension. |
| costRisk | 80.5 | 80.5 | target_met | No event liveness score action needed for this dimension. |
| regressionRisk | 88 | 78 | below_target | 17 event liveness point(s) of pressure from suspicious idle, missing source, or missing bridge/materializer/hydration classifications. |
| overallHealthScore | 90.03 | 82.06 | target_met | No event liveness score action needed for this dimension. |

## Dirty Files

- agent/state/activity-verification-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/algorithmic-evidence-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/beta-evidence-gap-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-lane-prep.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-freshness-language.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-realtime-cost-control.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-admin-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cloud-sql-gemini-cost-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-owner-review-source-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-dashboard-error-cost-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-status-metrics.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-experience-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-monetization-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-settings-control-plane.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-score-impact-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/existing-algorithm-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-cost-audit-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-pr-stale-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-telemetry-closure-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-marquee-truncated-titles.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-discovery-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-loading-hydration-stability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-ui-final-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/operator-revenue-smoke.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-final-integration-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-wiring-integrity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/post-economy-creator-flow-qa.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/regression-risk-high-blast-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-smoke-substitute-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-watch-time-v2.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-cost-readiness.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-refresh-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-connection-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-backed-runtime-confidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-truth-authority-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-creator-ui-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-facing-feature-connection-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-truth-source-sample.md: unsafe_unknown
- docs/agent-truth/analytics-cost-runtime-inventory.md: unsafe_unknown
- docs/agent-truth/analytics-hydration-consolidation-audit.md: unsafe_unknown
- docs/agent-truth/analytics-hydration-consolidation.md: unsafe_unknown
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/beta-evidence-gap-map.md: unsafe_unknown
- docs/agent-truth/beta-evidence-lane-prep.md: unsafe_unknown
- docs/agent-truth/beta-freshness-language.md: unsafe_unknown
- docs/agent-truth/chat-functionality-score-lock.md: documentation_artifact_expected
- docs/agent-truth/chat-gating-moderation.md: documentation_artifact_expected
- docs/agent-truth/chat-realtime-cost-control.md: unsafe_unknown
- docs/agent-truth/chat-telemetry-admin-truth.md: documentation_artifact_expected
- docs/agent-truth/cloud-sql-gemini-cost-guards.md: unsafe_unknown
- docs/agent-truth/cost-owner-review-source-closure.md: unsafe_unknown
- docs/agent-truth/cost-risk-exit-pass.md: unsafe_unknown
- docs/agent-truth/cost-risk-owner-review-closure.md: documentation_artifact_expected
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: unsafe_unknown
- docs/agent-truth/creator-drop-status-metrics.md: unsafe_unknown
- docs/agent-truth/creator-monetization-readiness-lock.md: unsafe_unknown
- docs/agent-truth/creator-settings-control-plane.md: unsafe_unknown
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/daily-task-debug-score-lock.md: unsafe_unknown
- docs/agent-truth/daily-task-guidance-route-audit.md: unsafe_unknown
- docs/agent-truth/daily-task-lifecycle-telemetry.md: unsafe_unknown
- docs/agent-truth/daily-task-reset-truth.md: unsafe_unknown
- docs/agent-truth/daily-task-reward-ledger.md: unsafe_unknown
- docs/agent-truth/debug-runtime-evidence.md: documentation_artifact_expected
- docs/agent-truth/debug-score-impact-triage.md: unsafe_unknown
- docs/agent-truth/debug-signal-actionability.md: unsafe_unknown
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- docs/agent-truth/event-envelope-normalization.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/evidence-capture-status.md: documentation_artifact_expected
- docs/agent-truth/existing-algorithm-refinement.md: unsafe_unknown
- docs/agent-truth/feature-registration-gate.md: unsafe_unknown
- docs/agent-truth/final-cost-audit-lock.md: unsafe_unknown
- docs/agent-truth/final-parity-telemetry-lock.md: unsafe_unknown
- docs/agent-truth/final-pr-stale-cleanup.md: unsafe_unknown
- docs/agent-truth/final-telemetry-closure-lock.md: unsafe_unknown
- docs/agent-truth/formal-evidence-bridge.md: unsafe_unknown
- docs/agent-truth/global-marquee-truncated-titles.md: unsafe_unknown
- docs/agent-truth/media-discovery-score-lock.md: unsafe_unknown
- docs/agent-truth/mobile-loading-hydration-stability.md: unsafe_unknown
- docs/agent-truth/mobile-ui-final-lock.md: unsafe_unknown
- docs/agent-truth/operator-revenue-smoke.md: unsafe_unknown
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/overnight-final-integration-lock.md: unsafe_unknown
- docs/agent-truth/overnight-wiring-integrity.md: unsafe_unknown
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/post-economy-creator-flow-qa.md: unsafe_unknown
- docs/agent-truth/regression-risk-high-blast-refresh.md: unsafe_unknown
- docs/agent-truth/runtime-smoke-substitute-matrix.md: unsafe_unknown
- docs/agent-truth/runtime-watch-time-v2.md: unsafe_unknown
- docs/agent-truth/score-80-cost-readiness.md: unsafe_unknown
- docs/agent-truth/score-80-reconciliation-lock.md: unsafe_unknown
- docs/agent-truth/score-80-refresh-pass.md: unsafe_unknown
- docs/agent-truth/settings-connection-parity.md: unsafe_unknown
- docs/agent-truth/source-backed-runtime-confidence.md: unsafe_unknown
- docs/agent-truth/source-truth-authority-map.md: unsafe_unknown
- docs/agent-truth/targeted-behavior-evidence.md: unsafe_unknown
- docs/agent-truth/telemetry-admin-debug-truth.md: documentation_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: unsafe_unknown
- docs/agent-truth/user-management-refactor.md: unsafe_unknown
- docs/agent-truth/user-profile-api-contract.md: unsafe_unknown
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-hydration-consolidation.ts: unsafe_unknown
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-creator-dashboard-error-cost-inventory.ts: unsafe_unknown
- scripts/agent/validate-creator-monetization-readiness-lock.ts: unsafe_unknown
- scripts/agent/validate-final-parity-telemetry-lock.ts: unsafe_unknown
- scripts/agent/validate-media-discovery-score-lock.ts: unsafe_unknown
- scripts/agent/validate-post-economy-creator-flow-qa.ts: unsafe_unknown
- scripts/agent/validate-public-beta-score.ts: unsafe_unknown
- scripts/agent/validate-regression-risk-high-blast-refresh.ts: unsafe_unknown
- scripts/agent/validate-score-80-reconciliation-lock.ts: unsafe_unknown
- scripts/agent/validate-score-80-refresh-pass.ts: unsafe_unknown
- scripts/agent/validate-user-facing-feature-connection-audit.ts: unsafe_unknown
- src/lib/agent-score/algorithmic-evidence-policy.ts: unsafe_unknown
- src/lib/agent-score/core.ts: unsafe_unknown
- src/lib/agent-score/evidence-quality.ts: unsafe_unknown
- src/lib/agent-score/formal-evidence-bridge.ts: unsafe_unknown
- src/lib/agent-score/regression-risk-refresh-plan.ts: unsafe_unknown
- tests/unit/creator-dashboard-error-cost-inventory.spec.ts: unsafe_unknown
- tests/unit/creator-experiences-panel.spec.tsx: unsafe_unknown
- tests/unit/post-economy-creator-flow-qa.spec.ts: unsafe_unknown
- tests/unit/public-beta-score.spec.ts: unsafe_unknown
- tests/unit/purchase-modal.spec.tsx: unsafe_unknown

## Validation Failures

- dirty files are unclassified.

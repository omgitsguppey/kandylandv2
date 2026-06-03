# Daily Task Lifecycle Telemetry

Generated: 2026-06-03T04:31:43.114Z
Current HEAD: 225f9e53

## Lifecycle

- daily_task_surface_viewed
- daily_task_card_viewed
- daily_task_guidance_opened
- daily_task_started
- daily_task_action_attempted
- daily_task_completed
- daily_task_reward_granted
- daily_task_failed
- daily_task_abandoned
- daily_task_reset_locked
- daily_task_next_eligible_viewed

## Duration Truth

- Passive page time rejected: true
- Abandonment classification: true
- Reward source: reward_gd_only
- Reward granted server truth: true

## Person Metrics

- daily_task_views: present=true; hydrated=2; events=daily_task_surface_viewed, daily_task_card_viewed, daily_tasks_viewed
- daily_task_starts: present=true; hydrated=1; events=daily_task_started
- daily_task_completions: present=true; hydrated=1; events=daily_task_completed, task_completed, daily_checkin_claimed
- daily_task_failures: present=true; hydrated=1; events=daily_task_failed
- daily_task_rewards_granted: present=true; hydrated=0; events=daily_task_reward_granted, daily_task_claimed
- daily_task_average_duration: present=true; hydrated=3; events=daily_task_completed, daily_task_failed, daily_task_abandoned
- daily_task_abandonments: present=true; hydrated=1; events=daily_task_abandoned
- daily_task_reset_locked_views: present=true; hydrated=2; events=daily_task_reset_locked, daily_task_next_eligible_viewed

## Debug Lane

- Lane: Daily task lifecycle
- Status: review
- Duration unavailable: 1

## Score Impact

- sourceHealth: Daily task lifecycle events are cataloged and mapped to task/person metric sources.
- runtimeHealth: No production/provider proof is claimed; route metadata stays server-truth compatible.
- evidenceCompleteness: Adds validator, report, debug lane, and deterministic duration tests.
- freshness: Refreshes the lifecycle report with the current HEAD and beta score artifact.
- costRisk: No production reads; lifecycle telemetry uses existing event paths and bounded local validators.
- regressionRisk: Adds red-green unit coverage for active duration and reward-source separation.
- overallHealthScore: Improves task lifecycle evidence without clearing formal external gates.

## Dirty Files

- agent/state/activity-verification-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/algorithmic-evidence-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
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
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-score-impact-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/existing-algorithm-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
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
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
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
- docs/agent-truth/admin-truth-source-sample.md: documentation_artifact_expected
- docs/agent-truth/analytics-cost-runtime-inventory.md: documentation_artifact_expected
- docs/agent-truth/analytics-hydration-consolidation-audit.md: documentation_artifact_expected
- docs/agent-truth/analytics-hydration-consolidation.md: documentation_artifact_expected
- docs/agent-truth/analytics-panel-hydration.md: documentation_artifact_expected
- docs/agent-truth/beta-evidence-gap-map.md: documentation_artifact_expected
- docs/agent-truth/beta-evidence-lane-prep.md: documentation_artifact_expected
- docs/agent-truth/beta-freshness-language.md: documentation_artifact_expected
- docs/agent-truth/chat-functionality-score-lock.md: documentation_artifact_expected
- docs/agent-truth/chat-gating-moderation.md: documentation_artifact_expected
- docs/agent-truth/chat-realtime-cost-control.md: documentation_artifact_expected
- docs/agent-truth/chat-telemetry-admin-truth.md: documentation_artifact_expected
- docs/agent-truth/cloud-sql-gemini-cost-guards.md: documentation_artifact_expected
- docs/agent-truth/cost-owner-review-source-closure.md: documentation_artifact_expected
- docs/agent-truth/cost-risk-exit-pass.md: documentation_artifact_expected
- docs/agent-truth/cost-risk-owner-review-closure.md: documentation_artifact_expected
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: documentation_artifact_expected
- docs/agent-truth/creator-drop-status-metrics.md: documentation_artifact_expected
- docs/agent-truth/creator-monetization-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/creator-settings-control-plane.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: documentation_artifact_expected
- docs/agent-truth/daily-task-debug-score-lock.md: documentation_artifact_expected
- docs/agent-truth/daily-task-guidance-route-audit.md: documentation_artifact_expected
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reset-truth.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reward-ledger.md: documentation_artifact_expected
- docs/agent-truth/debug-runtime-evidence.md: documentation_artifact_expected
- docs/agent-truth/debug-score-impact-triage.md: documentation_artifact_expected
- docs/agent-truth/debug-signal-actionability.md: documentation_artifact_expected
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- docs/agent-truth/event-envelope-normalization.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/evidence-capture-status.md: documentation_artifact_expected
- docs/agent-truth/existing-algorithm-refinement.md: documentation_artifact_expected
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/final-cost-audit-lock.md: documentation_artifact_expected
- docs/agent-truth/final-parity-telemetry-lock.md: documentation_artifact_expected
- docs/agent-truth/final-pr-stale-cleanup.md: documentation_artifact_expected
- docs/agent-truth/final-telemetry-closure-lock.md: documentation_artifact_expected
- docs/agent-truth/formal-evidence-bridge.md: documentation_artifact_expected
- docs/agent-truth/global-marquee-truncated-titles.md: documentation_artifact_expected
- docs/agent-truth/media-discovery-score-lock.md: documentation_artifact_expected
- docs/agent-truth/mobile-loading-hydration-stability.md: documentation_artifact_expected
- docs/agent-truth/mobile-ui-final-lock.md: documentation_artifact_expected
- docs/agent-truth/operator-revenue-smoke.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/overnight-final-integration-lock.md: documentation_artifact_expected
- docs/agent-truth/overnight-wiring-integrity.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/post-economy-creator-flow-qa.md: documentation_artifact_expected
- docs/agent-truth/regression-risk-high-blast-refresh.md: documentation_artifact_expected
- docs/agent-truth/runtime-smoke-substitute-matrix.md: documentation_artifact_expected
- docs/agent-truth/runtime-watch-time-v2.md: documentation_artifact_expected
- docs/agent-truth/score-80-cost-readiness.md: documentation_artifact_expected
- docs/agent-truth/score-80-reconciliation-lock.md: documentation_artifact_expected
- docs/agent-truth/score-80-refresh-pass.md: documentation_artifact_expected
- docs/agent-truth/settings-connection-parity.md: documentation_artifact_expected
- docs/agent-truth/source-backed-runtime-confidence.md: documentation_artifact_expected
- docs/agent-truth/source-truth-authority-map.md: documentation_artifact_expected
- docs/agent-truth/targeted-behavior-evidence.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: documentation_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- docs/agent-truth/user-management-refactor.md: documentation_artifact_expected
- docs/agent-truth/user-profile-api-contract.md: documentation_artifact_expected
- scripts/agent/score-public-beta-readiness.ts: unsafe_unknown
- scripts/agent/validate-analytics-hydration-consolidation.ts: unsafe_unknown
- scripts/agent/validate-analytics-panel-hydration.ts: unsafe_unknown
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

- person metrics omit tasks.
- chat files changed.
- dirty files unclassified: scripts/agent/score-public-beta-readiness.ts, scripts/agent/validate-analytics-hydration-consolidation.ts, scripts/agent/validate-analytics-panel-hydration.ts, scripts/agent/validate-creator-dashboard-error-cost-inventory.ts, scripts/agent/validate-creator-monetization-readiness-lock.ts, scripts/agent/validate-final-parity-telemetry-lock.ts, scripts/agent/validate-media-discovery-score-lock.ts, scripts/agent/validate-post-economy-creator-flow-qa.ts, scripts/agent/validate-public-beta-score.ts, scripts/agent/validate-regression-risk-high-blast-refresh.ts, scripts/agent/validate-score-80-reconciliation-lock.ts, scripts/agent/validate-score-80-refresh-pass.ts, scripts/agent/validate-user-facing-feature-connection-audit.ts, src/lib/agent-score/algorithmic-evidence-policy.ts, src/lib/agent-score/core.ts, src/lib/agent-score/evidence-quality.ts, src/lib/agent-score/formal-evidence-bridge.ts, src/lib/agent-score/regression-risk-refresh-plan.ts, tests/unit/creator-dashboard-error-cost-inventory.spec.ts, tests/unit/creator-experiences-panel.spec.tsx, tests/unit/post-economy-creator-flow-qa.spec.ts, tests/unit/public-beta-score.spec.ts, tests/unit/purchase-modal.spec.tsx

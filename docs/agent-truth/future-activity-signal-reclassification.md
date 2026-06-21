# Future Activity Signal Reclassification

Generated: 2026-06-21T03:25:16.618Z
Status: pass
Current head: bb7e2c67c3df73feccad7418321e51101d1f86e4

## Contract

- Source-ready future activity placeholders are quiet catalog entries, not active debug warnings.
- Missing producers, bridges, materializers, metric consumers, and debug mappings remain actionable.
- Formal provider, runtime, and admin evidence gates stay separate from activity signal lists.
- This pass does not fake activity, read production data, mutate legacy data, or clear formal gates.

## Activity Signal Counts

- Total signals: 768
- Actionable activity signals: 0
- Quiet future activity: 768
- Broken activity paths: 0
- Score-drag activity: 0
- Evidence-gate-only signals: 0

## Score Dimensions

- sourceHealth: 91.7 -> 97.2; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 67.75 -> 60.45; target=80; status=below_target; next=Capture formal runtime/provider smoke evidence; local source validators must not be promoted to runtime proof.
- evidenceCompleteness: 39.25 -> 55.11; target=80; status=below_target; next=Attach or refresh formal provider, runtime, admin-truth, and stale report evidence without faking activity.
- freshness: 62.86 -> 83.75; target=80; status=target_met; next=No score-80 action required for this dimension.
- costRisk: 42 -> 42; target=80; status=below_target; next=Complete the remaining owner-reviewed cost readiness lanes; keep the final lock source-only with no production reads.
- regressionRisk: 42 -> 94; target=80; status=target_met; next=No score-80 action required for this dimension.
- overallHealthScore: 62.15 -> 73.57; target=80; status=below_target; next=Complete every below-target dimension next action, then rerun score:beta and check:beta-score.

## Debug Panel

- Future activity catalog default open: false
- Hidden from default warnings: true
- Source of truth: src/lib/debug/future-activity-classifier.ts

## Old Logic Classification

- agent/state/activity-verification-engine.generated.json: still_required
- agent/state/analytics-panel-hydration.generated.json: still_required
- agent/state/current-beta-exit-status.generated.json: still_required
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: still_required
- agent/state/debug-signal-grouping.generated.json: still_required
- agent/state/event-liveness-audit.generated.json: still_required
- agent/state/event-translation-bridge.generated.json: still_required
- agent/state/evidence-capture-status.generated.json: still_required
- agent/state/final-signal-zero-lock.generated.json: still_required
- agent/state/final-testing-tracking-telemetry-lock.generated.json: still_required
- agent/state/future-activity-signal-reclassification.generated.json: still_required
- agent/state/non-event-score-policy.generated.json: still_required
- agent/state/person-metrics-hydration.generated.json: still_required
- agent/state/public-beta-score.generated.json: still_required
- docs/agent-truth/current-beta-exit-status.md: still_required
- docs/agent-truth/debug-backlog-engine.md: quiet_catalog_only
- docs/agent-truth/debug-signal-actionability.md: quiet_catalog_only
- docs/agent-truth/debug-signal-grouping.md: quiet_catalog_only
- docs/agent-truth/event-translation-bridge.md: still_required
- docs/agent-truth/evidence-capture-status.md: still_required
- docs/agent-truth/final-signal-zero-lock.md: quiet_catalog_only
- docs/agent-truth/final-testing-tracking-telemetry-lock.md: still_required
- docs/agent-truth/future-activity-catalog-status-cleanup.md: still_required
- docs/agent-truth/future-activity-signal-reclassification.md: still_required
- docs/agent-truth/non-event-score-policy.md: quiet_catalog_only
- docs/agent-truth/person-metrics-hydration.md: still_required
- scripts/agent/score-public-beta-readiness.ts: still_required
- scripts/agent/validate-debug-backlog-engine.ts: quiet_catalog_only
- scripts/agent/validate-debug-signal-actionability.ts: quiet_catalog_only
- scripts/agent/validate-debug-signal-grouping.ts: quiet_catalog_only
- scripts/agent/validate-event-liveness-audit.ts: quiet_catalog_only
- scripts/agent/validate-event-translation-bridge.ts: still_required
- scripts/agent/validate-evidence-capture-status.ts: still_required
- scripts/agent/validate-final-signal-zero-lock.ts: quiet_catalog_only
- scripts/agent/validate-final-testing-tracking-telemetry-lock.ts: still_required
- scripts/agent/validate-future-activity-catalog-status-cleanup.ts: quiet_catalog_only
- scripts/agent/validate-future-activity-signal-reclassification.ts: still_required
- scripts/agent/validate-non-event-score-policy.ts: quiet_catalog_only
- scripts/agent/validate-person-metrics-hydration.ts: still_required
- scripts/agent/validate-telemetry-trigger-test-matrix.ts: still_required
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx: quiet_catalog_only
- src/lib/admin-analytics/panel-hydration-contract.ts: still_required
- src/lib/admin-analytics/panel-hydration-resolver.ts: still_required
- src/lib/agent-score/core.ts: quiet_catalog_only
- src/lib/agent-score/non-event-score-policy.ts: quiet_catalog_only
- src/lib/agent-score/score-dimension-80-lock.ts: still_required
- src/lib/analytics/activity-verification-engine.ts: still_required
- src/lib/analytics/event-liveness-contract.ts: still_required
- src/lib/analytics/event-liveness-engine.ts: quiet_catalog_only
- src/lib/analytics/event-translation-bridge.ts: still_required
- src/lib/analytics/person-metrics-hydration.ts: still_required
- src/lib/debug/debug-backlog-builder.ts: quiet_catalog_only
- src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts: still_required
- src/lib/debug/debug-panel-tracking-summary.ts: still_required
- src/lib/debug/debug-signal-actionability.ts: quiet_catalog_only
- src/lib/debug/debug-signal-grouping.ts: quiet_catalog_only
- src/lib/identity-truth/analytic-algorithm-audit.ts: still_required
- src/lib/release-readiness/live-evidence-gate-contract.ts: still_required
- src/lib/release-readiness/live-evidence-resolver.ts: still_required
- src/lib/release-readiness/live-panel-evidence-resolver.ts: still_required
- src/lib/tasks/task-guidance-history-recovery.ts: still_required
- src/lib/tasks/task-guidance-telemetry-contract.ts: still_required
- tests/unit/analytics-panel-hydration.spec.ts: still_required
- tests/unit/current-beta-exit-status.spec.ts: still_required
- tests/unit/debug-cockpit-batch31-task-guidance-parity.spec.ts: still_required
- tests/unit/debug-signal-actionability.spec.ts: quiet_catalog_only
- tests/unit/debug-signal-grouping.spec.ts: quiet_catalog_only
- tests/unit/event-liveness-audit.spec.ts: still_required
- tests/unit/event-translation-bridge.spec.ts: still_required
- tests/unit/final-signal-zero-lock.spec.ts: quiet_catalog_only
- tests/unit/final-testing-tracking-telemetry-lock.spec.ts: still_required
- tests/unit/future-activity-catalog-status-cleanup.spec.ts: quiet_catalog_only
- tests/unit/future-activity-signal-reclassification.spec.ts: still_required
- tests/unit/live-evidence-gate-replacement.spec.ts: still_required
- tests/unit/non-event-score-policy.spec.ts: quiet_catalog_only
- tests/unit/score-dimension-80-lock.spec.ts: still_required

## Dirty Files

- agent/state/ai-critic-p1-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/ai-debug-critic.generated.json: stale_generated_artifact_to_regenerate
- agent/state/blocked-refresh-queue-resolver.generated.json: stale_generated_artifact_to_regenerate
- agent/state/future-activity-signal-reclassification.generated.json: current_generated_artifact_to_commit
- agent/state/score-80-refresh-queue-execution.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/ai-critic-p1-triage.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/blocked-refresh-queue-resolver.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/future-activity-signal-reclassification.md: documentation_artifact_expected
- docs/agent-truth/score-80-refresh-queue-execution.md: stale_generated_artifact_to_regenerate
- scripts/agent/validate-blocked-refresh-queue-resolver.ts: validator_artifact_expected
- scripts/agent/validate-future-activity-signal-reclassification.ts: validator_artifact_expected
- scripts/agent/validate-score-80-refresh-queue-execution.ts: validator_artifact_expected
- src/lib/debug/ai-critic-p1-triage.ts: real_source_change_needs_review
- src/lib/debug/ai-debug-critic-rules.ts: real_source_change_needs_review
- src/lib/debug/ai-debug-critic.ts: real_source_change_needs_review
- src/lib/debug/future-activity-classifier.ts: real_source_change_needs_review
- tests/unit/ai-critic-p1-triage.spec.ts: test_artifact_expected
- tests/unit/ai-debug-critic.spec.ts: test_artifact_expected
- tests/unit/blocked-refresh-queue-resolver.spec.ts: test_artifact_expected
- tests/unit/score-80-refresh-queue-execution.spec.ts: test_artifact_expected

## Validation Failures

- none

# Future Activity Signal Reclassification

Generated: 2026-05-23T19:59:10.849Z
Status: pass
Current head: 1eeb1b65ff5a54ae0549e6be3550413c566289db

## Contract

- Source-ready future activity placeholders are quiet catalog entries, not active debug warnings.
- Missing producers, bridges, materializers, metric consumers, and debug mappings remain actionable.
- Formal provider, runtime, and admin evidence gates stay separate from activity signal lists.
- This pass does not fake activity, read production data, mutate legacy data, or clear formal gates.

## Activity Signal Counts

- Total signals: 416
- Actionable activity signals: 0
- Quiet future activity: 416
- Broken activity paths: 0
- Score-drag activity: 0
- Evidence-gate-only signals: 0

## Score Dimensions

- sourceHealth: 91.7 -> 91.7; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 67.75 -> 67.75; target=80; status=below_target; next=Capture formal runtime/provider smoke evidence; local source validators must not be promoted to runtime proof.
- evidenceCompleteness: 39.25 -> 39.25; target=80; status=below_target; next=Attach or refresh formal provider, runtime, admin-truth, and stale report evidence without faking activity.
- freshness: 62.86 -> 62.86; target=80; status=below_target; next=Refresh stale generated reports listed in the public beta score refresh plan, then rerun score:beta and check:beta-score.
- costRisk: 42 -> 42; target=80; status=below_target; next=Complete the remaining owner-reviewed cost readiness lanes; keep the final lock source-only with no production reads.
- regressionRisk: 42 -> 42; target=80; status=below_target; next=Resolve stale/formal regression evidence gates with targeted validators before treating the release as score-80 locked.
- overallHealthScore: 62.15 -> 62.15; target=80; status=below_target; next=Complete every below-target dimension next action, then rerun score:beta and check:beta-score.

## Debug Panel

- Future activity catalog default open: false
- Hidden from default warnings: true
- Source of truth: src/lib/debug/future-activity-classifier.ts

## Old Logic Classification

- agent/state/activity-verification-engine.generated.json: still_required
- agent/state/event-translation-bridge.generated.json: still_required
- agent/state/final-testing-tracking-telemetry-lock.generated.json: still_required
- agent/state/future-activity-signal-reclassification.generated.json: still_required
- agent/state/person-metrics-hydration.generated.json: still_required
- docs/agent-truth/debug-backlog-engine.md: quiet_catalog_only
- docs/agent-truth/event-translation-bridge.md: still_required
- docs/agent-truth/final-testing-tracking-telemetry-lock.md: still_required
- docs/agent-truth/future-activity-signal-reclassification.md: still_required
- docs/agent-truth/person-metrics-hydration.md: still_required
- scripts/agent/validate-debug-backlog-engine.ts: quiet_catalog_only
- scripts/agent/validate-event-translation-bridge.ts: still_required
- scripts/agent/validate-final-testing-tracking-telemetry-lock.ts: still_required
- scripts/agent/validate-future-activity-signal-reclassification.ts: still_required
- scripts/agent/validate-person-metrics-hydration.ts: still_required
- scripts/agent/validate-telemetry-trigger-test-matrix.ts: still_required
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx: quiet_catalog_only
- src/lib/analytics/activity-verification-engine.ts: still_required
- src/lib/analytics/event-translation-bridge.ts: still_required
- src/lib/analytics/person-metrics-hydration.ts: still_required
- src/lib/debug/debug-backlog-builder.ts: quiet_catalog_only
- src/lib/debug/debug-panel-tracking-summary.ts: still_required
- src/lib/release-notes/public-release-notes.ts: quiet_catalog_only
- tests/unit/event-translation-bridge.spec.ts: still_required
- tests/unit/final-testing-tracking-telemetry-lock.spec.ts: still_required
- tests/unit/future-activity-signal-reclassification.spec.ts: still_required

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/future-activity-signal-reclassification.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/debug-backlog-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/future-activity-signal-reclassification.md: documentation_artifact_expected
- package.json: validator_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-debug-backlog-engine.ts: validator_artifact_expected
- scripts/agent/validate-debug-signal-actionability.ts: validator_artifact_expected
- scripts/agent/validate-future-activity-signal-reclassification.ts: validator_artifact_expected
- src/lib/debug/debug-backlog-builder.ts: real_source_change_needs_review
- src/lib/debug/debug-backlog-contract.ts: real_source_change_needs_review
- src/lib/debug/debug-signal-actionability.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/debug-backlog-engine.spec.ts: test_artifact_expected
- tests/unit/debug-signal-actionability.spec.ts: test_artifact_expected

## Validation Failures

- none

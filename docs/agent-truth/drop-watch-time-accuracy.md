# Drop Watch Time Accuracy

Generated: 2026-05-25T07:10:33.785Z
Status: pass
Current head: 8f5b66d4c5465ac057ea542614a5b8d01c5d3c43

## Contract

- Watch time starts after actual drop media/content exposure, not page load.
- Video and audio watch time uses active playback while foreground and visible.
- Image watch time uses active visible dwell, with passive visible/page-open time separated.
- Background and hidden tab intervals are excluded.
- Completion is normalized against content duration and capped per play unless replay is counted separately.
- Unknown duration is weak or unavailable evidence, never exact media runtime proof.

## Debug Lane

- Label: Drop watch time
- Exact media runtime count: 1
- Active visibility estimated count: 1
- Duration missing count: 1
- Background excluded count: 2
- Suspicious page-time fallback count: 0

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No drop watch-time score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No drop watch-time score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| freshness | 75.63 | 75.63 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| regressionRisk | 86 | 86 | target_met | No drop watch-time score action needed for this dimension. |
| overallHealthScore | 77.83 | 77.83 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |

## Dirty Files

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/server-unlock-telemetry-emission.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-rollup-reconciliation.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-journey-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-validation-semantics.generated.json: current_generated_artifact_to_commit
- agent/state/viewer-start-telemetry-repair.generated.json: current_generated_artifact_to_commit
- agent/state/watch-capture-quality-threshold.generated.json: current_generated_artifact_to_commit
- agent/state/watch-session-fact-link-repair.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/debug-cockpit-batch33-unlock-watch-parity.md: documentation_artifact_expected
- docs/agent-truth/drop-watch-time-accuracy.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/server-unlock-telemetry-emission.md: documentation_artifact_expected
- docs/agent-truth/unlock-rollup-reconciliation.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-journey-normalization.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-validation-semantics.md: documentation_artifact_expected
- docs/agent-truth/viewer-start-telemetry-repair.md: documentation_artifact_expected
- docs/agent-truth/watch-capture-quality-threshold.md: documentation_artifact_expected
- docs/agent-truth/watch-session-fact-link-repair.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- scripts/agent/validate-debug-cockpit-batch33-unlock-watch-parity.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-person-metrics-hydration.ts: validator_artifact_expected
- scripts/agent/validate-server-unlock-telemetry-emission.ts: validator_artifact_expected
- scripts/agent/validate-unlock-rollup-reconciliation.ts: validator_artifact_expected
- scripts/agent/validate-unlock-telemetry-truth.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-journey-normalization.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-validation-semantics.ts: validator_artifact_expected
- scripts/agent/validate-viewer-start-telemetry-repair.ts: validator_artifact_expected
- scripts/agent/validate-watch-capture-quality-threshold.ts: validator_artifact_expected
- scripts/agent/validate-watch-session-fact-link-repair.ts: validator_artifact_expected
- src/app/api/admin/analytics/historical/route.ts: unlock_watch_validation_semantics_required
- src/app/api/drops/unlock/route.ts: server_unlock_telemetry_required
- src/app/api/viewer/watch-session/route.ts: viewer_start_telemetry_required
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/viewer-start-telemetry-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-capture-quality-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-session-fact-linker.ts: real_source_change_needs_review
- src/lib/behavioral/unlock-watch-journey-normalization.ts: real_source_change_needs_review
- src/lib/commerce/unlock-rollup-reconciliation.ts: real_source_change_needs_review
- src/lib/commerce/unlock-watch-parity-contract.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: unlock_watch_validation_semantics_required
- tests/unit/debug-cockpit-batch33-unlock-watch-parity.spec.ts: test_artifact_expected
- tests/unit/server-unlock-telemetry-emission.spec.ts: test_artifact_expected
- tests/unit/unlock-rollup-reconciliation.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-journey-normalization.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-validation-semantics.spec.ts: test_artifact_expected
- tests/unit/viewer-start-telemetry-repair.spec.ts: test_artifact_expected
- tests/unit/watch-capture-quality-threshold.spec.ts: test_artifact_expected
- tests/unit/watch-session-fact-link-repair.spec.ts: test_artifact_expected

## Validation Failures

- none

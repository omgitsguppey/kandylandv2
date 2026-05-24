# Drop Watch Time Accuracy

Generated: 2026-05-24T10:14:13.425Z
Status: pass
Current head: 31e63bcd84b39f29e01b21d3fb2d3770eb1bc60e

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
| sourceHealth | 92.5 | 92.5 | target_met | No drop watch-time score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No drop watch-time score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| freshness | 83.75 | 83.75 | target_met | No drop watch-time score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| regressionRisk | 86 | 86 | target_met | No drop watch-time score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-trigger-test-matrix.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/drop-watch-time-accuracy.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- src/hooks/useViewerWatchSession.ts: real_source_change_needs_review
- src/lib/analytics/drop-watch-time-contract.ts: real_source_change_needs_review
- src/lib/analytics/drop-watch-time-engine.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/drop-watch-time-accuracy.spec.ts: test_artifact_expected

## Validation Failures

- none

# Drop Watch Time Accuracy

Generated: 2026-05-26T06:12:45.024Z
Status: pass
Current head: c84694d7f546c25f68639db1ed4680dab9abaccb

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
| sourceHealth | 100 | 100 | target_met | No drop watch-time score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No drop watch-time score action needed for this dimension. |
| evidenceCompleteness | 84.6 | 84.6 | target_met | No drop watch-time score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No drop watch-time score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside drop watch-time math; do not fake runtime/provider evidence. |
| regressionRisk | 86 | 86 | target_met | No drop watch-time score action needed for this dimension. |
| overallHealthScore | 85.34 | 85.34 | target_met | No drop watch-time score action needed for this dimension. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/canonical-math-authority-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/duration-math-normalization.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/canonical-math-authority-ledger.md: documentation_artifact_expected
- docs/agent-truth/drop-watch-time-accuracy.md: release_artifact_expected
- docs/agent-truth/duration-math-normalization.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-canonical-math-authority-ledger.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-duration-math-normalization.ts: validator_artifact_expected
- scripts/agent/validate-session-bounce-calculation.ts: validator_artifact_expected
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/math/canonical-math-authority-contract.ts: real_source_change_needs_review
- src/lib/math/canonical-math-authority-ledger.ts: real_source_change_needs_review
- src/lib/math/duration-math-normalizer.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/duration-math-normalization.spec.ts: test_artifact_expected

## Validation Failures

- none

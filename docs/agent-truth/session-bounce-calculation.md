# Session Bounce Calculation

Generated: 2026-05-26T06:12:47.487Z
Status: pass
Current head: c84694d7f546c25f68639db1ed4680dab9abaccb

## Contract

- Inactivity threshold: 1800000ms.
- Activity tick throttle: 15000ms.
- Active session time requires foreground user interaction or meaningful events.
- Hidden/background time is excluded from active time.
- Bounce classification is not one-page-only; meaningful unwrap/watch/click behavior prevents a bounce.
- Guest-to-user handoff preserves session continuity and suppresses duplicate counting.
- Missing closeouts are estimated with explicit confidence and endReason.

## Debug Lane

- Label: Session/bounce
- Active sessions: 1
- Idle sessions: 1
- Missing closeouts: 1
- Bounce classified: 2
- Hidden time excluded: 1
- Guest/user link: mapped

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 100 | 100 | target_met | No session/bounce score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No session/bounce score action needed for this dimension. |
| evidenceCompleteness | 84.6 | 84.6 | target_met | No session/bounce score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No session/bounce score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside session/bounce math; do not fake activity or runtime evidence. |
| regressionRisk | 86 | 86 | target_met | No session/bounce score action needed for this dimension. |
| overallHealthScore | 85.34 | 85.34 | target_met | No session/bounce score action needed for this dimension. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/canonical-math-authority-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/duration-math-normalization.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/canonical-math-authority-ledger.md: documentation_artifact_expected
- docs/agent-truth/drop-watch-time-accuracy.md: stale_generated_artifact_to_regenerate
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

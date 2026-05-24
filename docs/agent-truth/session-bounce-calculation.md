# Session Bounce Calculation

Generated: 2026-05-24T10:36:41.214Z
Status: pass
Current head: 7594711347e5902fd476e64b4b276d9c175429de

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
| sourceHealth | 92.5 | 92.5 | target_met | No session/bounce score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No session/bounce score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside session/bounce math; do not fake activity or runtime evidence. |
| freshness | 83.75 | 83.75 | target_met | No session/bounce score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside session/bounce math; do not fake activity or runtime evidence. |
| regressionRisk | 86 | 86 | target_met | No session/bounce score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Resolve formal beta score gates outside session/bounce math; do not fake activity or runtime evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/global-user-dedupe-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/session-bounce-calculation.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-trigger-test-matrix.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/global-user-dedupe-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/session-bounce-calculation.md: documentation_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-global-user-dedupe-normalization.ts: validator_artifact_expected
- scripts/agent/validate-session-bounce-calculation.ts: validator_artifact_expected
- src/components/Analytics/DeepTracker.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/session-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/session-metrics-engine.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-contract.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/session-bounce-calculation.spec.ts: test_artifact_expected

## Validation Failures

- none

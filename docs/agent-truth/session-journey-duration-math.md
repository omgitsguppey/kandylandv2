# Session Journey Duration Math

Generated: 2026-05-26T10:33:30.413Z
Current head: 9fd4c85c9501f272c720d8fab25a142bd3534e43
Status: pass

## Contract

- Session inactivity timeout: 1800000ms.
- Active foreground activity window: 30000ms.
- Hidden/background time is excluded from active time.
- Idle begins after 30 seconds without meaningful interaction.
- Bounce requires one route, no meaningful interaction, activeMs < 10000, no conversion, and non-unknown closeout.
- Unknown closeout downgrades confidence and does not auto-count as bounce.
- Guest-to-user handoff preserves continuity in the same session or within five minutes of auth transition.

## Debug Lane

- Label: Session math
- Unknown closeouts: 1
- Hidden time excluded: 1
- Bounce classifications: 1
- Guest/user continuity links: 1

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/session-journey-duration-math.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/session-journey-duration-math.md: current_generated_artifact_to_commit
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-session-bounce-calculation.ts: validator_artifact_expected
- scripts/agent/validate-session-journey-duration-math.ts: validator_artifact_expected
- scripts/agent/validate-user-journey-behavioral-intelligence.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/session-metrics-engine.ts: real_source_change_needs_review
- src/lib/behavioral/user-journey-builder.ts: real_source_change_needs_review
- src/lib/math/session-journey-math.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/session-journey-duration-math.spec.ts: test_artifact_expected

## Validation Failures

- none

# User Journey Behavioral Intelligence

Generated: 2026-05-24T10:56:47.853Z
Status: pass
Current head: b63c3c0703de9b462bdd84b1a79c227cb4e6c59a

## Contract

- Journey events are normalized summaries, not raw telemetry payload dumps.
- Each event keeps who, what, when, where, how, and how-long fields.
- Identity confidence, session continuity, active duration, and privacy class remain explicit.
- Payment/provider/chat/private content is redacted before behavioral intelligence receives data.
- Behavioral intelligence receives compact batched summaries with low-importance firehose events dropped.
- Core funnels are source-ready: landing/signup, signup/unwrap, wallet/payment, drop/watch, creator/Fan Pass/chat/follow, notifications, daily tasks, and chat outcomes.

## Debug Lane

- Label: User journey
- Builder connected: true
- Broken segments: 0
- Missing next actions: 0
- Top funnels source-ready: 8
- Cost guard: batched_rollup

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 92.5 | 92.5 | target_met | No user journey score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No user journey score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| freshness | 83.75 | 83.75 | target_met | No user journey score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| regressionRisk | 86 | 86 | target_met | No user journey score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/user-journey-behavioral-intelligence.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/user-journey-behavioral-intelligence.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-user-journey-behavioral-intelligence.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-contract.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/behavioral/user-journey-builder.ts: real_source_change_needs_review
- src/lib/behavioral/user-journey-contract.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/user-journey-behavioral-intelligence.spec.ts: test_artifact_expected

## Validation Failures

- none

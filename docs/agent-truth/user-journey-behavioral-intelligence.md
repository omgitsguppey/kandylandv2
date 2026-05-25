# User Journey Behavioral Intelligence

Generated: 2026-05-25T08:24:06.598Z
Status: pass
Current head: e53968ae1b6975aa492461625f7fd76133493226

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
| sourceHealth | 91.7 | 91.7 | target_met | No user journey score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No user journey score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| freshness | 75.63 | 75.63 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| regressionRisk | 86 | 86 | target_met | No user journey score action needed for this dimension. |
| overallHealthScore | 77.83 | 77.83 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/behavior-math-verification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-normalization-internals.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-task-telemetry-ui-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavioral-intelligence-snapshot-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/experiment-rollout-registry-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-window-zero-shell-classifier.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-catalog-runtime-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-telemetry-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-telemetry-mapping-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-parity-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-truth-recovery-formulas.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-journey-behavioral-intelligence.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/behavior-normalization-internals.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavior-task-telemetry-ui-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavioral-intelligence-snapshot-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch35-behavior-stack.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/experiment-rollout-registry-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-window-zero-shell-classifier.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-catalog-runtime-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-telemetry-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-telemetry-mapping-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-truth-recovery-formulas.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-journey-behavioral-intelligence.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-behavior-normalization-internals.ts: validator_artifact_expected
- scripts/agent/validate-behavior-task-telemetry-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-behavioral-intelligence-snapshot-truth.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch35-behavior-stack.ts: validator_artifact_expected
- scripts/agent/validate-experiment-rollout-registry-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-source-window-zero-shell-classifier.ts: validator_artifact_expected
- scripts/agent/validate-task-catalog-runtime-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-task-telemetry-mapping-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-truth-recovery-formulas.ts: validator_artifact_expected
- scripts/agent/validate-user-journey-behavioral-intelligence.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedBehavior.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedDrift.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedExperiments.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTelemetry.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTruth.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugPrimitives.tsx: real_source_change_needs_review
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-truth-recovery-formulas.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-truth-recovery-status.ts: real_source_change_needs_review
- src/lib/behavioral/behavior-normalization-internals-contract.ts: real_source_change_needs_review
- src/lib/behavioral/behavior-normalization-internals-engine.ts: real_source_change_needs_review
- src/lib/behavioral/behavioral-intelligence-snapshot-contract.ts: real_source_change_needs_review
- src/lib/behavioral/behavioral-intelligence-snapshot-status.ts: real_source_change_needs_review
- src/lib/debug/source-window-zero-shell-classifier.ts: real_source_change_needs_review
- src/lib/experiments/experiment-rollout-registry-contract.ts: real_source_change_needs_review
- src/lib/experiments/experiment-rollout-registry-status.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/tasks/task-catalog-coverage-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-catalog-coverage-engine.ts: real_source_change_needs_review
- src/lib/tasks/task-runtime-sample-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-telemetry-mapping-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-telemetry-mapping-engine.ts: real_source_change_needs_review
- tests/unit/behavior-normalization-internals.spec.ts: test_artifact_expected
- tests/unit/behavior-task-telemetry-ui-cleanup.spec.ts: test_artifact_expected
- tests/unit/behavioral-intelligence-snapshot-truth.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch35-behavior-stack.spec.ts: test_artifact_expected
- tests/unit/experiment-rollout-registry-reconstruction.spec.ts: test_artifact_expected
- tests/unit/source-window-zero-shell-classifier.spec.ts: test_artifact_expected
- tests/unit/task-catalog-runtime-reconstruction.spec.ts: test_artifact_expected
- tests/unit/task-telemetry-mapping-reconstruction.spec.ts: test_artifact_expected
- tests/unit/telemetry-truth-recovery-formulas.spec.ts: test_artifact_expected

## Validation Failures

- none

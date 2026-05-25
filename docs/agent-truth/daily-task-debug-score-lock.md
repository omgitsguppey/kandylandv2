# Daily Task Debug Score Lock

Generated: 2026-05-25T08:21:21.319Z
Current head: e53968ae

## Lock Status

- Reset truth: pass
- Lifecycle telemetry: pass
- Duration tracking: active_duration_only
- Reward ledger: pass
- Guidance routes: pass
- Task failure debug: present
- Task person metrics: present
- Task score coverage: present
- Reward GD source truth: reward_gd_only
- Unknown legacy task count: 0
- Duplicate reward risk count: 0
- Active task route mismatch count: 0
- Active task missing completion signal count: 0

## Debug Lanes

- Daily tasks/reset: present (daily-task-reset-truth)
- Daily task lifecycle: present (daily-task-lifecycle-telemetry)
- Daily task reward ledger: present (daily-task-reward-ledger)
- Task guidance health: present (daily-task-guidance-route-audit)

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No daily-task score action needed for this dimension. |
| runtimeHealth | 66.25 | 84.2 | target_met | No daily-task score action needed for this dimension. |
| evidenceCompleteness | 37.75 | 69.6 | below_target | Complete formal beta evidence gates and keep daily task generated reports fresh. |
| freshness | 62.86 | 75.63 | below_target | Refresh stale score-impacting artifacts with targeted validators. |
| costRisk | 42 | 42 | below_target | Resolve owner-review cost lanes without touching payment or GumDrop paid math. |
| regressionRisk | 42 | 86 | target_met | No daily-task score action needed for this dimension. |
| overallHealthScore | 61.55 | 77.83 | below_target | Raise below-target component dimensions before treating overall health as solved. |

## Remaining Gaps

- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- costRisk below 80: Resolve owner-review cost lanes without touching payment or GumDrop paid math.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Next Exact Steps

- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- costRisk below 80: Resolve owner-review cost lanes without touching payment or GumDrop paid math.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Old Task Logic Classification

- unknown_legacy reset handling: still_required - Legacy reset anchors remain explicitly unavailable instead of claimable truth.
- passive page time duration: stale_removed - Task lifecycle report requires active start/attempt duration and rejects passive page time.
- unfiltered task guidance rendering: superseded - Guidance route audit filters unsupported active tasks before rendering/claiming.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/behavior-math-verification.generated.json: current_generated_artifact_to_commit
- agent/state/behavior-normalization-internals.generated.json: current_generated_artifact_to_commit
- agent/state/behavior-task-telemetry-ui-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/behavioral-intelligence-snapshot-truth.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-debug-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: current_generated_artifact_to_commit
- agent/state/experiment-rollout-registry-reconstruction.generated.json: current_generated_artifact_to_commit
- agent/state/source-window-zero-shell-classifier.generated.json: current_generated_artifact_to_commit
- agent/state/task-catalog-runtime-reconstruction.generated.json: current_generated_artifact_to_commit
- agent/state/task-telemetry-mapping-reconstruction.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-truth-recovery-formulas.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/behavior-normalization-internals.md: documentation_artifact_expected
- docs/agent-truth/behavior-task-telemetry-ui-cleanup.md: documentation_artifact_expected
- docs/agent-truth/behavioral-intelligence-snapshot-truth.md: documentation_artifact_expected
- docs/agent-truth/daily-task-debug-score-lock.md: documentation_artifact_expected
- docs/agent-truth/debug-cockpit-batch35-behavior-stack.md: documentation_artifact_expected
- docs/agent-truth/experiment-rollout-registry-reconstruction.md: documentation_artifact_expected
- docs/agent-truth/source-window-zero-shell-classifier.md: documentation_artifact_expected
- docs/agent-truth/task-catalog-runtime-reconstruction.md: documentation_artifact_expected
- docs/agent-truth/task-telemetry-mapping-reconstruction.md: documentation_artifact_expected
- docs/agent-truth/telemetry-truth-recovery-formulas.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-behavior-normalization-internals.ts: validator_artifact_expected
- scripts/agent/validate-behavior-task-telemetry-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-behavioral-intelligence-snapshot-truth.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch35-behavior-stack.ts: validator_artifact_expected
- scripts/agent/validate-experiment-rollout-registry-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-source-window-zero-shell-classifier.ts: validator_artifact_expected
- scripts/agent/validate-task-catalog-runtime-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-task-telemetry-mapping-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-truth-recovery-formulas.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedBehavior.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedDrift.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedExperiments.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTelemetry.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTruth.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugPrimitives.tsx: real_source_change_needs_review
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
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

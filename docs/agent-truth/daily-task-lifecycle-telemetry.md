# Daily Task Lifecycle Telemetry

Generated: 2026-05-25T08:22:14.613Z
Current HEAD: e53968ae

## Lifecycle

- daily_task_surface_viewed
- daily_task_card_viewed
- daily_task_guidance_opened
- daily_task_started
- daily_task_action_attempted
- daily_task_completed
- daily_task_reward_granted
- daily_task_failed
- daily_task_abandoned
- daily_task_reset_locked
- daily_task_next_eligible_viewed

## Duration Truth

- Passive page time rejected: true
- Abandonment classification: true
- Reward source: reward_gd_only
- Reward granted server truth: true

## Person Metrics

- daily_task_views: present=true; hydrated=2; events=daily_task_surface_viewed, daily_task_card_viewed, daily_tasks_viewed
- daily_task_starts: present=true; hydrated=1; events=daily_task_started
- daily_task_completions: present=true; hydrated=1; events=daily_task_completed, task_completed, daily_checkin_claimed
- daily_task_failures: present=true; hydrated=1; events=daily_task_failed
- daily_task_rewards_granted: present=true; hydrated=1; events=daily_task_reward_granted, daily_task_claimed
- daily_task_average_duration: present=true; hydrated=3; events=daily_task_completed, daily_task_failed, daily_task_abandoned
- daily_task_abandonments: present=true; hydrated=1; events=daily_task_abandoned
- daily_task_reset_locked_views: present=true; hydrated=2; events=daily_task_reset_locked, daily_task_next_eligible_viewed

## Debug Lane

- Lane: Daily task lifecycle
- Status: review
- Duration unavailable: 1

## Score Impact

- sourceHealth: Daily task lifecycle events are cataloged and mapped to task/person metric sources.
- runtimeHealth: No production/provider proof is claimed; route metadata stays server-truth compatible.
- evidenceCompleteness: Adds validator, report, debug lane, and deterministic duration tests.
- freshness: Refreshes the lifecycle report with the current HEAD and beta score artifact.
- costRisk: No production reads; lifecycle telemetry uses existing event paths and bounded local validators.
- regressionRisk: Adds red-green unit coverage for active duration and reward-source separation.
- overallHealthScore: Improves task lifecycle evidence without clearing formal external gates.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/behavior-math-verification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-normalization-internals.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-task-telemetry-ui-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavioral-intelligence-snapshot-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: stale_generated_artifact_to_regenerate
- agent/state/experiment-rollout-registry-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-window-zero-shell-classifier.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-catalog-runtime-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-telemetry-mapping-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-truth-recovery-formulas.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavior-normalization-internals.md: documentation_artifact_expected
- docs/agent-truth/behavior-task-telemetry-ui-cleanup.md: documentation_artifact_expected
- docs/agent-truth/behavioral-intelligence-snapshot-truth.md: documentation_artifact_expected
- docs/agent-truth/daily-task-debug-score-lock.md: documentation_artifact_expected
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
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
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
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

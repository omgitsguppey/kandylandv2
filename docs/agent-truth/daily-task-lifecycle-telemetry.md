# Daily Task Lifecycle Telemetry

Generated: 2026-05-25T06:15:15.677Z
Current HEAD: ccf36528

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
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-event-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-history-recovery.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-telemetry-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-ui-instrumentation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-onboarding-parity-semantics.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: documentation_artifact_expected
- docs/agent-truth/daily-task-guidance-route-audit.md: documentation_artifact_expected
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reward-ledger.md: documentation_artifact_expected
- docs/agent-truth/debug-cockpit-batch31-task-guidance-parity.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-event-normalization.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-history-recovery.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-telemetry-contract.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-ui-instrumentation.md: documentation_artifact_expected
- docs/agent-truth/task-onboarding-parity-semantics.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/task-guidance-batch31-shared.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-guidance-route-audit.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reward-ledger.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch31-task-guidance-parity.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-event-normalization.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-history-recovery.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-telemetry-contract.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-ui-instrumentation.ts: validator_artifact_expected
- scripts/agent/validate-task-onboarding-parity-semantics.ts: validator_artifact_expected
- src/components/Dashboard/DailyTasksModule.tsx: real_source_change_needs_review
- src/components/Dashboard/TaskGuidanceBanner.tsx: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/task-onboarding-parity-semantics.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts: real_source_change_needs_review
- src/lib/privacy/consent-tracking-policy.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-tasks.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/lib/task-guidance.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-history-recovery.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-telemetry-contract.ts: real_source_change_needs_review
- tests/unit/debug-cockpit-batch31-task-guidance-parity.spec.ts: test_artifact_expected
- tests/unit/task-guidance-event-normalization.spec.ts: test_artifact_expected
- tests/unit/task-guidance-history-recovery.spec.ts: test_artifact_expected
- tests/unit/task-guidance-telemetry-contract.spec.ts: test_artifact_expected
- tests/unit/task-guidance-ui-instrumentation.spec.ts: test_artifact_expected
- tests/unit/task-onboarding-parity-semantics.spec.ts: test_artifact_expected

## Validation Failures

- none

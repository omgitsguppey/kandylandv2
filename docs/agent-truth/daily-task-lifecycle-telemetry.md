# Daily Task Lifecycle Telemetry

Generated: 2026-05-24T03:06:31.276Z
Current HEAD: b24ad4bc

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
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reset-truth.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reset-truth.ts: validator_artifact_expected
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/app/api/checkin/route.ts: real_source_change_needs_review
- src/components/Dashboard/DailyCheckIn.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-contract.ts: real_source_change_needs_review
- src/lib/behavioral/event-fact-normalizer.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-debug/summary.ts: real_source_change_needs_review
- src/lib/tasks/daily-task-contract.ts: real_source_change_needs_review
- src/lib/tasks/daily-task-duration.ts: real_source_change_needs_review
- src/lib/tasks/daily-task-telemetry.ts: real_source_change_needs_review
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/daily-task-lifecycle-telemetry.spec.ts: test_artifact_expected
- tests/unit/user-management-refactor.spec.ts: test_artifact_expected

## Validation Failures

- none

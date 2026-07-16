# Daily Task Lifecycle Telemetry

Generated: 2026-07-16T04:25:18.807Z
Current HEAD: 621afada2aea0ef269a02c7ac68d4424bfce5214

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

- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: documentation_artifact_expected

## Validation Failures

- none

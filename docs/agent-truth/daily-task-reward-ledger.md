# Daily Task Reward Ledger

Generated: 2026-05-25T06:14:56.725Z
Current head: ccf36528
Status: pass

## Contract

- Reward source: task_reward
- Source of funds: reward_gd
- Ledger destination: gumDropsRewardBalance
- Duplicate policy: block_within_reset_window
- Paid creator experiences, paid chat, and Fan Pass start/renewal are blocked for task reward GD.

## Route Wiring

- Check-in deterministic grant id: true
- Check-in source explanation: true
- Daily task deterministic grant id: true
- Daily task reward balance credit: true

## Debug Lane

- Lane: Daily task reward ledger
- Status: live
- Ledger source: transactions.daily_reward
- Source of funds: reward_gd
- Blocked duplicates: 1

## Score Impact

- sourceHealth: before=0; after=0; Task reward grants now have explicit reward_gd source-of-funds metadata.
- runtimeHealth: before=0; after=0; Reward grants use deterministic ids and transaction-scoped writes without production reads.
- evidenceCompleteness: before=0; after=0; Ledger report documents taskId, resetWindowId, idempotencyKey, duplicate policy, and debug lane.
- freshness: before=0; after=0; Daily task reward ledger state/doc generated with current HEAD.
- costRisk: before=0; after=0; Validator is source-only; no production reads or broad ledger scans.
- regressionRisk: before=0; after=0; Unit tests and source-of-funds validators guard reward-vs-paid classification.
- overallHealthScore: before=0; after=0; Score remains bounded by external beta evidence gates, not task reward ledger wiring.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-event-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-history-recovery.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-telemetry-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-ui-instrumentation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-onboarding-parity-semantics.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch31-task-guidance-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-event-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-history-recovery.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-telemetry-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-ui-instrumentation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-onboarding-parity-semantics.md: stale_generated_artifact_to_regenerate
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

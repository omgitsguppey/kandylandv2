# Daily Task Reward Ledger

Generated: 2026-05-24T03:57:57.649Z
Current head: 6a7ba11a
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
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-trigger-test-matrix.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-guidance-route-audit.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reset-truth.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reward-ledger.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/daily-task-debug-score-lock.spec.ts: test_artifact_expected

## Validation Failures

- none

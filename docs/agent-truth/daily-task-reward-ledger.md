# Daily Task Reward Ledger

Generated: 2026-07-16T04:25:21.078Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
Status: pass
Source status: pass

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

- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate

## Validation Failures

- none

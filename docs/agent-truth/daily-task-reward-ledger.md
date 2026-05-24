# Daily Task Reward Ledger

Generated: 2026-05-24T22:49:54.715Z
Current head: 650b22a8
Status: fail

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

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/debug-cockpit-batch22-commerce-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/recent-transaction-feed-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/transaction-sequence-journey.generated.json: stale_generated_artifact_to_regenerate
- agent/state/unlock-transaction-source-metadata.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch22-commerce-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/recent-transaction-feed-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/transaction-sequence-journey.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/unlock-transaction-source-metadata.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- scripts/agent/debug-cockpit-batch22-commerce-shared.ts: unsafe_unknown
- scripts/agent/validate-debug-cockpit-batch22-commerce-truth.ts: unsafe_unknown
- scripts/agent/validate-recent-transaction-feed-cleanup.ts: unsafe_unknown
- scripts/agent/validate-transaction-sequence-journey.ts: unsafe_unknown
- scripts/agent/validate-unlock-transaction-source-metadata.ts: unsafe_unknown
- src/app/admin/debug/components/DebugTabMonitoring.tsx: unsafe_unknown
- src/app/api/admin/overview/route.ts: unsafe_unknown
- src/lib/admin-analytics-recent-commerce-feed.ts: unsafe_unknown
- src/lib/admin-overview.ts: unsafe_unknown
- src/lib/behavioral/transaction-sequence-contract.ts: unsafe_unknown
- src/lib/commerce/transaction-source-of-funds-contract.ts: unsafe_unknown
- src/lib/debug/debug-cockpit-batch22-commerce-truth.ts: unsafe_unknown
- src/lib/debug/recent-transaction-feed-contract.ts: unsafe_unknown
- src/lib/gumdrop-ledger.ts: unsafe_unknown
- src/types/admin-analytics.ts: unsafe_unknown
- tests/unit/debug-cockpit-batch22-commerce-truth.spec.ts: unsafe_unknown
- tests/unit/recent-transaction-feed-cleanup.spec.ts: unsafe_unknown
- tests/unit/transaction-sequence-journey.spec.ts: unsafe_unknown
- tests/unit/unlock-transaction-source-metadata.spec.ts: unsafe_unknown

## Validation Failures

- dirty files unclassified.

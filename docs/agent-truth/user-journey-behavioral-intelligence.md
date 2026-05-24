# User Journey Behavioral Intelligence

Generated: 2026-05-24T22:50:19.033Z
Status: fail
Current head: 650b22a88d5b827de725f39e135fcb6e05965b60

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
| sourceHealth | 92.5 | 92.5 | target_met | No user journey score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No user journey score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| freshness | 83.75 | 83.75 | target_met | No user journey score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |
| regressionRisk | 86 | 86 | target_met | No user journey score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence. |

## Dirty Files

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch22-commerce-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/recent-transaction-feed-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-database-parity-cost-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/transaction-sequence-journey.generated.json: stale_journey_logic_to_remove
- agent/state/unlock-transaction-source-metadata.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch22-commerce-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/recent-transaction-feed-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/sql-database-parity-cost-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/transaction-sequence-journey.md: stale_journey_logic_to_remove
- docs/agent-truth/unlock-transaction-source-metadata.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- scripts/agent/debug-cockpit-batch22-commerce-shared.ts: unsafe_unknown
- scripts/agent/validate-debug-cockpit-batch22-commerce-truth.ts: unsafe_unknown
- scripts/agent/validate-recent-transaction-feed-cleanup.ts: unsafe_unknown
- scripts/agent/validate-transaction-sequence-journey.ts: stale_journey_logic_to_remove
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
- tests/unit/transaction-sequence-journey.spec.ts: stale_journey_logic_to_remove
- tests/unit/unlock-transaction-source-metadata.spec.ts: unsafe_unknown

## Validation Failures

- dirty files are unclassified.

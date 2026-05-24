# SQL Database Parity Cost Lock

Generated: 2026-05-24T22:49:55.198Z
Status: fail
Current head: 650b22a88d5b827de725f39e135fcb6e05965b60

## Contract

- Raw event facts map to normalized export rows without becoming runtime product truth.
- Global summaries, user summaries, person metrics, session summaries, journey summaries, and export rows share dedupe keys or record mismatches.
- BigQuery export remains daily/watermark batched; no per-event export trigger is allowed.
- Cloud SQL/Data Connect mirror sync remains manual, guarded, and external-review separated.
- Admin/debug reads summaries first and uses paged drilldowns for raw detail.

## Debug Lane

- Label: SQL/database parity
- Parity: matched
- Mismatches: 0
- Export freshness: current
- Cost guard: batched_summary_first
- Blocked external review: true

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 92.5 | 92.5 | target_met | No SQL parity score action needed for this dimension. |
| runtimeHealth | 84.2 | 84.2 | target_met | No SQL parity score action needed for this dimension. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Keep external billing/formal evidence separate; do not fake SQL or provider proof. |
| freshness | 83.75 | 83.75 | target_met | No SQL parity score action needed for this dimension. |
| costRisk | 42 | 42 | below_target | Keep external billing/formal evidence separate; do not fake SQL or provider proof. |
| regressionRisk | 86 | 86 | target_met | No SQL parity score action needed for this dimension. |
| overallHealthScore | 79.25 | 79.25 | below_target | Keep external billing/formal evidence separate; do not fake SQL or provider proof. |

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

- dirty files are unclassified.

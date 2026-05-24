# SQL Database Parity Cost Lock

Generated: 2026-05-24T11:13:21.326Z
Status: pass
Current head: a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76

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

- CHANGELOG.md: release_artifact_expected
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/sql-database-parity-cost-lock.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/sql-database-parity-cost-lock.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-sql-database-parity-cost-lock.ts: validator_artifact_expected
- src/lib/analytics/sql-database-parity-contract.ts: real_source_change_needs_review
- src/lib/analytics/sql-database-parity-engine.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/sql-database-parity-cost-lock.spec.ts: test_artifact_expected

## Validation Failures

- none

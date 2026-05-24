# SQL Database Parity Cost Lock

Generated: 2026-05-24T18:04:10.932Z
Status: pass
Current head: 6d038e7f7d9b7cef83d276f39bd968df83bb988d

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

- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-business-truth-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-business-truth-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch8-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/drop-watch-time-accuracy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/recovery-playbook-cta-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-database-parity-cost-lock.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/admin-truth-source-sample.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-business-truth-refresh.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-business-truth-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-backlog-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch8-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-time-accuracy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/recovery-playbook-cta-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/sql-database-parity-cost-lock.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- scripts/agent/business-truth-recovery-shared.ts: validator_artifact_expected
- scripts/agent/validate-admin-debug-control-tower.ts: validator_artifact_expected
- scripts/agent/validate-canonical-business-truth-refresh.ts: validator_artifact_expected
- scripts/agent/validate-canonical-business-truth-status.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch8-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-recovery-playbook-cta-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-sql-database-parity-cost-lock.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx: real_source_change_needs_review
- src/lib/debug/canonical-business-truth-status.ts: real_source_change_needs_review
- src/lib/debug/recovery-playbook-visibility.ts: real_source_change_needs_review
- tests/unit/canonical-business-truth-refresh.spec.ts: test_artifact_expected
- tests/unit/canonical-business-truth-status.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch8-cleanup.spec.ts: test_artifact_expected
- tests/unit/recovery-playbook-cta-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

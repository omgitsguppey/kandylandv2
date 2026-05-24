# SQL Database Parity Cost Lock

Generated: 2026-05-24T16:01:44.477Z
Status: pass
Current head: 883bdc0e91e5494f3b6b3e6449d5ea722b898077

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
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/debug-cockpit-batch3-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/drop-watch-time-accuracy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/empty-live-lane-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/notification-pwa-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/pwa-service-worker-safety.generated.json: stale_generated_artifact_to_regenerate
- agent/state/pwa-service-worker-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/session-bounce-calculation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-database-parity-cost-lock.generated.json: current_generated_artifact_to_commit
- agent/state/tracking-lane-freshness-display-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/user-journey-behavioral-intelligence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/wallet-funnel-sample-cleanup.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch3-cleanup.md: documentation_artifact_expected
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-time-accuracy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/empty-live-lane-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/notification-pwa-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/pwa-service-worker-safety.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/pwa-service-worker-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/session-bounce-calculation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/sql-database-parity-cost-lock.md: documentation_artifact_expected
- docs/agent-truth/tracking-lane-freshness-display-cleanup.md: documentation_artifact_expected
- docs/agent-truth/user-journey-behavioral-intelligence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/wallet-funnel-sample-cleanup.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch3-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-empty-live-lane-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-identity-handoff-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-notification-pwa-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-pwa-service-worker-safety.ts: validator_artifact_expected
- scripts/agent/validate-pwa-service-worker-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-session-bounce-calculation.ts: validator_artifact_expected
- scripts/agent/validate-sql-database-parity-cost-lock.ts: validator_artifact_expected
- scripts/agent/validate-tracking-lane-freshness-display-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-user-journey-behavioral-intelligence.ts: validator_artifact_expected
- scripts/agent/validate-wallet-funnel-sample-cleanup.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/debug/empty-live-lane-classifier.ts: real_source_change_needs_review
- src/lib/pwa/pwa-service-worker-contract.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/debug-cockpit-batch3-cleanup.spec.ts: test_artifact_expected
- tests/unit/empty-live-lane-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/identity-handoff-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/pwa-service-worker-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/tracking-lane-freshness-display-cleanup.spec.ts: test_artifact_expected
- tests/unit/wallet-funnel-sample-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

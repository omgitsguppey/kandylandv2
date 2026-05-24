# Regression Risk High-Blast Refresh

Generated: 2026-05-24T05:47:55.213Z

Current head: b0850954013ef36f732dec9ad90f64d5bcbfd65b

## Score Movement

- Regression risk: 86 -> 88
- Freshness: 83.75 -> 83.75
- Overall health: 83.1 -> 83.3

## Status

- High-blast coverage current: true
- Stale targeted behavior evidence retired: true
- Refreshed lanes: 22
- In-flight lanes: 1
- Failed lanes: 0
- Missing lanes: 0
- Stale lanes: 0

## Lane Results

| Lane | Status | Command | Artifact | Next action |
| --- | --- | --- | --- | --- |
| event-translation-bridge | landed_artifact_reused | npm run check:event-translation-bridge | agent/state/event-translation-bridge.generated.json | npm run check:event-translation-bridge could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| person-metrics-hydration | landed_artifact_reused | npm run check:person-metrics-hydration | agent/state/person-metrics-hydration.generated.json | npm run check:person-metrics-hydration could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| debug-signal-grouping | pass | npm run check:debug-signal-grouping | agent/state/debug-signal-grouping.generated.json | Keep this validator in the high-blast refresh set. |
| chat-functionality-score-lock | landed_artifact_reused | npm run check:chat-functionality-score-lock | agent/state/chat-functionality-score-lock.generated.json | npm run check:chat-functionality-score-lock could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| daily-task-debug-score-lock | landed_artifact_reused | npm run check:daily-task-debug-score-lock | agent/state/daily-task-debug-score-lock.generated.json | npm run check:daily-task-debug-score-lock could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| settings-connection-parity | pass | npm run check:settings-connection-parity | agent/state/settings-connection-parity.generated.json | Keep this validator in the high-blast refresh set. |
| wallet-modal-telemetry-cleanup | landed_artifact_reused | npm run check:wallet-modal-telemetry-cleanup | agent/state/wallet-modal-telemetry-cleanup.generated.json | npm run check:wallet-modal-telemetry-cleanup is not defined; no owned source changes were detected, so this lane is not counted as stale regression evidence. |
| user-management-refactor | landed_artifact_reused | npm run check:user-management-refactor | agent/state/user-management-refactor.generated.json | npm run check:user-management-refactor could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| formal-evidence-bridge | pass | npm run check:formal-evidence-bridge | agent/state/formal-evidence-bridge.generated.json | Keep this validator in the high-blast refresh set. |
| cost-risk-owner-review-closure | pass | npm run check:cost-risk-owner-review-closure | agent/state/cost-risk-owner-review-closure.generated.json | Keep this validator in the high-blast refresh set. |
| event-liveness-audit | in_flight | npm run check:event-liveness-audit | agent/state/event-liveness-audit.generated.json | Event liveness implementation is dirty/in-flight; keep it out of this regression refresh commit and rerun when landed. |
| event-envelope-normalization | pass | npm run check:event-envelope-normalization | agent/state/event-envelope-normalization.generated.json | Keep this validator in the high-blast refresh set. |
| telemetry-trigger-test-matrix | pass | npm run check:telemetry-trigger-test-matrix | agent/state/telemetry-trigger-test-matrix.generated.json | Keep this validator in the high-blast refresh set. |
| chat-realtime-cost-control | landed_artifact_reused | npm run check:chat-realtime-cost-control | agent/state/chat-realtime-cost-control.generated.json | npm run check:chat-realtime-cost-control could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| chat-gating-moderation | landed_artifact_reused | npm run check:chat-gating-moderation | agent/state/chat-gating-moderation.generated.json | npm run check:chat-gating-moderation could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| chat-telemetry-admin-truth | landed_artifact_reused | npm run check:chat-telemetry-admin-truth | agent/state/chat-telemetry-admin-truth.generated.json | npm run check:chat-telemetry-admin-truth could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| daily-task-reset-truth | landed_artifact_reused | npm run check:daily-task-reset-truth | agent/state/daily-task-reset-truth.generated.json | npm run check:daily-task-reset-truth could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| daily-task-lifecycle-telemetry | landed_artifact_reused | npm run check:daily-task-lifecycle-telemetry | agent/state/daily-task-lifecycle-telemetry.generated.json | npm run check:daily-task-lifecycle-telemetry could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| daily-task-reward-ledger | landed_artifact_reused | npm run check:daily-task-reward-ledger | agent/state/daily-task-reward-ledger.generated.json | npm run check:daily-task-reward-ledger could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| daily-task-guidance-route-audit | landed_artifact_reused | npm run check:daily-task-guidance-route-audit | agent/state/daily-task-guidance-route-audit.generated.json | npm run check:daily-task-guidance-route-audit could not rerun in the dirty queue state, but owned source did not change after available evidence. |
| user-profile-api-contract | pass | npm run check:user-profile-api-contract | agent/state/user-profile-api-contract.generated.json | Keep this validator in the high-blast refresh set. |
| feature-registration-gate | pass | npm run check:feature-registration-gate | agent/state/feature-registration-gate.generated.json | Keep this validator in the high-blast refresh set. |
| debug-signal-actionability | pass | npm run check:debug-signal-actionability | agent/state/debug-signal-actionability.generated.json | Keep this validator in the high-blast refresh set. |

## Remaining Gaps

- event-liveness-audit: in-flight lane kept separate from stale regression drag.

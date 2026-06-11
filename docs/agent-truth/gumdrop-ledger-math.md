# GumDrop Ledger Math

Generated: 2026-06-11T14:05:54.694Z
Current head: fca594c435f4a2418c6d96a10602a2ee422c014e
Status: pass

## Contract

- `paid_gd` is purchased base GumDrops only.
- `paid_bonus_gd` is paid bundle bonus value; it is paid-source eligible but not reward GD.
- `reward_gd` is non-purchase reward value; `task_reward_gd` is the task subtype.
- `admin_grant_gd` is explicit and never defaults to paid.
- Refunds reverse the original source bucket.
- Legacy unknown source cannot fund paid-only creator experiences.
- Displayed wallet total must match the source-bucket ledger total.

## Debug Lane

- Label: GumDrop ledger math
- Balance parity: matched
- Source unknown: 1
- Paid-only spend violations: 0
- Refund reversals: 1
- Display mismatch: 1

## Dirty Files

- Count: 148
- Drilldown truncated: true
- agent/context/doctrine.cards.jsonl: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/doctrine.index.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/file-size-budget.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/legacy-registry.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/surface-contracts.jsonl: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/task-pack.generated.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/context/validator-map.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/blast-radius.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/canonical-helpers.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/dependency-graph.summary.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/governance-truth.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/known-pitfalls.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/package-manager-truth.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/recent-passes.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/repo-inventory.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/retrieval-index.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/runtime-observability.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/surface-map.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/ui-surface-coverage.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/verification-commands.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/index/workflow-guidance.json: unrelated_dirty_outside_gumdrop_ledger_math
- agent/state/admin-cms-workflow-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-legacy-recovery-reconciliation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/background-job-idempotency-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/bug-report-truth-terminal-state.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-authority-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-env-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/content-media-pipeline-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cookie-banner-settings-sync.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-cost-surfaces.generated.json: stale_generated_artifact_to_regenerate
- agent/state/gumdrop-ledger-math.generated.json: current_generated_artifact_to_commit
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-upload-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/orphaned-logic-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/private-media-access.generated.json: stale_generated_artifact_to_regenerate
- agent/state/provider-smoke-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/route-sample-freshness-classifier.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-dimension-80-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-creator-dashboard-split.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-mirror-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-sync.payload.generated.json: stale_generated_artifact_to_regenerate
- agent/state/stale-route-sample-classification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/support-policy-surface-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-dependency-graph.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-identified-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/treasury-reconciliation-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/treasury-structure-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-status-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-cms-drop-workflow.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-legacy-recovery-reconciliation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/background-jobs-idempotency.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/bug-report-truth-terminal-state.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-authority-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/config-env-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/content-media-pipeline.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cookie-banner-settings-sync.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/gumdrop-ledger-math.md: current_generated_artifact_to_commit
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-upload-lifecycle.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/private-media-access.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/route-sample-freshness-classifier.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-reconciliation-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-dimension-80-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/stale-route-sample-classification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/support-policy-surface-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-dependency-graph.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/treasury-reconciliation-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/treasury-structure-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-management-status-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/admin-status-lane-cleanup-shared.ts: unrelated_dirty_outside_gumdrop_ledger_math
- scripts/agent/build-agent-indexes.ts: unrelated_dirty_outside_gumdrop_ledger_math
- scripts/agent/chat-cost-status-cleanup-shared.ts: unrelated_dirty_outside_gumdrop_ledger_math

## Validation Failures

- none

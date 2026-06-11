# Freshness Window Repair

Status: `pass`
Artifact: `agent/state/freshness-window-repair.generated.json`
Validator: `npm run check:freshness-window-repair`

## Summary

- Current head: `833a3a3cb10be9c68f3e36bb3e2ae1df1a525db6`
- Current head source: `git`
- Git status: `available`
- Tooling degraded: false
- Latest main head: `f1e140ac6a2827e40c4531ae47997d7312526f29`
- Stale required reports before: 7
- Freshness: 75.63 -> 59.38
- Health score: 78.03 -> 68.67
- Formal evidence impact: `does_not_clear_formal_gates`
- Production reads/provider calls/deploys performed: false

## Stale Report Classifications

| Artifact | Classification | Action | Current/replacement artifact | Next action |
| --- | --- | --- | --- | --- |
| agent/state/evidence-capture-status.generated.json | in_flight | npm run check:evidence-capture-status | agent/state/evidence-capture-status.generated.json | Run npm run check:evidence-capture-status from the latest code version. |
| agent/state/gumdrop-economy-accuracy.generated.json | refreshed | npm run check:gumdrop-economy-accuracy | agent/state/gumdrop-economy-accuracy.generated.json | No action needed after refresh. |
| agent/state/creator-experience-simplification.generated.json | in_flight | npm run check:creator-experience-simplification | agent/state/creator-experience-simplification.generated.json | Run npm run check:creator-experience-simplification from the latest code version. |
| agent/state/post-economy-creator-flow-qa.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/creator-monetization-readiness-lock.generated.json | Use creator monetization readiness lock and GumDrop source-of-funds truth for current source behavior evidence. |
| agent/state/user-creator-ui-parity.generated.json | in_flight | npm run check:user-creator-ui-parity | agent/state/user-creator-ui-parity.generated.json | Run npm run check:user-creator-ui-parity from the latest code version. |
| agent/state/user-facing-feature-connection-audit.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/final-parity-telemetry-lock.generated.json | Use final parity telemetry lock, feature registration gate, and targeted behavior evidence for current surface connection proof. |
| agent/state/creator-dashboard-error-cost-inventory.generated.json | retired_superseded | retired from REQUIRED_EVIDENCE_REPORTS | agent/state/score-80-cost-readiness.generated.json | Use beta score cost readiness and route/cost lanes; keep creator dashboard issue visible outside required freshness math. |

## Current Required Reports

- `agent/state/evidence-capture-status.generated.json`
- `agent/state/creator-experience-simplification.generated.json`
- `agent/state/user-creator-ui-parity.generated.json`
- `agent/state/targeted-behavior-evidence.generated.json`
- `agent/state/final-parity-telemetry-lock.generated.json`
- `agent/state/media-discovery-score-lock.generated.json`
- `agent/state/creator-monetization-readiness-lock.generated.json`

## Dirty File Classification

| File | Classification |
| --- | --- |
| agent/context/doctrine.cards.jsonl | unrelated_agent_context_file_to_ignore |
| agent/context/doctrine.index.json | unrelated_agent_context_file_to_ignore |
| agent/context/file-size-budget.json | unrelated_agent_context_file_to_ignore |
| agent/context/legacy-registry.json | unrelated_agent_context_file_to_ignore |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore |
| agent/context/surface-contracts.jsonl | unrelated_agent_context_file_to_ignore |
| agent/context/task-pack.generated.json | unrelated_agent_context_file_to_ignore |
| agent/context/validator-map.json | unrelated_agent_context_file_to_ignore |
| agent/index/blast-radius.json | generated_index_noise_leave_unstaged |
| agent/index/canonical-helpers.json | generated_index_noise_leave_unstaged |
| agent/index/dependency-graph.summary.json | generated_index_noise_leave_unstaged |
| agent/index/governance-truth.json | generated_index_noise_leave_unstaged |
| agent/index/known-pitfalls.json | generated_index_noise_leave_unstaged |
| agent/index/package-manager-truth.json | generated_index_noise_leave_unstaged |
| agent/index/recent-passes.json | generated_index_noise_leave_unstaged |
| agent/index/repo-inventory.json | generated_index_noise_leave_unstaged |
| agent/index/retrieval-index.json | generated_index_noise_leave_unstaged |
| agent/index/runtime-observability.json | generated_index_noise_leave_unstaged |
| agent/index/surface-map.json | generated_index_noise_leave_unstaged |
| agent/index/ui-surface-coverage.json | generated_index_noise_leave_unstaged |
| agent/index/verification-commands.json | generated_index_noise_leave_unstaged |
| agent/index/workflow-guidance.json | generated_index_noise_leave_unstaged |
| agent/state/config-env-contract.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/final-pr-stale-cleanup.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/freshness-window-repair.generated.json | current_generated_artifact_to_commit |
| agent/state/global-cost-surfaces.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/identity-handoff-spine.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/person-metrics-hydration.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/score-80-reconciliation-lock.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/score-dimension-80-lock.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/score-impact-stale-artifact-sweep.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/settings-creator-dashboard-split.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/sql-mirror-status.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/sql-sync.payload.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/support-policy-surface-cleanup.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/task-context.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/treasury-reconciliation-engine.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/treasury-structure-contract.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/user-management-status-truth.generated.json | stale_generated_artifact_to_regenerate |
| agent/state/user-profile-api-contract.generated.json | stale_generated_artifact_to_regenerate |
| docs/agent-truth/config-env-contract.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/final-pr-stale-cleanup.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/freshness-window-repair.md | current_generated_artifact_to_commit |
| docs/agent-truth/identity-handoff-spine.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/person-metrics-hydration.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/score-80-reconciliation-lock.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/score-dimension-80-lock.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/score-impact-stale-artifact-sweep.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/support-policy-surface-cleanup.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/treasury-reconciliation-engine.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/treasury-structure-contract.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/user-management-status-truth.md | stale_generated_artifact_to_regenerate |
| docs/agent-truth/user-profile-api-contract.md | stale_generated_artifact_to_regenerate |
| scripts/agent/build-agent-indexes.ts | generated_index_noise_leave_unstaged |
| scripts/agent/validate-freshness-window-repair.ts | failed_validator_to_repair |
| scripts/repo-inventory.ts | generated_index_noise_leave_unstaged |
| agent/state/debug-evidence-staleness-queue.generated.json | stale_generated_artifact_to_regenerate |

## Remaining Gaps

- agent/state/evidence-capture-status.generated.json: refresh is still in flight.
- agent/state/creator-experience-simplification.generated.json: refresh is still in flight.
- agent/state/user-creator-ui-parity.generated.json: refresh is still in flight.

## Next Exact Steps

- agent/state/evidence-capture-status.generated.json: Run npm run check:evidence-capture-status from the latest code version.
- agent/state/gumdrop-economy-accuracy.generated.json: No action needed after refresh.
- agent/state/creator-experience-simplification.generated.json: Run npm run check:creator-experience-simplification from the latest code version.
- agent/state/post-economy-creator-flow-qa.generated.json: Use creator monetization readiness lock and GumDrop source-of-funds truth for current source behavior evidence.
- agent/state/user-creator-ui-parity.generated.json: Run npm run check:user-creator-ui-parity from the latest code version.
- agent/state/user-facing-feature-connection-audit.generated.json: Use final parity telemetry lock, feature registration gate, and targeted behavior evidence for current surface connection proof.
- agent/state/creator-dashboard-error-cost-inventory.generated.json: Use beta score cost readiness and route/cost lanes; keep creator dashboard issue visible outside required freshness math.

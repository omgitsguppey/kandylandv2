# Global User Counting Math

Generated: 2026-06-11T14:23:47.117Z
Current head: b9ac75131b40cfbb312fcede79377bf896cbd50d
Status: pass

## Contract

- Global metrics count unique real actions once per dedupe key.
- Guest metrics count pre-login guest actions only.
- Signed-in metrics count authenticated actions only.
- Linked-person metrics combine guest and signed-in events only when link evidence exists.
- Creator role metrics are signed-in metrics with role context and do not create another person.
- Admin projections and system events never count as user behavior.
- Unknown legacy can count only as safe global evidence and never as exact user truth.

## Exact Dedupe Windows

- surface viewed: eventName + surface + actor/session + 60s
- click/action: eventName + objectId + actor/session + 5s
- signup/login: authAttemptId or userId + method + 10m
- wallet checkout: idempotency key
- payment approval: provider/order fingerprint only
- drop unlock: dropId + user/linkedPerson + unlockId
- watch session: watchSessionId
- chat message: messageId/idempotency key
- task reward: taskId + resetWindowId + user
- notification: intentId + recipient + 1h

## Dirty Files

Total dirty files seen: 116
Examples shown: 50 (truncated)

### Dirty File Classifications

- unrelated_agent_context_file_to_ignore: 7
- unrelated_agent_index_file_to_review: 14
- stale_generated_artifact_to_regenerate: 34
- current_generated_artifact_to_commit: 2
- unrelated_agent_validator_tooling_to_review: 57
- validator_artifact_expected: 1
- unrelated_agent_index_tooling_to_review: 1

### Dirty File Examples

- agent/context/doctrine.cards.jsonl: unrelated_agent_context_file_to_ignore
- agent/context/doctrine.index.json: unrelated_agent_context_file_to_ignore
- agent/context/file-size-budget.json: unrelated_agent_context_file_to_ignore
- agent/context/legacy-registry.json: unrelated_agent_context_file_to_ignore
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/task-pack.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/validator-map.json: unrelated_agent_context_file_to_ignore
- agent/index/blast-radius.json: unrelated_agent_index_file_to_review
- agent/index/canonical-helpers.json: unrelated_agent_index_file_to_review
- agent/index/dependency-graph.summary.json: unrelated_agent_index_file_to_review
- agent/index/governance-truth.json: unrelated_agent_index_file_to_review
- agent/index/known-pitfalls.json: unrelated_agent_index_file_to_review
- agent/index/package-manager-truth.json: unrelated_agent_index_file_to_review
- agent/index/recent-passes.json: unrelated_agent_index_file_to_review
- agent/index/repo-inventory.json: unrelated_agent_index_file_to_review
- agent/index/retrieval-index.json: unrelated_agent_index_file_to_review
- agent/index/runtime-observability.json: unrelated_agent_index_file_to_review
- agent/index/surface-map.json: unrelated_agent_index_file_to_review
- agent/index/ui-surface-coverage.json: unrelated_agent_index_file_to_review
- agent/index/verification-commands.json: unrelated_agent_index_file_to_review
- agent/index/workflow-guidance.json: unrelated_agent_index_file_to_review
- agent/state/admin-cms-workflow-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-legacy-recovery-reconciliation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/auth-provider-conflict-resolution.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-authority-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-env-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-staleness-queue.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-cost-surfaces.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-user-counting-math.generated.json: current_generated_artifact_to_commit
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/provider-smoke-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-dimension-80-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-creator-dashboard-split.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-mirror-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/sql-sync.payload.generated.json: stale_generated_artifact_to_regenerate
- agent/state/support-policy-surface-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/treasury-reconciliation-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/treasury-structure-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-status-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-cms-drop-workflow.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-legacy-recovery-reconciliation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/auth-provider-conflict-resolution.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-authority-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/config-env-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-user-counting-math.md: current_generated_artifact_to_commit
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate

## Open PR Classification

- none

## Validation Failures

- none

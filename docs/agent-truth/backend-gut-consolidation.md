# Backend Gut Consolidation

Generated: 2026-05-27T03:56:29.944Z
Current head: 360b1047

## Summary

- Backend routes audited: 218
- Backend routes consolidated: 25
- Backend routes removed: 0
- Services created or reused: 14
- Unsafe unknowns: 0
- Score before/after: 79.25 -> 77.83

## Consolidation

- route ownership classification now derives from source instead of ad hoc prompt state
- service owner rules reused by inventory, cost, and memory validators
- admin/debug raw detail default classified as drilldown_only
- debug/control tower service owns backend diagnostic summary mapping

## Memory

- Source: AGENTS.md, REPO_MEMORY_LEDGER.md
- Entries added: 1

## Remaining Gaps

- provider proof remains external; source-only checks do not prove PayPal/runtime execution.
- Existing oversized historical generated artifacts remain evidence snapshots unless their owning lane regenerates them.
- Route-level business math should continue moving from large admin routes into canonical services in narrow follow-up passes.

## Dirty File Classification

- agent/state/backend-cost-consolidation.generated.json: current_generated_artifact_to_commit
- agent/state/backend-route-inventory.generated.json: current_generated_artifact_to_commit
- agent/state/backend-service-ownership.generated.json: current_generated_artifact_to_commit
- agent/state/codex-memory-writeback.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/backend-cost-consolidation.md: current_generated_artifact_to_commit
- docs/agent-truth/backend-route-inventory.md: current_generated_artifact_to_commit
- docs/agent-truth/backend-service-ownership.md: current_generated_artifact_to_commit
- docs/agent-truth/codex-memory-writeback.md: current_generated_artifact_to_commit

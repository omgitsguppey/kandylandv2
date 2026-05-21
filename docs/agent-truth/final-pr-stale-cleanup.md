# Final PR Stale Cleanup

Generated: 2026-05-21T16:15:45.673Z

Latest code version: 2b2e19b60aff5bd93e0a9bde735793dad18dbe52

## Summary

- Open PR count: 2
- PRs handled: 3
- Integrated and closed: 2
- Closed superseded: 1
- Dirty files unclassified: 1
- Stale generated artifacts: 0
- Release notes same commit: false
- Findings: P0=3, P1=0, P2=0

## PR Cleanup Actions

| PR | Action | Reason |
| --- | --- | --- |
| #275 | integrated_and_closed | Scoped admin analytics optimization was applied directly; PR closed to prevent duplicate preserved work. |
| #276 | integrated_and_closed | Button.tsx accessibility fix was applied directly; .Jules workflow artifact was intentionally not merged. |
| #274 | closed_superseded | Broad monolith governance doc was superseded by newer admin analytics, telemetry, mobile UI, and overnight integration locks. |

## Dirty File Classifications

| File | Classification | Reason |
| --- | --- | --- |
| agent/context/optimized-task-context.generated.json | unrelated_agent_context_file_to_ignore | Agent context output should be restored before staging unless explicitly owned. |
| agent/state/beta-evidence-gap-map.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| agent/state/beta-evidence-lane-prep.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| agent/state/beta-freshness-language.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| agent/state/overnight-final-integration-lock.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| agent/state/refresh-safeguards.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| agent/state/self-healing-refresh-queue.generated.json | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/beta-evidence-gap-map.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/beta-evidence-lane-prep.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/beta-freshness-language.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/overnight-final-integration-lock.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/refresh-safeguards.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| docs/agent-truth/self-healing-refresh-queue.md | current_generated_artifact_to_commit | Focused validator refreshed current generated evidence. |
| tests/unit/score-80-refresh-queue-execution.spec.ts | unsafe_unknown | File is not in the final PR stale cleanup allowed scope. |

## Fixes Applied

- Integrated PR #275 admin analytics traversal reduction directly into current main.
- Integrated PR #276 Button loading spinner aria-hidden fix directly without .Jules artifact.
- Closed PR #274 as superseded broad governance doctrine.

## Release Note

- Cleaned up remaining preserved PRs and stale repo artifacts.
- Kept beta cleanup lanes free of superseded PR clutter.
- Preserved current source-truth doctrine while closing stale work.

## Next Exact Steps

- Keep open PR count at zero for stale bot cleanup lanes.
- Do not re-open broad monolith doctrine unless a current owner-scoped decomposition pass needs it.
- Run npm run check:final-pr-stale-cleanup after any new preserved PR cleanup.

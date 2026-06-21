# AI Debug Critic

Status: source-only static critic lane.
External AI calls: forbidden.

The AI debug critic reviews debug-backed proposed fixes before they are considered complete. It catches shallow patches, duplicate systems, monolith growth, fake evidence, protected surface edits, orphaned telemetry, and source-ready-as-runtime-proof mistakes.

## Summary

- Critic status: blocked
- Findings: 3
- Blockers: 1
- Required changes: 1
- Unsafe changes: 0
- Duplicate systems: 1
- Monolith risks: 2
- Evidence misclassification risks: 0

## Findings

- warning / needs_refresh: Stale debug logic is still active (no_patch_on_top_of_stale_logic) - Keep the stale backlog item visible in the owning evidence or refresh lane until the required artifact changes.
- blocker / needs_code_change: Potential duplicate debug system (no_duplicate_systems) - Refactor into the existing debug backlog, evidence, telemetry, or score owner instead of adding a parallel system.
- required / needs_code_change: Monolith split plan required (no_monolith_growth_without_split_plan) - Split logic into contract, builder, validator, and view/source helpers or document a bounded split plan.


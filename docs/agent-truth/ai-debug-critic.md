# AI Debug Critic

Status: source-only static critic lane.
External AI calls: forbidden.

The AI debug critic reviews debug-backed proposed fixes before they are considered complete. It catches shallow patches, duplicate systems, monolith growth, fake evidence, protected surface edits, orphaned telemetry, and source-ready-as-runtime-proof mistakes.

## Summary

- Critic status: request_changes
- Findings: 1
- Blockers: 0
- Required changes: 1
- Unsafe changes: 0
- Duplicate systems: 0
- Monolith risks: 0
- Evidence misclassification risks: 0

## Required Checks

- no_patch_on_top_of_stale_logic: Do not patch on top of stale logic
- no_duplicate_systems: Do not create duplicate systems
- no_fake_evidence: Do not fake evidence
- no_formal_gate_cleared_without_artifact: Do not clear formal gates without artifacts
- no_monolith_growth_without_split_plan: Do not grow monoliths without split plans
- no_chat_nav_touch_without_explicit_request: Do not touch chat or navigation without explicit request
- no_payment_math_change_without_explicit_request: Do not touch payment or GumDrop math without explicit request
- no_unowned_debug_warning: Do not leave debug warnings unowned
- no_orphaned_telemetry: Do not create orphaned telemetry
- no_hardcoded_ui_scale_regression: Do not hardcode UI scale regressions
- no_new_cost_path_without_guard: Do not add cost paths without guardrails
- no_source_ready_as_runtime_proof: Do not present source readiness as runtime proof

## Suggested Validators

- `npm run check:ai-debug-critic`
- `npm run check:beta-score`
- `npm run check:debug-backlog-engine`
- `npm run check:debug-evidence-pipeline`
- `npm run score:beta`

## Findings

- required: Stale debug logic is still active (no_patch_on_top_of_stale_logic) - Refresh or retire stale backlog items and keep them visible until the owning evidence lane changes.


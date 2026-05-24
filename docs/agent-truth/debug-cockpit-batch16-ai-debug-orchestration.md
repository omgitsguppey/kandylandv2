# Debug Cockpit Batch 16 AI Debug Orchestration

Status: AI debug is modeled as bounded async work items, optional budgeted planning, critic review, and human-approved repair proposals.
- Task issues: live_zero_sample -> source_ready_no_sample_loaded
- Repair queue: live_zero_sample -> source_ready_no_sample_loaded
- Bug triage: live_zero_sample -> source_ready_no_sample_loaded
- Manual utilities: manual_utility_not_health
- AI planner: deterministic_fallback_ready
- AI critic: critic_required_for_source_patch
- Provider calls in tests: false

## Release Notes
- Refactored AI debug into bounded async work items, planner, critic, and repair proposal contracts.
- Separated task/bug/repair zero-sample states from healthy live status.
- Kept manual utilities out of live health while preserving admin audit and GumDrop safeguards.

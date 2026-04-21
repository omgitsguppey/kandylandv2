# Handoff Protocol

When a task requires multiple agents or hits a boundary constraint, you MUST generate a handoff report using this template. Place it in the task artifact.

## Template

```yaml
task_type: "" # e.g., FOUNDATION, ISOLATED_FIX
owner: "" # Who executed this portion
surfaces_touched: [] # e.g., ["Wallet", "TopNav"]
files_touched: []
source_of_truth_affected: [] # e.g., ["Firestore (users)", "useAuthSWR"]
telemetry_affected: []
admin_or_debug_surface_affected: []
what_was_done: "" # Brief summary
what_was_intentionally_not_done: "" # e.g., "Did not touch the API route due to boundary constraints"
risks: "" # Any potential breakage
verification_needed: "" # What the next agent must check
next_recommended_owner: "" # e.g., "antigravity", "jules", "human"
```

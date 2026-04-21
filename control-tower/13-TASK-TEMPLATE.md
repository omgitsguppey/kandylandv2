# Standard Task Brief Template

Use this template when generating prompts or breaking down tasks for future agents.

```yaml
task_type: "" # e.g., FOUNDATION, ISOLATED_FIX
surface: "" # e.g., Wallet, TopNav, Admin Dashboard
owner_expected: "" # e.g., antigravity, jules

doctrine_files:
  - "" # e.g., kandydrops-copy-doctrine.md

source_of_truth_paths:
  - "" # e.g., useDrops.ts -> Firestore

telemetry_paths:
  - "" # e.g., logEvent("purchase")

admin_truth_paths:
  - "" # e.g., AdminTruthSurfaces.tsx

scope:
  - "" # Explicitly what to do

out_of_scope:
  - "" # Explicitly what to avoid

validation_requirements:
  - "" # e.g., Must pass npm run lint

handoff_target: "" # If applicable
```

# Experiment Rollout Registry Reconstruction

Batch 35 adds registry source status for experiment and rollout debug panels.

Configured zero is valid only when the registry source exists, loads, and is intentionally empty. Missing registry source is `registry_missing_actionable`, not an empty experiment state. Active experiments require assignment source and exposure event source. Experiment events are not required when no experiments are configured.

Registry raw rows remain drilldown-only.

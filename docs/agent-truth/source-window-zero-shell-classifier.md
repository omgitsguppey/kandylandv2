# Source Window Zero Shell Classifier

Batch 35 adds a shared terminal-state classifier for debug panels that previously rendered loaded zero shells.

The classifier separates real zero from no sample, missing source, stale rebuild, missing formula, missing registry, unsupported runtime, failed load, and unknown source state. A panel with zero rows is not healthy unless it has a bounded source window, generated-at provenance, and an explicit formula/freshness state.

Required UI behavior:
- `loaded_empty_with_source_window` means a bounded source loaded and proved zero rows for that window.
- `source_ready_no_sample_loaded` means the source exists but no bounded sample was loaded.
- `source_missing_actionable`, `formula_missing_actionable`, `registry_missing_actionable`, and `stale_rebuild_required` must show exact next actions.
- 0 findings over 0 inspected rows is not proof of clean.
- Raw rows remain drilldown-only.

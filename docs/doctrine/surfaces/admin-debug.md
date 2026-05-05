# Admin Debug Doctrine

Authority level: 4

Owner: admin debug/control tower

## Must

- Label data as live, cached, stale, fallback, partial, failed, or unknown.
- Surface generated reports, debug evidence, stale/missing truth, and deterministic next actions.
- Keep heavy raw JSON collapsed behind operational summaries.

## Must Not

- Show missing or stale data as healthy.
- Treat generated reports as canonical doctrine.
- Let raw JSON become the primary admin truth UI.

## Source Truth

- Admin debug control tower, debug evidence pipeline, generated reports as snapshots.

## Validators

- `check:admin-debug-control-tower`
- `check:debug-evidence-pipeline`
- `check:admin-truth`

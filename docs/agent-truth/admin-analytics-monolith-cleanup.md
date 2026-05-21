# Admin Analytics Monolith Cleanup

Generated: 2026-05-21T05:03:57.339Z
Current code version: 5e1ccedfceebc9fe56a06fa2235b1eadb6d2c36e

## Summary

- Monoliths found: 2
- Monoliths split: 2
- Unnecessary analytics removed or deferred: 2
- Default admin load reduced: yes
- GA4 state classified: yes
- Evidence-only sources separated: yes
- Truth state preserved: yes

## Split Modules

- src/lib/server/admin-debug/summary.ts
- src/lib/server/admin-debug/truth-state.ts
- src/lib/server/admin-analytics/ga4-evidence.ts

## GA4 Status

- fixed: GA4 is classified as missing, deferred, or evidence-only instead of guessed live.
- fixed: GA4 is explicitly external evidence only and cannot become product truth through this lane.

## Default Load Findings

- fixed: Default Admin Debug load uses bounded summary and hot cache cost controls.
- fixed: Unavailable/deferred/degraded semantics remain visible; GA4 is not marked healthy.

## Next Fix Order

1. Split the remaining Admin Debug all-section branch into named drilldown loaders after UI callers support section-specific requests.
2. Wire a future GA4 refresh-only evidence lane if owner credentials and cost approval are provided.
3. Continue moving admin analytics historical validation helpers into smaller modules when touching that route.

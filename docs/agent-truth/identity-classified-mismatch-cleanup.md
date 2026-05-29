# Identity Classified Mismatch Cleanup

- Status: pass
- Current head: 3962eae483605a9a0b4dffd9957dd361881eda91
- Total mismatches: 3
- Active mismatches (score-impacting): 0
- Classified non-blocking: 3
- Expected no-user-mapping: 3
- Missing identity links: 1
- Unsafe unknown: 0
- Score drag count: 0

## Summary

All 3 global-vs-user mismatches are classified as `expected_no_user_mapping` / `classified_non_blocking`.
They represent guest page views without a guestId (cookie blocks, bots, initialization latency).
These do not represent active bugs, do not impact score, and must not be treated as user-tracking failures.

## Mismatch Table

| Mismatch ID | Metric | Reason | Active Bug | Score Drag |
| --- | --- | --- | --- | --- |
| `mismatch_visits_global_only` | visits | expected_no_user_mapping | false | false |
| `mismatch_active_days_global_only` | active_days | expected_no_user_mapping | false | false |
| `mismatch_page_views_global_only` | page_views | expected_no_user_mapping | false | false |

## Next Exact Steps

- Future identity mismatches must be classified before closing.
- Validators must fail if classified mismatches have scoreDrag or activeBug true.
- Reports must always show active vs classified breakdown, never total alone.

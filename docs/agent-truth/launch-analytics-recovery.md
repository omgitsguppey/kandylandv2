# Launch Analytics Recovery

Generated: 2026-06-18T02:05:25.346Z
Current head: 9bc587e3d122a0e82a0ae7174ab247b517fc1a85
Status: source_agreement_failed

## Source Order

- First-party/user activity is primary product truth.
- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-like comparisons.
- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.

## Launch Coverage

- Recovered days: 3/3
- First-party days: 1
- GA4 days: 3
- Historical snapshot days: 1
- Legacy support days: 1
- Stale input evidence: no

## Source Agreement

- State: failed
- Compared sources: first_party, ga4, historical_snapshot, legacy_support
- Disagreements: 3
- Max delta: 67
- Classifications: date_range_mismatch, duplicate_event, external_source_gap, missing_materializer
- Next action: Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.

## Admin Panel Connection

- Hydrated panels: 10/41
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 2
- External evidence required: 4

## Next Steps

- Use /api/admin/analytics/historical with range=all to hydrate launchHistoryCoverage from first-party day buckets before chart promotion.
- Compare GA4 day buckets only as second-source evidence; do not average or overwrite first-party product metrics.
- Keep missing days labeled source missing until a bounded source window proves zero.
- Repair source agreement before treating admin charts as canonical launch-history truth.

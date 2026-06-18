# Launch Analytics Recovery

Generated: 2026-06-18T02:29:22.510Z
Current head: 6292d032500510e80d06b8e3c04cceb028449466
Status: stale_evidence_review

## Source Order

- First-party/user activity is primary product truth.
- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-like comparisons.
- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.

## Evidence Provenance

- Launch coverage input: agent/state/source-agreement-failure-detail.generated.json
- Panel hydration input: agent/state/analytics-panel-hydration.generated.json
- GA4 read mode: generated/local evidence only; no provider call performed
- First-party read mode: source-agreement day-bucket evidence only; no production read performed
- Limitation: This generated snapshot cannot clear runtime, provider, or admin-truth gates; use the all-range historical route/admin truth sample for formal launch-history proof.

## Canonical Owners

- first_party: analytics_event_facts and telemetry catalog
- person_metrics: person metrics hydration
- ga4: GA4/external evidence lane
- historicalSnapshot: admin analytics historical snapshot
- legacySupport: legacy support snapshot lane
- adminPanelHydration: admin analytics panel hydration

## Launch Coverage

- Recovered days: 3/3
- First-party days: 1
- GA4 days: 3
- Historical snapshot days: 1
- Legacy support days: 1
- Stale input evidence: yes

## Source Agreement

- State: failed
- Compared sources: first_party, ga4, historical_snapshot, legacy_support
- Disagreements: 3
- Max delta: 67
- Classifications: stale_generated_evidence, date_range_mismatch, duplicate_event, external_source_gap, missing_materializer
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

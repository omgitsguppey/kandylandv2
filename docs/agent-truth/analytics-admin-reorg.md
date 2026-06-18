# Analytics Admin Reorg

Generated: 2026-06-18T08:35:00.000Z
Current head: 2e9b7990d25ab93302a1814ef28f667d56e37a75
Status: source_agreement_failed

## Canonical Lanes

- Admin panel hydration: `analytics-panel-hydration`
- Launch recovery: `launch-analytics-recovery`
- Retired duplicate lane: `analytics-hydration-consolidation`

## Source Order

- First-party/user activity is primary product truth.
- GA4 is second-source evidence for sessions, views, device mix, regions, top paths, and acquisition-style comparisons.
- Historical snapshots and legacy support can explain gaps, but they do not overwrite first-party user, purchase, unlock, watch, task, creator, admin, wallet, or GumDrop truth.

## Current State

- Source agreement is failed because first-party launch-history day buckets are missing for at least one local evidence day.
- Launch coverage is still `fixture_only_local_window`; full all-launch range proof is not present.
- GA4 can corroborate traffic shape, but it cannot clear product-truth, runtime, provider, admin truth, payment, or GumDrop gates.

## Next Steps

- Attach an approved all-range historical export or admin truth sample.
- Run `npm run check:source-agreement-failure-detail`.
- Run `npm run check:analytics-panel-hydration`.
- Keep missing first-party days labeled source missing until a bounded source window proves zero.

## Does Not Prove

- Runtime/provider smoke
- Production admin truth samples
- Payment or GumDrop treasury correctness
- Browser visual QA
- Full all-launch first-party recovery

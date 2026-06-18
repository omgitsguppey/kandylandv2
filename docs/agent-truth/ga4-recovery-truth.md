# GA4 Recovery Truth

Generated: 2026-06-18T08:31:13.149Z
Current code version: 2e9b7990d25ab93302a1814ef28f667d56e37a75

## Summary

- GA4 status: config_missing
- Client GA4 configured: no
- Server Data API configured: no
- First-party analytics primary: yes
- GA4 evidence-only: yes
- Missing GA4 shown as unavailable, not zero: yes
- Default Data API calls blocked: yes
- Consent gate respected: yes
- Retry/cost guard present: yes
- Evidence states classified: yes
- Recovery timeline mapped: yes

## Inventory

- fixed: Client GA4 support exists through a consent-gated evidence tracker.
- fixed: Server Data API dependency exists but is classified as external evidence.
- fixed: Analytics source hierarchy keeps first-party event facts and rollups as product truth.

## Admin Integration

- fixed: Missing GA4 config no longer blocks the historical admin analytics route.
- fixed: Missing GA4 evidence is displayed as unavailable and never as zero traffic.
- fixed: Admin historical analytics keeps first-party sources canonical and GA4 as external evidence.

## Client Integration

- fixed: Client GA4 cannot load without a public measurement ID.
- fixed: Client GA4 respects the existing analytics consent gate.
- fixed: Root layout mounts the GA4 evidence tracker once without replacing first-party DeepTracker.

## Cost Guards

- fixed: Default admin analytics load does not call GA4 Data API.
- fixed: GA4 evidence refresh requires explicit refresh and respects the retry TTL.

## Recovery Timeline

- fixed: GA4 evidence states classify config_missing, unavailable, evidence_only, imported_sample, and stale without producing product truth.
- fixed: Known GA4 event names map into recovery timeline evidence entries with source labels.
- fixed: GA4 commerce/GumDrop evidence is rejected from product truth without first-party ledger corroboration.

## Next Fix Order

1. If owner-approved GA4 evidence is needed, add measurement/property configuration and run only explicit refreshes.
2. Keep first-party analytics event facts and rollups as product truth for admin totals.
3. Use GA4 snapshots as external comparison evidence, not live totals.

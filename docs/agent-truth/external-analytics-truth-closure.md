# External Analytics Truth Closure

Generated: 2026-05-19T23:03:46.560Z
Current code version: e395c1d8c55c5645f92672a67a5ec19542ecaeec

## Summary

- GA4 statuses: ga4_server_configured, ga4_evidence_only
- PostHog statuses: posthog_missing
- First-party analytics primary: yes
- External analytics product truth: no
- Missing external analytics shown as zero traffic: no
- GA4 client env gated: yes
- GA4 client consent gated: yes
- PostHog env gated: yes
- PostHog consent gated: yes
- GA Data API default load blocked: yes

## Inventory

- fixed: External analytics truth contract exists.
- fixed: External analytics truth contract validates.
- fixed: Existing GA4 recovery truth helper and consent-gated tracker are reused.

## GA4 Findings

- fixed: GA4 has explicit statuses and no unknown state.
- fixed: GA4 client tracker is gated by NEXT_PUBLIC_GA_MEASUREMENT_ID; current App Hosting source does not expose that public key.
- fixed: GA4 client tracker respects analytics consent.
- fixed: GA4 server evidence is configured in source through GA_PROPERTY_ID and the Data API dependency.
- fixed: GA4 remains external evidence only.

## PostHog Findings

- fixed: PostHog has explicit status and no unknown state.
- fixed: PostHog provider is source-gated and current App Hosting source does not configure PostHog.
- fixed: PostHog capture respects analytics consent.

## Admin Evidence

- fixed: Missing external analytics is unavailable evidence, not zero traffic.
- fixed: External analytics cannot override first-party event facts and rollups.
- fixed: GA Data API calls remain blocked on default admin analytics load.

## Docs

- fixed: Docs keep GA4 as evidence/export, not product truth.
- fixed: Docs do not claim unsupported live GA4 product truth.

## Fixes Applied

- fixed: Added external analytics truth contract.
- fixed: Added external analytics truth validator.
- fixed: Added external analytics truth unit coverage.

## Next Fix Order

1. If client GA4 evidence is owner-approved, add NEXT_PUBLIC_GA_MEASUREMENT_ID in deployment config in a dedicated config pass.
2. Keep GA Data API evidence behind explicit refresh and TTL; do not call it from default admin loads.
3. If PostHog evidence is owner-approved, configure NEXT_PUBLIC_POSTHOG_KEY and keep consent gating intact.

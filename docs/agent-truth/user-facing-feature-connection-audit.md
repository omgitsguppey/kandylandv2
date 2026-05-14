# User-Facing Feature Connection Audit

Artifact: `agent/state/user-facing-feature-connection-audit.generated.json`  
Validator: `npm run check:user-facing-feature-connection-audit`

## Scope

This pass audits creator-facing feature connections without changing UI design. It checks Creator Dashboard sections, Fan Pass, calls/bookings, custom requests, paid chat, broadcasts, wallet guidance, route targets, race guards, and cost-bleed risks.

No providers, production reads, BigQuery jobs, deploys, Playwright, Cypress, Lighthouse, polling, or new realtime listeners were run or added.

## Current Results

- Surfaces scanned: 9.
- Fake-live risks: 0 after the source metadata mapping.
- Race-condition risks: 0 after request-id guards were added for creator settings and broadcasts.
- Cost-bleed risks: 0.
- Self-loop links: 0.
- P0: 0.
- P1: 2.
- P2: 1.

## Source Truth Changes

`/api/creator/settings` now returns `statsEvidence` next to the existing `stats` object. The evidence is derived from the existing reads only:

- `creator_ledger_accruals`
- `creator_payout_requests`
- `creator_subscriptions`
- `creator_custom_requests`
- `creator_call_bookings`
- `creator_relationships_ops`
- `drops`
- `users`

No new collection scans were added.

## Remaining Gaps

- Requests are source-backed but inline-only until a dedicated dashboard request management target exists.
- Bookings are source-backed and configuration-only until a dedicated dashboard booking management target exists.
- Fan Pass in Creator Dashboard is guidance/configuration only; the purchase flow remains on the public creator experience path.

Do not restore `/dashboard/creator` self-loop "Open section" links for inline-only cards. Add real destinations first.

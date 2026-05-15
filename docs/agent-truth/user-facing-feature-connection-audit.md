# User-Facing Feature Connection Audit

Authority: Current authority for creator-facing feature connection audit and no-orphan-action rules.  
Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

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
- P1: 0.
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

Creator operation writes now use the bounded JSON body parser before route schema parsing for:

- `/api/creator/settings`
- `/api/creator/broadcasts`
- `/api/creator/requests`
- `/api/creator/bookings`
- `/api/creator/subscriptions`

## Remaining Gaps

- Requests are connected to `CreatorRequestsManager`, which uses the existing `/api/creator/requests` GET/PUT route with read-only and pending-action guards.
- Bookings are connected to `CreatorBookingsManager`, which uses the existing `/api/creator/bookings` GET/PUT route with read-only and pending-action guards.
- Fan Pass in Creator Dashboard is subscriber visibility only through `CreatorFanPassManager`; the public creator experience path owns Fan Pass membership changes.
- Fan Pass and bookings still show configuration-only states when settings, restrictions, pricing, or availability make them unavailable.
- Messages link to `/dashboard/chat` only when messaging is enabled and unrestricted.

Do not restore `/dashboard/creator` self-loop "Open section" links for inline-only cards. Add real destinations first. No orphan button, fake CTA, or placeholder action may appear live without a real route/action, permission guard, pending guard, and unavailable/error state.

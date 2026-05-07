# Legal Payment User-Trust Copy

Status: Launch audit doctrine  
Last updated: 2026-05-02  
Scope: User-facing clarity for GumDrops, wallet refills, unlocks, Drop expiry, notifications, access, and support.

This document is not legal advice. It records product-copy truth and consistency checks so future agents do not invent legal claims or weaken launch-critical user trust.

## Doctrine

- GumDrops are currency-like product units for access inside KandyDrops, not cash.
- Product UI should call them `GumDrops` unless a legal page intentionally quotes the existing legal wording.
- Bonus, promo, reward, or admin-granted GumDrops must not be presented as cash value, refundable value, or revenue.
- Purchase UI must show the USD amount and total GumDrops before checkout.
- Purchase UI must preserve source-of-funds truth while keeping package rows compact.
- Unlock UI must show the GumDrops cost before the user confirms the unlock.
- Expiration copy must distinguish public Drop availability from owned library access.
- Notification permission copy must say what notifications are for before asking users to enable them.
- Terms, Privacy, and Support paths must be reachable or the missing path must be documented as a launch risk.
- User-facing copy must not promise realtime earnings, realtime analytics, guaranteed future Drop return, refunds, or legal rights that are not already present in the legal docs.

## Current Launch Truth

Terms and Privacy:
- `/terms` defines Gum Drops as a limited, non-transferable, revocable license for digital content access and says they are not real currency, have no monetary value, and cannot be redeemed for cash.
- `/privacy` explains account, commerce, notification, optional analytics, service activity, PayPal, Firebase/Google Cloud, and in-site support paths.

Wallet refill:
- `src/components/PurchaseModal.tsx` uses the canonical GumDrop economics helpers.
- Package rows show total delivered GumDrops, USD price, and a compact bonus indicator before checkout.
- The success state repeats credited GumDrops and secured USD amount while source-of-funds details remain in backend/admin truth.

Unlock:
- Drop cards display the GD cost on the card.
- Drop preview uses `Unwrap for {cost} GD` and then `Confirm {cost} GD?`.
- Insufficient-balance copy states the action cost, current balance, and shortfall.

Expiration and owned access:
- Timer copy may show `Ends in ...` or final-day countdown only.
- FAQ says expired public Drops disappear from the public Drops page if the user did not unwrap them.
- FAQ and Library copy say unwrapped Drops remain available in the dashboard Library.
- Onboarding copy must say expired Drops leave the public Drops page, not that owned access disappears.

Notifications:
- Onboarding and profile settings explain live-drop, daily-loop, task, in-app, new-release, and ending-soon alerts.
- Permission copy should stay specific to anticipated notifications and avoid spammy urgency.

Support:
- Signed-in users can open `/dashboard/support`.
- FAQ gives `support@kandydrops.com` for purchase, account, and general support.
- Privacy links to in-site support.
- 404 currently returns users to the app. It does not expose a direct public support contact; that is documented as a medium launch warning, not a hidden pass.

## Allowed Copy Patterns

- `Get GumDrops`
- `Refill GumDrops`
- `Unwrap for 50 GD`
- `Confirm 50 GD?`
- `500 GumDrops + bonus`
- `This action costs 50 GumDrops.`
- `Expired Drops leave the public Drops page.`
- `Unwrapped Drops stay in your Library.`
- `Turn on alerts for live Drops and daily resets.`
- `Contact support if a purchase, unlock, or account issue needs review.`

## Avoid

- Calling GumDrops tokens, coins, points, or cash.
- Saying bonus GumDrops are worth cash.
- Saying a user bought a Drop when they spent GumDrops to unlock access.
- Saying a Drop is gone after expiry without explaining that owned Library access remains.
- Promising a Drop will return after expiry.
- Promising refunds or realtime earnings unless counsel and product source-of-truth explicitly add that copy.
- Sending users to a missing support path.

## Validation

Run:

```bash
npm run check:legal-payment-copy
```

The validator checks:
- `agent/state/legal-payment-copy-audit.generated.json` exists and records every required clarity lane.
- Wallet package copy stays compact while backend/admin truth preserves paid-source and bonus-source accounting.
- Unlock UI shows cost before action.
- Terms, Privacy, and Support paths exist or missing state is documented.
- Bonus/promo copy does not imply cash value.
- Expiration copy is consistent across onboarding, FAQ, Drop cards, preview, Library, and Viewer.
- Notification permission purpose copy exists.
- Governance ledgers record the audit.

Future agents must update this document and the validator before changing launch-critical payment, unlock, expiration, support, or notification trust copy.

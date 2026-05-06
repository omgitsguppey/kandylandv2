# Platform Economy Commerce Controls

Status: canonical admin economy contract  
Recorded: 2026-05-06

## Doctrine

Platform Economy is the canonical GumDrops treasury and commerce control center. Packages, promos, offers, redemptions, warnings, and drift checks must all defer to ledger/source-of-funds truth and PayPal purchase verification. Admin UI may summarize this state, but it must not redefine package pricing, source-of-funds classification, or creator spend restrictions.

Platform Economy cannot drift. Any GumDrops balance, package, promo, discount, bonus, reward, spend, creator payout, expiration, forfeit, refund, or adjustment must resolve to the canonical ledger/source-of-funds model. Admin UI may summarize, but it cannot redefine economy math.

## Required Controls

- Package manager
- Promo/discount manager
- Offer manager
- Redemption audit
- Drift detector
- Warning inventory

## Economic Rules

- Base rate anchor: `$1 = 100 GD`
- Warning floor: effective value below `$0.50 / 100 GD` must warn
- Paid package bonus GumDrops remain paid-source bonus
- Promo codes must be case-normalized
- Promo redemptions must be idempotent
- Non-stackable promos are default
- Expired promos must not apply
- Risky below-floor overrides require admin reason

## Route Contract

Admin-only routes:

- `GET /api/admin/economy/treasury`
- `GET /api/admin/economy/packages`
- `POST/PATCH /api/admin/economy/packages`
- `GET /api/admin/economy/promos`
- `POST/PATCH /api/admin/economy/promos`
- `GET /api/admin/economy/offers`
- `POST/PATCH /api/admin/economy/offers`
- `GET /api/admin/economy/redemptions`
- `GET /api/admin/economy/drift`

All mutation routes require admin auth, trusted origin, typed errors, version bumps, and bounded reads.

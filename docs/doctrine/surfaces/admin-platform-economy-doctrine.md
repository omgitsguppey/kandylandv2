# Admin Platform Economy Doctrine

Authority: canonical admin economic truth surface for GumDrops treasury, packages, promos, offers, redemptions, warnings, drift, and source-of-funds review.

## Priority

Platform Economy is the top admin economic truth surface. Anything GumDrops touches must resolve through ledger and source-of-funds truth first, then Platform Economy summaries, then lower admin and user projections.

## Rules

- Platform Economy cannot drift. Any GumDrops balance, package, promo, discount, bonus, reward, spend, creator payout, expiration, forfeit, refund, or adjustment must resolve to the canonical ledger/source-of-funds model.
- `$1 = 100 GumDrops` is the base rate anchor.
- Warn when effective paid-source value drops below `$0.50 per 100 GD`.
- Paid package bonus GumDrops remain paid-source bonus, not reward/free.
- Reward, check-in, onboarding, referral, and admin promo grants not tied to a paid package remain reward/free source.
- Admin UI may summarize economy math, but it cannot redefine it.
- Package, promo, offer, redemption, warning, and drift rows must expose source truth, freshness, effective rate, and explicit warnings.
- Lower surfaces must fail or mark drift when they disagree with Platform Economy.

## Must Not

- Do not let wallet display redefine paid vs reward source-of-funds truth.
- Do not silently reconcile package, promo, wallet, revenue, or ledger mismatches by display-only math.
- Do not activate below-floor or missing-basis configs without explicit admin override reason.
- Do not classify paid package bonus GumDrops as reward/free.

## Canonical Authority Order

1. Server ledger/source-of-funds contract
2. Platform Economy Treasury Console
3. Payment/capture route truth
4. Wallet display
5. Admin overview/revenue cards
6. Debug reports
7. User-facing UI

## Validators

- `check:platform-economy-treasury`
- `check:platform-economy-commerce-controls`
- `check:gumdrop-source-of-funds-truth`
- `check:purchase-telemetry-truth`

## Deterministic Hardening Addendum

Platform Economy is the ultimate GumDrops Treasury and Commerce Control Center.
Platform Economy is the ultimate economic truth for GumDrops treasury, package value basis, promo/bonus classification, and source-of-funds splits. Every GD row must split paidGd, paidBonusGd, rewardFreeGd, adminAdjustmentGd, pendingGd, heldGd, spentGd, expiredGd, forfeitedGd, and unknownSourceGd when the source supports it; missing splits are review, not healthy.

Canonical deterministic helper: `src/lib/deterministic-admin-truth.ts`.

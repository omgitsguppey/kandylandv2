# GumDrop Source-Of-Funds Truth

Status: canonical source-of-funds doctrine  
Recorded: 2026-05-06

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments.

## Canonical Source Order

1. Server purchase verification
2. Ledger/source-aware balance helpers
3. Platform Economy treasury and commerce controls
4. Wallet display
5. Admin overview and debug summaries

## Required Ledger Metadata

Future purchase ledger rows should carry:

- `packageId`
- `promoId`
- `offerId`
- `priceUsdBeforeDiscount`
- `discountUsd`
- `priceUsdPaid`
- `basePaidGd`
- `bonusPaidGd`
- `rewardPromoGd`
- `effectiveUsdPer100Gd`
- `sourceOfFundsBreakdown`
- `idempotencyKey`
- `orderId`
- `paypalCaptureId`

## Guardrails

- Paid package bonus must never classify as reward/free.
- Reward GumDrops must never satisfy paid-only creator spend restrictions.
- Platform Economy warnings must surface drift rather than redefining balances.

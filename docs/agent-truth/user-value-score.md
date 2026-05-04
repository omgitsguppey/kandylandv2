# User Value Score

KandyDrops admin value scoring is a canonical paid-value model, not a loose mix of spend, bonus delivery, and reward behavior.

## Goal

Prioritize users by proven paid value while still exposing conversion readiness:

- total spend
- purchase count
- purchase recency
- post-purchase usage
- free-to-paid conversion signal

## Canonical helper

Source of truth: `src/lib/behavioral/user-value-score.ts`

User Management and Admin User Detail must read the same value object through route payloads and the shared behavior rollup. UI code must not recalculate spend/value tiers locally.

## Inputs

- `totalSpendUsd`
- `purchaseCount`
- `paidGdPurchased`
- `bonusGdDelivered`
- `rewardGdEarned`
- `freeGdEarned30d`
- `unwrapsAfterPurchase`
- `daysSinceLastPurchase`

## Score formula

```ts
spendComponent = logNorm(totalSpendUsd, 500)
purchaseCountComponent = logNorm(purchaseCount, 20)
recencyComponent = recencyDecay(daysSinceLastPurchase, 30)
postPurchaseUsageComponent = logNorm(unwrapsAfterPurchase, 50)
freeConversionComponent = min(1, freeGdEarned30d / 500) * (hasNoPurchase ? 1 : 0.4)

valueScore = round(100 * (
  0.45 * spendComponent +
  0.25 * purchaseCountComponent +
  0.12 * recencyComponent +
  0.10 * postPurchaseUsageComponent +
  0.08 * freeConversionComponent
))
```

## Tier mapping

- `0-19`: `observer`
- `20-39`: `warm`
- `40-59`: `buyer`
- `60-79`: `repeat_buyer`
- `80-100`: `VIP`

## Revenue truth

- Gross cash spend and purchase count matter most.
- Reward behavior is a conversion predictor, not paid value.
- Bonus GD delivered in paid packages remains paid-source GD in economy truth.
- Bonus GD is **not** extra cash revenue and must never be added to `totalSpendUsd`.

## UI rules

- Admin user cards may show the value verdict and score.
- Admin detail shows value verdict first, then the top reasons.
- Bonus-versus-revenue truth must remain explicit on the admin detail surface.

## Regression lane

Run:

```bash
npm run check:user-value-score
```

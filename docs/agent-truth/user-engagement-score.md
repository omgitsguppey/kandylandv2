# User Engagement Score

KandyDrops admin user engagement is a canonical behavioral score, not an ad hoc count.

## Goal

Replace vague engagement numbers with a score aligned to actual product goals:

- unwraps
- paid purchases
- valid watch time
- repeat visits
- meaningful actions
- free-GD intent with lower weight

## Canonical helper

Source of truth: `src/lib/behavioral/user-engagement-score.ts`

Both Admin User Management and Admin User Detail must read the same score object through route payloads. UI code must not re-derive its own engagement math.

## Inputs

- `normalizedActionCount7d`
- `unwrappedCount30d`
- `validWatchMinutes30d`
- `purchaseCount90d`
- `activeDays7d`
- `freeGdEarned30d`

## Normalization

- `logNorm(value, cap) = min(1, log10(value + 1) / log10(cap + 1))`
- `recencyDecay(ageDays, halfLifeDays) = pow(0.5, ageDays / halfLifeDays)`

`recencyDecay` is available for future diagnostics. The production score currently follows the weighted formula below.

## Score formula

```ts
actionComponent = logNorm(normalizedActionCount7d, 100)
unwrapComponent = logNorm(unwrappedCount30d, 25)
watchComponent = logNorm(validWatchMinutes30d, 180)
purchaseComponent = logNorm(purchaseCount90d, 10)
returnComponent = activeDays7d / 7
freeIntentComponent = logNorm(freeGdEarned30d, 1000)

engagementScore = round(100 * (
  0.12 * actionComponent +
  0.23 * unwrapComponent +
  0.23 * watchComponent +
  0.20 * purchaseComponent +
  0.14 * returnComponent +
  0.08 * freeIntentComponent
))
```

## Tier mapping

- `0-19`: `dormant`
- `20-39`: `light`
- `40-59`: `active`
- `60-79`: `engaged`
- `80-100`: `power`

## Free GD rule

Free-earned GD is low-weight intent, not primary value. Paid actions must outweigh free-only behavior.

## Returner truth

The old label `7 day returners` is deprecated in admin UI.

Canonical admin wording:

- `Returned in last 7 days`

A user qualifies when they logged in, visited, or produced a valid tracked event in the last 7 days.

## UI rules

- User Management shows verdict-first engagement, not raw math-first.
- User Detail shows verdict plus top 3 reasons.
- Raw components stay diagnostic, not primary.

## Regression lane

Run:

```bash
npm run check:user-engagement-score
```

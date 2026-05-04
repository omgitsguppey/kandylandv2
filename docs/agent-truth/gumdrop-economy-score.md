# GumDrops Economy Score

Status: Active public beta economy truth scorer  
Last updated: 2026-05-04  
Score command: `npm run score:economy`  
Validator: `npm run check:gumdrop-economy`  
Generated report: `agent/state/gumdrop-economy-score.generated.json`

## Doctrine

GumDrops economy scoring is deterministic. It exists to prevent paid/reward balance regressions without manual terminal audit sprawl, browser automation, or broad suite runs. The scorer reads source files and targeted tests only; it does not mutate economy logic.

Paid package base GumDrops are paid-source GumDrops. Paid package bonus GumDrops are also paid-source GumDrops. Both credit `gumDropsPurchasedBalance` and can be used on paid-only creator monetization surfaces.

Reward-source GumDrops are only non-purchase rewards such as check-ins, daily tasks, referrals, onboarding, or admin reward adjustments. They credit `gumDropsRewardBalance`.

Creator experiences, chat, subscriptions, requests, and bookings spend purchased balance only. Normal Drops may use total source-aware balance. Transaction metadata must preserve `paidGumDrops`, `bonusGumDrops`, delivered totals, purchase bonus metadata, and purchased/reward spend fields.

Wallet UI is not required to expose source split everywhere. Source-of-funds truth is backend/audit/telemetry truth first; visible wallet layout should not be treated as the canonical source classifier.

## Scored Surfaces

The scorer checks:

- `src/lib/gumdrop-ledger.ts`
- `src/lib/gumdrop-economics.ts`
- `src/app/api/paypal/capture/route.ts`
- reward credit routes for check-in, tasks, onboarding, referral, and admin adjustments
- `src/lib/server/creator-experiences.ts`
- creator chat/subscription/request/booking spend routes
- `src/app/api/drops/unlock/route.ts`
- targeted ledger, PayPal capture, and economics tests

## Findings

Each finding includes:

- file path and line when available
- severity and category
- exact title
- score impact
- suggested fix
- autofix safety truth
- human-readable escalation

Critical findings force `fail` regardless of numeric score. The scorer currently does not auto-fix economy findings because payment, source-of-funds, creator monetization, and unlock behavior require explicit owner review and targeted tests.

## Commands

```bash
npm run score:economy
npm run check:gumdrop-economy
npx vitest run --config vitest.contracts.config.ts tests/unit/gumdrop-ledger.spec.ts tests/unit/lib/gumdrop-economics.spec.ts tests/unit/paypal-capture-route.spec.ts
```

Forbidden default commands for this lane: Playwright, Lighthouse, Cypress, full `npm run check`, and broad UI audits.

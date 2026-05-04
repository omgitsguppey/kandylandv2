# Payment Wallet Unlock Entitlement

Status: launch-critical source-truth guard  
Recorded: 2026-05-01

Machine-readable audit: `agent/state/payment-unlock-security-audit.generated.json`  
Validator/doc owner: `docs/agent-truth/payment-wallet-unlock-entitlement.md`

## Doctrine

Money and access flows are server-truth only. The browser may request a purchase, unlock, or content stream, but it never decides balance, paid-source versus reward-source Gum Drops, revenue, or entitlement.

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments. Wallet UI may display total delivered package value, but backend source-of-funds truth must preserve paid vs reward source correctly.

The wallet modal uses compact public-beta density. Package cards show total delivered GumDrops, package label, price, and purple bonus chip only. The visible paid/bonus explanatory subcopy is removed to reduce vertical sprawl. The balance chip shows source-aware free GD and paid GD. Backend source-of-funds accounting and telemetry remain unchanged.

Wallet v1 renders one PayPal checkout button on-page. KandyDrops does not CSS-hide PayPal iframes or buttons. Funding-source visibility is controlled through PayPal SDK configuration or PayPalButtons fundingSource. PayPal may still offer eligible funding methods after buyer enters PayPal; KandyDrops only controls the on-page button stack.

## Source Truth Rules

- Gum Drops package pricing is defined by `src/lib/gumdrops-packages.ts`.
- PayPal order creation binds the authenticated user and requested package in `custom_id` as `userId:expectedDrops`.
- PayPal capture must verify status, USD amount, expected package price, and the server-created `custom_id` user/package binding before any credit.
- PurchaseModal renders the on-page checkout as a PayPal-only funding-source button and may also disable extra SDK funding sources through the shared `PayPalScriptProvider` options. It must not CSS-hide PayPal iframes/buttons or fall back to stacked card/paylater buttons.
- Purchase economics still record `paidGumDrops`, `bonusGumDrops`, and delivered totals from `src/lib/gumdrop-economics.ts`, but paid-pack base and paid-pack bonus both credit purchased/paid-source balance through `src/lib/gumdrop-ledger.ts`.
- PurchaseModal may show compact source-aware balance display and compact package cards, but it must not change package delivery totals, checkout expectedDrops, PayPal behavior, or source classification.
- Promo, reward, referral, onboarding, task, check-in, and admin grant Gum Drops credit reward-source balance and are not revenue.
- Paid-pack bonus GumDrops are purchase bonus metadata and paid-source spendable balance, not reward-source balance.
- Revenue is counted only from completed `purchase_currency` ledger rows.
- Unlock deduction happens inside a Firestore transaction.
- A repeated unlock request must return existing entitlement without a second deduction.
- Secure content access requires either `unlockedContent` entitlement or creator ownership.
- Raw content URLs must not appear in initial viewer HTML.
- Admin balance adjustments require admin auth, trusted origin, reason, and structured audit metadata.
- Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.
- Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.

## Fixed In This Pass

- PayPal capture identity binding: a completed PayPal capture without `custom_id` now fails before crediting balance.
- PayPal capture package binding: `custom_id` package amount must match the requested package.
- Creator entitlement: the secure content proxy now mirrors the viewer client and allows a drop creator to view their own media without a paid unlock.
- Unlock parity metadata: unlock ledger rows include `unlockSource`, `purchasedAmountSpent`, and `rewardAmountSpent`.
- Admin adjustment audit: adjustment rows include admin uid, admin email, reason, source route, and `auditedServerSide`.

## Debug And Parity Expectations

Debug may show exact transaction ids, PayPal capture ids, route names, and source split fields. Main UI must not imply that bonus/admin grant Gum Drops are paid revenue.

Required evidence fields:

- `paymentId`
- `paypalCaptureId`
- `grossRevenueCents`
- `paidGumDrops`
- `bonusGumDrops`
- `purchaseBonusGumDrops`
- `purchasedBalanceCreditGumDrops`
- `rewardBalanceCreditGumDrops`
- `purchaseSourceClassification`
- `purchasedAmountSpent`
- `rewardAmountSpent`
- `adjustedByUid`
- `adjustmentReason`
- `auditedServerSide`

## Validation

Run:

- `npm run check:payment-unlock-security`
- `npm run typecheck -- --pretty false`
- `npx vitest run tests/unit/paypal-capture-route.spec.ts tests/unit/drops-unlock-route.spec.ts tests/unit/drops-content-route.spec.ts tests/unit/admin-balance-route.spec.ts tests/unit/gumdrop-ledger.spec.ts tests/unit/gumdrops-packages.spec.ts tests/unit/gumdrop-economics.spec.ts`

Run Firebase rules only when security rules change:

- `npm run check:firebase:rules`

## Future Agent Rules

- Do not use client-provided balance or entitlement as source truth.
- Do not credit a PayPal capture missing the server-created custom id.
- Do not clear, rewrite, or bypass payment locks.
- Do not make paid-pack bonus GumDrops count as reward-source balance; they are paid-source balance even though they remain purchase bonus metadata.
- Do not reintroduce visible paid/bonus explanatory subcopy under wallet package cards; source split truth belongs in telemetry/backend fields and the compact free/paid balance chip.
- Do not reintroduce stacked PayPal, Pay Later, Debit, or Credit Card buttons into Wallet v1. Use PayPal SDK funding-source controls instead of CSS hiding.
- Do not make promo, reward, referral, daily task, onboarding, or admin adjustment Gum Drops count as revenue or paid-source creator spend balance.
- Do not expose raw private content URLs to the browser before entitlement verification.
- Do not change payment/write flows without route tests and this validation lane.

# Payment Wallet Unlock Entitlement

Status: launch-critical source-truth guard  
Recorded: 2026-05-01

Machine-readable audit: `agent/state/payment-unlock-security-audit.generated.json`  
Validator/doc owner: `docs/agent-truth/payment-wallet-unlock-entitlement.md`

## Doctrine

Money and access flows are server-truth only. The browser may request a purchase, unlock, or content stream, but it never decides balance, paid versus bonus Gum Drops, revenue, or entitlement.

## Source Truth Rules

- Gum Drops package pricing is defined by `src/lib/gumdrops-packages.ts`.
- PayPal order creation binds the authenticated user and requested package in `custom_id` as `userId:expectedDrops`.
- PayPal capture must verify status, USD amount, expected package price, and the server-created `custom_id` user/package binding before any credit.
- Purchase credit is split into purchased Gum Drops and bonus/reward Gum Drops by `src/lib/gumdrop-economics.ts`.
- Promo, bonus, reward, and admin grant Gum Drops are not revenue.
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
- Do not make bonus, promo, reward, referral, daily task, onboarding, or admin adjustment Gum Drops count as revenue.
- Do not expose raw private content URLs to the browser before entitlement verification.
- Do not change payment/write flows without route tests and this validation lane.

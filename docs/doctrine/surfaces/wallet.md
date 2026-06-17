# Wallet Doctrine

Authority level: 4

Owner: wallet/payment/GumDrops

## Must

- Anchor revenue and user value to server purchase or ledger transaction truth.
- Preserve paid vs reward GumDrop source accounting.
- Show source-aware reward GD and paid GD where balance source matters.
- Keep PayPal capture and ledger facts as canonical purchase evidence.
- Treat missing source-of-funds, ledger, entitlement, or provider evidence as unavailable or source_missing, not zero.
- Keep GumDrop simplification work tied to one canonical owner before removing duplicate displays, adapters, or reports.

## Must Not

- Count client-only purchase completion as revenue.
- Reintroduce total-only balance chips as canonical wallet truth.
- Hide PayPal button stacks with CSS.
- Spend reward-only GumDrops on paid-only creator monetization.
- Use analytics, GA4, legacy events, screenshots, or operator memory to credit, debit, unlock, refund, or prove exact revenue.
- Collapse paid base GumDrops, paid package bonus GumDrops, reward GumDrops, task rewards, admin grants, or unknown legacy balances into one total when source eligibility matters.
- Mark unknown legacy money as exact product truth without ledger or provider corroboration.

## Source Truth

- Server capture route, GumDrop ledger, transaction id, sourceTruth.

## GumDrop Truth Simplification

- Canonical package price and delivered-value truth belongs to `src/lib/gumdrops-packages.ts` and purchase economics helpers, not component copy or generated reports.
- Canonical source-of-funds truth belongs to the GumDrop ledger and server ledger/math owners. Paid package base GumDrops are `paid_gd`; paid package bonus GumDrops are `paid_bonus_gd`; reward-only paths are `reward_gd`, `task_reward_gd`, `admin_grant_gd`, or another explicit reward-source bucket.
- Paid-only creator monetization, Fan Pass, creator chat, subscriptions, requests, bookings, and other paid-source gates may use only paid-source buckets. Reward-source or unknown legacy GumDrops cannot satisfy paid-only eligibility.
- Legacy total-only wallet balances may support display, review, recovery, and normal any-source unlock compatibility, but they must not be promoted to purchased balance for paid-only creator, Fan Pass, creator chat, subscription, request, booking, or payment-adjacent gates.
- Normal drop unlocks may use the source-aware total only when the server ledger and entitlement flow prove the spend and resulting access.
- Revenue is exact only from completed server transaction or purchase-currency ledger truth. Provider smoke, manual proof, and admin truth samples are separate evidence gates and cannot be cleared by source-only tests.
- Entitlement truth is access truth, not payment truth. Existing entitlements may prevent duplicate deduction, but they do not prove new revenue.
- Analytics, GA4, legacy recovery, and admin debug evidence may corroborate or explain gaps, but they must stay evidence-only unless a ledger/provider-backed recovery plan is separately approved.
- Admin and wallet UI may simplify duplicate panels, labels, or chips only after each displayed value maps to a canonical owner, source state, freshness/confidence state, and validator. If the owner is missing, show unavailable, source_missing, protected_manual_review, or recovery_required instead of a live zero.
- Unknown legacy money is protected manual review. It must stay excluded from exact balance, exact revenue, paid-only authorization, and entitlement repair until ledger/provider corroboration exists.

## Verification Gates

- Source validators may prove formulas, owner wiring, idempotency, source buckets, and missing-vs-zero behavior.
- Runtime/admin/provider gates require their own evidence. Source validators must not mark provider smoke, runtime route health, admin truth samples, or production recovery as passed.
- Before changing GumDrop math, source-of-funds, wallet spend, creator monetization, PayPal capture, entitlement, refund, or recovery behavior, run the narrow validator for that owner and the relevant targeted tests. Do not use full-suite or provider checks as an implementation loop.

## Validators

- `check:wallet-density`
- `check:wallet-single-paypal-button`
- `check:purchase-telemetry-truth`
- `check:gumdrop-economy`
- `check:gumdrop-ledger-math`
- `check:gumdrop-source-of-funds-truth`
- `check:treasury-structure-contract`
- `check:treasury-reconciliation-engine`
- `check:platform-economy-treasury`

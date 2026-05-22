# Payment Module Symmetry

Status: source-confirmed UI refinement  
Recorded: 2026-05-22

## Scope

This pass refines only the Kandy Shop Wallet purchase module display. It does not change PayPal/provider runtime, payment API routes, wallet crediting, GumDrop math, source-of-funds classification, package pricing, package delivered amounts, Firebase rules, chat, top nav, or bottom nav.

## Display Contract

- Purchase rows use stable zones: left icon, middle paid amount plus `Paid GD` and package name, right price plus a reserved promo slot.
- Promo badges are display-only and non-wrapping. The initial supported kinds are `bonus`, `sale`, `discount`, `subscription`, `best_value`, `limited`, and `starter`.
- Current bonus copy is `+50 bonus GD`, `+100 bonus GD`, `+500 bonus GD`, and `2x bonus GD`.
- Selected state uses border/tint and price color only; child icon and badge styling stay quieter.
- PayPal remains a single centered provider button with the existing funding source and callbacks.

## Release Note Copy

- Refined payment module copy, symmetry, and mobile density.
- Shortened GumDrop bonus labels for cleaner package rows.
- Kept PayPal, wallet crediting, pricing, and GumDrop math unchanged.

## Protected Runtime Proof

The validator treats these files as protected for this lane:

- `src/app/api/paypal/create/route.ts`
- `src/app/api/paypal/capture/route.ts`
- `src/app/api/wallet/packages/route.ts`
- `src/lib/server/paypal.ts`
- `src/components/PayPalProvider.tsx`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/gumdrop-source-of-funds.ts`
- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrops-packages.ts`

Machine-readable evidence: `agent/state/payment-module-symmetry.generated.json`.

Validation: `npm run check:payment-module-symmetry`.

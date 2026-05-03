# Drop Cover Visibility Truth

Status: Active public beta source-of-truth note for Drop card and Featured carousel presentation state.
Last updated: 2026-05-02.

## Doctrine

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

## Source Owners

- Presentation decision helper: `src/lib/drop-card-visibility.ts`
- Drop card orchestration: `src/components/DropCard.tsx`
- Drop card media/layout: `src/components/DropCardLayout.tsx`
- Featured carousel state and timer chips: `src/components/FeaturedCarousel.tsx`
- Server unlock authority: `src/app/api/drops/unlock/route.ts`
- Payment, ledger, and source-aware spend truth: `src/lib/gumdrop-ledger.ts`, `src/lib/gumdrop-economics.ts`, `src/lib/server/paypal.ts`

## Rules

- Guest card state may use `blurred_guest` and `create_profile`.
- Authenticated users and admins use `userProfile.gumDropsBalance` total balance for normal Drop affordability.
- Authenticated users with enough total GumDrops use `clear` cover treatment and `unwrap` CTA state.
- Authenticated users with a known shortfall use `blurred_insufficient_balance` and `refill`.
- Owned/unwrapped Drops use `owned` and `view`; owned covers remain clear.
- Expired/unavailable Drops use status/timing truth and must not be modeled as an affordability blur.
- Loading shimmer or temporary image blur is separate from product cover treatment.
- Normal Drop cards and Featured carousel must not use creator paid-only balance fields.

## Debug Markers

- `data-drop-cover-treatment`
- `data-drop-cta-state`
- `data-drop-affordability-reason`
- `data-drop-card-auth-state`
- `data-featured-drop-affordability`
- `data-featured-drop-cta-state`
- `data-featured-chip-treatment="adaptive-glass"`

## Validation

Run:

- `npm run check:drop-cover-visibility-truth`
- `npm run check:drops-mobile-refinement`
- `npm run typecheck`

Run payment/unlock security only when server payment, entitlement, ledger, or unlock logic changes:

- `npm run check:payment-unlock-security`

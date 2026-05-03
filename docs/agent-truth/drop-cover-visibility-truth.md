# Drop Cover Visibility Truth

Status: Active public beta source-of-truth note for Drop card and Featured carousel presentation state.
Last updated: 2026-05-02.

## Doctrine

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling. Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views. Drop grid view counts remain unchanged. All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected. Video file chips use a 🎥 camera indicator for clarity.

Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.

## Source Owners

- Presentation decision helper: `src/lib/drop-card-visibility.ts`
- Drop card orchestration: `src/components/DropCard.tsx`
- Drop card media/layout: `src/components/DropCardLayout.tsx`
- Featured carousel state and timer chips: `src/components/FeaturedCarousel.tsx`
- Shared looping title marquee: `src/components/ui/TitleMarquee.tsx`, `src/app/globals.css`
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
- Featured accent selection uses title, tags, type, and image URL keywords only; no canvas, pixel sampling, or runtime image analysis is allowed.
- Featured social proof uses unwraps only when `totalUnlocks > 10`; otherwise it uses `getDropViewCount(drop)`.
- Drop grid view count display remains owned by the existing Drop card view-count path.

## Debug Markers

- `data-drop-cover-treatment`
- `data-drop-cta-state`
- `data-drop-affordability-reason`
- `data-drop-card-auth-state`
- `data-featured-drop-affordability`
- `data-featured-drop-cta-state`
- `data-featured-chip-treatment="cover-aware-glass"`
- `data-featured-cta-accent`
- `data-featured-cta-cover-aware="true"`
- `data-featured-social-proof-type`
- `data-title-marquee-speed="public-beta-fast"`

## Validation

Run:

- `npm run check:drop-cover-visibility-truth`
- `npm run check:featured-carousel-polish`
- `npm run check:drops-mobile-refinement`
- `npm run typecheck`

Run payment/unlock security only when server payment, entitlement, ledger, or unlock logic changes:

- `npm run check:payment-unlock-security`

# Drop Preview Page Truth

Status: Active public beta source-of-truth note for locked Drop preview routing.
Last updated: 2026-05-03.

## Doctrine

Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.

## Source Owners

- Dedicated route: `src/app/drops/[id]/preview/page.tsx`
- Route loading shell: `src/app/drops/[id]/preview/loading.tsx`
- Client state, unlock, and telemetry: `src/components/Drops/LockedDropPreviewClient.tsx`
- Presentation layout and sticky CTA: `src/components/Drops/LockedDropPreviewView.tsx`
- Preview truth and safe fields: `src/lib/locked-drop-preview-truth.ts`
- Telemetry payload enrichment: `src/lib/drop-preview-telemetry.ts`
- Post-unlock profile patch: `src/lib/locked-drop-preview-profile.ts`
- Legacy Drops query handoff: `src/app/drops/page.tsx`
- Entry points: `src/app/drops/DropsClient.tsx`, `src/components/DropCard.tsx`, `src/components/FeaturedCarousel.tsx`
- Library deep-open handoff: `src/app/dashboard/library/LibraryClient.tsx`
- Server unlock authority: `src/app/api/drops/unlock/route.ts`
- Secure content authority: `src/app/api/drops/content/route.ts`

## Rules

- `/drops?drop=<id>` redirects to `/drops/<id>/preview` with source-component context.
- Drop cards and Featured carousel navigate locked preview taps to the dedicated route instead of opening the legacy modal.
- The preview route receives only cover, metadata, title, description, creator, price, timer, file-count, and engagement fields.
- Internal content URLs and internal file thumbnails are never rendered before unlock.
- The cover art remains the sales asset. File count is metadata only.
- Urgency tiers are deterministic: calm, warm under 24h, urgent under 4h, critical under 30m, expired when unavailable.
- Social proof shows unwraps only when `totalUnlocks > 10`; otherwise it shows views.
- Guest CTA opens signup. Insufficient-balance CTA shows the shortfall and opens the wallet with the shortfall as the preferred refill amount.
- Successful unwrap shows `Saved to your KandyDrops.` first, then offers `Open in My KandyDrops` and `Keep Unwrapping`.
- `/dashboard/library?drop=<id>` immediately deep-opens the viewer for owned Drops.
- Unlock, ledger, entitlement, content proxy, and payment logic stay server-truth and unchanged.

## Debug Markers

- `data-drop-preview-page="true"`
- `data-drop-preview-urgency-tier`
- `data-drop-preview-cta-state`
- `data-drop-preview-social-proof-type`
- `data-safe-preview-fields-only="true"`
- `data-drop-preview-sticky-cta-above-bottom-nav="true"`

## Validation

Run:

- `npm run check:drop-preview-page`
- `npm run check:drops-mobile-refinement`
- `npm run check:drop-cover-visibility-truth`
- `npm run check:payment-unlock-security`
- `npm run typecheck`

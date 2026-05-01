# SHORT Task Context

## Goal
simplify final-day drop card countdown typography

Mode: ui
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/components/DropCard.tsx
- src/components/DropGrid.tsx
- src/components/DropCardCta.tsx
- src/components/DropCardLayout.tsx
- src/lib/drop-engagement.ts

## Canonical Helpers To Reuse
- src/lib/telemetry.ts
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- consumed_response_stream_fallback

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/components/DropCard.tsx
- npm run agent:test -- src/components/DropGrid.tsx
- npm run agent:test -- src/components/DropCardCta.tsx
- npm run agent:test -- src/components/DropCardLayout.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

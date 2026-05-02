# SHORT Task Context

## Goal
centralize creator profile routing

Mode: creator
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/lib/creator-public-pages.ts
- src/lib/creator-onboarding.ts
- src/lib/creator-experiences.ts
- src/components/CreatorDiscoveryRail.tsx
- src/lib/server/creator-discovery.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/server/creator-onboarding.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/lib/creator-public-pages.ts
- npm run agent:test -- src/lib/creator-onboarding.ts
- npm run agent:test -- src/lib/creator-experiences.ts
- npm run agent:test -- src/components/CreatorDiscoveryRail.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

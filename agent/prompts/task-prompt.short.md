# SHORT Task Context

## Goal
Finish creator dashboard refinements so the dashboard can be reviewed through real read-only admin creator projection without logging into creator accounts

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/context/AdminViewAsContext.tsx
- src/components/Admin/AdminCreatorViewAsControls.tsx
- src/components/Admin/AdminViewAsBanner.tsx
- src/lib/admin/synthetic-creators-view-as.ts
- src/lib/admin-parity.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/auth.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/context/AdminViewAsContext.tsx
- npm run agent:test -- src/components/Admin/AdminCreatorViewAsControls.tsx
- npm run agent:test -- src/components/Admin/AdminViewAsBanner.tsx
- npm run agent:test -- src/lib/admin/synthetic-creators-view-as.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm --prefix functions run check

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

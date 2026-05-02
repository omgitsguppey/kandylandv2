# SHORT Task Context

## Goal
add creator lane debug parity diagnostics

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/admin/debug/page.tsx
- src/lib/creator-onboarding.ts
- src/lib/admin-debug-preferences.ts
- src/lib/admin-debug-route-runtime.ts
- src/lib/admin-debug-summary-cards.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/creator-onboarding.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- legacy_queue_adapter_usage
- stale_queue_scheduler_heartbeat

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/app/admin/debug/page.tsx
- npm run agent:test -- src/lib/creator-onboarding.ts
- npm run agent:test -- src/lib/admin-debug-preferences.ts
- npm run agent:test -- src/lib/admin-debug-route-runtime.ts
- npm run check:ui:coverage
- npm run check:ui:runtime

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

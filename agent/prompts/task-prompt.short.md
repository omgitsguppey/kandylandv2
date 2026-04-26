# SHORT Task Context

## Goal
improve analytics error handling, retries, and stale UI, ensure no caching on admin surfaces, make site-wide speed enhancements

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
- src/lib/server/firebase-admin.ts
- src/app/admin/analytics/page.tsx
- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx
- src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts

## Canonical Helpers To Reuse
- src/lib/telemetry-catalog.ts
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
- npm run agent:test -- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
- npm run agent:test -- src/lib/server/firebase-admin.ts
- npm run agent:test -- src/app/admin/analytics/page.tsx
- npm run agent:test -- src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

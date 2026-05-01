# SHORT Task Context

## Goal
audit global loading performance and preserve admin analytics hot cache first render

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/admin/analytics/page.tsx
- src/components/Analytics/PageViewEvent.tsx
- src/lib/server/analytics.ts
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx

## Canonical Helpers To Reuse
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts

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
- npm run agent:test -- src/app/admin/analytics/page.tsx
- npm run agent:test -- src/components/Analytics/PageViewEvent.tsx
- npm run agent:test -- src/lib/server/analytics.ts
- npm run agent:test -- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics
- npm --prefix functions run check

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

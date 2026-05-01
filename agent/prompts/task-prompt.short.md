# SHORT Task Context

## Goal
human-readable admin truth diagnostics copy hardening

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx
- src/lib/admin-analytics-audience-snapshot.ts
- src/lib/admin-analytics-auth-outcome-split.ts
- src/lib/admin-analytics-commerce-snapshot.ts

## Canonical Helpers To Reuse
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- sidecar_truth_confusion
- legacy_queue_adapter_usage

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
- npm run agent:test -- src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx
- npm run agent:test -- src/lib/admin-analytics-audience-snapshot.ts
- npm run agent:test -- src/lib/admin-analytics-auth-outcome-split.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

# STANDARD Task Context

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
- src/lib/admin-analytics-preferences.ts
- src/lib/admin-analytics-return-cadence.ts
- src/lib/admin-auth-outcome-chart.ts
- src/lib/admin-notification-funnel.ts
- src/lib/admin-onboarding-velocity.ts

## Canonical Helpers To Reuse
- src/lib/telemetry-catalog.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/auth.ts
- src/lib/server/request-guard.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts
- src/lib/server/server-diagnostics.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- sidecar_truth_confusion
- route_runtime_stale_vs_unseen_confusion
- legacy_queue_adapter_usage

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

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

## Compatibility Verification Fields
- required: npm run check:analytics-semantics
- required: npm run check:analytics:continuity
- required: npm run check:telemetry
- required: npm run check:ui:audits
- required: npm run check:ui:coverage
- required: npm run check:ui:runtime
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

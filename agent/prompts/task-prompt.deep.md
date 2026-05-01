# DEEP Task Context

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
- src/components/Admin/AdminPageHeader.tsx
- src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx
- src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx
- functions/src/analytics-event-facts.ts
- src/lib/analytics-identifiers.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- docs/agent-truth/drops-mobile-refinement.md
- npm run agent:fast-start -- --task="apple style mobile drops page refinement with telemetry preservation" --mode=user --file=src/app/drops/page.tsx
- npm run agent:test -- src/app/drops/page.tsx

## Canonical Helpers To Reuse
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/auth.ts
- src/lib/server/request-guard.ts
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

## Compatibility Verification Fields
- required: npm run check:agent-context
- required: npm run check:analytics-semantics
- required: npm run check:analytics:continuity
- required: npm run check:continuity
- required: npm run check:telemetry
- required: npm run check:ui:audits
- required: npm run check:ui:coverage
- required: npm run check:ui:runtime
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- required: npm run check:ui:lighthouse
- required: npm --prefix functions run check
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/server/analytics.ts
- src/lib/analytics-identifiers.ts
- src/lib/telemetry-catalog.ts
- src/lib/server/firebase-admin.ts

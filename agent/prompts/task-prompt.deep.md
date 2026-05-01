# DEEP Task Context

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
- src/lib/admin-analytics-event-mix.ts
- src/lib/admin-analytics-guest-bounce-quality.ts
- src/lib/admin-analytics-journey-funnel.ts
- src/lib/admin-analytics-live-interaction-stream.ts
- src/lib/admin-analytics-live-pulse.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- agent/state/refresh-cache-loading-audit.generated.json
- docs/agent-truth/refresh-based-hot-cache.md
- scripts/agent/validate-refresh-based-hot-cache.ts

## Canonical Helpers To Reuse
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts
- src/lib/server/server-diagnostics.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/server/auth.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- sidecar_truth_confusion
- legacy_queue_adapter_usage
- queue_activation_missing_notification_outcome
- stale_queue_scheduler_heartbeat

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

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

## Compatibility Verification Fields
- required: npm run check:analytics-semantics
- required: npm run check:analytics:continuity
- required: npm run check:telemetry
- required: npm run check:ui:audits
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/admin-analytics-audience-snapshot.ts
- src/lib/admin-analytics-auth-outcome-split.ts
- src/lib/admin-analytics-commerce-snapshot.ts
- src/lib/admin-analytics-event-mix.ts
- src/lib/admin-analytics-guest-bounce-quality.ts
- src/lib/admin-analytics-journey-funnel.ts
- src/lib/admin-analytics-live-interaction-stream.ts
- src/lib/admin-analytics-live-pulse.ts
- src/lib/admin-analytics-preferences.ts
- src/lib/admin-analytics-return-cadence.ts

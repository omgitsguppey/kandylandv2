# DEEP Task Context

## Goal
harden identified telemetry parity

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/lib/telemetry.ts
- src/lib/server/analytics.ts
- src/lib/analytics-client-engine.ts
- src/lib/analytics-identifiers.ts
- src/lib/analytics-semantics.ts
- src/lib/telemetry-safety.ts
- src/components/Admin/AdminAnalyticsCharts.tsx
- src/components/Admin/AdminCreatorViewAsControls.tsx
- src/components/Admin/AdminModerationConsole.tsx
- src/components/Admin/AiDropCoverGeneratorPanel.tsx
- FULL_SCALE_CODEBASE_AUDIT.md
- admin/users/page.tsx
- agent/state/tracking-surface-coverage.generated.json
- npx vitest run tests/unit/event-fact-truth.spec.ts

## Canonical Helpers To Reuse
- src/lib/telemetry.ts
- src/lib/telemetry-catalog.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/auth.ts
- src/lib/server/request-guard.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- legacy_queue_adapter_usage
- queue_activation_missing_notification_outcome

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/lib/telemetry.ts
- npm run agent:test -- src/lib/server/analytics.ts
- npm run agent:test -- src/lib/analytics-client-engine.ts
- npm run agent:test -- src/lib/analytics-identifiers.ts
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
- src/lib/telemetry.ts
- src/lib/server/analytics.ts
- src/lib/analytics-client-engine.ts
- src/lib/analytics-identifiers.ts
- src/lib/analytics-semantics.ts
- src/lib/telemetry-safety.ts

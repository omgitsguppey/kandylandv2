# DEEP Task Context

## Goal
tighten admin ai runtime health

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/admin/debug/page.tsx
- src/lib/server/firebase-admin.ts
- src/hooks/useAdminOverview.ts
- src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts
- src/app/admin/debug/hooks/useAdminDebugRealtime.ts
- src/lib/admin-debug-preferences.ts
- src/lib/admin-debug-route-runtime.ts
- src/lib/ai-debug-assistant.ts
- src/components/Admin/AdminPageHeader.tsx
- src/components/Admin/AdminStatusBadge.tsx
- FULL_SCALE_CODEBASE_AUDIT.md
- .agent/workflows/dependency-truth.md
- /api/admin/debug
- scripts/agent/check-infrastructure-truth.ts

## Canonical Helpers To Reuse
- src/lib/route-runtime-health.ts
- src/lib/ai-drop-covers.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/ai-drop-covers.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts
- src/lib/server/server-diagnostics.ts
- src/lib/server/auth.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- consumed_response_stream_fallback
- legacy_queue_adapter_usage
- stale_queue_scheduler_heartbeat
- unchecked_response_ok_ui_hydration
- creator_booking_timezone_drift
- silent_ui_fallback_masking_failure

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/app/admin/debug/page.tsx
- npm run agent:test -- src/lib/server/firebase-admin.ts
- npm run agent:test -- src/hooks/useAdminOverview.ts
- npm run agent:test -- src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

## Compatibility Verification Fields
- required: npm run check:ui:audits
- required: npm run check:ui:coverage
- required: npm run check:ui:runtime
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- required: npm run check:telemetry
- required: npm run check:analytics-semantics
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/server/firebase-admin.ts
- src/lib/admin-debug-preferences.ts
- src/lib/admin-debug-route-runtime.ts
- src/lib/ai-debug-assistant.ts
- src/lib/admin-ai-models.ts
- src/lib/admin-analytics-live-runtime.ts

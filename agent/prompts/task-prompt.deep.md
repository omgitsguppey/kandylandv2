# DEEP Task Context

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
- src/lib/ai-debug-assistant.ts
- src/components/Admin/AdminPageHeader.tsx
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- src/lib/creator-application.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- docs/agent-truth/creator-profile-routing.md
- docs/agent-truth/user-chat-shell-routing.md
- npx vitest run tests/unit/creator-profile-routing.spec.ts tests/unit/creator-public-pages.spec.ts tests/unit/creator-profile-route.spec.ts tests/unit/creator-experiences-panel.spec.tsx tests/unit/admin-roster-decision-queue.spec.ts tests/unit/admin-roster-route.spec.ts tests/unit/chat-thread-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/creator-onboarding.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts
- src/lib/server/server-diagnostics.ts
- src/lib/server/auth.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- legacy_queue_adapter_usage
- stale_queue_scheduler_heartbeat
- creator_booking_timezone_drift

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

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

## Compatibility Verification Fields
- required: npm run check:ui:audits
- required: npm run check:ui:coverage
- required: npm run check:ui:runtime
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/creator-onboarding.ts
- src/lib/admin-debug-preferences.ts
- src/lib/admin-debug-route-runtime.ts
- src/lib/admin-debug-summary-cards.ts
- src/lib/ai-debug-assistant.ts
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- src/lib/creator-application.ts
- src/lib/creator-contract.ts
- src/lib/creator-onboarding-projection.ts

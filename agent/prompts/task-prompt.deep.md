# DEEP Task Context

## Goal
centralize creator profile routing

Mode: creator
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/lib/creator-public-pages.ts
- src/lib/creator-onboarding.ts
- src/lib/creator-experiences.ts
- src/components/CreatorDiscoveryRail.tsx
- src/lib/server/creator-discovery.ts
- src/app/creators/[username]/CreatorProfileClient.tsx
- src/app/api/creator/discovery/route.ts
- src/app/api/creator/relationships/route.ts
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- docs/agent-truth/creator-experience-transaction-truth.md
- npx vitest run tests/unit/creator-subscriptions-route.spec.ts tests/unit/creator-requests-route.spec.ts tests/unit/creator-bookings-transaction-route.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/server-creator-experience-transactions.spec.ts tests/unit/gumdrop-ledger.spec.ts tests/unit/creator-experiences.spec.ts
- src/lib/server/chat.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/server/creator-onboarding.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts
- src/lib/server/paypal.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- legacy_queue_adapter_usage
- queue_activation_missing_notification_outcome
- unchecked_response_ok_ui_hydration
- creator_booking_timezone_drift

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/lib/creator-public-pages.ts
- npm run agent:test -- src/lib/creator-onboarding.ts
- npm run agent:test -- src/lib/creator-experiences.ts
- npm run agent:test -- src/components/CreatorDiscoveryRail.tsx
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
- optional: npm run check:analytics-semantics
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/creator-public-pages.ts
- src/lib/creator-onboarding.ts
- src/lib/creator-experiences.ts
- src/lib/server/creator-discovery.ts
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- src/lib/creator-application.ts
- src/lib/creator-contract.ts

# SHORT Task Context

## Goal
Finish creator public profiles as fan conversion pages

Mode: user
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/app/creators/[username]/page.tsx
- src/lib/creator-experiences.ts
- src/lib/creator-profile-routing.ts
- src/app/creators/[username]/CreatorProfileClient.tsx
- src/lib/creator-onboarding.ts

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/server/creator-onboarding.ts
- src/lib/tasks/task-catalog.ts
- src/lib/tasks/task-observability.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- legacy_queue_adapter_usage
- stale_queue_scheduler_heartbeat

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/app/creators/[username]/page.tsx
- npm run agent:test -- src/lib/creator-experiences.ts
- npm run agent:test -- src/lib/creator-profile-routing.ts
- npm run agent:test -- src/app/creators/[username]/CreatorProfileClient.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

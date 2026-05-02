# DEEP Task Context

## Goal
creator experience transaction truth cleanup

Mode: creators
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/components/Creators/CreatorExperiencesPanel.tsx
- src/lib/creator-experiences.ts
- src/lib/creator-onboarding.ts
- src/app/creators/[username]/CreatorProfileClient.tsx
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- src/lib/creator-application.ts
- src/lib/creator-contract.ts
- src/lib/creator-onboarding-projection.ts
- src/lib/server/creator-admin-action-contract.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- /api/admin/creator-agreements
- /api/admin/user/[userId]
- /api/admin/users

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/server/creator-onboarding.ts
- src/lib/telemetry.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- sidecar_truth_confusion
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
- npm run agent:test -- src/components/Creators/CreatorExperiencesPanel.tsx
- npm run agent:test -- src/lib/creator-experiences.ts
- npm run agent:test -- src/lib/creator-onboarding.ts
- npm run agent:test -- src/app/creators/[username]/CreatorProfileClient.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

## Compatibility Verification Fields
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- required: npm run check:ui:audits
- optional: npm run check:architecture

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/creator-experiences.ts
- src/lib/creator-onboarding.ts
- src/lib/creator-agreement-documents.ts
- src/lib/creator-agreement-version.ts
- src/lib/creator-application.ts
- src/lib/creator-contract.ts
- src/lib/creator-onboarding-projection.ts
- src/lib/server/creator-admin-action-contract.ts
- src/lib/server/creator-admin-actions.ts
- src/lib/server/creator-agreement-documents.ts

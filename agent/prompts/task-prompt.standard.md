# STANDARD Task Context

## Goal
Finish creator dashboard refinements so the dashboard can be reviewed through real read-only admin creator projection without logging into creator accounts

Mode: admin
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

## Likely Entrypoints
- src/context/AdminViewAsContext.tsx
- src/components/Admin/AdminCreatorViewAsControls.tsx
- src/components/Admin/AdminViewAsBanner.tsx
- src/lib/admin/synthetic-creators-view-as.ts
- src/lib/admin-parity.ts
- src/lib/creator-experiences.ts
- src/lib/creator-onboarding.ts
- src/lib/server/firebase-admin.ts
- src/app/admin/roster/page.tsx
- src/app/admin/economy/page.tsx

## Canonical Helpers To Reuse
- src/lib/creator-onboarding.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts
- src/lib/server/auth.ts
- src/lib/server/creator-onboarding.ts
- src/lib/server/request-guard.ts
- src/lib/server/route-diagnostics.ts
- src/lib/server/route-runtime-health.ts

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
- npm run agent:test -- src/context/AdminViewAsContext.tsx
- npm run agent:test -- src/components/Admin/AdminCreatorViewAsControls.tsx
- npm run agent:test -- src/components/Admin/AdminViewAsBanner.tsx
- npm run agent:test -- src/lib/admin/synthetic-creators-view-as.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm --prefix functions run check

## Signoff Verification
- npm run check:ui:audits
- npm run check:continuity

## Compatibility Verification Fields
- required: npm run check:ui:audits
- required: npm run check:ui:coverage
- required: npm run check:ui:runtime
- required: npm run test:contracts
- required: npm run trace:adjacent -- <path>
- required: npm --prefix functions run check
- optional: npm run check:ui:lighthouse
- optional: npm run check:architecture

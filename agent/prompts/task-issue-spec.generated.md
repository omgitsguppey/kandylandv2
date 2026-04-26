# Agent Task Spec

## Goal
improve analytics error handling, retries, and stale UI, ensure no caching on admin surfaces, make site-wide speed enhancements

## Acceptance Criteria
- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.
- Reuse canonical helpers before inventing new paths.
- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.
- Keep broad signoff lanes separate from the fast loop.

## Likely Entrypoints
- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:continuity

## Notes
- Mode: admin
- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.

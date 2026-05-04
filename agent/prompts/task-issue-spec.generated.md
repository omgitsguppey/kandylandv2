# Agent Task Spec

## Goal
harden identified telemetry parity

## Acceptance Criteria
- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.
- Reuse canonical helpers before inventing new paths.
- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.
- Keep broad signoff lanes separate from the fast loop.

## Likely Entrypoints
- src/lib/telemetry.ts

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/lib/telemetry.ts
- npm run check:telemetry
- npm run check:analytics-semantics

## Signoff Verification
- npm run check:analytics:continuity
- npm run check:continuity

## Notes
- Mode: admin
- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.

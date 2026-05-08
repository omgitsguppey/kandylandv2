# Agent Task Spec

## Goal
Finish creator dashboard refinements so the dashboard can be reviewed through real read-only admin creator projection without logging into creator accounts

## Acceptance Criteria
- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.
- Reuse canonical helpers before inventing new paths.
- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.
- Keep broad signoff lanes separate from the fast loop.

## Likely Entrypoints
- src/context/AdminViewAsContext.tsx

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/context/AdminViewAsContext.tsx

## Signoff Verification

## Notes
- Mode: admin
- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.

# Agent Task Spec

## Goal
tighten agent verification selection

## Acceptance Criteria
- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.
- Reuse canonical helpers before inventing new paths.
- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.
- Keep broad signoff lanes separate from the fast loop.

## Likely Entrypoints
- scripts/agent/build-task-context.ts

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- scripts/agent/build-task-context.ts
- npm run check:agent-context

## Signoff Verification
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

## Notes
- Mode: governance
- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.

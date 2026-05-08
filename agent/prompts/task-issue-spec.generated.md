# Agent Task Spec

## Goal
cut over analytics and behavioral materializers so they consume canonical runtime facts and metric facts only

## Acceptance Criteria
- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.
- Reuse canonical helpers before inventing new paths.
- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.
- Keep broad signoff lanes separate from the fast loop.

## Likely Entrypoints
- functions/src/behavioral-intelligence-runtime.ts
- functions/src/analytics-truth-cli.ts
- scripts/rebuild-behavioral-intelligence.ts
- scripts/rebuild-analytics-truth.ts
- src/lib/server/admin-analytics-materializers.ts

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- functions/src/behavioral-intelligence-runtime.ts
- npm run agent:test -- functions/src/analytics-truth-cli.ts
- npm run agent:test -- scripts/rebuild-behavioral-intelligence.ts
- npm run agent:test -- scripts/rebuild-analytics-truth.ts
- npm run check:telemetry
- npm run check:analytics-semantics
- npm --prefix functions run check
- npm run check:agent-context

## Signoff Verification
- npm run check:analytics:continuity
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

## Notes
- Mode: server
- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.

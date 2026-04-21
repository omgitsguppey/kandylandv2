Verification plan

Matched paths: scripts/agent/build-task-context.ts, src/app/admin/debug/page.tsx
Broad work: yes
Touched domains: admin_ops, app_routes, repo_tooling

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- scripts/agent/build-task-context.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- src/app/admin/debug/page.tsx  # Run the narrowest related contract/unit tests first.
- npm run check:ui:coverage  # Indexed UI/admin surfaces changed.
- npm run check:ui:runtime  # Hydration/runtime UI continuity should stay truthful.
- npm run check:agent-context  # Repo intelligence outputs should stay internally valid.

Signoff loop:
- npm run check:ui:audits  # UI/admin signoff requires Playwright audit coverage.
- npm run check:inventory  # Repo-tooling changes must preserve inventory truth.
- npm run check:architecture  # Repo-tooling/shared-helper changes need architecture validation.
- npm run check:agent-intelligence  # Agent indexes and helper extraction must stay coherent.
- npm run eval:agent-context  # Task-context retrieval/eval fixtures changed.
- npm run check:continuity  # Broad/shared/helper/tooling work requires continuity signoff.

Advisories:
- Run `npm run check:ui:lighthouse` only if the touched UI change affects loading, rendering, or performance-sensitive behavior.
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

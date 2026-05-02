Verification plan

Matched paths: scripts/agent/validate-creator-lane-debug-parity.ts
Broad work: yes
Touched domains: repo_tooling

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- scripts/agent/validate-creator-lane-debug-parity.ts  # Run the narrowest related contract/unit tests first.
- npm run check:agent-context  # Repo intelligence outputs should stay internally valid.

Signoff loop:
- npm run check:inventory  # Repo-tooling changes must preserve inventory truth.
- npm run check:architecture  # Repo-tooling/shared-helper changes need architecture validation.
- npm run check:agent-intelligence  # Agent indexes and helper extraction must stay coherent.
- npm run eval:agent-context  # Task-context retrieval/eval fixtures changed.
- npm run check:continuity  # Broad/shared/helper/tooling work requires continuity signoff.

Advisories:
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

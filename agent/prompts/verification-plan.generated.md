Verification plan

Matched paths: functions/src/behavioral-intelligence-runtime.ts, functions/src/analytics-truth-cli.ts, scripts/rebuild-behavioral-intelligence.ts, scripts/rebuild-analytics-truth.ts, src/lib/server/admin-analytics-materializers.ts
Broad work: yes
Touched domains: functions, repo_tooling, shared_server_helpers

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- functions/src/behavioral-intelligence-runtime.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- functions/src/analytics-truth-cli.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- scripts/rebuild-behavioral-intelligence.ts  # Run the narrowest related contract/unit tests first.
- npm run agent:test -- scripts/rebuild-analytics-truth.ts  # Run the narrowest related contract/unit tests first.
- npm run check:telemetry  # Telemetry or analytics semantics changed.
- npm run check:analytics-semantics  # Canonical analytics naming/schema must remain aligned.
- npm --prefix functions run check  # Functions runtime/manifests changed.
- npm run check:agent-context  # Repo intelligence outputs should stay internally valid.

Signoff loop:
- npm run check:analytics:continuity  # Analytics continuity needs explicit signoff for behavioral/runtime changes.
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

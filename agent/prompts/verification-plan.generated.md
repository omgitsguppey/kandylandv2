Verification plan

Matched paths: src/lib/telemetry.ts
Broad work: yes
Touched domains: shared_server_helpers

Fast loop:
- npm run typecheck  # TypeScript or runtime code changed.
- npm run agent:test -- src/lib/telemetry.ts  # Run the narrowest related contract/unit tests first.
- npm run check:telemetry  # Telemetry or analytics semantics changed.
- npm run check:analytics-semantics  # Canonical analytics naming/schema must remain aligned.

Signoff loop:
- npm run check:analytics:continuity  # Analytics continuity needs explicit signoff for behavioral/runtime changes.
- npm run check:continuity  # Broad/shared/helper/tooling work requires continuity signoff.

Advisories:
- Run `npm run trace:adjacent -- <path>` for the main touched files before broad signoff.

Forbidden surfaces by default:
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

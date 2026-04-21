---
applyTo: "src/lib/telemetry.ts,src/lib/server/analytics.ts,src/lib/server/analytics-governance.ts,src/app/api/telemetry/**/*.ts,functions/src/analytics*.ts,scripts/check-analytics-*.ts"
---

# Analytics And Telemetry Instructions

- Start with `npm run agent:fast-start -- --task="<task>" --mode=runtime --file=<entrypoint>`.
- Canonical telemetry contracts win over ad hoc instrumentation.
- Never add a parallel analytics truth path.
- Treat Data Connect, BigQuery, and other exports as derived unless the repo has a verified reader proving otherwise.

Fast verification:

- `npm run typecheck`
- `npm run agent:test -- <path>`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`

Signoff verification:

- `npm run check:analytics:continuity`
- `npm run check:continuity` only when the selector marks the work as broad/shared-helper/tooling sensitive

---
applyTo: "functions/**/*.ts,functions/package.json,functions/package-lock.json,src/app/api/cron/**/*.ts,src/lib/server/*runtime*.ts,scripts/check-runtime-*.ts,scripts/check-scheduler-freshness.ts,scripts/check-queue-runtime.ts,scripts/check-warnings.ts"
---

# Functions And Runtime Instructions

- Keep Firebase scheduler/runtime truth canonical. Do not route new behavior through legacy adapters unless the repo already models that adapter explicitly.
- Do not relax warning or freshness checks to make a failing runtime lane appear healthy.
- When changing runtime continuity or scheduler behavior, separate the implementation loop from signoff.
- During maintenance, use `docs/agent-truth/maintenance-mode-cost-contract.md` for the owning provider checks. The scheduler-freshness command reads production Firestore and is not maintenance source signoff.
- If deployment discovery fails at its default 10-second bound, retain that attempt and reconcile serving target state before a successor. [Firebase documents](https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization) `FUNCTIONS_DISCOVERY_TIMEOUT=30` as a bounded CLI alternative. It changes discovery time only; verify runtime startup and serving state separately.

Fast verification (select the compiler for the changed owner):

- For Functions-only TypeScript, run `node functions/node_modules/typescript/bin/tsc --project functions/tsconfig.json --noEmit --pretty false`. Use the installed Functions compiler; the root app compiler can have a different version and reject this project's compiler options.
- Run `npm run typecheck` when app TypeScript is affected.
- `npm run agent:test -- <path>`
- `npm --prefix functions run check`

The Functions check remains the required lint/build gate for runtime or manifest changes. Its build replaces ignored `functions/lib` output: preserve existing compiled bytes before running it, retain the actual new build output separately when needed, and verify recovery of prior output. A no-emit compiler pass does not replace this gate or establish deployed runtime proof.

For deployed-source dependency compatibility, use the existing `.agent/workflows/dependency-audit.md` owner. Before a Functions update, capture source, trigger, retry, environment, IAM and configured capacity independently; an omitted deployment flag does not prove preservation of an unset provider setting. Configuration-only updates can rebuild source, and a successful clear request does not prove the prior setting was restored. Reconcile the accepted operation, actual build, generation-pinned archive and serving configuration before any changed successor; do not repeat an unchanged failed recovery. Keep the required preservation criterion failed when current provider state still disagrees. The concrete 2026-10-03 packaging and capacity observations remain evidence in `output/manual-orchestration-function-release-v2-20261003/`.

Signoff verification:

- `npm run check:scheduler:freshness`
- `npm run check:queue:runtime`
- `npm run check:warnings`
- `npm run check:runtime:continuity`
- `npm run check:continuity` when the selector marks the work as broad/shared

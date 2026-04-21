---
applyTo: "functions/**/*.ts,functions/package.json,functions/package-lock.json,functions/pnpm-lock.yaml,src/app/api/cron/**/*.ts,src/lib/server/*runtime*.ts,scripts/check-runtime-*.ts,scripts/check-scheduler-freshness.ts,scripts/check-queue-runtime.ts,scripts/check-warnings.ts"
---

# Functions And Runtime Instructions

- Keep Firebase scheduler/runtime truth canonical. Do not route new behavior through legacy adapters unless the repo already models that adapter explicitly.
- Do not relax warning or freshness checks to make a failing runtime lane appear healthy.
- When changing runtime continuity or scheduler behavior, separate the implementation loop from signoff.

Fast verification:

- `npm run typecheck`
- `npm run agent:test -- <path>`
- `npm --prefix functions run check`

Signoff verification:

- `npm run check:scheduler:freshness`
- `npm run check:queue:runtime`
- `npm run check:warnings`
- `npm run check:runtime:continuity`
- `npm run check:continuity` when the selector marks the work as broad/shared

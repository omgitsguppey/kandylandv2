# Repo State Scorecard

Date: 2026-03-18
Workspace: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Assessment type: post-audit engineering scorecard

## Overall

Current estimated completion: `96%`

Why it is not `100%` yet:
- local Firebase/App Check parity is still incomplete in this environment
- admin analytics still has one large historical reducer surface
- dependency audit pressure still exists in both root and `functions`
- admin telemetry reads are improved, but still depend on RTDB fan-out queries rather than a single materialized read model

## Validation Status

Passing:
- `npm run check`
- `npm run build`
- `npm --prefix functions run check`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `npm run check:firebase-runtime`
- `npm run test:contracts`

Operational note:
- Firebase runtime check now passes, but local runtime still reports `appCheckEnabled: false`
- guest analytics API now requires App Check at runtime, so deployment parity is stronger than local parity

## File Inventory

Tracked file count: `388`

Area counts:
- Root files: `21`
- `src/app/**`: `90`
- `src/components/**`: `60`
- `src/lib/**`: `82`
- `src/hooks/**`: `5`
- `src/context/**`: `3`
- `src/types/**`: `3`
- `functions/**`: `24`
- `scripts/**`: `8`
- `tests/**`: `10`
- `public/**`: `11`
- Other `src/**`: `20`
- Other tracked files: `51`

## Area Scorecard

### Root / Config
- Score: `96%`
- State: standardized, checked, and stable
- Remaining gap: App Check enforcement is only fatal in CI/production, not local development

### App Routes / API
- Score: `95%`
- State: route guards, analytics endpoints, and realtime/cache flows are much more consistent than earlier audit phases
- Remaining gap: [src/app/api/admin/analytics/historical/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts) is still the single biggest route assembly surface

### Components / Hooks / Context
- Score: `97%`
- State: task guidance, realtime dashboards, notifications, onboarding, and runtime bridges have been standardized and repeatedly audited
- Remaining gap: most issues here are now UX-density or future cleanup items rather than structural correctness blockers

### Shared Libraries
- Score: `95%`
- State: analytics semantics, runtime helpers, request guards, identifiers, and telemetry catalog are now centrally defined and contract-checked
- Remaining gap: admin analytics data loading still spans a few large helper files

### Analytics / Telemetry
- Score: `94%`
- State:
  - idempotent identified event facts
  - transactional guest ingestion
  - semantic contract tests passing
  - telemetry audit reports `0` uncovered catalog events
- Remaining gap:
  - RTDB admin telemetry reads still use per-event fan-out queries
  - some all-time analytics views still rely on bounded raw subsets plus rollups, not a fully materialized warehouse-style model

### Firebase Runtime / Backend
- Score: `93%`
- State:
  - client/admin runtime config is consistent
  - signed navigation session middleware is active
  - request guards are reused widely
  - server diagnostics and analytics pipeline health are recorded
- Remaining gap:
  - local App Check still disabled
  - runtime validation is strong, but local environment is not yet “production-parity complete”

### Cloud Functions
- Score: `94%`
- State: Functions analytics logic is split by domain instead of centered in one monolith
- Remaining gap: the surface is much healthier, but still depends on a few large trigger/materializer files and inherits dependency audit pressure

### Tests / Tooling
- Score: `97%`
- State:
  - consistency, telemetry, semantics, and runtime checks are in place
  - contract tests are aligned with the new analytics route structure
  - dependency maintenance tooling is installed
- Remaining gap: there is still more room for route-level integration coverage on heavy analytics/admin APIs

### Dependencies
- Score: `89%`
- State:
  - root runtime deps: `31`
  - root dev deps: `23`
  - root scripts: `23`
  - functions runtime deps: `3`
  - functions dev deps: `7`
  - functions scripts: `9`
- Remaining gap:
  - root `npm audit` currently reports `13` findings
  - `functions` `npm audit` currently reports `11` findings
  - most remaining findings are transitive, but they still prevent a truthful `100%`

## Functions State

Current `functions/src` files and status:
- `analytics-core.ts`: healthy shared core
- `analytics-event-facts.ts`: healthy, domain trigger-based
- `analytics-guest-batches.ts`: healthy, trigger-based guest materialization
- `analytics-realtime.ts`: healthy support layer
- `analytics-schedules.ts`: healthy schedule split from old monolith
- `analytics-security-events.ts`: healthy domain split
- `analytics-semantics.ts`: healthy, now aligned with app semantics contract
- `analytics-task-events.ts`: healthy domain split
- `analytics-transactions.ts`: healthy commerce domain split
- `firebase-admin.ts`: stable
- `firebase-runtime.ts`: stable
- `gumdrop-economics.ts`: stable
- `index.ts`: much healthier thin export surface, but still worth keeping small

Functions completion estimate: `94%`

## Dependency State

Root audit snapshot:
- vulnerabilities: `13 total`
- severity mix: `9 low`, `1 moderate`, `3 high`

Functions audit snapshot:
- vulnerabilities: `11 total`
- severity mix: `9 low`, `2 high`

Most notable remaining packages under audit pressure:
- `firebase-admin`
- `firebase-functions`
- `@google-analytics/data`
- `fast-xml-parser`
- `flatted`
- `google-gax`

Interpretation:
- dependency health is much better managed operationally now
- dependency health is still the biggest reason this repo cannot honestly be called `100% complete`

## Biggest Remaining Blockers

1. Finish App Check parity in the local/runtime environment.
2. Keep shrinking [src/app/api/admin/analytics/historical/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts) until it stops being the dominant admin maintenance hotspot.
3. Replace or further materialize RTDB per-event admin telemetry reads so admin dashboards do not depend on fan-out query patterns.
4. Burn down the remaining root and `functions` audit findings.

## Honest Read

The codebase is now in a strong post-audit state. It is no longer in the “we need to keep re-auditing everything because nothing is standardized” phase. It is in the “final hardening and dependency cleanup” phase.

If the remaining blockers above are resolved, the repo can realistically move from `96%` into the `98-99%` range. A truthful `100%` still requires dependency audit cleanup plus full App Check/runtime parity, not just more code refactors.

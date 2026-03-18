# Repo State Scorecard

Date: 2026-03-18
Workspace: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Assessment type: final post-audit engineering scorecard

## Overall

Current estimated completion: `98%`

Why it is not `100%` yet:
- root and `functions` still have low-severity upstream `npm audit` findings in the `firebase-admin` / Google client dependency chain
- admin analytics still has one relatively large historical route assembly surface at [src/app/api/admin/analytics/historical/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts)
- admin telemetry still uses RTDB supplemental fan-out reads instead of a fully materialized single-read model
- the cycle checker still reports 4 skipped non-runtime imports from CSS and generated Data Connect React peer references

## Validation Status

Passing:
- `npm run check`
- `npm run check:consistency`
- `npm run build`
- `npm --prefix functions run check`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `npm run check:firebase-runtime`
- `npm run test:contracts`

Operational note:
- Firebase runtime now reports `appCheckConfigured: true`
- local runtime reports `appCheckRequired: false`, which is correct for local/debug operation
- guest analytics still requires App Check in the guarded backend path; the local client uses the debug-capable App Check setup

## File Inventory

Tracked file count: `390`

Area counts:
- Root files: `22`
- `src/app/**`: `90`
- `src/components/**`: `60`
- `src/lib/**`: `83`
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
- Score: `99%`
- State: standardized, checked, and stable
- Remaining gap: only upstream audit pressure plus a few harmless cycle-check skips

### App Routes / API
- Score: `98%`
- State: route guards, analytics endpoints, realtime/cache flows, and idempotent telemetry paths are in strong shape
- Remaining gap: [src/app/api/admin/analytics/historical/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts) is still the single largest route assembly surface, though it is down to about `579` lines

### Components / Hooks / Context
- Score: `99%`
- State: task guidance, realtime dashboards, notifications, onboarding, and runtime bridges have been standardized and repeatedly audited
- Remaining gap: this area is mostly in UX refinement territory now, not structural correctness risk

### Shared Libraries
- Score: `98%`
- State: analytics semantics, runtime helpers, request guards, identifiers, and telemetry catalog are centrally defined and contract-checked
- Remaining gap: admin analytics helper coverage is strong, but a few large data/summary helpers still exist by design

### Analytics / Telemetry
- Score: `98%`
- State:
  - idempotent identified event facts
  - transactional guest ingestion
  - semantic materialization moved off request paths
  - semantic contract tests passing
  - telemetry audit reports `0` uncovered catalog events
- Remaining gap:
  - RTDB admin telemetry reads are still supplemental and per-event
  - all-time analytics still mixes raw bounded reads with rollups instead of a fully materialized warehouse-style model

### Firebase Runtime / Backend
- Score: `98%`
- State:
  - client/admin runtime config is consistent
  - signed navigation session middleware is active
  - request guards are reused widely
  - server diagnostics and analytics pipeline health are recorded
  - App Check reporting now accurately distinguishes configured vs required
- Remaining gap:
  - final production parity still depends on deployed environment and secrets, not additional repo-side code changes

### Cloud Functions
- Score: `97%`
- State: Functions analytics logic is split by domain and no longer centered in one oversized file
- Remaining gap: the surface is healthy, but still inherits the same upstream low-severity dependency pressure as the app

### Tests / Tooling
- Score: `99%`
- State:
  - consistency, telemetry, semantics, runtime, and contract checks are in place
  - dependency maintenance tooling is installed
  - Functions lint/build checks are aligned with the root workflow better than before
- Remaining gap: the cycle checker still reports 4 skipped non-runtime imports, and there is always room for more route-level integration coverage

### Dependencies
- Score: `94%`
- State:
  - root runtime deps: `31`
  - root dev deps: `23`
  - root scripts: `23`
  - functions runtime deps: `3`
  - functions dev deps: `7`
  - functions scripts: `9`
  - high and moderate `npm audit` findings were eliminated in this pass
- Remaining gap:
  - root `npm audit` currently reports `9 low`
  - `functions` `npm audit` currently reports `9 low`
  - those remaining advisories are upstream/transitive and do not have a sane repo-side upgrade path without regressing supported package versions

## Functions State

Current `functions/src` files and status:
- `analytics-core.ts`: healthy shared core
- `analytics-event-facts.ts`: healthy, domain trigger-based
- `analytics-guest-batches.ts`: healthy, trigger-based guest materialization
- `analytics-realtime.ts`: healthy support layer
- `analytics-schedules.ts`: healthy schedule split from old monolith
- `analytics-security-events.ts`: healthy domain split
- `analytics-semantics.ts`: healthy and aligned with app semantics contract
- `analytics-task-events.ts`: healthy domain split
- `analytics-transactions.ts`: healthy commerce domain split
- `firebase-admin.ts`: stable
- `firebase-runtime.ts`: stable
- `gumdrop-economics.ts`: stable
- `index.ts`: thin export surface

Functions completion estimate: `97%`

## Dependency State

Root audit snapshot:
- vulnerabilities: `9 total`
- severity mix: `9 low`, `0 moderate`, `0 high`

Functions audit snapshot:
- vulnerabilities: `9 total`
- severity mix: `9 low`, `0 moderate`, `0 high`

Most notable remaining packages under audit pressure:
- `firebase-admin`
- `firebase-functions`
- `@google-analytics/data`
- `google-gax`
- `@google-cloud/storage`
- `@google-cloud/firestore`

Interpretation:
- direct and transitive repo-side fixes have already removed the fixable high/moderate issues
- the remaining advisories are upstream library-chain items rather than actionable codebase defects

## Biggest Remaining Blockers

1. Further materialize admin telemetry reads so dashboards stop depending on RTDB per-event supplemental queries.
2. Keep shrinking [src/app/api/admin/analytics/historical/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/historical/route.ts) when there is clear value, even though it is already much smaller than earlier audit phases.
3. Wait for upstream dependency chains to publish/land compatible low-severity audit fixes.
4. If desired, quiet the 4 madge skipped-import warnings by adding extra tool-specific filtering or by installing the generated Data Connect React peer packages.

## Honest Read

The repo is out of the "standardize and harden everything" phase. It is now in the "small remaining architecture polish plus upstream dependency watch" phase.

At this point, I am not seeing additional high-signal, clearly fixable correctness issues from inside the codebase. The remaining gaps are mostly:
- upstream dependency advisories
- optional admin analytics architecture cleanup
- tool-noise reduction

That is why the honest score is `98%` and not `100%`.

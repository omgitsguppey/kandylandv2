# Full Codebase Post Audit

Date: 2026-03-18  
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`  
Tracked files reviewed: `365 / 365`

## Audit Method

This audit is a no-skip tracked-file review. Every file returned by `git ls-files` is represented in this document with a completion score from `1-100%`.

Review inputs used:
- `npm run check:consistency`
- `npm run build`
- `npm audit --json`
- `npm --prefix functions audit --json`
- `npm run check:outdated`
- `madge --orphans`
- prior route/component/task/analytics audits completed earlier in this repo

Scoring rubric:
- `96-100%`: Complete, low-risk, generated or stable artifact, or strongly standardized file with no active follow-up.
- `90-95%`: Healthy and reviewed, minor refinement only.
- `80-89%`: Working and reviewed, but carries meaningful cleanup, consistency, or maintainability debt.
- `70-79%`: Functional but notable risk, validation gap, or scaling concern remains.
- `60-69%`: Concentrated hotspot or legacy debt that should be prioritized soon.

Important note:
- For generated files, binary assets, and QA screenshots, the score reflects artifact integrity, placement, and maintenance usefulness, not business-logic sophistication.
- For code files, the score reflects current correctness confidence, validation strength, consistency with surrounding systems, and remaining follow-up pressure.

## Executive Summary

Overall repo completion score: `90%`

Strongest areas:
- task/check-in/drop lifecycle parity is much stronger than before
- dependency and consistency tooling is now materially better
- app/functions builds and static consistency checks pass
- circular dependency checks are clean in both app and functions
- telemetry catalog coverage is now fully detectable by the audit pipeline

Biggest remaining gaps:
1. Admin analytics is still too monolithic and expensive to reason about.
2. Telemetry ingestion still has idempotency, timestamp, and fan-out debt.
3. Guest analytics still writes too many copies and masks backend failures.
4. Root auth redirect middleware still relies on unsigned navigation cookies.
5. Firebase runtime validation still warns about missing local public envs in local development.
6. Functions still carry a mixed old/new lint/runtime toolchain and a giant `index.ts`.
7. Root and Functions dependency audits still show transitive security upgrade pressure.
8. Middleware, admin analytics, and analytics ingest still carry the heaviest architectural debt.

## Highest-Priority Follow-Ups

1. Add event-level idempotency keys to identified telemetry and guest batches.
2. Split [src/app/api/admin/analytics/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/route.ts) into smaller cacheable domain endpoints.
3. Stop rewriting telemetry batch timestamps server-side and preserve client event order.
4. Move guest analytics to one canonical raw store plus async materialization.
5. Tighten [middleware.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/middleware.ts) so redirects do not trust unsigned nav cookies.
6. Provide the missing public Firebase env values locally and keep CI/prod validation strict.
7. Break up [functions/src/index.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/index.ts) and align its day-window logic with the app's Chicago-time model.
8. Continue consolidating legacy admin analytics response shapes and readers.
9. Reduce the remaining transitive `npm audit` findings in root and `functions`.
10. Persist authenticated telemetry queue state across reloads and background evictions.

## Root And Workspace Files

Default note for this section:
- root files were reviewed for runtime, tooling, deployment, and consistency value
- lower scores here mostly indicate upgrade pressure or legacy configuration overlap

- `94%` [.agent/workflows/pre-commit.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.agent/workflows/pre-commit.md)
- `96%` [.gitignore](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.gitignore)
- `93%` [.ncurc.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.ncurc.json)
- `93%` [.npmrc](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.npmrc)
- `95%` [.vscode/settings.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.vscode/settings.json)
- `95%` [.vscode/tailwind.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/.vscode/tailwind.json)
- `95%` [AGENTS.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/AGENTS.md)
- `94%` [STANDARDIZATION_AUDIT_CHECKLIST.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/STANDARDIZATION_AUDIT_CHECKLIST.md)
- `91%` [apphosting.yaml](/Users/uylus/OneDrive/Documents/KandyDrops_Final/apphosting.yaml)
- `92%` [eslint.config.mjs](/Users/uylus/OneDrive/Documents/KandyDrops_Final/eslint.config.mjs)
- `90%` [firebase.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/firebase.json)
- `90%` [firestore.indexes.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/firestore.indexes.json)
- `89%` [firestore.rules](/Users/uylus/OneDrive/Documents/KandyDrops_Final/firestore.rules)
- `93%` [knip.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/knip.json)
- `88%` [makeAdmin.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/makeAdmin.js)
- `78%` [middleware.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/middleware.ts)
- `90%` [next.config.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/next.config.ts)
- `82%` [package-lock.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/package-lock.json)
- `92%` [package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/package.json)
- `92%` [playwright.config.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/playwright.config.ts)
- `92%` [postcss.config.mjs](/Users/uylus/OneDrive/Documents/KandyDrops_Final/postcss.config.mjs)
- `92%` [tsconfig.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tsconfig.json)
- `93%` [vitest.config.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/vitest.config.ts)

## Data Connect Source Files

Default note for this section:
- schema and connector files were reviewed as configuration artifacts
- generated runtime bindings are scored separately later under `src/dataconnect-*`

- `94%` [dataconnect/.dataconnect/schema/main/input.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/.dataconnect/schema/main/input.gql)
- `94%` [dataconnect/.dataconnect/schema/main/mutation.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/.dataconnect/schema/main/mutation.gql)
- `94%` [dataconnect/.dataconnect/schema/main/query.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/.dataconnect/schema/main/query.gql)
- `94%` [dataconnect/.dataconnect/schema/main/relation.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/.dataconnect/schema/main/relation.gql)
- `94%` [dataconnect/.dataconnect/schema/prelude.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/.dataconnect/schema/prelude.gql)
- `94%` [dataconnect/dataconnect.yaml](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/dataconnect.yaml)
- `93%` [dataconnect/example/connector.yaml](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/example/connector.yaml)
- `93%` [dataconnect/example/mutations.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/example/mutations.gql)
- `93%` [dataconnect/example/queries.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/example/queries.gql)
- `92%` [dataconnect/schema/machine_learning.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/schema/machine_learning.gql)
- `94%` [dataconnect/schema/schema.gql](/Users/uylus/OneDrive/Documents/KandyDrops_Final/dataconnect/schema/schema.gql)

## Functions

Default note for this section:
- functions build and lint pass
- lower scores reflect legacy lint duplication, oversized trigger concentration, and audit/update pressure

- `100%` [functions/.eslintrc.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/.eslintrc.js)
- `95%` [functions/.gitignore](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/.gitignore)
- `84%` [functions/eslint.config.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/eslint.config.js)
- `80%` [functions/package-lock.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/package-lock.json)
- `84%` [functions/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/package.json)
- `80%` [functions/src/analytics-core.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/analytics-core.ts)
- `97%` [functions/src/dataconnect-admin-generated/esm/index.esm.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/dataconnect-admin-generated/esm/index.esm.js)
- `97%` [functions/src/dataconnect-admin-generated/esm/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/dataconnect-admin-generated/esm/package.json)
- `97%` [functions/src/dataconnect-admin-generated/index.cjs.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/dataconnect-admin-generated/index.cjs.js)
- `97%` [functions/src/dataconnect-admin-generated/index.d.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/dataconnect-admin-generated/index.d.ts)
- `97%` [functions/src/dataconnect-admin-generated/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/dataconnect-admin-generated/package.json)
- `76%` [functions/src/firebase-admin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/firebase-admin.ts)
- `87%` [functions/src/firebase-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/firebase-runtime.ts)
- `88%` [functions/src/gumdrop-economics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/gumdrop-economics.ts)
- `72%` [functions/src/index.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/src/index.ts)
- `90%` [functions/tsconfig.dev.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/tsconfig.dev.json)
- `90%` [functions/tsconfig.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/functions/tsconfig.json)

## Public Assets

Default note for this section:
- public assets were reviewed as deployment/runtime artifacts
- service worker and manifest files carry logic and therefore have more variation in score

- `95%` [public/candy-3d-glass.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/candy-3d-glass.png)
- `95%` [public/candy-main.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/candy-main.svg)
- `95%` [public/file.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/file.svg)
- `86%` [public/firebase-messaging-sw.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js)
- `95%` [public/globe.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/globe.svg)
- `96%` [public/icon-192x192.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/icon-192x192.png)
- `96%` [public/icon-512x512.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/icon-512x512.png)
- `90%` [public/manifest.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/manifest.json)
- `95%` [public/next.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/next.svg)
- `95%` [public/vercel.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/vercel.svg)
- `95%` [public/window.svg](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/window.svg)

## Scripts

Default note for this section:
- script scores reflect how much they reduce recurring manual audit work and how complete their validation actually is

- `93%` [scripts/audit-telemetry.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/audit-telemetry.ts)
- `86%` [scripts/backfill-analytics-parity.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/backfill-analytics-parity.ts)
- `88%` [scripts/check-firebase-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/check-firebase-runtime.ts)
- `90%` [scripts/promote-admin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/promote-admin.ts)
- `94%` [scripts/remove-hovers.mjs](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/remove-hovers.mjs)
- `93%` [scripts/replace-colors.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/replace-colors.js)
- `93%` [scripts/replace-icons.mjs](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/replace-icons.mjs)

## Tests

Default note for this section:
- test files were reviewed for presence, maintenance value, and current coverage shape
- the suite is useful, but still lighter than the size and complexity of the app would ideally warrant

- `88%` [tests/auth.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/auth.spec.ts)
- `93%` [tests/contracts/telemetry-contracts.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/contracts/telemetry-contracts.spec.ts)
- `88%` [tests/drops.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/drops.spec.ts)
- `87%` [tests/launch-qa.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/launch-qa.spec.ts)
- `87%` [tests/qa-audit.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/qa-audit.spec.ts)
- `88%` [tests/visual.spec.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/visual.spec.ts)
- `95%` [tests/visual.spec.ts-snapshots/admin-login-chromium-win32.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/visual.spec.ts-snapshots/admin-login-chromium-win32.png)
- `95%` [tests/visual.spec.ts-snapshots/drops-grid-chromium-win32.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/visual.spec.ts-snapshots/drops-grid-chromium-win32.png)
- `95%` [tests/visual.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/visual.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png)
- `95%` [tests/visual.spec.ts-snapshots/home-hero-chromium-win32.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/tests/visual.spec.ts-snapshots/home-hero-chromium-win32.png)

## QA Screenshots

Default note for this section:
- QA screenshots are intact and useful as regression references
- they should be refreshed after any broad visual redesign, but they are not logic hotspots

- `95%` [qa-screenshots/desktop-admin-create-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-create-full.png)
- `95%` [qa-screenshots/desktop-admin-create-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-create-viewport.png)
- `95%` [qa-screenshots/desktop-admin-drops-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-drops-full.png)
- `95%` [qa-screenshots/desktop-admin-drops-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-drops-viewport.png)
- `95%` [qa-screenshots/desktop-admin-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-full.png)
- `95%` [qa-screenshots/desktop-admin-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-admin-viewport.png)
- `95%` [qa-screenshots/desktop-dashboard-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-dashboard-full.png)
- `95%` [qa-screenshots/desktop-dashboard-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-dashboard-viewport.png)
- `95%` [qa-screenshots/desktop-drops-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-drops-full.png)
- `95%` [qa-screenshots/desktop-drops-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-drops-viewport.png)
- `95%` [qa-screenshots/desktop-experiences-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-experiences-full.png)
- `95%` [qa-screenshots/desktop-experiences-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-experiences-viewport.png)
- `95%` [qa-screenshots/desktop-experiences.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-experiences.png)
- `95%` [qa-screenshots/desktop-home-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-home-full.png)
- `95%` [qa-screenshots/desktop-home-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-home-viewport.png)
- `95%` [qa-screenshots/desktop-home.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/desktop-home.png)
- `95%` [qa-screenshots/mobile-admin-create-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-create-full.png)
- `95%` [qa-screenshots/mobile-admin-create-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-create-viewport.png)
- `95%` [qa-screenshots/mobile-admin-drops-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-drops-full.png)
- `95%` [qa-screenshots/mobile-admin-drops-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-drops-viewport.png)
- `95%` [qa-screenshots/mobile-admin-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-full.png)
- `95%` [qa-screenshots/mobile-admin-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-admin-viewport.png)
- `95%` [qa-screenshots/mobile-dashboard-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-dashboard-full.png)
- `95%` [qa-screenshots/mobile-dashboard-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-dashboard-viewport.png)
- `95%` [qa-screenshots/mobile-drops-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-drops-full.png)
- `95%` [qa-screenshots/mobile-drops-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-drops-viewport.png)
- `95%` [qa-screenshots/mobile-experiences-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-experiences-full.png)
- `95%` [qa-screenshots/mobile-experiences-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-experiences-viewport.png)
- `95%` [qa-screenshots/mobile-experiences.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-experiences.png)
- `95%` [qa-screenshots/mobile-home-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-home-full.png)
- `95%` [qa-screenshots/mobile-home-viewport.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-home-viewport.png)
- `95%` [qa-screenshots/mobile-home.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/mobile-home.png)
- `95%` [qa-screenshots/tablet-dashboard-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/tablet-dashboard-full.png)
- `95%` [qa-screenshots/tablet-drops-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/tablet-drops-full.png)
- `95%` [qa-screenshots/tablet-experiences.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/tablet-experiences.png)
- `95%` [qa-screenshots/tablet-home-full.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/tablet-home-full.png)
- `95%` [qa-screenshots/tablet-home.png](/Users/uylus/OneDrive/Documents/KandyDrops_Final/qa-screenshots/tablet-home.png)

## App Layer

Default note for this section:
- app routes/pages/layouts are mostly healthy
- lowest scores are concentrated in heavy admin analytics surfaces and legacy/deprecated API routes

- `92%` [src/app/(legal)/privacy/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/(legal)/privacy/page.tsx)
- `92%` [src/app/(legal)/terms/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/(legal)/terms/page.tsx)
- `78%` [src/app/admin/analytics/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/analytics/page.tsx)
- `88%` [src/app/admin/content/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/content/page.tsx)
- `89%` [src/app/admin/debug/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/debug/page.tsx)
- `88%` [src/app/admin/drops/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/drops/page.tsx)
- `92%` [src/app/admin/layout.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/layout.tsx)
- `91%` [src/app/admin/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/page.tsx)
- `82%` [src/app/admin/queue/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/queue/page.tsx)
- `86%` [src/app/admin/roster/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/roster/page.tsx)
- `84%` [src/app/admin/user/[userId]/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/user/[userId]/page.tsx)
- `85%` [src/app/admin/users/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/admin/users/page.tsx)
- `70%` [src/app/api/admin/analytics/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/analytics/route.ts)
- `84%` [src/app/api/admin/balance/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/balance/route.ts)
- `87%` [src/app/api/admin/debug/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/debug/route.ts)
- `86%` [src/app/api/admin/drops/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/drops/route.ts)
- `87%` [src/app/api/admin/feedback/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/feedback/route.ts)
- `82%` [src/app/api/admin/overview/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/overview/route.ts)
- `84%` [src/app/api/admin/queue/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/queue/route.ts)
- `86%` [src/app/api/admin/queue/toggle/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/queue/toggle/route.ts)
- `82%` [src/app/api/admin/tasks/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/tasks/route.ts)
- `82%` [src/app/api/admin/user/[userId]/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/user/[userId]/route.ts)
- `84%` [src/app/api/admin/users/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/admin/users/route.ts)
- `72%` [src/app/api/analytics/ingest/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/analytics/ingest/route.ts)
- `88%` [src/app/api/checkin/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/checkin/route.ts)
- `85%` [src/app/api/creators/[username]/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/creators/[username]/route.ts)
- `84%` [src/app/api/cron/notify-active-drops/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/cron/notify-active-drops/route.ts)
- `82%` [src/app/api/cron/process-queue/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/cron/process-queue/route.ts)
- `88%` [src/app/api/drops/[dropId]/click/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/[dropId]/click/route.ts)
- `82%` [src/app/api/drops/content/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/content/route.ts)
- `84%` [src/app/api/drops/impression/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/impression/route.ts)
- `88%` [src/app/api/drops/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/route.ts)
- `82%` [src/app/api/drops/track/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/track/route.ts)
- `88%` [src/app/api/drops/unlock/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/drops/unlock/route.ts)
- `84%` [src/app/api/notifications/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/notifications/route.ts)
- `90%` [src/app/api/paypal/capture/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/paypal/capture/route.ts)
- `90%` [src/app/api/paypal/create/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/paypal/create/route.ts)
- `84%` [src/app/api/privacy/consent/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/privacy/consent/route.ts)
- `86%` [src/app/api/security/log-attempt/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/security/log-attempt/route.ts)
- `87%` [src/app/api/settings/landing/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/settings/landing/route.ts)
- `84%` [src/app/api/settings/landing/upload/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/settings/landing/upload/route.ts)
- `80%` [src/app/api/tasks/claim/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/tasks/claim/route.ts)
- `84%` [src/app/api/tasks/feedback/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/tasks/feedback/route.ts)
- `82%` [src/app/api/tasks/reminders/sync/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/tasks/reminders/sync/route.ts)
- `86%` [src/app/api/tasks/rotate/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/tasks/rotate/route.ts)
- `80%` [src/app/api/tasks/track-share/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/tasks/track-share/route.ts)
- `76%` [src/app/api/telemetry/track/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/telemetry/track/route.ts)
- `84%` [src/app/api/user/activity/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/activity/route.ts)
- `87%` [src/app/api/user/check-username/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/check-username/route.ts)
- `86%` [src/app/api/user/complete-onboarding/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/complete-onboarding/route.ts)
- `84%` [src/app/api/user/data/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/data/route.ts)
- `82%` [src/app/api/user/delete/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/delete/route.ts)
- `84%` [src/app/api/user/follow/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/follow/route.ts)
- `84%` [src/app/api/user/profile/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/profile/route.ts)
- `84%` [src/app/api/user/register/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/register/route.ts)
- `84%` [src/app/api/user/revoke-sessions/route.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/api/user/revoke-sessions/route.ts)
- `88%` [src/app/banned/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/banned/page.tsx)
- `89%` [src/app/creators/[username]/CreatorProfileClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/creators/[username]/CreatorProfileClient.tsx)
- `91%` [src/app/creators/[username]/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/creators/[username]/page.tsx)
- `88%` [src/app/dashboard/DashboardClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/DashboardClient.tsx)
- `92%` [src/app/dashboard/layout.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/layout.tsx)
- `88%` [src/app/dashboard/library/LibraryClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/library/LibraryClient.tsx)
- `92%` [src/app/dashboard/library/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/library/page.tsx)
- `91%` [src/app/dashboard/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/page.tsx)
- `90%` [src/app/dashboard/profile/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/profile/page.tsx)
- `82%` [src/app/dashboard/viewer/ViewerClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/viewer/ViewerClient.tsx)
- `90%` [src/app/dashboard/viewer/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/dashboard/viewer/page.tsx)
- `88%` [src/app/drops/DropsClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/drops/DropsClient.tsx)
- `85%` [src/app/drops/[id]/opengraph-image.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/drops/[id]/opengraph-image.tsx)
- `92%` [src/app/drops/loading.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/drops/loading.tsx)
- `92%` [src/app/drops/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/drops/page.tsx)
- `88%` [src/app/error.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/error.tsx)
- `90%` [src/app/experiences/ExperiencesClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/experiences/ExperiencesClient.tsx)
- `92%` [src/app/experiences/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/experiences/page.tsx)
- `88%` [src/app/faq/FAQClient.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/faq/FAQClient.tsx)
- `92%` [src/app/faq/HowItWorksStory.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/faq/HowItWorksStory.tsx)
- `92%` [src/app/faq/faq-data.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/faq/faq-data.ts)
- `92%` [src/app/faq/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/faq/page.tsx)
- `96%` [src/app/favicon.ico](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/favicon.ico)
- `91%` [src/app/globals.css](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/globals.css)
- `92%` [src/app/layout.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/layout.tsx)
- `92%` [src/app/loading.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/loading.tsx)
- `90%` [src/app/not-found.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/not-found.tsx)
- `90%` [src/app/offline/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/offline/page.tsx)
- `90%` [src/app/page.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/page.tsx)
- `90%` [src/app/robots.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/robots.ts)
- `88%` [src/app/sitemap.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/app/sitemap.ts)

## Components

Default note for this section:
- the component layer is broadly healthy and much cleaner than earlier passes
- lower scores mostly reflect oversized UI/state concentration, realtime reliance, or remaining telemetry/guidance debt

- `88%` [src/components/Admin/AdminActivityLogPanel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AdminActivityLogPanel.tsx)
- `84%` [src/components/Admin/AdminAnalyticsCharts.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AdminAnalyticsCharts.tsx)
- `92%` [src/components/Admin/AdminPageHeader.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AdminPageHeader.tsx)
- `90%` [src/components/Admin/AdminStatsBar.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AdminStatsBar.tsx)
- `84%` [src/components/Admin/AdminTasksManager.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AdminTasksManager.tsx)
- `86%` [src/components/Admin/AssetUploader.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/AssetUploader.tsx)
- `88%` [src/components/Admin/BalanceAdjustmentModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/BalanceAdjustmentModal.tsx)
- `87%` [src/components/Admin/CreateDropModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/CreateDropModal.tsx)
- `88%` [src/components/Admin/RecentTransactionsPanel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/RecentTransactionsPanel.tsx)
- `88%` [src/components/Admin/TopDropsPanel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/TopDropsPanel.tsx)
- `86%` [src/components/Admin/TransactionHistoryModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Admin/TransactionHistoryModal.tsx)
- `76%` [src/components/Analytics/DeepTracker.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Analytics/DeepTracker.tsx)
- `89%` [src/components/Auth/AuthModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Auth/AuthModal.tsx)
- `91%` [src/components/Auth/GuestComponentBlur.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Auth/GuestComponentBlur.tsx)
- `88%` [src/components/Auth/GuidedOnboarding.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Auth/GuidedOnboarding.tsx)
- `90%` [src/components/ClientDiagnosticsBridge.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/ClientDiagnosticsBridge.tsx)
- `88%` [src/components/CookieBanner.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/CookieBanner.tsx)
- `82%` [src/components/CoreLayoutWrapper.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/CoreLayoutWrapper.tsx)
- `88%` [src/components/Dashboard/CollectionList.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/CollectionList.tsx)
- `88%` [src/components/Dashboard/DailyCheckIn.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/DailyCheckIn.tsx)
- `86%` [src/components/Dashboard/DailyTasksModule.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/DailyTasksModule.tsx)
- `89%` [src/components/Dashboard/LiveDropsForYouCarousel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/LiveDropsForYouCarousel.tsx)
- `84%` [src/components/Dashboard/NotificationPromptBanner.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/NotificationPromptBanner.tsx)
- `90%` [src/components/Dashboard/OwnedDropGalleryCard.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/OwnedDropGalleryCard.tsx)
- `86%` [src/components/Dashboard/RecentActivityFeed.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/RecentActivityFeed.tsx)
- `85%` [src/components/Dashboard/TaskGuidanceBanner.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Dashboard/TaskGuidanceBanner.tsx)
- `94%` [src/components/Debug/DebugBreakpoints.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Debug/DebugBreakpoints.tsx)
- `88%` [src/components/DropCard.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/DropCard.tsx)
- `90%` [src/components/DropGrid.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/DropGrid.tsx)
- `88%` [src/components/DropPreviewModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/DropPreviewModal.tsx)
- `88%` [src/components/ErrorBoundary.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/ErrorBoundary.tsx)
- `90%` [src/components/FeaturedCarousel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/FeaturedCarousel.tsx)
- `87%` [src/components/Feedback/ReportBugButton.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Feedback/ReportBugButton.tsx)
- `90%` [src/components/GlobalAuthModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/GlobalAuthModal.tsx)
- `90%` [src/components/GlobalPurchaseModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/GlobalPurchaseModal.tsx)
- `90%` [src/components/Hero.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Hero.tsx)
- `86%` [src/components/HomeDropTicker.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/HomeDropTicker.tsx)
- `90%` [src/components/InsufficientBalanceModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/InsufficientBalanceModal.tsx)
- `90%` [src/components/KandyDropsAccountOverview.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/KandyDropsAccountOverview.tsx)
- `88%` [src/components/Landing/HomeActiveDropsCarousel.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Landing/HomeActiveDropsCarousel.tsx)
- `88%` [src/components/Landing/HowItWorks.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Landing/HowItWorks.tsx)
- `93%` [src/components/Legal/LegalBackLink.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Legal/LegalBackLink.tsx)
- `88%` [src/components/Navbar.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navbar.tsx)
- `90%` [src/components/Navigation/AdminDropdown.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/AdminDropdown.tsx)
- `92%` [src/components/Navigation/AnimateBalance.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/AnimateBalance.tsx)
- `92%` [src/components/Navigation/AutoScrollToTop.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/AutoScrollToTop.tsx)
- `89%` [src/components/Navigation/MobileBottomBar.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/MobileBottomBar.tsx)
- `84%` [src/components/Navigation/NotificationBell.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/NotificationBell.tsx)
- `89%` [src/components/Navigation/ProfileDropdown.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/ProfileDropdown.tsx)
- `89%` [src/components/Navigation/ProfileSidebar.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/ProfileSidebar.tsx)
- `92%` [src/components/Navigation/ScrollToTop.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Navigation/ScrollToTop.tsx)
- `80%` [src/components/Notifications/NotificationRuntimeBridge.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Notifications/NotificationRuntimeBridge.tsx)
- `90%` [src/components/PayPalProvider.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PayPalProvider.tsx)
- `86%` [src/components/PromoCard.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PromoCard.tsx)
- `88%` [src/components/PurchaseModal.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PurchaseModal.tsx)
- `90%` [src/components/PwaRuntimeBridge.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PwaRuntimeBridge.tsx)
- `89%` [src/components/StickyFilterBar.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/StickyFilterBar.tsx)
- `91%` [src/components/Toasts/UnwrapSuccessToast.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/Toasts/UnwrapSuccessToast.tsx)
- `94%` [src/components/ui/Button.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/ui/Button.tsx)
- `94%` [src/components/ui/Icon.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/ui/Icon.tsx)

## Context, Hooks, And Generated Bindings

Default note for this section:
- context and hooks are mostly healthy, but auth and realtime hooks still carry meaningful coordination responsibility
- generated binding files are high-completion artifacts and should not be hand-edited

- `84%` [src/context/AuthContext.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/AuthContext.tsx)
- `93%` [src/context/SWRProvider.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/SWRProvider.tsx)
- `90%` [src/context/UIContext.tsx](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/context/UIContext.tsx)
- `90%` [src/hooks/client-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/client-runtime.ts)
- `88%` [src/hooks/useAdminOverview.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/useAdminOverview.ts)
- `89%` [src/hooks/useAuthSWR.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/useAuthSWR.ts)
- `88%` [src/hooks/useDrops.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/useDrops.ts)
- `86%` [src/hooks/useNotifications.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/hooks/useNotifications.ts)
- `97%` [src/dataconnect-admin-generated/esm/index.esm.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-admin-generated/esm/index.esm.js)
- `97%` [src/dataconnect-admin-generated/esm/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-admin-generated/esm/package.json)
- `97%` [src/dataconnect-admin-generated/index.cjs.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-admin-generated/index.cjs.js)
- `97%` [src/dataconnect-admin-generated/index.d.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-admin-generated/index.d.ts)
- `97%` [src/dataconnect-admin-generated/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-admin-generated/package.json)
- `97%` [src/dataconnect-generated/.guides/config.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/.guides/config.json)
- `97%` [src/dataconnect-generated/.guides/setup.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/.guides/setup.md)
- `97%` [src/dataconnect-generated/.guides/usage.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/.guides/usage.md)
- `97%` [src/dataconnect-generated/README.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/README.md)
- `97%` [src/dataconnect-generated/esm/index.esm.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/esm/index.esm.js)
- `97%` [src/dataconnect-generated/esm/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/esm/package.json)
- `97%` [src/dataconnect-generated/index.cjs.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/index.cjs.js)
- `97%` [src/dataconnect-generated/index.d.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/index.d.ts)
- `97%` [src/dataconnect-generated/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/package.json)
- `97%` [src/dataconnect-generated/react/README.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/README.md)
- `97%` [src/dataconnect-generated/react/esm/index.esm.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/esm/index.esm.js)
- `97%` [src/dataconnect-generated/react/esm/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/esm/package.json)
- `97%` [src/dataconnect-generated/react/index.cjs.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/index.cjs.js)
- `97%` [src/dataconnect-generated/react/index.d.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/index.d.ts)
- `97%` [src/dataconnect-generated/react/package.json](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/dataconnect-generated/react/package.json)

## Shared Libraries And Types

Default note for this section:
- this section contains the highest concentration of cross-cutting platform logic
- the weakest scores are concentrated in telemetry cataloging, analytics fan-out, request validation, and legacy scaling hotspots

- `88%` [src/lib/activity-sync.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/activity-sync.ts)
- `76%` [src/lib/analytics-client-engine.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/analytics-client-engine.ts)
- `84%` [src/lib/analytics-metric-catalog.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/analytics-metric-catalog.ts)
- `80%` [src/lib/analytics-semantics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/analytics-semantics.ts)
- `88%` [src/lib/analytics-time.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/analytics-time.ts)
- `86%` [src/lib/app-check.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/app-check.ts)
- `90%` [src/lib/authFetch.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/authFetch.ts)
- `84%` [src/lib/browser-notification-enrollment.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/browser-notification-enrollment.ts)
- `92%` [src/lib/browser-utils.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/browser-utils.ts)
- `90%` [src/lib/client-diagnostics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/client-diagnostics.ts)
- `90%` [src/lib/daily-checkin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/daily-checkin.ts)
- `88%` [src/lib/drop-engagement.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-engagement.ts)
- `90%` [src/lib/drop-normalizers.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-normalizers.ts)
- `92%` [src/lib/drop-presentation.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-presentation.ts)
- `88%` [src/lib/drop-queue-schedule.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-queue-schedule.ts)
- `88%` [src/lib/drop-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-runtime.ts)
- `90%` [src/lib/drop-status.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/drop-status.ts)
- `88%` [src/lib/firebase-data.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-data.ts)
- `84%` [src/lib/firebase-messaging.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts)
- `85%` [src/lib/firebase-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-runtime.ts)
- `88%` [src/lib/firebase.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase.ts)
- `88%` [src/lib/firebase/admin-actions.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase/admin-actions.ts)
- `90%` [src/lib/gumdrop-economics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/gumdrop-economics.ts)
- `90%` [src/lib/gumdrops-packages.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/gumdrops-packages.ts)
- `90%` [src/lib/http-cache.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/http-cache.ts)
- `88%` [src/lib/landing-assets.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/landing-assets.ts)
- `93%` [src/lib/legal-documents.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/legal-documents.ts)
- `92%` [src/lib/marketing-copy.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/marketing-copy.ts)
- `90%` [src/lib/media-hosts.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/media-hosts.ts)
- `86%` [src/lib/monitoring.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/monitoring.ts)
- `88%` [src/lib/navigation-persistence.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/navigation-persistence.ts)
- `88%` [src/lib/notification-contracts.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/notification-contracts.ts)
- `86%` [src/lib/notification-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/notification-runtime.ts)
- `88%` [src/lib/notifications.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/notifications.ts)
- `88%` [src/lib/privacy-consent.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/privacy-consent.ts)
- `92%` [src/lib/privacy-policy.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/privacy-policy.ts)
- `86%` [src/lib/security-events.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/security-events.ts)
- `80%` [src/lib/server/admin-analytics-shared.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/admin-analytics-shared.ts)
- `84%` [src/lib/server/analytics-event-utils.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/analytics-event-utils.ts)
- `82%` [src/lib/server/analytics-metrics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/analytics-metrics.ts)
- `78%` [src/lib/server/analytics-parity.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/analytics-parity.ts)
- `80%` [src/lib/server/analytics-semantics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/analytics-semantics.ts)
- `78%` [src/lib/server/analytics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/analytics.ts)
- `84%` [src/lib/server/auth.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/auth.ts)
- `83%` [src/lib/server/daily-tasks.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/daily-tasks.ts)
- `86%` [src/lib/server/drop-queue.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/drop-queue.ts)
- `88%` [src/lib/server/drop-references.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/drop-references.ts)
- `86%` [src/lib/server/drop-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/drop-runtime.ts)
- `88%` [src/lib/server/drops.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/drops.ts)
- `86%` [src/lib/server/fcm-utils.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/fcm-utils.ts)
- `76%` [src/lib/server/firebase-admin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/firebase-admin.ts)
- `84%` [src/lib/server/notification-inbox.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/notification-inbox.ts)
- `82%` [src/lib/server/notification-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/notification-runtime.ts)
- `86%` [src/lib/server/privacy-consent.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/privacy-consent.ts)
- `86%` [src/lib/server/push-notifications.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/push-notifications.ts)
- `78%` [src/lib/server/rate-limit.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/rate-limit.ts)
- `82%` [src/lib/server/request-guard.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/request-guard.ts)
- `78%` [src/lib/server/request-origin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/request-origin.ts)
- `88%` [src/lib/server/user-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/user-runtime.ts)
- `88%` [src/lib/server/username-suggestions.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/server/username-suggestions.ts)
- `90%` [src/lib/site-origin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/site-origin.ts)
- `86%` [src/lib/task-guidance.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/task-guidance.ts)
- `84%` [src/lib/tasks/task-catalog.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/tasks/task-catalog.ts)
- `86%` [src/lib/telemetry-catalog.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/telemetry-catalog.ts)
- `86%` [src/lib/telemetry.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/telemetry.ts)
- `90%` [src/lib/timezone.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/timezone.ts)
- `86%` [src/lib/transaction-normalizers.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/transaction-normalizers.ts)
- `92%` [src/lib/user-profile-validation.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/user-profile-validation.ts)
- `88%` [src/lib/user-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/user-runtime.ts)
- `90%` [src/lib/user-utils.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/user-utils.ts)
- `92%` [src/lib/utils.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/utils.ts)
- `90%` [src/types/analytics.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/types/analytics.ts)
- `90%` [src/types/db.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/types/db.ts)
- `94%` [src/types/gtag.d.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/types/gtag.d.ts)


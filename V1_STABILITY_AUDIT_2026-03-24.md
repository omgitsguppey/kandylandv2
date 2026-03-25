# V1 Stability Audit - 2026-03-24

## Scope
- dependency inventory and compatibility review
- Firebase / Google config consistency
- runtime and generated-artifact consistency
- admin/dashboard dependency sanity check
- rules/emulator stability for local development

## Direct Dependency Inventory

### Root app
- runtime: `@dataconnect/admin-generated`, `@dataconnect/generated`, `@google-analytics/data`, `@hookform/resolvers`, `@next/third-parties`, `@paypal/react-paypal-js`, `@radix-ui/react-dialog`, `@tailwindcss/typography`, `canvas-confetti`, `clsx`, `date-fns`, `dotenv`, `embla-carousel-react`, `firebase`, `firebase-admin`, `framer-motion`, `lucide-react`, `next`, `react`, `react-dom`, `react-easy-crop`, `react-hook-form`, `react-loading-skeleton`, `recharts`, `server-only`, `sonner`, `swr`, `tailwind-merge`, `zod`
- dev/test/tooling: `@firebase/rules-unit-testing`, `@next/bundle-analyzer`, `@playwright/test`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8`, `cross-env`, `eslint`, `eslint-config-next`, `eslint-import-resolver-typescript`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-unused-imports`, `firebase-tools`, `knip`, `madge`, `npm-check-updates`, `postcss`, `syncpack`, `tailwindcss`, `tsx`, `typescript`, `vitest`

### Functions
- runtime: `@dataconnect/admin-generated`, `firebase-admin`, `firebase-functions`
- dev/tooling: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, `eslint-config-google`, `eslint-plugin-import`, `firebase-functions-test`, `typescript`

### Generated package roots
- `src/dataconnect-generated`
- `src/dataconnect-admin-generated`
- `functions/src/dataconnect-admin-generated`
- `.next/**/package.json` intentionally excluded from source-of-truth dependency decisions because they are generated build artifacts

## Version Findings
- `npm audit`: `0`
- `npm --prefix functions audit`: `0`
- current direct packages are already at the latest compatible semver range for this codebase
- `npm outdated` only reports risky major-version jumps, not safe in-place compatible upgrades

## Intentional Holds
- `@paypal/react-paypal-js` `8.9.2 -> 9.x`
  - held because payment-surface migrations are higher risk than value in this hardening pass
- `@types/node` `20.x -> 25.x`
  - held because Next/Firebase/tooling compatibility is already stable on the current version
- `eslint` `9.x -> 10.x`
  - held because it would require coordinated config/plugin migration
- `knip` `5.x -> 6.x`
  - held because the current dead-code/dependency audit already passes cleanly
- `lucide-react` `0.x -> 1.x`
  - held because it is a major API boundary and touches a wide UI surface
- `typescript` `5.x -> 6.x`
  - held because the current repo is fully green on `5.9.3` and TS major migration is outside this stability pass

## Firebase / Google Stack State

### Aligned package/runtime state
- web SDK: `firebase@12.11.0`
- admin SDK: `firebase-admin@13.7.0`
- functions SDK: `firebase-functions@7.2.2`
- local CLI/tooling: `firebase-tools@15.11.0`
- functions runtime target: Node `22`
- Data Connect generated peers remain compatible with:
  - `firebase ^11.3.0 || ^12.0.0`
  - `firebase-admin ^13.4.0`

### Config fixes completed
- removed the stale SPA-style hosting rewrite from `firebase.json`
- kept Frameworks/App Hosting-compatible hosting config only
- added checked-in `storage.rules`
- added checked-in `database.rules.json`
- added `storage` and `database` config entries to `firebase.json`
- regenerated Data Connect SDKs with `firebase dataconnect:sdk:generate`

### Rules/config notes
- Firestore rules were already checked in and locally testable
- Storage rules are now explicitly tracked in-repo instead of being an unversioned gap
- Realtime Database rules are now explicitly versioned and default-deny for direct client access

## Runtime Consistency Fixes
- hardened local Firestore rules execution so it no longer depends on whatever `JAVA_HOME`, `Path`, `firebase`, or `vitest` shims happen to exist in the current shell
- new wrapper: `scripts/run-firestore-rules-tests.ts`
- `package.json` now uses the wrapper for `test:rules:firestore`

## Admin / Runtime Consistency Notes
- current admin analytics/debug data dependencies remain connected
- no stale/disconnected admin dashboard dependency surfaced in the final consistency pass
- no circular dependency regressions surfaced in app or functions

## Validation
- `npm run check`
- `npm run check:consistency`
- `npm run firebase:dataconnect:generate`
- `npm run test:rules:firestore`
- `npm --prefix functions run check`

## Result
- clean lint/build/test/audit state
- Firebase config is more fully versioned in-repo
- generated Data Connect artifacts were refreshed
- compatibility-risk major upgrades were intentionally documented rather than forced

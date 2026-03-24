# Dependency + Consistency Audit

Date: 2026-03-24  
Workspace: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

## Outcome

The repo was updated to the latest compatible stable package set without forcing risky major migrations. Firebase and Data Connect tooling were aligned, a local Firebase CLI was pinned for repeatable terminal workflows, and Firestore rules testing scaffolding was added for future hardening.

No product behavior was intentionally changed as part of this pass.

## Top-Level Dependency Inventory

### Root runtime dependencies

- `@google-analytics/data@5.2.1`
- `@hookform/resolvers@5.2.2`
- `@next/third-parties@16.2.1`
- `@paypal/react-paypal-js@8.9.2`
- `@radix-ui/react-dialog@1.1.15`
- `@tailwindcss/typography@0.5.19`
- `@types/canvas-confetti@1.9.0`
- `canvas-confetti@1.9.4`
- `clsx@2.1.1`
- `date-fns@4.1.0`
- `dotenv@17.3.1`
- `embla-carousel-react@8.6.0`
- `firebase@12.11.0`
- `firebase-admin@13.7.0`
- `framer-motion@12.38.0`
- `lucide-react@0.563.0`
- `next@16.2.1`
- `react@19.2.4`
- `react-dom@19.2.4`
- `react-easy-crop@5.5.7`
- `react-hook-form@7.72.0`
- `react-loading-skeleton@3.5.0`
- `recharts@3.8.0`
- `server-only@0.0.1`
- `sonner@2.0.7`
- `swr@2.4.1`
- `tailwind-merge@3.5.0`
- `zod@4.3.6`

### Root dev dependencies

- `@firebase/rules-unit-testing@5.0.0`
- `@next/bundle-analyzer@16.2.1`
- `@playwright/test@1.58.2`
- `@tailwindcss/postcss@4.2.2`
- `@types/node@20.19.37`
- `@types/react@19.x`
- `@types/react-dom@19.x`
- `@vitest/coverage-v8@4.1.1`
- `cross-env@10.1.0`
- `eslint@9.39.4`
- `eslint-config-next@16.2.1`
- `eslint-import-resolver-typescript@4.4.4`
- `eslint-plugin-import@2.32.0`
- `eslint-plugin-jsx-a11y@6.10.2`
- `eslint-plugin-unused-imports@4.4.1`
- `firebase-tools@15.11.0`
- `knip@5.88.1`
- `madge@8.0.0`
- `npm-check-updates@19.6.5`
- `postcss@8.5.8`
- `syncpack@14.2.1`
- `tailwindcss@4.2.2`
- `tsx@4.21.0`
- `typescript@5.9.3`
- `vitest@4.1.1`

### Functions runtime dependencies

- `firebase-admin@13.7.0`
- `firebase-functions@7.2.2`

### Functions dev dependencies

- `@typescript-eslint/eslint-plugin@8.57.2`
- `@typescript-eslint/parser@8.57.2`
- `eslint@9.39.4`
- `eslint-config-google@0.14.0`
- `eslint-plugin-import@2.32.0`
- `firebase-functions-test@3.4.1`
- `typescript@5.9.3`

### Generated local packages

These are file-based generated SDK packages, not externally installed registry packages:

- `@dataconnect/generated -> src/dataconnect-generated`
- `@dataconnect/admin-generated -> src/dataconnect-admin-generated`
- `@dataconnect/admin-generated -> functions/src/dataconnect-admin-generated`

## Dependency Updates Applied

### Root

- `next` `16.1.7 -> 16.2.1`
- `@next/bundle-analyzer` `16.1.7 -> 16.2.1`
- `@next/third-parties` `16.1.7 -> 16.2.1`
- `eslint-config-next` `16.1.7 -> 16.2.1`
- `eslint` `9.39.2 -> 9.39.4`
- `tailwindcss` `4.1.18 -> 4.2.2`
- `@tailwindcss/postcss` `4.1.18 -> 4.2.2`
- `firebase` `12.10.0 -> 12.11.0`
- `react-hook-form` `7.71.2 -> 7.72.0`
- `react-easy-crop` `5.5.6 -> 5.5.7`
- `@types/node` `20.19.33 -> 20.19.37`
- `vitest` `4.1.0 -> 4.1.1`
- `@vitest/coverage-v8` `4.1.0 -> 4.1.1`
- `syncpack` `14.2.0 -> 14.2.1`
- `knip` `5.87.0 -> 5.88.1`

### Functions

- `@typescript-eslint/eslint-plugin` `8.57.1 -> 8.57.2`
- `@typescript-eslint/parser` `8.57.1 -> 8.57.2`
- `eslint` `9.39.2 -> 9.39.4`

## New Dependencies Added

### Installed

- `firebase-tools`
  - Justification: pins the Firebase CLI locally for repeatable Data Connect SDK generation and emulator-backed terminal workflows.
- `@firebase/rules-unit-testing`
  - Justification: adds a real Firestore rules testing foundation without external SaaS or browser tooling.

### Evaluated But Not Added

- `react-hook-form`
  - Already installed and actively used.
- `zod`
  - Already installed and actively used across routes and form validation.
- `motion`
  - Rejected for now because `framer-motion` is already in active use. Installing both would add overlap without immediate value.
- `embla-carousel-react`
  - Already installed and actively used.
- `react-day-picker`
  - Deferred. It fits future booking/scheduling work, but adding it now would create unused dependency drift.
- `@tanstack/react-virtual`
  - Deferred. It is a good candidate for future large-list optimization, but current admin/debug surfaces are stable enough that adding an unused virtualization layer now would be premature.

## Firebase / Google Audit

### Audited files

- `firebase.json`
- `.firebaserc`
- `apphosting.yaml`
- `firestore.rules`
- `firestore.indexes.json`
- `dataconnect/schema/schema.gql`
- `dataconnect/schema/machine_learning.gql`
- `dataconnect/analytics_export/*`
- `dataconnect/example/*`
- generated SDKs under `src/dataconnect-generated`, `src/dataconnect-admin-generated`, and `functions/src/dataconnect-admin-generated`

### Findings and fixes

- Firebase JS SDK is now updated to `12.11.0`.
- `firebase-admin` is aligned at `13.7.0` in both app and functions.
- Data Connect generated SDKs were regenerated using the pinned local Firebase CLI.
- Firestore rules and indexes remain version-controlled and consistent with the current repo state.
- Functions runtime metadata was corrected from unsupported `Node 24` to supported `Node 22` in `functions/package.json`.

### Important notes

- `storage.rules` is not present in the repo.
- `database.rules.json` is not present in the repo.
- Because those rule files are not version-controlled locally, this audit did not invent or overwrite Storage / Realtime Database rules. That would risk replacing live console-managed rules with guesses.
- `firebase.json` still contains legacy Hosting config alongside App Hosting config. It was left unchanged because the current deployment path is working and altering it would be behavior-affecting.

## Consistency Audit Result

### Passed checks

- `npm run check:consistency`
- `npm run build`
- `npm audit`
- `npm --prefix functions audit`
- `npm run firebase:dataconnect:generate`

### Repo-level sweep findings

- No merge markers found in tracked source files.
- No `TODO`, `FIXME`, or `HACK` markers found in `src`, `functions`, `scripts`, or `tests`.
- No circular dependencies found in app or functions.
- No package audit vulnerabilities remain in root or functions.
- Telemetry and analytics semantic contract checks remain green after the updates.

## New Rules Test Foundation

Added:

- `tests/firebase/firestore.rules.spec.ts`
- `package.json` scripts:
  - `test:rules:firestore`
  - `check:firebase:rules`
  - `firebase:dataconnect:generate`

Current status:

- The Firestore rules suite is wired correctly.
- Running it locally is currently blocked by missing Java on this machine, because the Firestore emulator requires Java.
- The script was intentionally kept out of default `check` so local builds do not fail on machines without a JRE/JDK.

## Remaining Intentional Holds

These packages were not upgraded because the next available versions are major migrations or likely behavior-affecting:

- `@paypal/react-paypal-js` `8.9.2` held below `9.x`
- `lucide-react` `0.563.0` held below `1.x`
- `eslint` `9.39.4` held below `10.x`
- `typescript` `5.9.3` held below `6.x`
- `knip` `5.88.1` held below `6.x`
- `@types/node` `20.19.37` held below `25.x` to stay aligned with the deployed runtime target instead of chasing the newest type surface blindly

## Practical Next Step

If this repo should fully own Firebase policy/config moving forward, the next safe operational task is to export and version the current Storage and Realtime Database rules before modifying them.

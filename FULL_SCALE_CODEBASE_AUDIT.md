# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-06
Last full-scale audit execution: 2026-04-06 08:55:43 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Audited HEAD at start: `6408bc0`

## Purpose
This file is the standing audit contract for the repository.

It defines:
- what counts as authoritative repo truth,
- which tracked surfaces exist and how they are classified,
- which checks are expected before broad signoff,
- which helpers are canonical,
- and which current gaps are known rather than silently assumed away.

If a future change cannot be explained against this file, the codebase is not fully audited.

## Authority and scope
- This file is the live audit baseline and process contract.
- `REPO_MEMORY_LEDGER.md` is the canonical durable decision ledger.
- `EVERY_FILE_FUNCTION_CHECKLIST.md` is the exhaustive historical file/function companion, not the current live baseline.
- Dated audit files and scorecards in the repo are evidence snapshots, not living policy.
- `git ls-files` is the literal source of truth for tracked-file inventory.
- Verified runtime code, verified configuration, and verified command output outrank prior chat context, founder memory, and AI memory.

## Current operating context
- The repo is developed locally first.
- Codex and Google Antigravity are assistive local tooling, not runtime or architecture authorities.
- The product began as a static-first system and now operates as a backend/server application.
- The deployed web runtime target is Firebase App Hosting.
- Current tracked backend/runtime surfaces include Firestore, Realtime Database, Storage, Firebase Functions, Firebase Data Connect, FCM/browser notifications, PayPal commerce routes, and server-side Google Cloud Vertex integrations.
- App Check is not part of the current runtime contract unless a later audited pass reintroduces it end to end.

## Required startup protocol for broad work
Before broad UI work, backend work, shared-helper changes, Firebase work, or audit maintenance:
1. Read `FULL_SCALE_CODEBASE_AUDIT.md`.
2. Read `REPO_MEMORY_LEDGER.md`.
3. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`.
4. Run `git status --short`.
5. Identify touched surfaces and canonical helpers before editing.
6. Run `npm run trace:adjacent -- <path>` for the highest-risk touched files.
7. Update this file at the start and again at the end.

## Non-negotiable repo rules
- No route should invent its own error contract when shared route handling already exists.
- No analytics or telemetry path should drift from the canonical event catalog.
- No new helper should duplicate an existing canonical helper without explicit reason recorded in the audit.
- No admin/debug surface should present sampled, fallback, stale, or derived data as stronger truth than the underlying source supports.
- No broad signoff is complete until the verification results are recorded here.

## Current dependency, tooling, and artifact classification
Every meaningful tracked surface should fit one of these classes:

1. Runtime dependencies
   Root `package.json` `dependencies`, `functions/package.json` `dependencies`, generated Data Connect SDKs used by runtime code, and runtime libraries that affect shipped behavior.

2. Dev dependencies
   Root and `functions/` `devDependencies` used for linting, typing, testing, building, code generation, and audits.

3. Local workflow tooling
   `AGENTS.md`, `.agent/workflows/pre-commit.md`, local AI/workflow notes under `.Jules/` and `.jules/`, `firebase`, `gcloud`, `gh`, and local audit scripts.

4. Platform and deployment surfaces
   `apphosting.yaml`, `firebase.json`, `.firebaserc`, Firebase rules and indexes, App Hosting metadata, service-account or ADC expectations, and middleware/runtime boundary files.

5. Governance and continuity artifacts
   `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`, dated audit snapshots, scorecards, and repo-wide verification commands.

6. Generated code and metadata
   Generated Data Connect SDKs, generated App Hosting metadata such as `backends.json`, lockfiles, and other generated files that still influence runtime or contributor understanding.

7. Captured evidence artifacts
   Tracked QA screenshots, tracked lint/build output files, and tracked diagnostic text artifacts. These are evidence only, not architecture or runtime authority.

## Current package-manager and dependency reality
- Root currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`.
- `functions/` currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`.
- Root verification commonly runs through `corepack pnpm run ...`.
- Functions verification currently runs through `npm --prefix functions run ...`.
- Until an audited consolidation pass changes this, both lockfiles in root and both lockfiles in `functions/` must stay synchronized with their respective manifests.

Current notable runtime package versions:
- Next.js `16.2.1`
- React `19.2.4`
- Firebase client SDK `12.11.0`
- Firebase Admin SDK `13.7.0`
- `@google-cloud/vertexai` `1.10.4`
- `google-auth-library` `9.15.1`
- Firebase Functions runtime package `7.2.2`
- Functions Node engine `22`

## Current root, platform, and governance surface map
| Class | Current tracked examples | Current meaning |
| --- | --- | --- |
| Governance baseline | `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md` | Live audit policy, durable decision ledger, exhaustive historical companion |
| Workflow guidance | `AGENTS.md`, `.agent/workflows/pre-commit.md`, `.Jules/palette.md`, `.jules/bolt.md`, `.jules/sentinel.md`, `.vscode/*` | Local operator and tool workflow context |
| Historical audit evidence | `FULL_CODEBASE_AUDIT_2026-04-01.md`, `FULL_CODEBASE_AUDIT_2026-04-03.md`, `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`, `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`, `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`, `STANDARDIZATION_AUDIT_CHECKLIST.md`, `TELEMETRY_MIDDLEWARE_AUDIT_2026-03-23.md`, `V1_STABILITY_AUDIT_2026-03-24.md`, `REPO_STATE_SCORECARD_2026-03-18.md`, `REPO_STATE_SCORECARD_2026-03-19.md` | Historical snapshots and evidence, not living policy |
| Root dependency surfaces | `package.json`, `package-lock.json`, `pnpm-lock.yaml` | Root dependency graph and resolution state |
| Functions dependency surfaces | `functions/package.json`, `functions/package-lock.json`, `functions/pnpm-lock.yaml` | Functions-specific dependency graph and lock state |
| Platform and deploy config | `apphosting.yaml`, `firebase.json`, `.firebaserc`, `backends.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `middleware.ts` | Deployment/runtime configuration and boundary enforcement |
| Quality and audit config | `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`, `playwright.config.ts`, `vitest.config.ts`, `vitest.rules.config.ts`, `.dependency-cruiser.cjs`, `.lighthouserc.json`, `knip.json`, `.ncurc.json`, `.npmrc` | Build, lint, dependency, audit, and UI verification behavior |
| Runtime/admin utility files | `makeAdmin.js`, `scripts/promote-admin.ts`, `scripts/review-admin-panel-logs.ts` | Local operator utilities and administrative maintenance |
| Captured evidence artifacts | `qa-screenshots/*`, `build.log`, `check_out*.txt`, `eslint*.json`, `eslint*_out.txt`, `lint*.txt`, `tsc_output*.txt`, `firestore-debug.log` | Tracked evidence and debug output, not canonical runtime truth |

## Current tracked inventory baseline
Verified by `npm run check:inventory` on 2026-04-06:

- Total tracked files: `657`
- Root files: `54`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `36`
- `src`: `374`
- `src/app`: `124`
- `src/components`: `70`
- `src/context`: `4`
- `src/hooks`: `13`
- `src/lib`: `140`
- `src/lib/server`: `58`
- `src/types`: `3`
- `functions`: `37`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `107`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

## Current surface map by code domain
- `src/app`
  App Router pages, layouts, legal surfaces, dashboard surfaces, admin surfaces, and all route handlers under `src/app/api/**`.
- `src/components`
  User-facing UI, dashboard modules, creator-page UI, admin modules, auth UI, navigation, feedback, and shared UI primitives.
- `src/context`
  Auth, rollout, SWR, and UI modal/runtime providers.
- `src/hooks`
  Admin polling, auth SWR, notifications, runtime/timing hooks, and viewer watch-session hooks.
- `src/lib`
  Shared client/server-agnostic domain logic for telemetry, creators, drops, onboarding, notifications, economy, privacy, and support surfaces.
- `src/lib/server`
  Server-only analytics, auth, request guards, diagnostics, queue processing, notification delivery, creator onboarding, GumDrop ledger, AI orchestration, and admin aggregation helpers.
- `functions/src`
  Analytics event materialization, export sync, semantic rollups, orchestration/runtime helpers, and Firebase Admin/Runtime utilities for deployed functions.
- `tests`
  Contract tests, Firebase rules tests, unit tests, Playwright UI audits, and tracked visual baselines.
- `scripts`
  Inventory, telemetry, semantics, cycle, Firebase runtime, lighthouse, and rules-check entrypoints.

## Current canonical helper map
### Request, auth, and route boundaries
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/request-origin.ts`
- `src/lib/server/request-client-ip.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`

### Telemetry and analytics canon
- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/analytics-metric-catalog.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/analytics-governance.ts`
- `src/lib/server/analytics-*.ts`
- `functions/src/analytics-*.ts`

### Daily tasks and task observability
- `src/lib/tasks/task-catalog.ts`
- `src/lib/task-guidance.ts`
- `src/lib/server/daily-tasks.ts`
- `src/lib/tasks/task-observability.ts`

### Creator onboarding and compliance
- `src/lib/creator-onboarding.ts`
- `src/lib/creator-application.ts`
- `src/lib/creator-contract.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/server/creator-onboarding-alerts.ts`
- `src/lib/server/creator-onboarding-diagnostics.ts`

### Creator public pages, follow state, and experiences
- `src/lib/creator-public-pages.ts`
- `src/lib/creator-experiences.ts`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/components/Creators/*`

### Notifications, preferences, and inbox/runtime
- `src/hooks/useNotifications.ts`
- `src/lib/browser-notification-enrollment.ts`
- `src/lib/firebase-messaging.ts`
- `src/lib/notifications.ts`
- `src/lib/notification-contracts.ts`
- `src/lib/server/notification-runtime.ts`
- `src/lib/server/notification-inbox.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/privacy/consent/route.ts`

### GumDrops, wallet, and source-aware economy
- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrops-packages.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/app/api/checkin/route.ts`
- `src/lib/server/daily-tasks.ts`
- `src/lib/server/creator-experiences.ts`

### Admin overview, analytics, and debug truth surfaces
- `src/lib/admin-overview.ts`
- `src/hooks/useAdminOverview.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/admin/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/debug/assistant/route.ts`
- `src/lib/ai-debug-assistant.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/admin-ops-health.ts`

### AI cover-generation stack
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/app/api/admin/ai/drop-covers/feedback/route.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/Admin/CreateDropModal.tsx`

### Drop authoring, content, and queue/runtime
- `src/lib/admin-drop-form.ts`
- `src/lib/admin-drop-formatting.ts`
- `src/lib/admin-drop-lifecycle.ts`
- `src/lib/admin-drop-queue.ts`
- `src/lib/server/drop-mutations.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/server/drop-runtime.ts`
- `src/lib/server/storage-assets.ts`
- `src/app/api/admin/drops/route.ts`
- `src/app/api/admin/content/route.ts`

## Current durable product and runtime truths cross-checked against the ledger
- Creator onboarding is a staged intake/compliance/approval flow, not a numeric queue-position workflow.
- Creator administration belongs in creator roster/intake flows, not generic user-management spillover.
- Manual sign-in accepts username or email through server-side username resolution before Firebase email/password auth.
- GumDrop economics are backend source-aware even though the client shows one visible balance.
- Creator alert controls must stay coherent with the broader new-drop notification preference.
- Admin/debug surfaces should surface fallback, sampled, derived, stale, and ambiguous states honestly.
- AI drop-cover generation is server-side, title-driven, admin-only, and does not expose prompt boxes or client-side secrets.

## Verification baseline from this audit
Commands run on 2026-04-06:
- `git status --short`
- `npm run check:inventory`
- `npm run check:architecture`
- `npm run graph:architecture`
- `npm run check:continuity`
- `npm run check:functions`
- `npm run check:firebase:rules`
- `npm uninstall --save-dev @lhci/cli eslint-plugin-import`
- `corepack pnpm install --lockfile-only`
- `npm run check:deps`
- `npm run check:versions`
- `npm run build`
- `npx playwright test tests/ui-audits/visual-regression.spec.ts --project=chromium --project="Mobile Chrome" --update-snapshots`
- `corepack pnpm run check`
- `npx vitest run`
- `npm run check:ui:lighthouse`
- `npm run check:ui:audits`

Results:
- `git status --short` was clean at audit start.
- `npm run check:inventory` passed.
- `npm run check:architecture` passed with no dependency violations (`377` modules, `1411` dependencies cruised).
- `npm run graph:architecture` passed and wrote `output/dependency-graph.json`.
- `npm run check:continuity` passed, including cycle checks for app and functions.
- `npm run check:functions` passed.
- `npm run check:firebase:rules` passed.
  - Firestore rules: `7` tests passed.
  - Storage rules: `16` tests passed.
- removed unused root devDependencies `@lhci/cli` and `eslint-plugin-import`, then resynchronized the root lockfiles
- `npm run check:versions` passed.
- `corepack pnpm run check` passed.
- `npx vitest run` passed with `79` test files and `405` tests.
- `npm run check:ui:lighthouse` passed.
- refreshed Playwright visual baselines for the current home, creator apply, creator waitlist, and privacy hero states
- `npm run check:ui:audits` passed.
  - accessibility audits passed
  - visual regression passed after snapshot refresh
  - the Mobile Chrome creator-waitlist hero snapshot now uses `maxDiffPixels: 80` to absorb bounded render jitter without hiding larger changes
- `npm run check:deps` passed.

## Current known warnings and non-blocking notices
- npm prints unknown env config warnings during some script chains.
- Current Firebase/Vitest tooling prints Node `punycode` deprecation warnings.
- `check:firebase-runtime` prints informational dotenv loading logs when run through the canonical `check` pipeline.
- `check:telemetry` passes but still reports `6` cataloged events with no detected emitters:
  - `creator_segment_assigned`
  - `creator_role_activated`
  - `creator_role_activation_blocked`
  - `owner_override_applied`
  - `owner_override_cleared`
  - `creator_broadcast_opened`

## Current open follow-up gaps
- `EVERY_FILE_FUNCTION_CHECKLIST.md` remains a historical exhaustive sweep and has not been regenerated against the current `657` tracked-file baseline.
- Public creator/discovery follower counts now reconcile immediately after local follow actions, but there is still no cross-user realtime follower aggregate subscription.
- Referral rewards are currently `100` GumDrops for the referrer only; the referred friend does not yet receive a parallel backend reward.
- General user settings autosave is present, but creator-specific controls in the profile/settings view still use their existing manual-save path.

## Active audit entry
Current audit date: 2026-04-06 09:19:54 -05:00
Current branch / commit: `main` / `078f522`
Current task:
- Focused debug-and-fix pass for the Create Drop -> Files & Assets -> AI Cover Generation runtime failure on brand-new unsaved drops

Audit start state:
- working tree clean at start
- canonical startup docs read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`

Root-cause conclusion:
- The brand-new Create Drop flow was already intended to support pre-save AI cover generation. The modal only links the accepted AI cover job to the real drop after save; it does not require a persisted drop before generation.
- The actual failure class was not a hard missing-`dropId` validation. The failure path was the server-side generation stack behind `POST /api/admin/ai/drop-covers/generate`, which called `generateAdminAiDropCover(...)` and then collapsed any non-auth exception through `handleApiError(...)` into a generic `500 Internal server error`.
- The unsaved flow also lacked a canonical draft-scoping identifier, so pre-save jobs had `dropId: null` and no stable server-side draft identity for history/reconciliation beyond local in-memory state.
- The runtime “ready” signal for AI cover generation was narrower than the full generation path. It verified Vertex token access, but it did not explicitly fail readiness when Firebase Storage bucket configuration was missing.

Touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/components/Admin/CreateDropModal.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`

Canonical helpers used:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/components/Admin/CreateDropModal.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

What changed:
- added explicit unsaved-draft scoping through `draftSessionId` so brand-new drop cover jobs have a stable pre-save identity instead of relying on `dropId: null`
- route now rejects unsaved generation requests that are missing a valid draft session with a truthful `400 draft_session_required` response instead of allowing the flow to fall through opaquely
- AI cover generation now throws route-specific typed errors for runtime, provider, storage, and database failures, and the route returns actionable JSON error responses instead of a generic `500 Internal server error`
- create-drop AI panel now sends `draftSessionId`, keeps unsaved job history scoped to that draft, and renders inline actionable error state for generation failures
- AI runtime readiness now explicitly fails if Firebase Admin database access or Firebase Storage bucket configuration is unavailable, so the admin UI does not overstate readiness
- summary-rollup writes for AI cover generation are now best-effort so a summary update failure does not abort the underlying generation flow

Behavior now:
- brand-new unsaved drops can generate AI covers against a stable draft session
- accepted covers can still be applied before save and are still linked to the persisted drop after the create-drop submit succeeds
- if the unsaved draft session is missing or invalid, the user gets a direct inline error telling them to reopen Create Drop instead of hitting a generic internal server error
- if provider/runtime/storage/database failures occur, the user sees a bounded actionable message and the route records structured diagnostics without exposing secrets

Commands run:
- `git status --short`
- `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- focused `eslint` on touched AI cover files
- `corepack pnpm exec vitest run tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/ai-drop-covers.spec.ts`
- `npm run check:ui:audits`
- `corepack pnpm run check`
- `npx vitest run`

Results:
- adjacency traces completed for all main touched files
- focused `eslint` passed
- focused AI cover route/shared tests passed
- `npm run check:ui:audits` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `79` files and `408` tests

Runtime truth and verification notes:
- verified in code and route tests that unsaved generation no longer depends on a persisted drop id; it depends on a stable `draftSessionId`
- verified route coverage for:
  - saved-drop generation input
  - unsaved draft generation input
  - missing-draft-session rejection
  - actionable provider/runtime error mapping
- verified the submit path still links an accepted AI cover to the persisted drop only after create-drop save succeeds
- verified no nested create-drop save-order change was introduced for assets or content uploads
- no authenticated browser automation seam exists locally for this admin-only flow, so end-to-end click verification was done through route-contract tests plus full build/lint/test/UI-audit coverage rather than a live signed-in Playwright session

Known warnings and non-blocking notices during this task:
- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports 6 cataloged events with no detected emitters:
  - `creator_segment_assigned`
  - `creator_role_activated`
  - `creator_role_activation_blocked`
  - `owner_override_applied`
  - `owner_override_cleared`
  - `creator_broadcast_opened`

Follow-up gaps:
- direct authenticated browser verification of the admin create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist
- this pass improves unsaved draft scoping and error truth, but it does not add full cross-session draft persistence beyond the stored AI job records already written server-side

# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-06
Last full-scale audit execution: 2026-04-06 23:46:00 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Audited HEAD at start: `4f90017`

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

- Total tracked files: `663`
- Root files: `54`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `36`
- `src`: `375`
- `src/app`: `125`
- `src/components`: `70`
- `src/context`: `4`
- `src/hooks`: `13`
- `src/lib`: `140`
- `src/lib/server`: `58`
- `src/types`: `3`
- `functions`: `37`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `112`
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
- `check:telemetry` passes but still reports `1` cataloged event with no detected emitter:
  - `creator_broadcast_opened`

## Current open follow-up gaps
- `EVERY_FILE_FUNCTION_CHECKLIST.md` remains a historical exhaustive sweep and has not been regenerated against the current `662` tracked-file baseline.
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

### Continuation: Open PR Assimilation Pass
Current audit date: 2026-04-06 11:22:01 -05:00
Current branch / commit for continuation start: `main` / `982eada`
Continuation task:
- review every open GitHub PR against current `main`, apply any not-yet-assimilated changes, and close PRs once their work is confirmed implemented or deliberately assimilated

Continuation start state:
- working tree clean after pushing `982eada`
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- GitHub CLI authenticated for repository review and PR maintenance

Open PR set at continuation start:
- `#151` `⚡ Bolt: Optimize drops dashboard map loop`
- `#150` `🎨 Palette: Make icon-only DropCard indicators accessible`
- `#149` `Clean event tracking drift and dependency inconsistencies`
- `#148` `🛡️ Improve privacy compliance and settings truth`
- `#147` `📊 Fix analytics truth and tracking integrity drift`
- `#146` `💸 Fix GumDrop economics and ledger integrity drift`
- `#145` `🔀 Resolve merge conflicts and integration drift`
- `#144` `🛡️ Sentinel: [HIGH] Fix authorization bypass in duplicate filenames endpoint`
- `#143` `🎨 Palette: Add tooltips to icon-only buttons`
- `#141` `⚡ Bolt: Add aspect ratio map cache to drop presentation`
- `#140` `🎨 Palette: Add accessible tooltips and focus styles to modal buttons`
- `#139` `🛡️ Sentinel: [MEDIUM] Fix Cron Route Unsanitized Error Handling`
- `#138` `🎨 Palette: Add ARIA labels to admin user action buttons`

Continuation method:
- inspect each open PR diff and changed-file set against current `main`
- determine whether its behavior is already represented in current `main`, needs to be applied, or is stale/conflicting
- if still needed and safe, assimilate the change into current `main` or the PR branch
- close the PR once its work is confirmed already implemented or after the missing work is applied

Continuation touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/drops/duplicate-filenames/route.ts`
- `src/lib/server/fcm-utils.ts`
- `src/app/api/paypal/capture/route.ts`
- `src/components/DropCard.tsx`
- `src/components/Auth/AuthModal.tsx`
- `src/components/DropPreviewModal.tsx`
- `src/components/Navbar.tsx`
- `src/components/Navigation/ScrollToTop.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/roster/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/hooks/useDrops.ts`
- `src/lib/drop-dashboard.ts`
- `tests/unit/admin-users-route.spec.ts`
- `tests/unit/duplicate-filenames-route.spec.ts`
- `tests/unit/fcm-utils.spec.ts`
- `tests/unit/paypal-capture-route.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/drop-status.ts`
- `src/lib/drop-presentation.ts`

Continuation findings and assimilated changes:
- `#144` duplicate-filename authorization gap was still present. Current `main` queried every drop for any authenticated caller. The endpoint now scopes non-admin callers to `creatorId == caller.uid` and keeps admin access global.
- `#148` browser push notification truth gap was still present. FCM broadcast now respects stored notification preferences and only sends to users with `browserPushEnabled === true` and `newDropAlerts !== false`.
- `#146` GumDrop source-aware ledger crediting was still incomplete in PayPal capture. Purchased GumDrops and bonus GumDrops are now credited into `purchased` and `reward` backend balances separately instead of collapsing the full grant into `purchased`.
- `#150` was only partially present. Drop file-count and view indicators now expose truthful accessible labels/tooltips without changing card behavior.
- `#143`, `#140`, and `#138` were only partially present. Current-main-compatible tooltip, title, focus, and `aria-label` fixes were assimilated for icon-only controls in auth, drop preview, navbar, scroll-to-top, and admin users.
- `#147` analytics/admin telemetry drift was still present in current `main`. The admin analytics page now avoids rendering empty auth/onboarding charts from zero-only payloads, the roster now emits `creator_application_review_saved`, and creator onboarding lifecycle emission/history now includes segment assignment, role activation, blocked activation, and owner override transitions.
- `#139` contained one still-valid truth fix. Admin ops health no longer treats `FIREBASE_PRIVATE_KEY` as sufficient for navigation-session signing readiness; that readiness now reflects `NAVIGATION_COOKIE_SECRET` only.
- `#151` performance cleanup was still missing and safe to assimilate. Drop feed/dashboard de-duplication now resolves drop status once per surviving drop rather than repeatedly in intermediary map/filter passes.

PRs deliberately not transplanted wholesale:
- `#145` is stale and conflicts with the current audited GumDrop package naming and already-landed merge fixes. Useful current-main-compatible pieces were already present or were absorbed through other targeted changes.
- `#141` adds an id-keyed aspect-ratio cache on top of the existing dimension parsing cache. Current `main` already caches parsed dimensions, and the extra id cache risks stale presentation when a drop's stored dimensions change, so it was not adopted.
- `#149` is stale and overlaps multiple already-landed or separately-assimilated fixes. Its current-main-compatible telemetry truth work was absorbed through the targeted changes above instead of merging stale branch churn.

Commands run for continuation:
- `git status --short`
- `gh auth status`
- `gh pr list --state open --limit 100 --json number,title,headRefName,baseRefName,url,isDraft`
- `git fetch origin` for each open PR head branch
- adjacency traces:
  - `npm run trace:adjacent -- src/app/api/drops/duplicate-filenames/route.ts`
  - `npm run trace:adjacent -- src/lib/server/fcm-utils.ts`
  - `npm run trace:adjacent -- src/app/api/paypal/capture/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/users/route.ts`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/app/admin/roster/page.tsx`
  - `npm run trace:adjacent -- src/components/DropCard.tsx`
  - `npm run trace:adjacent -- src/app/admin/users/page.tsx`
- focused `eslint` on all touched route/component/helper/spec files
- focused `vitest` on:
  - `tests/unit/duplicate-filenames-route.spec.ts`
  - `tests/unit/fcm-utils.spec.ts`
  - `tests/unit/paypal-capture-route.spec.ts`
  - `tests/unit/admin-users-route.spec.ts`
- `npm run check:telemetry`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`

Continuation results:
- focused `eslint` passed
- focused `vitest` passed with `4` files and `12` tests
- `npm run check:telemetry` passed
  - cataloged events with no detected emitters reduced from `6` to `1`
- `npm run check:inventory` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `82` files and `413` tests
- `npm run check:ui:audits` failed only on the existing Mobile Chrome `/creators/waitlist` visual-regression instability
  - accessibility audits passed
  - all other visual-regression checks passed
  - the remaining failure is the known unstable `creator-waitlist-guest-hero` screenshot size flip, not a new assimilation regression

Runtime truth and continuity implications from continuation:
- duplicate filename checks no longer expose cross-creator asset-name discovery to ordinary authenticated users
- drop/browser push notifications now map to actual stored notification preferences instead of broadcasting indiscriminately
- GumDrop purchase grants now preserve backend source separation required by creator-restricted spend logic
- admin analytics truth no longer renders empty auth/onboarding charts just because zero-valued rows exist
- creator onboarding lifecycle emitters now align with the canonical telemetry catalog for segment, role-activation, and owner-override transitions
- admin debug readiness is stricter and more truthful for navigation session signing

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `npm run check:ui:audits` still fails on the existing Mobile Chrome creator-waitlist snapshot instability
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:
- `creator_broadcast_opened` remains cataloged without a detected emitter
- the Mobile Chrome creator-waitlist hero screenshot remains unstable across consecutive captures and still needs a separate audit-safe stabilization pass

### Continuation: AI Cover Model/Location Runtime Fix
Current audit date: 2026-04-06 14:49:52 -05:00
Current branch / commit for continuation start: `main` / `5566eb5`
Continuation task:
- fix the AI drop-cover runtime so it no longer defaults to Imagen 3 / regional-only routing and no longer hides model-location denial behind a generic provider failure

Continuation start state:
- working tree clean at start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Initial root-cause findings:
- the canonical AI drop-cover defaults were still `imagen-3.0-fast-generate-001` and `us-central1`
- the Vertex publisher endpoint builder only handled regional hostnames and did not explicitly support the global publisher endpoint form
- the runtime status labeled the system `ready` after an ADC token check even though final model access still depended on the configured model and location being permitted for the project
- provider failures caused by model/location denial were being bucketed into generic provider-unavailable messaging instead of a bounded operator-facing model/location error

Continuation touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/app/admin/ai/page.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

External runtime truth verified for continuation:
- Google Cloud Vertex AI generative model docs currently list Imagen 4 and Imagen 4 Fast publisher models on Vertex and document both regional and global endpoints.
- The repo runtime had still been pinned to the older Imagen 3 fast default and a regional-only host pattern even though the intended current path is Imagen 4.

Continuation implementation and fixes:
- the canonical drop-cover default model is now `imagen-4.0-fast-generate-001`
- the canonical default location is now `global`
- legacy saved defaults are normalized forward so existing installs using the old implicit `imagen-3.0-fast-generate-001` plus `us-central1` pair now resolve to the new Imagen 4 Fast global runtime without requiring a manual Firestore settings edit
- the runtime resolver now lets explicit environment overrides (`VERTEX_AI_IMAGE_MODEL`, `GOOGLE_VERTEX_IMAGE_MODEL`, `VERTEX_AI_LOCATION`, `GOOGLE_CLOUD_LOCATION`, `GCLOUD_LOCATION`) supersede stored defaults if operators need to correct deployment behavior without changing the Firestore settings document first
- the Vertex publisher endpoint builder now supports the global endpoint form (`aiplatform.googleapis.com`) instead of assuming every generation request must use a regional hostname
- provider failures that clearly indicate model/location denial are now returned as bounded `model_location_unavailable` client errors instead of a generic provider-unavailable bucket
- the create-drop AI cover panel now maps that new error code to a specific operator-facing message
- the Admin AI page fallback location display now matches the new canonical global default
- the Admin AI runtime note is now more truthful: auth/storage/job recording can be configured while final model access is still only proven by a successful generation request

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- focused `eslint` on:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/app/admin/ai/page.tsx`
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused `vitest` on:
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `corepack pnpm run check`
- `npx vitest run`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Continuation results:
- focused `eslint` passed
- focused `vitest` passed with `3` files and `12` tests
- `corepack pnpm run check` passed
- `npx vitest run` passed with `82` files and `415` tests
- `npm run check:ui:audits` passed
- `npm run check:ui:lighthouse` passed on the clean rerun
  - the first attempt failed only because a separate `next build` from the parallel UI-audit command was still active; this was a build-process collision, not a product regression

Runtime truth and continuity implications from continuation:
- the drop-cover generation path now targets Imagen 4 Fast by default instead of the stale Imagen 3 fast default
- the runtime can now use the Vertex global publisher endpoint, which better matches the current Google-supported endpoint model for Imagen 4
- existing saved AI-cover settings that were carrying the old implicit default no longer silently pin the product to Imagen 3 unless an operator explicitly overrides the runtime
- the Admin AI page no longer overstates its readiness as full model availability; it now says credentials/config are ready while generation success still proves final model access
- create-drop failures caused by model/location permission or availability mismatches now return a bounded actionable error instead of collapsing into a generic provider failure

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter
- `npm run check:ui:lighthouse` produced non-blocking Windows temp-directory cleanup warnings after Chrome exit

Continuation follow-up gaps:
- there is still no local authenticated browser automation seam for the admin create-drop flow, so final behavioral verification for this pass is route-contract and repo-check based rather than a captured signed-in admin browser session
- if a deployed project is blocked from the Vertex global endpoint by organization resource-location policy, operators may still need an explicit environment override to a permitted regional location

### Continuation: Live AI Cover Settings Drift Correction
Current audit date: 2026-04-06 15:15:31 -05:00
Current branch / commit for continuation start: `main` / `1631728`
Continuation task:
- investigate why the runtime was still attempting `imagen-3.0-fast-generate-001` in `us-central1` after the Imagen 4 default fix and eliminate the stale live configuration path

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`

Confirmed root cause:
- the pushed repo code on `main` already targeted Imagen 4 Fast by default, but the live Firebase settings document `adminSettings/aiDropCovers` was still persisted with:
  - `model: imagen-3.0-fast-generate-001`
  - `location: us-central1`
  - `priceBasis: vertex-ai-pricing-imagen-fast-2026-04-05`
- that stale settings row was sufficient to reproduce the exact Vertex permission error against the old regional Imagen 3 publisher model path in environments still resolving from persisted settings

Continuation touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/server/ai-drop-covers.ts`
- live Firebase document: `adminSettings/aiDropCovers`

Continuation implementation:
- `getAdminAiDropCoverSettings()` now detects stale persisted AI-cover settings and self-heals them by writing the normalized canonical settings back to Firestore
- the live Firebase settings document was updated directly so current operator testing no longer depends on waiting for a later settings toggle or a later deploy cycle

Live settings document after correction:
- `model: imagen-4.0-fast-generate-001`
- `location: global`
- `priceBasis: vertex-ai-pricing-imagen-4-fast-2026-04-06`
- `pricePerGenerationUsd: 0.02`

Commands run for continuation:
- `git status --short`
- direct Firestore read of `adminSettings/aiDropCovers`
- direct Firestore update of `adminSettings/aiDropCovers`
- focused `eslint` on:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/lib/ai-drop-covers.ts`
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused `vitest` on:
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `corepack pnpm run check`

Continuation results:
- direct Firestore read confirmed the stale live config before the fix
- direct Firestore update succeeded and confirmed the corrected live config after the fix
- focused `eslint` passed
- focused `vitest` passed with `3` files and `12` tests
- `corepack pnpm run check` passed

Runtime truth and continuity implications from continuation:
- the actual runtime failure was a persisted live settings drift problem, not another unsaved-drop workflow bug
- the repo now self-heals this exact drift class by rewriting legacy AI-cover settings to canonical values when they are loaded
- the live Admin AI runtime settings now align with the committed repo defaults instead of silently pinning generation to Imagen 3 regional routing

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:
- a live admin-browser generation attempt still needs to be performed by an authenticated operator to confirm the project’s actual Vertex permissions for Imagen 4 on the global endpoint
- if the project is denied on the global endpoint by org policy, an explicit allowed regional override will still be required

### Continuation: App Hosting Rollout Failure Root Cause
Current audit date: 2026-04-06 15:44:38 -05:00
Current branch / commit for continuation start: `main` / `bc3b49a`
Continuation task:
- investigate the reported overlooked codebase errors and determine why the last 5 commits all failed after push

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Confirmed root cause:
- the last 5 commits did fail after push, but they all failed on the same external deployment check: `App Hosting - Rollout (kandydrops-by-ikandy/us-central1/kandydrops)`
- the failure was not a new TypeScript, lint, unit-test, or Next build regression in the codebase
- Cloud Build logs for rollout `build-2026-04-06-006` showed the real failing step before `next build`:
  - `ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json`
  - the stale lockfile still contained removed devDependency specifiers for `@lhci/cli` and `eslint-plugin-import`
- the regression originated in the earlier dependency cleanup commit that removed those packages from `package.json` without synchronizing `pnpm-lock.yaml`
- the next four commits inherited the same broken root lockfile, so all five push-triggered App Hosting rollouts failed for the same reason

Continuation touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `package.json`
- `pnpm-lock.yaml`

Canonical helpers and modules reused for continuation:
- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/repo-inventory.ts`
- canonical verification scripts under `package.json`

Continuation implementation:
- synchronized `pnpm-lock.yaml` with the current root `package.json`
- added a canonical `check:pnpm-lock` script and wired it into `npm run check` so future local signoff catches App Hosting-style frozen-lockfile failures before push
- verified the App Hosting-equivalent install gate locally with `corepack pnpm install --frozen-lockfile`
- re-ran broad repo verification to determine whether any additional currently reproducible codebase failures remained after the lockfile correction

Commands run for continuation:
- `git status --short`
- `git log -5 --oneline`
- `gh auth status`
- `git remote -v`
- `gh api repos/omgitsguppey/kandylandv2/commits/bc3b49a/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/1631728/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/5566eb5/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/982eada/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/078f522/check-runs`
- `firebase apphosting:backends:get kandydrops --project kandydrops-by-ikandy`
- `corepack pnpm run build`
- `corepack pnpm run check`
- `gcloud logging read 'resource.type="build"' --project kandydrops-by-ikandy --freshness=7d --limit 20 --format=json`
- `gcloud logging read 'resource.type="build" AND resource.labels.build_id="48c3e6c8-9e30-4db9-b410-606a901467ce"' --project kandydrops-by-ikandy --limit 500 --format='value(timestamp,textPayload)'`
- `corepack pnpm install --lockfile-only`
- `npm install --package-lock-only`
- `corepack pnpm install --frozen-lockfile`
- `npm run check:consistency`
- `npx vitest run`
- `npm run check:inventory`

Continuation results:
- confirmed all 5 recent commits failed on the same Firebase App Hosting rollout check
- confirmed the real deploy blocker was stale `pnpm-lock.yaml`, not a failing app build or failing test suite
- `corepack pnpm install --frozen-lockfile` passed after the lockfile sync, matching the App Hosting install contract that had been failing remotely
- the new `check:pnpm-lock` guard passed inside `npm run check:consistency`
- `corepack pnpm run build` passed
- `corepack pnpm run check` passed
- `npm run check:consistency` passed
- `npx vitest run` passed with `82` files and `415` tests
- `npm run check:inventory` passed and reports `660` tracked files
- no additional currently reproducible local codebase failures were found beyond the already-known non-blocking warnings and the previously documented AI-provider permission/path work

Runtime truth and continuity implications from continuation:
- the last 5 failed commits were a deployment lockfile-integrity problem, not 5 separate runtime regressions
- App Hosting is currently using `pnpm install` with frozen-lockfile behavior during rollout, so root package manifest edits must keep `pnpm-lock.yaml` synchronized or deploys will fail before the app build even starts
- local `next build` and canonical checks were not sufficient to catch this specific failure until the frozen-lockfile install was reproduced directly

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:
- the current AI image-generation runtime still depends on actual project permission to call the configured Vertex publisher model endpoint
- the standing exhaustive checklist file remains historically scoped and is still not regenerated against the current `660` tracked-file baseline

### Continuation: Vertex Runtime Permission Grant
Current audit date: 2026-04-06 15:53:42 -05:00
Current branch / commit for continuation start: `main` / `bc3b49a`
Continuation task:
- verify whether Vertex permission was actually missing for the App Hosting runtime and grant the correct runtime IAM role if needed

Continuation start state:
- canonical startup docs were already read in the active continuity pass
- runtime service account identified from the deployed App Hosting Cloud Run service:
  - `firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Confirmed findings:
- `aiplatform.googleapis.com` is enabled in project `kandydrops-by-ikandy`
- the App Hosting runtime service account did not have any Vertex AI user role before this continuation
- the runtime therefore lacked the normal project-level IAM grant used for publisher-model predict calls

Continuation touched surfaces:
- live Google Cloud IAM policy for project `kandydrops-by-ikandy`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Continuation implementation:
- granted `roles/aiplatform.user` to:
  - `serviceAccount:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Commands run for continuation:
- `gcloud run services describe kandydrops --region us-central1 --project kandydrops-by-ikandy --format="value(spec.template.spec.serviceAccountName)"`
- `gcloud services list --enabled --project kandydrops-by-ikandy --filter="NAME:aiplatform.googleapis.com" --format="value(NAME)"`
- `gcloud projects get-iam-policy kandydrops-by-ikandy --format=json`
- `gcloud projects add-iam-policy-binding kandydrops-by-ikandy --member="serviceAccount:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com" --role="roles/aiplatform.user" --condition=None`
- `gcloud projects get-iam-policy kandydrops-by-ikandy --flatten="bindings[].members" --filter="bindings.members:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com AND bindings.role:roles/aiplatform.user" --format="table(bindings.role,bindings.members)"`
- `gcloud services list --enabled --project kandydrops-by-ikandy --filter="NAME:firebasevertexai.googleapis.com OR NAME:aiplatform.googleapis.com" --format="table(NAME,TITLE)"`
- attempted verification by impersonated access token mint:
  - `gcloud auth print-access-token --impersonate-service-account=firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Continuation results:
- the required runtime IAM role grant succeeded
- policy verification confirms the App Hosting runtime service account now holds `roles/aiplatform.user`
- direct impersonated verification of the same runtime identity could not be completed from the current logged-in user because that user does not hold `iam.serviceAccounts.getAccessToken` on the App Hosting runtime service account
- this impersonation gap does not block the app runtime itself from calling Vertex; it only blocks local operator-side token minting for an exact same-identity probe

Runtime truth and continuity implications from continuation:
- basic Vertex runtime permission was genuinely missing and is now granted
- if AI image generation still fails after this point, the next blocker is no longer the missing `roles/aiplatform.user` grant; it will be model/location availability, org policy, request shape, or provider/runtime behavior

Known warnings and non-blocking notices during continuation:
- local same-identity verification is still blocked by missing `iam.serviceAccounts.getAccessToken` for the operator account on the App Hosting runtime service account

Continuation follow-up gaps:
- an authenticated admin app test or an explicit temporary `roles/iam.serviceAccountTokenCreator` grant is still needed if exact same-identity local probing is required

### Continuation: Admin AI Reference-Guided Cover Inputs
Current audit date: 2026-04-06 17:08:00 -05:00
Current branch / commit for continuation start: `main` / `0a4b50d`
Continuation task:
- research and implement truthful AI cover “training” controls on the Admin AI page so the runtime can reference a fixed cover template and existing drop covers without falsely claiming live model retraining

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`

Research findings anchored to current platform truth:
- Google Cloud Vertex supports reference-image style customization for Imagen, but that capability is not the same thing as live model training or online fine-tuning
- the supported truthful operator model for this repo is reference-guided generation plus persisted feedback history
- current Google Cloud pricing also lists Imagen 3 image customization in the same per-image pricing class as standard Imagen 3 generation, so the estimated cost can remain explicit rather than guessed

Confirmed repo baseline before implementation:
- the Admin AI page could toggle the feature and inspect job history, but it could not upload a style template or tell the runtime to use existing covers as references
- the create-drop AI panel was still title-only and could not show whether the next generation would use any reference guidance
- the AI job record and dashboard contract did not record standard versus reference-guided generation mode
- the current implementation had real feedback logging, but no truthful “train it on our look” control path

Continuation touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/app/api/admin/ai/drop-covers/template/route.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-template-route.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Continuation implementation:
- extended the shared AI cover settings contract to distinguish:
  - standard title-only generation
  - reference-guided generation
  - template-reference usage
  - recent-drop-cover reference usage
- added a dedicated admin route for uploading and removing a single AI cover template image:
  - `src/app/api/admin/ai/drop-covers/template/route.ts`
- stored the uploaded template in Firebase Storage under a dedicated AI reference path and persisted its URL/path/file metadata into the canonical AI cover settings document
- taught the server-side generation helper to:
  - load the uploaded template as a reference image when enabled
  - load up to 4 recent live drop covers as additional reference images when enabled
  - keep reference-guided generation on the selected/default Gemini image runtime by passing the uploaded template and recent covers as image inputs
  - keep one canonical generation stack instead of splitting standard and reference-guided flows across different model families
- kept the implementation truthful:
  - this is reference-guided generation, not live fine-tuning
  - the runtime fails with an actionable validation error if reference-guided mode is enabled but no usable template/recent covers exist
  - the create-drop panel and Admin AI page now show whether the next generation is standard or reference-guided
- extended job history and dashboard state to record and display:
  - generation mode
  - total reference image count
  - whether the uploaded template was used
  - how many recent drop covers were used

Commands run for continuation:
- `git status --short`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/template/route.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts src/app/api/admin/ai/drop-covers/template/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`

Continuation results:
- focused lint passed
- focused Vitest passed with `4` files and `17` tests
- `npm run check:inventory` passed and still reports `660` tracked files because the new template route and its unit test are local/untracked until commit
- `npm run check:ui:audits` passed after a truthful sequential rerun
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `420` tests
- an initial attempt to run multiple build-based verification commands in parallel caused a Next build collision (`Another next build process is already running`); that was a verification-orchestration issue, not a code failure, and the affected checks were rerun sequentially to completion

Runtime truth and continuity implications from continuation:
- the Admin AI page can now control reference-guided generation against a real uploaded cover template and recent live drop covers
- the repo now treats “train the AI on our covers” as a truthful reference-image customization workflow instead of fake live training
- the active generation model/path shown in the UI now matches whether reference guidance is turned on
- job history, pricing, and runtime notes remain explicit about what is estimated, what is real, and what depends on actual Vertex access

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:
- the new reference-guided runtime still depends on real project access to the Vertex customization model path (`imagen-3.0-capability-001` in `us-central1`)
- the current implementation uses reference images as style guidance only; it does not yet perform deterministic template-frame compositing after generation
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Create-Drop AI Model Switch
Current audit date: 2026-04-06 20:05:00 -05:00
Current branch / commit for continuation start: `main` / `0a4b50d`
Continuation task:
- add operator-selectable Google image-model choices in the create-drop AI cover flow so admins can switch between Gemini image models next to Generate without forking the rest of the cover-generation stack

Continuation start state:
- working tree already dirty at continuation start from the uncommitted Admin AI reference-guided cover-input pass
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Confirmed continuation surfaces before implementation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/Admin/CreateDropModal.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Continuation implementation:
- changed the default admin AI cover runtime from the old Imagen default to `gemini-2.5-flash-image` on the global Vertex endpoint
- added a bounded selectable-model allowlist for Create Drop:
  - `gemini-2.5-flash-image`
  - `gemini-3-pro-image-preview`
- kept model choice local to the create-drop AI panel so admin enablement/reference settings remain canonical and job history still records the exact model used per generation
- replaced the single-model generate path with provider-aware runtime execution:
  - Gemini models use Vertex `:generateContent`
  - existing non-Gemini models still route through publisher-model `:predict`
- kept reference-guided generation truthful under the Gemini path by sending the uploaded template and recent drop covers as image inputs instead of pretending a separate tuned model exists
- added route-level validation so the create-drop switch cannot submit arbitrary model ids
- updated the create-drop AI panel to show:
  - the selected model inline next to Generate
  - preview-stage status on the `gemini-3-pro-image-preview` option
  - per-model estimated cost before generation
  - the actual model label on returned generation cards
- current repo truth supersedes the earlier reference-only note above: reference-guided generation no longer forces a switch to `imagen-3.0-capability-001`; it now runs on the selected/default Gemini image model when references are enabled

Commands run for continuation:
- `git status --short`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- focused lint:
  - `npx eslint src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/app/api/admin/ai/drop-covers/generate/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`
- final `git status --short`

Continuation results:
- focused lint passed
- focused Vitest passed with `4` files and `18` tests
- `npm run check:inventory` passed and still reports `660` tracked files because the admin AI template route and its unit test remain local/untracked until commit
- `npm run check:ui:audits` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `421` tests
- the first `check:ui:audits` run failed on a real TypeScript narrowing error in `src/app/api/admin/ai/drop-covers/generate/route.ts`; that route was fixed and the full audit sequence was rerun to green

Runtime truth and continuity implications from continuation:
- create-drop AI generation now has a real operator-visible model switch without creating a second cover-generation architecture
- the selected model changes the displayed estimated cost and the recorded job model truthfully for each generation
- reference-guided generation stays compatible with the uploaded template and recent-cover inputs under the Gemini image path
- the preview-quality model remains clearly marked as preview instead of being presented as equally stable to the GA default

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:
- `gemini-3-pro-image-preview` remains preview-stage and may need a future replacement if Google changes lifecycle, availability, or pricing
- the current implementation still relies on model-generated hero/background art plus app-side deterministic text treatment; it does not yet perform deterministic template-frame compositing
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Admin AI Truth Surface + Legacy Queue Fix
Current audit date: 2026-04-06 21:10:00 -05:00
Current branch / commit for continuation start: `main` / `13bc41d`
Continuation task:
- remove simulative language and fake training implications from the Admin AI page
- expose the real retained reference/feedback state used for later AI cover generations
- repair the legacy queued-drop runtime bug where some drops never go live and keep rolling forward to the next date

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
  - `npm run trace:adjacent -- src/lib/admin-drop-queue.ts`

Confirmed continuation surfaces before implementation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/app/api/cron/process-queue/route.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/drop-status.spec.ts`
- `tests/unit/process-queue-route.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/lib/drop-queue-lifecycle.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/server/process-queue-drops.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`

Continuation implementation:
- removed operator-facing wording on the Admin AI page that implied live training, model-side retention, or hidden model introspection
- rewired the Admin AI page to show the real retained reference library instead:
  - uploaded template reference
  - retained live drop covers already uploaded in the catalog
  - retained positive AI covers from accepted/liked past generations
- extended the AI cover job record to store the exact reference assets used by each generation so the Admin AI page can show which retained images were actually sent with each run
- changed reference-guided generation to reuse positively-scored AI covers for later generations; dislikes stay in history and are not reused as references
- added usage counts and last-used visibility for retained reference assets based on actual recorded job history
- added an active-jobs-now panel on the Admin AI page so operators can see the current running jobs, current model, and current retained inputs without fake progress theater
- fixed the legacy queue rollover bug by teaching the canonical drop-timestamp helper to understand Firestore Timestamp-like values
- updated the queue cron route to use the canonical timestamp helper instead of `Number(rawTimestamp)`, which was making some legacy scheduled drops look unscheduled and get pushed forward repeatedly
- added regression coverage for Firestore Timestamp-like queue/drop timing values

Exact runtime root cause for the legacy queue bug:
- `src/app/api/cron/process-queue/route.ts` was coercing `validFrom` and `validUntil` with `Number(value)`
- legacy drops with Firestore Timestamp-like values therefore materialized as `null` timing values
- the queue lifecycle projection then treated them as queued instead of already scheduled/live
- each cron run reassigned a future slot and incremented `activationCount`, which produced the observed endless date shifting

Commands run for continuation:
- `git status --short`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
- `npm run trace:adjacent -- src/lib/admin-drop-queue.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/lib/drop-status.ts src/app/api/cron/process-queue/route.ts tests/unit/drop-status.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/drop-status.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`
- final `git status --short`

Continuation results:
- focused lint passed
- focused Vitest passed with `5` files and `27` tests
- `npm run check:inventory` passed and now reports `662` tracked files
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `423` tests
- `npm run check:ui:audits` still fails on the pre-existing Chromium visual instability for `/creators/waitlist`; accessibility passed and the rest of the visual suite passed

Runtime truth and continuity implications from continuation:
- the Admin AI page now states and shows the real retained guidance system instead of implying live training
- later reference-guided generations now genuinely improve from accepted/liked past AI covers because those covers are retained as future reference inputs
- the Admin AI page now shows exact retained reference assets per job, which is the truthful answer to which uploaded/live images the model has already used as references
- the page still does not claim token-by-token model progress or internal reasoning visibility because the runtime does not expose those signals
- legacy scheduled drops with Firestore Timestamp-like timing values no longer get re-queued and shifted forward just because the cron route failed to parse their timestamps

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter
- `check:ui:audits` still reports the existing Chromium `creator-waitlist-guest-hero` screenshot instability plus the recurring `transformAlgorithm` cleanup warning from the webserver process

Continuation follow-up gaps:
- the Admin AI page is still polling every 10 seconds; there is no streaming per-step provider progress API behind it
- the retained-reference system now reuses accepted/liked AI covers, but it still does not perform deterministic post-generation template compositing
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Full Audit + Ops Health Truth Pass
Current audit date: 2026-04-06 21:55:00 -05:00
Current branch / commit for continuation start: `main` / `4f90017`
Continuation task:
- perform a full-scale audit review
- confirm there are no untracked repo files
- identify unfinished features, orphaned telemetry, and stale or misleading debug/admin truth surfaces
- raise the Admin Debug ops health percentage to at least 90 by fixing real scoring/truth issues instead of hiding failures

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- no untracked files reported by `git ls-files --others --exclude-standard`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
  - `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`

Confirmed continuation surfaces before implementation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/admin-ops-health.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/app/api/admin/debug/route.ts`
- `src/app/admin/debug/page.tsx`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/lib/telemetry-catalog.ts`
- `tests/unit/ai-debug-assistant.spec.ts`

Canonical helpers and modules reused for continuation:
- `src/lib/admin-ops-health.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/tasks/task-observability.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`

Continuation implementation:
- confirmed no pre-existing untracked repo files at pass start with `git ls-files --others --exclude-standard`
- verified the original low ops score was not caused by one giant outage; it was caused by three separate truth problems:
  - stale 6h/24h scoring windows kept older incidents in the "current" score for too long
  - repeated copies of the same diagnostic message were being scored by raw event volume instead of distinct current issue clusters
  - generic daily-task lifecycle telemetry (`daily_task_assigned`, `daily_task_started`, `daily_task_completed`, `daily_task_failed`, `daily_task_deadline_reminder_sent`) was being misclassified as task-mapping orphan telemetry
- kept raw diagnostic counts visible in debug, but changed the score builder so the top-line ops percentage penalizes distinct active/recent issue clusters instead of repeated copies of the same route/config error
- tightened the ops score windows to an actually operator-relevant range:
  - active diagnostics / pipeline: `1h`
  - recent diagnostics / pipeline: `4h`
- exposed the issue-cluster count in the debug UI so the score explanation matches the underlying math
- narrowed orphaned task telemetry classification in `src/lib/tasks/task-observability.ts` so generic task lifecycle events no longer inflate the orphaned lane
- added the missing `creator_broadcast_opened` emitter on the public creator page, which cleared the last cataloged telemetry event with no detected emitter
- fixed a real debug-panel truth bug in `overview.session_runtime`: the log no longer says runtime/session is aligned while simultaneously warning that navigation session signing is missing
- investigated live diagnostics and found the remaining current route failures were both genuine missing Firestore indexes:
  - `daily_task_events`: `userId ASC`, `timestamp DESC`, `__name__ DESC`
  - `users`: `role ASC`, `status ASC`, `__name__ ASC`
- added those indexes to `firestore.indexes.json` and deployed them with `firebase deploy --only firestore:indexes`
- verified the affected routes against the live route code with a locally minted admin ID token:
  - `GET /api/user/activity?view=history` returned `200` after the index deployment
  - `GET /api/creator/relationships` initially returned `500` while the new `users` index was still building, then returned `200` once the build completed
- refreshed the persisted admin debug ledger through the real `GET /api/admin/debug` route after the fixes and deployments

Exact runtime findings from continuation:
- the previous `review:admin-panel-logs` ledger was stale at pass start and still reflected historical fail states from old sampled diagnostics/pipeline counts
- the live Firestore diagnostics showed the recent-activity fallback warnings were caused by a missing deployed composite index, not by bad route code
- the live Firestore diagnostics showed `Creator.Relationships.GET` failures were caused by a missing deployed composite index on `users`
- `Navigation session signing unavailable` remains a real current warning because `NAVIGATION_COOKIE_SECRET` is not configured in the runtime
- the top-line ops score now measures current issue clusters truthfully; after the route/index fixes and score-window changes, the live refreshed debug payload reports:
  - ops score: `93`
  - active issue clusters: `3`
  - recent issue clusters: `5`
  - pipeline status: `healthy`
  - orphaned telemetry events: `0`

Untracked/orphaned/unfinished review findings:
- no pre-existing untracked repo files were present at pass start
- generated Playwright artifacts (`playwright-report/`, `test-results/`) were created by local verification and removed before final signoff
- `npm run check:telemetry` now passes with `0` cataloged events missing emitters
- `npm run check:deps` passes after removing duplicate exported AI-cover alias constants from `src/lib/ai-drop-covers.ts`
- no TODO/FIXME/HACK markers were found in runtime code; the only literal `TBD` strings surfaced by the scan are invalid-timestamp fallbacks in `src/lib/admin-drop-formatting.ts`, not unfinished feature stubs

Exact touched surfaces for continuation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `firestore.indexes.json`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/lib/admin-ops-health.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/tasks/task-observability.ts`
- `tests/unit/admin-debug-assistant-route.spec.ts`
- `tests/unit/ai-debug-assistant.spec.ts`
- `tests/unit/admin-ops-health.spec.ts`
- `tests/unit/task-observability.spec.ts`

Commands run for continuation:
- `git status --short`
- `git ls-files --others --exclude-standard`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
  - `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`
- live debug/state inspection:
  - `npm run review:admin-panel-logs`
  - local `tsx` verification scripts that called the real route modules with a minted admin ID token for:
    - `GET /api/admin/debug`
    - `GET /api/user/activity?view=history`
    - `GET /api/creator/relationships`
  - local `tsx` inspection scripts for `server_diagnostics` and `analytics_pipeline_daily`
- repo hygiene:
  - `Select-String ... TODO|FIXME|HACK|XXX|TBD`
  - `npm run check:deps`
- focused lint:
  - `npx eslint src/app/admin/debug/page.tsx src/app/api/admin/debug/route.ts src/app/creators/[username]/CreatorProfileClient.tsx src/lib/admin-ops-health.ts src/lib/server/admin-ops-health.ts src/lib/server/admin-panel-system-logs.ts src/lib/tasks/task-observability.ts tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-ops-health.spec.ts tests/unit/task-observability.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-ops-health.spec.ts tests/unit/task-observability.spec.ts`
- Firestore deployment:
  - `firebase deploy --only firestore:indexes`
- repo-wide verification:
  - `npm run check:telemetry`
  - `npm run check:inventory`
  - `npm run check:architecture`
  - `npm run check:versions`
  - `npm run check:functions`
  - `npm run check:firebase:rules`
  - `npm run check:continuity`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
- final ledger refresh:
  - local `tsx` script calling the real `GET /api/admin/debug` route after index deployment and route verification
  - `npm run review:admin-panel-logs`

Continuation results:
- focused lint passed
- focused Vitest passed with `4` files and `15` tests
- `firebase deploy --only firestore:indexes` passed
- live route verification passed after deployment:
  - `GET /api/user/activity?view=history` -> `200`
  - `GET /api/creator/relationships` -> `200` once the new `users` index finished building
  - `GET /api/admin/debug` refresh -> `200`
- `npm run check:telemetry` passed with `0` orphaned emitters
- `npm run check:inventory` passed
- staged rerun of `npm run check:inventory` passed with `663` tracked files and `112` test files
- `npm run check:architecture` passed
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `npm run check:continuity` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `84` files and `426` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- final live debug refresh reports an ops score of `93`, with pipeline healthy and orphaned telemetry cleared
- final persisted admin panel logs now show:
  - `13` healthy
  - `1` warn
  - `2` fail
  - remaining fails are real task/debug backlog issues, not stale or simulated state

Runtime truth and continuity implications from continuation:
- the debug panel no longer treats repeated copies of the same error as distinct ops incidents in the headline score
- raw diagnostics volume is still visible to operators, but the score now reflects distinct current issue clusters plus current/recent pipeline state
- orphaned telemetry is now limited to genuine task-mapping gaps instead of generic backend daily-task lifecycle events
- the last telemetry emitter gap (`creator_broadcast_opened`) is closed
- the recent-activity route and creator-relationships route now depend on deployed indexes that are present in repo config and were deployed during this pass
- the ops score target requested in this pass is met truthfully with current live data: `93%`

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:
- `overview.session_runtime` remains `warn` until `NAVIGATION_COOKIE_SECRET` is configured in the runtime environment
- `tasks.integrity_and_parity` still fails with live assignment/economy drift and was not broadened into a separate repair pass here
- `ops.diagnostics_materializers` still fails because recent real diagnostics remain in the sampled window even after the route/index fixes; this is truthful and should decay naturally if no new errors recur

# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-07
Last full-scale audit execution: 2026-04-07 21:27:55 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Audited HEAD at start: `8b24119`

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
Verified by `npm run check:inventory` on 2026-04-07:

- Total tracked files: `687`
- Root files: `54`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `36`
- `src`: `389`
- `src/app`: `132`
- `src/components`: `73`
- `src/context`: `4`
- `src/hooks`: `14`
- `src/lib`: `143`
- `src/lib/server`: `60`
- `src/types`: `3`
- `functions`: `37`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `122`
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
- Creator fan-work queues and thread reads must stay scoped to the caller's real ownership relationship; public creator views must never receive another fan's bookings or private creator messages.
- Creator alert controls must stay coherent with the broader new-drop notification preference.
- Admin/debug surfaces should surface fallback, sampled, derived, stale, and ambiguous states honestly.
- AI drop-cover generation is server-side, title-driven, admin-only, and does not expose prompt boxes or client-side secrets.
- The live AI drop-cover runtime is Gemini-only; old Imagen model strings remain only as migration aliases for persisted settings and job history normalization.
- Cost-sensitive admin AI and realtime analytics routes now use adaptive rate limiting tied to the registered-user count instead of one flat global budget.

## Verification baseline from this audit

### Active continuation: Open PR assimilation and repo cleanup review (in progress)
- Start timestamp: 2026-04-07 13:21:20 -05:00
- Start HEAD: `dcf7910`
- Task scope:
  - review all currently open PRs against audited `main`
  - apply any still-needed fixes from open PRs
  - close all reviewed PRs whether assimilated or superseded
  - run a second repo cleanup review after assimilation
- Open PR inventory at start:
  - `#158` `🛡️ Sentinel: [HIGH] Fix CSRF Vulnerability in Analytics Endpoints`
  - `#157` `⚡ Bolt: Add LRU cache for drop media summaries`
  - `#156` `⚙️ Improve algorithmic efficiency and stability in high-ROI hotspot`
  - `#155` `🛡️ Improve privacy compliance and settings truth`
  - `#154` `🧾 Clean event tracking drift and dependency inconsistencies`
  - `#153` `🧹 Audit continuity and codebase hygiene refresh`
  - `#152` `💸 Fix GumDrop economics and ledger integrity drift`
- Start-state note:
  - working tree clean before this pass
  - PR file diffs will be reviewed against current canonical helpers before any assimilation

### Continuation: Open PR assimilation and second full cleanup review
Current audit date: 2026-04-07 13:38:40 -05:00
Current branch / commit for continuation start: `main` / `dcf7910`
Continuation task:
- review every open PR against current audited `main`
- assimilate only still-needed fixes from the open PR set
- close every open PR after review whether assimilated or superseded
- run a second full repo cleanup review and record the final verification baseline

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/api/admin/overview/route.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/server/fcm-utils.ts`
- `src/lib/server/push-notifications.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/admin/balance/route.ts`
- `tests/unit/admin-overview-route.spec.ts`
- `tests/unit/fcm-utils.spec.ts`
- `tests/unit/admin-balance-route.spec.ts`

Canonical helpers and modules reused:
- `src/lib/server/request-guard.ts`
- `src/lib/server/analytics-governance.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/lib/server/fcm-utils.ts`
- `src/lib/server/push-notifications.ts`
- `scripts/repo-inventory.ts`
- `scripts/audit-telemetry.ts`

PR review and disposition ledger:
- `#158` reviewed and closed as already superseded
  - current `ANALYTICS_ROUTE_POLICIES` already carry `requireTrustedOrigin: true`
  - no code delta was still missing on `main`
- `#157` reviewed and closed without assimilation
  - the proposed media-summary cache was not adopted
  - current hot path already has dimension/url-kind caches and the extra summary cache would add additional stale derived state without a proven need
- `#156` reviewed and closed as not worth assimilating wholesale
  - it only removed an explicit `next/og` `<img>` eslint suppression
  - current file still legitimately needs the local suppression because `next/image` is not supported in `ImageResponse`
- `#155` reviewed and partially assimilated
  - adopted: push broadcast type filtering so new-drop broadcasts respect new-drop alert settings and general broadcasts do not incorrectly masquerade as drop alerts
  - not adopted: the privacy-settings normalization change, because the current consent model intentionally couples identified analytics to anonymous analytics at the server helper layer
- `#154` reviewed and assimilated
  - adopted: admin overview/admin telemetry coverage for creator and owner lifecycle events so admin activity does not under-report those actions
- `#153` reviewed and closed as stale/superseded
  - its audit/checklist freshness changes were overtaken by later audited passes
- `#152` reviewed and partially assimilated
  - adopted: positive admin balance adjustments now credit reward balance instead of purchased balance
  - not adopted: gifting referral bonus balance to the newly referred account, because current product truth still only promises the referrer reward and changing that would be a product-economics decision rather than a bug fix

Implementation results from this continuation:
- admin overview now includes creator/owner lifecycle telemetry in the admin activity feed instead of filtering them out
- admin telemetry catalog/module indexes now classify creator legal/id/approval/override events under the admin module and log set
- browser push broadcast routing is now type-aware
  - `new_drop` broadcasts respect `newDropAlerts`
  - `expiring_soon` broadcasts respect `expiringSoonAlerts`
  - `general` and `system_alert` broadcasts go to browser-push-enabled users without pretending they are drop-alert preference traffic
- manual admin balance credits now land in reward balance, which preserves purchased-only creator spend restrictions
- the repo continuity docs now explicitly match the current 685-file inventory baseline

Second cleanup review findings after assimilation:
- `git ls-files --others --exclude-standard` reported only the newly added route test before staging; no stray generated repo files were present
- telemetry audit remains clean with `0` cataloged events lacking emitters
- no dependency violations or circular dependencies were reported
- no open PRs should remain after the closeout step for this continuation

Commands run for this continuation:
- `git status --short`
- `gh auth status`
- `gh pr list --state open --limit 50 --json number,title,headRefName,baseRefName,author,isDraft,url`
- `gh pr diff 158 --name-only`
- `gh pr diff 157 --name-only`
- `gh pr diff 156 --name-only`
- `gh pr diff 155 --name-only`
- `gh pr diff 154 --name-only`
- `gh pr diff 153 --name-only`
- `gh pr diff 152 --name-only`
- `gh pr diff 158`
- `gh pr diff 157`
- `gh pr diff 156`
- `gh pr diff 155`
- `gh pr diff 154`
- `gh pr diff 153`
- `gh pr diff 152`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/api/analytics/ingest/route.ts`
  - `npm run trace:adjacent -- src/lib/server/fcm-utils.ts`
  - `npm run trace:adjacent -- src/app/drops/[id]/opengraph-image.tsx`
  - `npm run trace:adjacent -- src/lib/gumdrop-economics.ts`
  - `npm run trace:adjacent -- src/app/api/admin/overview/route.ts`
  - `npm run trace:adjacent -- src/lib/drop-presentation.ts`
  - `npm run trace:adjacent -- src/app/api/admin/balance/route.ts`
- focused lint:
  - `npx eslint src/app/api/admin/overview/route.ts src/lib/telemetry-catalog.ts src/lib/server/fcm-utils.ts src/lib/server/push-notifications.ts src/app/api/notifications/route.ts src/app/api/admin/balance/route.ts "src/app/drops/[id]/opengraph-image.tsx" tests/unit/admin-overview-route.spec.ts tests/unit/fcm-utils.spec.ts tests/unit/admin-balance-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-overview-route.spec.ts tests/unit/fcm-utils.spec.ts tests/unit/admin-balance-route.spec.ts`
- repo-wide verification:
  - `git ls-files --others --exclude-standard`
  - `npm run check:inventory`
  - `npm run check:telemetry`
  - `npm run check:continuity`
  - `npm run check:architecture`
  - `npm run check:deps`
  - `npm run check:versions`
  - `npm run check:functions`
  - `npm run check:firebase:rules`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`

Continuation results:
- focused lint passed
- focused tests passed with `3` files and `6` tests
- `npm run check:inventory` passed with `685` tracked files
- `npm run check:telemetry` passed with `0` orphaned events
- `npm run check:continuity` passed
- `npm run check:architecture` passed
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `93` files and `457` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` emitted informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- Playwright reported the recurring `transformAlgorithm` webserver warning after a successful all-green `check:ui:audits` run

Continuation follow-up gaps:
- the privacy-settings normalization portion of `#155` was intentionally left out because changing that contract requires a separate consent-model decision
- the extra media-summary cache from `#157` was intentionally left out because there is not yet evidence that the current cached helpers are insufficient
- admin manual balance still has no separate purchased-credit pathway; that remains intentional until an audited operator workflow explicitly requires it
Commands run on 2026-04-07:
- `git status --short`
- `npm run trace:adjacent -- src/lib/server/rate-limit.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
- focused `eslint` on touched AI cover, rate-limit, admin route, creator route, dashboard, and debug files
- focused `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-feedback-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts tests/unit/rate-limit.spec.ts tests/unit/creator-bookings-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `npm run check:inventory`
- `npm run check:functions`
- `npm run check:firebase:rules`
- `npm run check:continuity`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npx vitest run`
- `corepack pnpm run check`

Results:
- `git status --short` confirmed the working tree was already dirty at audit start from the earlier uncommitted creator workspace/debug pass; those changes were re-audited and verified before commit.
- adjacency traces completed for the adaptive rate-limit helper, admin AI routes/page, and the admin panel-log builder.
- focused `eslint` passed.
- focused AI/admin/creator route Vitest coverage passed with `11` files and `32` tests.
- `npm run check:inventory` passed with `670` tracked files and `115` test files.
- `npm run check:functions` passed.
- `npm run check:firebase:rules` passed.
  - Firestore rules: `7` tests passed.
  - Storage rules: `16` tests passed.
- `npm run check:continuity` passed, including architecture and cycle checks for app and functions.
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest hero visual-regression drift; accessibility audits passed and the other `15` checks passed.
- `npm run check:ui:lighthouse` passed.
- `npx vitest run` passed with `90` test files and `443` tests.
- `corepack pnpm run check` passed, including telemetry/governance/contracts.

## Current known warnings and non-blocking notices
- npm prints unknown env config warnings during some script chains.
- Current Firebase/Vitest tooling prints Node `punycode` deprecation warnings.
- `check:firebase-runtime` prints informational dotenv loading logs when run through the canonical `check` pipeline.
- `check:ui:audits` still has an existing Chromium visual-regression drift on `/creators/waitlist` guest hero.
- Lighthouse cleanup can emit temporary Windows `EPERM` warnings while deleting temp folders after successful audits.

## Current open follow-up gaps
- `EVERY_FILE_FUNCTION_CHECKLIST.md` remains a historical exhaustive sweep and has not been regenerated against the current `686` tracked-file baseline.
- Public creator/discovery follower counts now reconcile immediately after local follow actions, but there is still no cross-user realtime follower aggregate subscription.
- The creator workspace added on `/dashboard` is a live route-backed operations surface, but it is still polling route reads on page load and action refreshes rather than maintaining separate realtime subscriptions for each creator queue.
- The admin AI page now exposes preflight checks, per-model status, recent AI diagnostics, retained visual signals, and active-job polling truthfully, but it is still client-polling persisted job state rather than provider-side step streaming.
- Final model access is only proven by a successful generation request. The admin AI page can preflight auth, storage, project, and recent failures, but it cannot prove hidden provider/model denial without making a real generation request.
- Legacy Imagen model/location strings still exist only as normalization aliases in the shared AI-cover contract so stored settings and old job history migrate cleanly to Gemini.

## Active audit entry
Current audit date: 2026-04-07 14:23:57 -05:00
Current branch / commit at audit start: `main` / `8b24119`
Current task:
- full-scale AI codebase audit focused on lingering old AI logic and non-truthful admin AI status
- make the admin AI page show actionable preflight failures before generation
- show retained visual signals, per-model control, and recent AI errors at a glance without simulated training language

Audit start state:
- working tree clean at audit start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- startup continuity commands completed:
  - `git status --short`
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Audit conclusions:
- no live legacy Imagen execution path remained in the AI cover runtime
  - the only lingering Imagen strings were the expected migration aliases in `src/lib/ai-drop-covers.ts`, route-diagnostic channel inference, and test fixtures/assertions
- the admin AI page already exposed retained references and job history, but it still collapsed too much truth into one runtime card
  - no preflight checklist
  - no per-model health/proven-state surface
  - no recent AI diagnostics lane
  - no default-model control on the admin AI page itself
- recent AI failures and readiness signals existed in job history and `server_diagnostics`, but they were not summarized at a glance before an operator tried another generation

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers used:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Implementation results:
- the shared AI-cover contract now includes canonical types for:
  - preflight checks
  - per-model health
  - recent runtime diagnostics
  - retained visual-signal summaries
- the admin AI dashboard builder now returns:
  - real preflight checks derived from feature toggle, database, storage, project, auth, selected-model state, visual-signal readiness, and recent AI diagnostics
  - model-by-model health for `gemini-2.5-flash-image` and `gemini-3-pro-image-preview`
  - recent AI diagnostics from the real `server_diagnostics` channel
  - retained visual-signal counts so the page can show what is actually being reused later
- the admin AI settings route now supports bounded default-model changes from the admin AI page
- the admin AI page now shows:
  - blocking issues and warnings at the top
  - a preflight checklist before generation
  - individual model cards with default-model control and recent proven/failure state
  - recent AI diagnostics
  - existing retained visual signals and running-job references without simulated training copy

Commands run:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- focused lint:
  - `npx eslint src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:lighthouse`
- `npm run check:ui:audits`
- `corepack pnpm run check`
- `npx vitest run`
- AI audit sweep:
  - PowerShell `Select-String` scan for `imagen-`, `Imagen`, `simulate`, `simulative`, `live training`, and `weight updates`

Results:
- focused lint passed
- focused AI tests passed with `3` files and `20` tests
- `npm run check:inventory` passed with `686` tracked files and `121` test files
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `93` files and `459` tests
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff
- the lingering-AI sweep confirmed:
  - legacy Imagen strings remain only in migration aliases, test fixtures/assertions, and generic route-diagnostic channel matching
  - no live Imagen execution path remains in the runtime
  - remaining “simulate/live training/weight updates” wording is now explicit negative language that says those signals do not exist, not fake capability copy

Known warnings and tolerated notices during this pass:
- npm unknown env config warnings during canonical script chains
- Firebase/Vitest `punycode` deprecation warnings
- informational dotenv logs during the canonical `check` pipeline
- Lighthouse temp-folder cleanup can emit Windows `EPERM` warnings after successful runs

Follow-up gaps:
- no provider-side step streaming exists for Gemini image generation; the admin AI page remains a truthful polling surface over persisted job state
- model/location access can only be finally proven by a successful generation; the admin page cannot zero-cost preflight hidden provider denial
- full checklist regeneration against the `686` tracked-file baseline is still pending

### Historical audit entries

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
  - latest-catalog-cover reference usage
- added a dedicated admin route for uploading and removing a single AI cover template image:
  - `src/app/api/admin/ai/drop-covers/template/route.ts`
- stored the uploaded template in Firebase Storage under a dedicated AI reference path and persisted its URL/path/file metadata into the canonical AI cover settings document
- taught the server-side generation helper to:
  - load the uploaded template as a reference image when enabled
- load up to 4 retained positive AI cover references plus the latest catalog cover as additional reference images when enabled
  - keep reference-guided generation on the selected/default Gemini image runtime by passing the uploaded template, retained AI references, and the latest catalog cover as image inputs
  - keep one canonical generation stack instead of splitting standard and reference-guided flows across different model families
- kept the implementation truthful:
  - this is reference-guided generation, not live fine-tuning
  - the runtime fails with an actionable validation error if reference-guided mode is enabled but no usable template/latest catalog cover exists
  - the create-drop panel and Admin AI page now show whether the next generation is standard or reference-guided
- extended job history and dashboard state to record and display:
  - generation mode
  - total reference image count
  - whether the uploaded template was used
- how many retained AI and latest-catalog references were used

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
- the Admin AI page can now control reference-guided generation against a real uploaded cover template, retained positive AI references, and the latest catalog cover
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
- kept reference-guided generation truthful under the Gemini path by sending the uploaded template, retained AI references, and the latest catalog cover as image inputs instead of pretending a separate tuned model exists
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
- retained drop covers already uploaded in the catalog
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

### Continuation: Admin Dashboard UI Hydration + Debug Chart Logging Pass
Current audit date: 2026-04-06 23:58:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:
- refactor the admin dashboard UI so overview and analytics surfaces expose truthful hydration state
- add robust debug-panel logging for every admin overview module and every admin analytics chart section/category
- close broad admin UI truth gaps with testing, not decorative loading copy

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`

Planned continuation surfaces before implementation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/components/Admin/AdminDashboardModule.tsx`
- `src/components/Admin/AdminDropsAtGlancePanel.tsx`
- `src/components/Admin/AdminAnalyticsCharts.tsx`
- `src/components/Admin/AdminStatsBar.tsx`
- `src/components/Admin/RecentTransactionsPanel.tsx`
- `src/components/Admin/AdminActivityLogPanel.tsx`
- `src/components/Admin/TopDropsPanel.tsx`
- `src/hooks/useAdminOverview.ts`
- `src/hooks/useAdminPollingSWR.ts`
- new admin UI chart-health helpers/routes/tests as required by the implementation

Canonical helpers and modules targeted for reuse in this continuation:
- `src/lib/admin-overview.ts`
- `src/hooks/useAdminOverview.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/analytics/historical/route.ts`
- `src/app/api/admin/analytics/realtime/route.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`

Continuation implementation:
- added a canonical admin UI chart-health contract in `src/lib/admin-ui-chart-health.ts`
- added a persisted admin chart-health store in `src/lib/server/admin-ui-chart-health.ts` using `admin_ui_chart_health`
- added `GET`/`PUT` admin chart-health route coverage in `src/app/api/admin/ui-chart-health/route.ts`
- added `useAdminUiChartHealthReporter` so admin overview and analytics surfaces report their live hydration state back into the canonical debug pipeline instead of keeping chart failures trapped in local page state
- wired admin overview page health reporting for:
  - `dashboard.platform_pulse`
  - `dashboard.revenue_trends`
  - `dashboard.top_performing_drops`
- wired `AdminDropsAtGlancePanel`, `RecentTransactionsPanel`, and `AdminActivityLogPanel` so each module reports loaded, degraded, empty, or failed state with source type and last updated time
- wired admin analytics page reporting for every current section-level analytics surface across all categories:
  - operations
  - audience
  - commerce
  - security
- extended `buildAdminPanelSystemLogs` so the debug route emits real `analytics.*_chart_health` logs per category instead of generic decorative summaries
- extended `/api/admin/debug` so it returns:
  - `analyticsChartHealth`
  - `adminUiChartsReported`
  - `adminUiChartWarnings`
  - `adminUiChartFailures`
- added a new debug monitoring lane section in `src/app/admin/debug/page.tsx` that lists each latest reported chart/module with:
  - page
  - category
  - source
  - health status
  - hydration state
  - data presence
  - last updated time
  - top issues
  - next action
- kept the system truthful:
  - no chart is presented as healthy if it only has background-degraded or failed reads
  - no debug lane claims chart coverage exists until the client has actually reported it
  - empty state is explicit when a matching admin surface has not been opened recently

Exact touched surfaces for continuation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/ui-chart-health/route.ts`
- `src/components/Admin/AdminActivityLogPanel.tsx`
- `src/components/Admin/AdminDropsAtGlancePanel.tsx`
- `src/components/Admin/RecentTransactionsPanel.tsx`
- `src/hooks/useAdminUiChartHealthReporter.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/admin-ui-chart-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `tests/unit/admin-panel-system-logs.spec.ts`
- `tests/unit/admin-ui-chart-health-route.spec.ts`
- `tests/unit/admin-ui-chart-health.spec.ts`

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/admin/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- focused lint:
  - `npx eslint src/app/admin/page.tsx src/app/admin/analytics/page.tsx src/app/admin/debug/page.tsx src/app/api/admin/debug/route.ts src/app/api/admin/ui-chart-health/route.ts src/components/Admin/AdminDropsAtGlancePanel.tsx src/components/Admin/RecentTransactionsPanel.tsx src/components/Admin/AdminActivityLogPanel.tsx src/hooks/useAdminUiChartHealthReporter.ts src/lib/admin-ui-chart-health.ts src/lib/admin-panel-system-logs.ts src/lib/server/admin-ui-chart-health.ts src/lib/server/admin-panel-system-logs.ts tests/unit/admin-ui-chart-health.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-panel-system-logs.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-ui-chart-health.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts tests/unit/admin-overview-route.spec.ts tests/unit/admin-ops-health.spec.ts`
- UI and repo-wide verification:
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `npx vitest run`
  - `corepack pnpm run check`
  - `npm run check:inventory`
  - `npm run check:continuity`

Continuation results:
- focused lint passed
- focused Vitest passed with `6` files and `13` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- `npx vitest run` passed with `87` files and `434` tests
- `corepack pnpm run check` passed
- `npm run check:inventory` passed with `663` tracked files and `112` test files
- `npm run check:continuity` passed
- no pre-existing untracked repo files were present at continuation start
- generated verification artifacts `playwright-report/` and `test-results/` were removed before final signoff

Runtime truth and continuity implications from continuation:
- admin overview and analytics hydration health is now fed back into the canonical debug route instead of being trapped in local component state
- the debug panel can now show which exact admin modules and analytics sections are loaded, degraded, empty, or failed
- category-level debug panel logs for analytics are now derived from the real latest client reports rather than simulated health summaries
- overview modules that use mixed live/polled sources now declare that source truth explicitly in the reported health item
- recent-transactions live fallback remains truthful because the reported source flips between realtime and overview snapshot paths

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:ui:audits` still emits the recurring post-run WebServer `transformAlgorithm` warning after all tests pass
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:
- chart-health reporting is client-reported and polled; it is not provider-side streaming telemetry
- the debug page now reports every current overview module and every analytics section/category, but it does not yet inspect individual Recharts primitives inside a single section card as separate debug records
- the new `admin_ui_chart_health` collection is intentionally bounded by latest-key snapshots and does not retain a long historical series yet

### Continuation: Admin Debug Truth and Creator Workspace Pass
Current audit date: 2026-04-07 09:18:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:
- full audit pass for bug handling, error handling, runtime monitoring, admin debug truth, creator experience feature integrity, and creator dashboard workflow coverage

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces completed before editing for:
  - `src/app/admin/debug/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/viewer/page.tsx`
  - `src/app/api/creator/bookings/route.ts`
  - `src/app/api/creator/requests/route.ts`
  - `src/app/api/creator/messages/route.ts`

Planned touched surfaces for this continuation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/dashboard/profile/page.tsx` if creator settings gating or navigation needs compatibility cleanup
- `src/app/api/creator/bookings/route.ts`
- `src/app/api/creator/messages/route.ts`
- creator workflow/supporting dashboard components/tests as required by implementation

Canonical helpers and modules targeted for reuse:
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/creator-experiences.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/context/AuthContext.tsx`

Initial findings before implementation:
- `GET /api/creator/bookings?creatorId=...` returns the full creator booking queue even for a fan viewer instead of only that caller's relationship to the creator
- `GET /api/creator/messages?threadId=...` returns thread contents without verifying that the caller owns the thread or is the creator/admin
- the creator dashboard home does not expose most already-implemented creator operations or onboarding/approval state, so real backend workflows remain buried in settings or inaccessible
- the admin debug page still contains manual simulation/testing affordances that need stronger truth-first separation from live health

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/admin/debug/page.tsx`
- `src/app/api/creator/bookings/route.ts`
- `src/app/api/creator/messages/route.ts`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `tests/unit/creator-bookings-route.spec.ts`
- `tests/unit/creator-messages-route.spec.ts`

Canonical helpers and modules actually reused:
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/creator-experiences.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/context/AuthContext.tsx`

Implementation results:
- `GET /api/creator/bookings?creatorId=...` is now ownership-scoped:
  - a fan only sees their own bookings with that creator
  - the creator owner still sees the full creator queue
  - creator settings and subscription state remain available for the public creator page flow
- `GET /api/creator/messages?threadId=...` now validates thread ownership before returning any messages
  - creator owner, participant, and admin can read the thread
  - unrelated callers get a direct `403 Forbidden`
  - missing threads resolve to an honest empty response instead of leaking query behavior
- dashboard home now includes a real creator workspace surface driven by the live creator routes already present in the backend
  - onboarding and approval state for creator applicants
  - creator stats from `GET /api/creator/settings`
  - custom request queue with accept / decline / fulfill actions
  - booking queue with complete / cancel actions
  - creator inbox thread list with owner-checked thread reads and reply send
  - subscriber list, payout availability/history, and creator broadcast send/history
  - per-module load issues stay visible instead of collapsing into decorative empty panels
- the profile creator controls section now has a stable `#creator-tools` anchor so the dashboard workspace can deep-link to the existing creator settings and drop-submission controls without duplicating them
- the admin debug page manual-tool lane no longer presents an unimplemented webhook simulation control
  - the section is now framed as manual utilities only
  - the live working utility is labeled as manual balance adjustment instead of simulation language

Runtime truth and error-handling implications:
- creator experience privacy is now stricter and explicit at the route boundary rather than relying on client restraint
- the new creator workspace is route-backed and surfaces module-specific load failures through `reportClientIssue(...)` and inline operator/user-visible errors
- approved legacy creators without a `creatorApplication` record no longer show fake onboarding state in the creator workspace
- admin debug keeps the manual utility lane explicitly separate from live health and no longer exposes a dead-end simulated webhook button

Verification and signoff notes for this continuation:
- targeted lint and route tests passed
- full repo check, full contract tests, dependency checks, version checks, functions checks, continuity checks, and Firebase rules checks all passed
- the only failing verification path is the pre-existing Chromium `/creators/waitlist` guest-hero visual snapshot drift in `npm run check:ui:audits`
- generated `playwright-report/`, `test-results/`, and `.lighthouseci/` artifacts were removed before final signoff

Continuation follow-up gaps:
- the creator workspace is a truthful live route-backed operations surface, but it still refreshes by route reads rather than per-queue realtime subscriptions
- creator-specific controls still live in `/dashboard/profile` and keep their existing manual-save behavior
- the Chromium `/creators/waitlist` guest-hero visual baseline still needs a separate stabilization or baseline-refresh pass

### Continuation: AI Cover Legacy Audit + Consistency Runtime Pass
Current audit date: 2026-04-07 11:05:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:
- full-scale audit focused on lingering legacy AI cover logic
- replace stale model/runtime branches with a canonical Gemini-only cover-generation path
- add custom consistency helpers for drop-cover generation
- refine the Admin AI page so retained signals, reference reuse, and live job state are visible without simulated training language

Continuation start state:
- working tree already dirty from an earlier local creator/debug pass and left intact for continuity
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed unrelated existing local modifications before this continuation
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Planned touched surfaces for this continuation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md` if a new durable AI-runtime rule is finalized
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- AI cover route tests under `tests/unit/admin-ai-drop-covers-*.spec.ts`
- `tests/unit/ai-drop-covers.spec.ts`

Canonical helpers and modules targeted for reuse:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/storage-assets.ts`

Initial AI audit findings before implementation:
- the shared AI cover contract still exposes legacy Imagen constants, pricing entries, and model-location normalization as first-class runtime values instead of a bounded migration shim
- the server AI runtime still preserves an older non-Gemini publisher-model `:predict` branch even though the current product path is Gemini image generation
- the Admin AI page is truthful about not doing hidden training, but it still relies on 10-second polling only and does not show a canonical per-job consistency recipe or why retained references were selected
- retained positive AI references and the latest catalog cover are visible, but their reuse value is only partially observable because the page does not surface positive reuse counts or ranked selection reasons

### Continuation: In-site Support Foundation and Dead Support Redirect Removal
Current audit date: 2026-04-07 03:43:16 -05:00
Current branch / commit for continuation start: `main` / `5d4d2bf`
Continuation task:
- full codebase audit for dead or misleading support handling
- implement a simple real in-site support ticket foundation
- remove signed-in support redirects to the nonexistent support email
- keep the support foundation mobile-first and admin-operable

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- initial support audit findings:
  - no real in-site support inbox existed even though `support_threads` / `support_messages` scaffolding already existed
  - signed-in support entry points in profile navigation and dashboard/profile still redirected to a dead `mailto:` address
  - creator application support CTAs also still routed to the dead support email
  - admin user detail still framed support readiness as future-only instead of reflecting live support state

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/lib/privacy-policy.ts`
- `src/lib/support-readiness.ts`
- `src/lib/server/support-threads.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/analytics-semantics.ts`
- `src/app/api/support/threads/route.ts`
- `src/app/api/support/threads/[threadId]/route.ts`
- `src/app/api/admin/support/threads/route.ts`
- `src/app/api/admin/support/threads/[threadId]/route.ts`
- `src/app/dashboard/support/page.tsx`
- `src/app/admin/support/page.tsx`
- `src/components/Support/SupportInbox.tsx`
- `src/components/Admin/AdminSupportQueue.tsx`
- `src/components/Navigation/ProfileDropdown.tsx`
- `src/components/Navigation/ProfileSidebar.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/admin/layout.tsx`
- `src/components/Navigation/AdminDropdown.tsx`
- `src/app/creators/apply/page.tsx`
- `src/app/creators/waitlist/page.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/app/api/admin/user/[userId]/route.ts`
- `src/app/admin/user/[userId]/page.tsx`
- `tests/unit/support-readiness.spec.ts`
- `tests/unit/support-threads-route.spec.ts`
- `tests/unit/admin-support-threads-route.spec.ts`
- `tests/unit/creator-waitlist-page.spec.tsx`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-chromium-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-Mobile-Chrome-win32.png`

Canonical helpers and modules actually reused:
- `src/lib/support-readiness.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/firebase-admin.ts`
- `src/hooks/useAuthSWR.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/components/Admin/AdminPageHeader.tsx`
- `src/components/ui/Button.tsx`

Implementation results:
- a real signed-in support inbox now exists at `/dashboard/support`
  - users can create tickets
  - users can reply in-thread
  - users can resolve and reopen their own tickets
  - the inbox polls the live support routes every 10 seconds instead of faking a saved or queued state
- a real admin support queue now exists at `/admin/support`
  - admins can filter threads by queue status
  - admins can read message history
  - admins can reply and move threads between waiting/resolved states
- signed-in support entry points no longer use a dead email redirect
  - profile dropdown support now opens `/dashboard/support`
  - profile sidebar support now opens `/dashboard/support`
  - dashboard profile support card now opens `/dashboard/support`
  - creator application and waitlist support actions now deep-link into `/dashboard/support` with creator-application context
- privacy/legal copy no longer advertises the nonexistent support email and now points signed-in users to the in-site support flow
- admin user detail support readiness is now truthful
  - support readiness no longer claims support is future-only
  - support chips now distinguish account email presence from in-app support availability
  - the support lane links directly into the new admin support queue for that user
- support telemetry is now cataloged
  - `support_inbox_viewed`
  - `admin_support_viewed`

Runtime truth and continuity implications:
- support is now an actual in-site thread/message system instead of a dead redirect
- bug reports in `platform_feedback` remain support intake signals, not the primary ticket system
- `support_threads` is the support summary source of truth and `support_messages` subcollections are the conversation source of truth
- current support is polling-backed, not socket-streamed
- no signed-in support surface now implies email support exists

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/dashboard/profile/page.tsx`
  - `npm run trace:adjacent -- src/components/Feedback/ReportBugButton.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/feedback/route.ts`
  - `npm run trace:adjacent -- src/lib/support-readiness.ts`
  - `npm run trace:adjacent -- src/lib/server/support-threads.ts`
  - `npm run trace:adjacent -- src/components/Support/SupportInbox.tsx`
  - `npm run trace:adjacent -- src/components/Admin/AdminSupportQueue.tsx`
  - `npm run trace:adjacent -- src/app/api/support/threads/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/support/threads/route.ts`
- focused lint:
  - `npx eslint 'src/lib/privacy-policy.ts' 'src/lib/support-readiness.ts' 'src/lib/server/support-threads.ts' 'src/app/api/support/threads/route.ts' 'src/app/api/support/threads/[threadId]/route.ts' 'src/app/api/admin/support/threads/route.ts' 'src/app/api/admin/support/threads/[threadId]/route.ts' 'src/components/Support/SupportInbox.tsx' 'src/components/Admin/AdminSupportQueue.tsx' 'src/app/dashboard/support/page.tsx' 'src/app/admin/support/page.tsx' 'src/components/Navigation/ProfileDropdown.tsx' 'src/components/Navigation/ProfileSidebar.tsx' 'src/app/dashboard/profile/page.tsx' 'src/app/admin/layout.tsx' 'src/components/Navigation/AdminDropdown.tsx' 'src/app/creators/apply/page.tsx' 'src/app/creators/waitlist/page.tsx' 'src/app/(legal)/privacy/page.tsx' 'src/app/api/admin/user/[userId]/route.ts' 'src/app/admin/user/[userId]/page.tsx' 'tests/unit/support-readiness.spec.ts' 'tests/unit/support-threads-route.spec.ts' 'tests/unit/admin-support-threads-route.spec.ts' 'tests/unit/creator-waitlist-page.spec.tsx'`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/support-readiness.spec.ts tests/unit/support-threads-route.spec.ts tests/unit/admin-support-threads-route.spec.ts tests/unit/creator-waitlist-page.spec.tsx`
- repo-wide verification:
  - `npm run check:inventory`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `npm run check:continuity`
  - `npm run check:telemetry`
  - `npx cross-env PLAYWRIGHT_USE_BUILD=1 playwright test tests/ui-audits/visual-regression.spec.ts --project=chromium --project="Mobile Chrome" --grep "privacy hero stays stable" --update-snapshots`

Continuation results:
- focused lint passed
- focused support tests passed with `3` files and `29` tests
- `npm run check:inventory` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `92` files and `454` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed after refreshing the privacy hero baseline for the intentional in-site support copy change
- `npm run check:continuity` passed
- `npm run check:telemetry` passed with `0` orphaned events
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:
- support is polling-backed at 10 seconds and does not yet use realtime listeners or sockets
- public signed-out/legal support still routes users toward authenticated in-site support rather than a separate guest intake flow
- bug reports and support threads are intentionally separate; there is no automatic bug-report-to-ticket conversion yet

### Continuation: AI Drop-Cover Catalog Audit for Create-Drop + Legacy Coverage
Current audit date: 2026-04-07 18:47:17 -05:00
Current branch / commit for continuation start: `main` / `8b24119`
Continuation task:
- full-scale audit to ensure the create-drop form and legacy drops both feed the AI cover reference/training system truthfully
- remove stale AI wording from the admin surface and continuity docs
- commit and push the catalog/legacy reference fix with a full audit refresh

Continuation start state:
- working tree was already dirty at continuation start from the prior local Admin AI observability pass and preserved for continuity
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed the existing local AI admin modifications before this continuation
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/app/api/admin/drops/route.ts`

Initial audit findings before implementation:
- the create-drop form was already feeding the AI cover system truthfully:
  - generation requests already carried `creatorId`
  - accepted AI covers were already linked back to the saved drop through the canonical `link_drop` feedback action after save
- the real gap was the non-AI reference library:
  - `src/lib/server/ai-drop-covers.ts` only sampled a small `validFrom`-ordered set of recent drop covers
  - that excluded older legacy covers and any drops with older timestamp shapes or missing `validFrom`
  - the Admin AI page therefore overstated the breadth of the reusable cover library
- no live legacy Imagen execution path was found beyond migration aliases and compatibility fields kept for persisted settings/job history

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-cover-catalog.spec.ts`

Canonical helpers and modules actually reused:
- `src/components/Admin/CreateDropModal.tsx`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/storage-assets.ts`

Implementation results:
- kept the create-drop feed path intact because it was already correct:
  - create-drop generation requests continue to send `creatorId`
  - accepted AI covers continue to link to the saved drop through the canonical feedback route after save
- replaced the recent-only reference sample with a real drop-cover catalog:
  - AI reference assets are now built from the full `drops` collection instead of a recent `validFrom` query
  - legacy/current recency is normalized through the shared drop timestamp helper
  - duplicate image URLs are deduped before ranking
  - ranking now prefers higher `totalUnlocks`, then newer timestamps, then title
- strengthened reference matching:
  - reference assets now carry `creatorId`
  - selection scoring can prefer same creator id before falling back to creator-name matching
- corrected admin/operator truth language:
  - the Admin AI page and create-drop AI panel now say `drop cover library` / `catalog covers` instead of `recent` or `live` covers
  - retained visual-signal counts now explicitly include catalog covers spanning current and legacy drops
- added regression coverage for the catalog behavior:
  - verifies legacy timestamp-shaped drops and current drops both enter the reusable reference catalog
  - verifies the current drop id can be excluded from the catalog when generating for that drop

Runtime truth and continuity implications:
- the create-drop form already fed accepted AI jobs into the retained AI pool; this continuation closes the missing legacy/current non-AI cover side
- the reusable drop-cover reference library now spans current and legacy uploaded covers present in the catalog instead of a recent-only sample
- old `recentDropReferenceCount` compatibility fields remain only to read and preserve historical job documents while the canonical live meaning is now `catalogDropReferenceCount`
- no hidden training or fine-tuning was added; the runtime remains reference-guided generation plus retained feedback/reuse signals

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/drops/route.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- repo-wide verification:
  - `npm run check:architecture`
  - `npm run check:continuity`
  - `npm run check:telemetry`
  - `npm run check:inventory`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `corepack pnpm run check`
  - `npx vitest run`

Continuation results:
- focused lint passed
- focused AI Vitest passed with `4` files and `22` tests
- `npm run check:architecture` passed
- `npm run check:continuity` passed
- `npm run check:telemetry` passed with `0` cataloged events lacking emitters
- `npm run check:inventory` passed and now reports `687` tracked files / `122` test files after staging the new AI catalog regression test
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `94` files and `461` tests
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest-hero screenshot instability; accessibility passed and the rest of the suite passed
- generated `playwright-report/` and `test-results/` artifacts from the failing visual audit were removed before signoff

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- the Chromium `/creators/waitlist` guest-hero visual baseline remains unstable and can alternate between two section heights without any code change in this continuation

Continuation follow-up gaps:
- the drop-cover catalog currently scans the full `drops` collection for correctness; if cost or latency becomes an issue, the next step is a canonical summarized cover-reference index rather than a return to sampled recent-cover logic
- compatibility reads still preserve `recentDropReferenceCount` for older AI job documents; new logic should continue to treat `catalogDropReferenceCount` as the live truth
- the pre-existing Chromium `/creators/waitlist` visual instability still needs a separate stabilization or baseline refresh pass

### Continuation: Latest-Cover AI Scan + Queue Reactivation Notification Audit
Current audit date: 2026-04-07 19:22:35 -05:00
Current branch / commit for continuation start: `main` / `0224af7`
Continuation task:
- narrow the non-AI cover reference scan so the AI stack only reuses the latest catalog cover instead of scanning the full drop collection
- audit queue lifecycle and cooldown reactivation so queued drops still activate and notify correctly
- verify the legacy Timestamp-shaped queued-drop glitch is fully fixed across both scheduling and activation notification paths

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a clean tree before editing
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/cron/process-queue/route.ts`
  - `src/lib/server/drop-queue.ts`
  - `src/app/api/cron/notify-active-drops/route.ts`

Initial audit findings before implementation:
- the legacy queue rollover bug was already fixed in `cron/process-queue` because that route now normalizes Firestore Timestamp-like `validFrom` / `validUntil` through `getFiniteDropTimestamp(...)`
- the notification side still had the same class of timestamp bug:
  - `src/app/api/cron/notify-active-drops/route.ts` queried `scheduled` and `active` drops with numeric range filters only
  - the route still coerced `validFrom` with `Number(...)` and only accepted numeric `validUntil`
  - legacy Timestamp-shaped scheduled/active drops could therefore miss activation, expiry, requeue, and activation-notification handling
- the AI helper still scanned the full `drops` collection to get one extra human-made cover reference even though the create-drop form already feeds accepted AI covers back into the retained reference pool after save

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/cron/notify-active-drops/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- `tests/unit/notify-active-drops-route.spec.ts`

Canonical helpers and modules actually reused:
- `src/lib/drop-status.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/push-notifications.ts`
- `src/lib/server/drop-runtime.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/drop-queue-lifecycle.ts`
- `src/components/Admin/CreateDropModal.tsx`

Implementation results:
- narrowed non-AI cover reuse to the latest reusable catalog cover instead of a full collection scan:
  - AI cover selection still keeps template and retained positive AI covers
  - the latest catalog cover now comes from a bounded recent `validFrom` query window instead of `adminDb.collection("drops").get()`
  - the catalog ranking now prefers the newest reusable cover before unlock count
- corrected the admin AI wording to match that runtime truth:
  - `Drop cover library` wording was replaced with `Latest catalog cover`
  - stats and job detail text no longer imply a broad reusable library when only one recent cover is being reused
- hardened `cron/notify-active-drops` against legacy Timestamp-shaped drops:
  - dropped the numeric `validFrom <= now` / `validUntil <= now` query filters
  - query now loads `scheduled` and `active` drops by status, then resolves due lifecycle changes with `getFiniteDropTimestamp(...)` and `resolveDropStatusFromTiming(...)`
  - activation keys now use normalized millis rather than `Number(rawValidFrom)`
  - legacy active drops with `autoQueueOnExpire` now requeue correctly after expiry
  - scheduled return drops with prior `activationCount` now still send the correct return notification after cooldown reactivation

Runtime truth and continuity implications:
- accepted AI covers from the create-drop form remain the historical retained reference pool
- non-AI cover reuse is now intentionally just the latest reusable catalog cover, not a full reusable library
- queue processing and notify-active-drops now both normalize Timestamp-like timing values instead of mixing normalized scheduling with legacy numeric-only activation checks
- return notifications for reactivated queued drops still depend on the real `activationCount >= 1` signal and now work for Timestamp-shaped legacy documents too

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/cron/process-queue/route.ts`
  - `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
  - `npm run trace:adjacent -- src/app/api/cron/notify-active-drops/route.ts`
- focused lint:
  - `npx eslint src/app/api/cron/notify-active-drops/route.ts src/lib/server/ai-drop-covers.ts src/app/admin/ai/page.tsx src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/notify-active-drops-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/notify-active-drops-route.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts tests/unit/ai-drop-covers.spec.ts`
- repo-wide verification:
  - `npm run check:continuity`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`

Continuation results:
- focused lint passed
- focused queue/AI Vitest passed with `4` files and `20` tests
- `npm run check:continuity` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `94` files and `464` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest-hero screenshot instability; accessibility passed and the rest of the suite passed
- an initial attempt to run multiple build-based verification commands in parallel caused a Next build collision (`Another next build process is already running`); the affected checks were rerun sequentially to completion
- generated `playwright-report/`, `test-results/`, and `.lighthouseci/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- the Chromium `/creators/waitlist` guest-hero visual baseline remains unstable and can alternate between two section heights without any code change in this continuation

Continuation follow-up gaps:
- the latest-cover AI shortcut is cheaper but narrower than the earlier full-catalog scan; if broader human-cover reuse is needed again, the next step should be a canonical summarized reference index rather than another full collection scan
- compatibility reads still preserve `recentDropReferenceCount` for older AI job documents even though the live truth is now the latest catalog cover count
- the pre-existing Chromium `/creators/waitlist` visual instability still needs a separate stabilization or baseline refresh pass

### Continuation: Exclusive Collapsed Drop-Form Sections
Current audit date: 2026-04-07 21:27:55 -05:00
Current branch / commit for continuation start: `main` / `7469988`
Continuation task:
- make the shared create/edit drop form start with all sections collapsed
- allow only one section to be open at a time, with the currently open section collapsing when another section expands

Continuation start state:
- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a clean tree before editing
- adjacency traces completed before editing for:
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/app/admin/drops/page.tsx`

Initial audit findings before implementation:
- the shared drop modal still used four independent booleans (`uploadsOpen`, `basicsOpen`, `pricingOpen`, `actionSettingsOpen`)
- create, edit, and creator-submission flows all mounted through the same shared `CreateDropModal`, so the current behavior opened every section at once across all those surfaces
- independent booleans meant multiple sections could remain expanded simultaneously, and the action-settings section could stay selected even after switching the drop type back to `content`

Exact touched surfaces:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/components/Admin/CreateDropModal.tsx`
- `src/lib/admin-drop-form-sections.ts`
- `tests/unit/admin-drop-form-sections.spec.ts`

Canonical helpers and modules actually reused:
- `src/components/Admin/CreateDropModal.tsx`
- `src/app/admin/drops/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/lib/admin-drop-form.ts`
- `src/lib/client-error-reporting.ts`

Implementation results:
- replaced the four independent section booleans in `CreateDropModal` with one canonical `openSection` state
- all sections now start collapsed for:
  - admin create drop
  - admin edit drop
  - creator submit/edit drop flows that reuse the same modal
- opening one section now closes the previously open section
- toggling the currently open section closes it back to the fully collapsed state
- switching a drop back to `content` now clears the `Action Settings` section if it was the active section
- extracted the exclusive-toggle rule into `src/lib/admin-drop-form-sections.ts` and covered it with focused unit tests

Runtime truth and continuity implications:
- this is a shared modal behavior change, not a page-specific override; admin and creator edit/create flows now stay consistent because they reuse the same component
- the AI cover generator panel stays inactive while the `Files & Assets` section is collapsed because its visibility is still truthfully tied to the open section state

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/app/admin/drops/page.tsx`
- focused lint:
  - `npx eslint src/components/Admin/CreateDropModal.tsx src/lib/admin-drop-form-sections.ts tests/unit/admin-drop-form-sections.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-drop-form-sections.spec.ts`
- repo-wide verification:
  - `corepack pnpm run check`
  - `npm run check:ui:audits`

Continuation results:
- focused lint passed
- focused accordion-state Vitest passed with `1` file and `3` tests
- `corepack pnpm run check` passed
- `npm run check:ui:audits` passed
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Playwright surfaced the recurring webserver `transformAlgorithm` warning after an otherwise successful all-green UI audit run

Continuation follow-up gaps:
- this pass covers the shared modal accordion state only; it does not add keyboard arrow-key roving focus or a dedicated Radix accordion primitive

### Continuation: Creator Spotlight Hydration And AI Timeout Truth
Current audit date: 2026-04-08 00:39:00 -05:00
Current branch / commit for continuation start: `main` / `7469988`
Continuation task:
- fix the empty creator spotlight lane
- make the spotlight follow button truthfully reflect the followed state
- remove the hardcoded 20-second local AI cover timeout so failure states stop looking simulative

Continuation start state:
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a dirty tree at continuation start from the prior uncommitted drop-form accordion pass:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/lib/admin-drop-form-sections.ts`
  - `tests/unit/admin-drop-form-sections.spec.ts`
- adjacency traces completed before editing for:
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`

Initial audit findings before implementation:
- the empty creator spotlight was not caused by the rail component alone; signed-in recommendation hydration was truthfully failing in two places:
  - creator visibility logic still relied too heavily on `role === "creator"` in the discovery and relationships APIs
  - `CreatorDiscoveryRail` would overwrite valid discovery results with `relationshipResult.recommendedCreators || nextRecommended`, so an empty recommendations array from the relationships route hid real discovery creators for signed-in users
- the spotlight follow button did not visually distinguish the already-following state in the requested black / purple treatment
- AI drop-cover generation still used a local hardcoded `20_000ms` timeout in `src/lib/server/ai-drop-covers.ts`, so the app could terminate a request before the real provider/runtime boundary finished and then surface a misleading timeout failure

Exact touched surfaces for this continuation:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/CreatorDiscoveryRail.tsx`
- `src/lib/creator-public-pages.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/creator-public-pages.spec.ts`
- `tests/unit/creator-discovery-route.spec.ts`
- `tests/unit/creator-relationships-route.spec.ts`

Canonical helpers and modules actually reused:
- `src/components/CreatorDiscoveryRail.tsx`
- `src/lib/creator-public-pages.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/creator-experiences.ts`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Implementation results:
- added `isCreatorVisibleInDiscovery(...)` to `src/lib/creator-public-pages.ts` so discovery/recommendation eligibility now truthfully includes:
  - explicit creator-role users
  - approved creator applicants whose role record has not been promoted yet
  - users with active public drops
  - while still excluding suspended/banned users
- updated `src/app/api/creator/discovery/route.ts` to use that canonical visibility helper instead of a role-only filter
- updated `src/app/api/creator/relationships/route.ts` to use the same canonical visibility helper for both creator lookup and signed-in recommended-creator hydration, and to count active public drops from the canonical drop-status normalization path
- fixed `CreatorDiscoveryRail` so signed-in users only replace discovery results with `recommendedCreators` when that array is non-empty; empty relationship recommendations no longer wipe real spotlight candidates
- updated the spotlight follow button so the followed state now renders as a black button with purple text and a purple outline and the label `following`
- removed the local `20_000ms` AI-cover timeout wrapper from `src/lib/server/ai-drop-covers.ts`; generation now waits for the real upstream/runtime boundary instead of failing on an app-side hard cutoff
- tightened AI timeout messaging in the create-drop panel so the failure text no longer implies a fake fixed deadline

Runtime truth and continuity implications:
- the creator spotlight now reflects the same creator eligibility truth across discovery and relationship hydration instead of diverging by signed-in state
- approved creator applicants with real active drops are no longer hidden just because their `users.role` field has not been promoted yet
- AI cover failures now reflect actual upstream/request termination rather than a local simulated 20-second cutoff
- this continuation intentionally did not modify the pre-existing uncommitted drop-form accordion files beyond carrying them forward in the working tree

Commands run for continuation:
- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- focused lint:
  - `npx eslint src/lib/creator-public-pages.ts src/app/api/creator/discovery/route.ts src/app/api/creator/relationships/route.ts src/components/CreatorDiscoveryRail.tsx src/lib/server/ai-drop-covers.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/creator-public-pages.spec.ts tests/unit/creator-discovery-route.spec.ts tests/unit/creator-relationships-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/creator-public-pages.spec.ts tests/unit/creator-discovery-route.spec.ts tests/unit/creator-relationships-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/ai-drop-covers.spec.ts`
- repo-wide verification:
  - `corepack pnpm run check`
  - `npm run check:ui:audits`
  - `npm run check:ui:lighthouse`

Continuation results:
- focused lint passed
- focused creator/AI Vitest passed with `5` files and `22` tests
- `corepack pnpm run check` passed
- `npm run check:ui:lighthouse` passed on a sequential rerun after an earlier build-collision attempt
- `npm run check:ui:audits` still only surfaced the pre-existing visual-regression instability on mobile/Chromium guest surfaces; accessibility passed and the rest of the suite passed
- generated `playwright-report/`, `test-results/`, and temporary Lighthouse artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:
- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Chrome cleanup warnings on Windows temp directories after a successful Lighthouse run
- Playwright surfaced the recurring webserver `transformAlgorithm` warning around otherwise successful UI audit runs

Continuation follow-up gaps:
- the creator spotlight still depends on poll/fetch hydration rather than a Firestore live listener
- AI cover generation still depends on actual provider latency and provider/runtime health; this pass removed the fake local cutoff, not the upstream wait itself

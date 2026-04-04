# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-03
Last full-scale audit execution: 2026-04-03 19:16:34 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

## Purpose
This is the standing audit document that future work should start with and end with.

It is not a one-time snapshot. It is the reusable standard that defines:
- what "auditable" means in this repo,
- which file surfaces exist,
- which checks each surface must pass,
- which commands are required before signoff,
- which shared helpers are canonical,
- and how new work must be recorded so consistency does not drift over time.

If a future build, refactor, feature, or fix cannot be explained against this document, the work is not considered fully audited.

## What This File Is
- This file is the canonical policy and baseline.
- Dated audit files in the repo are historical snapshots and evidence.
- `git ls-files` is the literal source of truth for tracked-file inventory.
- This file must be updated whenever the audit standard changes, the repository surface changes materially, or the canonical helper map changes.

## Audit Pair
Use these together:

1. `FULL_SCALE_CODEBASE_AUDIT.md`
   This file. It defines the standard, the baseline, the build gates, and the canonical helper map.

2. `EVERY_FILE_FUNCTION_CHECKLIST.md`
   Historical exhaustive inventory companion. Useful for no-skip file/function sweeps, but it must be refreshed whenever tracked-file counts materially drift.

Related evidence snapshots:
- `FULL_CODEBASE_AUDIT_2026-04-01.md`
- `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`
- `STANDARDIZATION_AUDIT_CHECKLIST.md`
- `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`
- `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`

## Canonical Stack, Workflow, and Deployment Context
- This repo is developed locally first.
- Google Antigravity and Codex may both be used locally to assist build, review, implementation, and verification work before changes are committed.
- Those tools are assistive local workflow tooling only. They are not authoritative runtime, deployment, or architecture sources of truth.
- The authoritative sources of truth are git-tracked runtime code, canonical docs, canonical helpers, audit scripts, and the verification commands named in this file.
- The product originated as a static-first system and later pivoted into a backend/server architecture. The exact pivot date is not fully recoverable from current tracked evidence and is therefore recorded as historical continuity context rather than a claimed precise timestamp.
- The deployed runtime target is Firebase App Hosting, with Firebase and Google Cloud services providing backend behavior where present in code: Firestore, Realtime Database, Storage, Functions, Data Connect, and server-side Vertex AI integration where enabled.
- Local AI/developer tooling may work on uncommitted files, but repository truth does not change until the resulting decisions are written into tracked files and verified.

## Repository Memory and Decision Ledger
- `REPO_MEMORY_LEDGER.md` is the canonical concise ledger for architectural pivots, workflow-authority decisions, deprecated patterns, and major continuity-sensitive repo decisions.
- Use it when a task touches deployment assumptions, dependency/tooling meaning, historical pivots, workflow authority, or anything that founder memory or AI context might otherwise be forced to explain informally.
- This audit file remains the standing policy and surface map. The ledger records the major decisions that explain why those policies and surfaces look the way they do.

## Dependency, Tooling, and Artifact Classification
Every meaningful package, config file, generated artifact, and local tool surface must fit one of the classes below:

1. Runtime dependencies
   Root `package.json` `dependencies`, `functions/package.json` `dependencies`, generated Data Connect SDKs used by the app/functions, and Firebase/Google runtime libraries that affect shipped behavior.

2. Dev dependencies
   Root and `functions/` `devDependencies` used for linting, typing, testing, builds, audits, code generation, and local verification.

3. Local workflow tooling
   Codex, Google Antigravity, `gh`, `firebase`, `gcloud`, `AGENTS.md`, `.agent/workflows/pre-commit.md`, and local scripts that help humans or agents work safely but are not themselves runtime truth.

4. Deployment and platform dependencies
   `apphosting.yaml`, `firebase.json`, `.firebaserc`, Firestore/Storage/Realtime rules and indexes, App Hosting metadata, service-account or ADC expectations, and other files/CLIs that define deployed behavior or cloud connectivity.

5. Governance and continuity dependencies
   `FULL_SCALE_CODEBASE_AUDIT.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`, `REPO_MEMORY_LEDGER.md`, dated audit snapshots, continuity scripts, dependency graph rules, visual/a11y/perf audit configs, and the verification commands that keep future changes explainable.

6. Generated artifacts
   Lockfiles, generated Data Connect clients, generated backend metadata such as `backends.json`, and other generated files that may still materially affect dependency resolution, runtime integration, or contributor understanding.

Generated does not mean ignorable. Generated means:
- do not hand-edit unless that generation path is the audited source of truth,
- classify the file explicitly,
- and record when it changes repo behavior, contributor workflow, or deployment assumptions.

## Dependency Delta Recording Rules
When dependencies, tooling, or generated artifacts change:

1. Record which class changed: runtime, dev, local workflow, platform, governance, or generated artifact.
2. Record which source file owns the change: root `package.json`, `functions/package.json`, config file, generated client, or continuity doc.
3. Record whether build/runtime behavior changed, contributor workflow changed, or both.
4. Record which verification commands were run because of the change.
5. Update this file if the canonical dependency/tooling story changed.
6. Update `REPO_MEMORY_LEDGER.md` if the change reflects a durable architectural or workflow decision rather than a routine version bump.
7. Until a later audited pass intentionally consolidates package-manager strategy, keep root `package-lock.json` and `pnpm-lock.yaml` synchronized when the root dependency graph changes.
8. `functions/package-lock.json` remains the dependency-resolution companion to `functions/package.json` and must stay aligned with Functions-specific dependency changes.
9. `backends.json` is generated App Hosting backend metadata, not the canonical deploy configuration. It must never be treated as the primary source of truth for deployment behavior or environment contracts.

## Contributor Continuity Requirements
- A future contributor must be able to orient from tracked repo artifacts without needing private AI context or founder memory as the first interpretation layer.
- Required first-read surfaces for broad work are:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- Required first-read surfaces for runtime/deployment changes also include:
  - `package.json`
  - `functions/package.json`
  - `firebase.json`
  - `apphosting.yaml`
- `AGENTS.md` and `.agent/workflows/pre-commit.md` are workflow guidance, not architecture authority.
- If tracked docs and runtime code disagree, code plus verification plus audit scripts win, and the docs must be updated in the same change.

## Root, Platform, and Governance Accountability Matrix
Every tracked root-level artifact must be explainable through one of the classes below.

| Class | Files | Meaning | Canonical handling |
| --- | --- | --- | --- |
| Governance baseline | `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md` | Standing audit policy, decision ledger, and exhaustive historical inventory companion | Must stay mutually consistent on counts, continuity rules, and authority language |
| Workflow guidance | `AGENTS.md`, `.agent/workflows/pre-commit.md` | Contributor and agent workflow instructions | Useful, but not architecture authority; must point back to canonical docs |
| Historical evidence snapshots | `FULL_CODEBASE_AUDIT_2026-04-01.md`, `FULL_CODEBASE_AUDIT_2026-04-03.md`, `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`, `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`, `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`, `STANDARDIZATION_AUDIT_CHECKLIST.md`, `TELEMETRY_MIDDLEWARE_AUDIT_2026-03-23.md`, `V1_STABILITY_AUDIT_2026-03-24.md`, `REPO_STATE_SCORECARD_2026-03-18.md`, `REPO_STATE_SCORECARD_2026-03-19.md` | Historical audit evidence, not living policy | Must not contradict the standing audit without an explicit note that they are historical |
| Local planning or ephemeral evidence | `CHANGELOG.md`, `plan_review.md`, `status.txt` | Historical planning/status context | Useful as evidence only; not canonical architecture truth |
| Root dependency surfaces | `package.json`, `package-lock.json`, `pnpm-lock.yaml` | Root dependency graph and resolution state | Must stay synchronized with dependency changes and the dependency classification rules above |
| Functions dependency surfaces | `functions/package.json`, `functions/package-lock.json` | Firebase Functions-specific dependency graph | Must stay aligned with Functions runtime and lint/build verification |
| Platform and deploy config | `apphosting.yaml`, `firebase.json`, `.firebaserc`, `backends.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules` | App Hosting, Firebase services, rules, and generated backend metadata | Must be treated as deployment/platform truth or explicitly classified as generated evidence |
| Quality and continuity tooling config | `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `vitest.rules.config.ts`, `.dependency-cruiser.cjs`, `.lighthouserc.json`, `knip.json`, `.ncurc.json`, `.npmrc`, `.gitignore` | Build, lint, dependency, audit, and test behavior | Must stay consistent with the verification commands promised in this file |
| Root runtime or admin utility files | `middleware.ts`, `makeAdmin.js` | Runtime boundary enforcement and local admin utility behavior | Must stay truthful about their actual authority and risk; no hidden assumptions |

## Current Baseline
Current tracked inventory baseline after this audited change on 2026-04-03:

- Total tracked files: `614`
- Root files: `42`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `24`
- `src`: `354`
- `src/app`: `116`
- `src/components`: `65`
- `src/context`: `4`
- `src/hooks`: `13`
- `src/lib`: `133`
- `src/lib/server`: `56`
- `src/types`: `3`
- `functions`: `36`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `97`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

Current baseline verification on 2026-04-03:
- `corepack pnpm run check` passed
- `npx vitest run` passed
- `npm run check:continuity` passed
- `npm run check:inventory` passed
- `npm run check:telemetry` passed
- `npm run check:analytics-semantics` passed
- adjacency traces passed for the touched continuity/tooling surfaces

Current tolerated non-blocking environment notices:
- npm unknown env config warnings printed during some script runs
- Node `punycode` deprecation warnings printed by Firebase/Vitest tooling on current local Node
- Windows Chrome cleanup warning may print after local Lighthouse runs when there is no running Chrome instance left to kill

These notices are not automatic audit failures, but they must stay explicitly known and not silently spread into product behavior.

## Active Audit Entry
Current audit date: `2026-04-03 19:05:30 -05:00`
Current branch / commit: `main / 56fd38d`

Current task:
- full repository memory and traceability hardening pass for long-term multi-developer continuity in a local-first repo deployed through Firebase App Hosting

Current mission:
- make the repository itself remember its architecture, dependency classes, workflow authority, deployment context, historical pivots, and canonical continuity rules so future contributors do not need Codex, Antigravity, or founder memory as the first interpretation layer

Current expected touched surfaces:
- root/docs
- root config and governance files
- `scripts`
- audit and continuity tooling references

Current canonical helpers/modules expected to be used:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `package.json`
- `functions/package.json`
- `firebase.json`
- `apphosting.yaml`
- `AGENTS.md`
- `.agent/workflows/pre-commit.md`
- `scripts/repo-inventory.ts`
- `scripts/trace-adjacent-surfaces.ts`
- existing continuity, dependency-graph, telemetry, analytics semantics, typecheck, and Vitest verification entrypoints already codified in the repo

Current continuity note:
- this pass must classify root/governance/platform artifacts explicitly, record the static-first to backend/server pivot without inventing missing history, distinguish assistive tooling from authoritative repo truth, and leave the repo more legible to contributors who have no private AI context

Audit start recorded at: `2026-04-03 19:05:30 -05:00`

Start-of-task audit inputs read:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short`
- root/config/process surfaces including:
  - `package.json`
  - `functions/package.json`
  - `firebase.json`
  - `apphosting.yaml`
  - `AGENTS.md`
  - `.dependency-cruiser.cjs`
  - `.lighthouserc.json`
  - `eslint.config.mjs`
  - `playwright.config.ts`
  - `next.config.ts`
  - `tsconfig.json`
  - `knip.json`
  - `backends.json`
  - `.agent/workflows/pre-commit.md`
- adjacency traces for:
  - `scripts/repo-inventory.ts`
  - `AGENTS.md` attempted but not supported by the internal adjacency tracer because it only maps internal code files

End-of-task audit completion recorded at: `2026-04-03 19:16:34 -05:00`

Final touched surfaces:
- root/docs
- root config and governance files
- `scripts`

Final touched files:
- `.agent/workflows/pre-commit.md`
- `AGENTS.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `scripts/repo-inventory.ts`

Canonical helpers/modules used in this task:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `REPO_MEMORY_LEDGER.md`
- `package.json`
- `functions/package.json`
- `firebase.json`
- `apphosting.yaml`
- `AGENTS.md`
- `.agent/workflows/pre-commit.md`
- `scripts/repo-inventory.ts`
- `scripts/trace-adjacent-surfaces.ts`

Dependency decisions in this task:
- Installed:
  - none
- Already present and reused:
  - existing root and Functions dependency graphs
  - existing continuity, dependency-graph, telemetry, analytics semantics, TypeScript, ESLint, and Vitest tooling
- Rejected:
  - no new package dependency or SaaS dependency was justified for this continuity-only pass

Dependency/tooling classification outcome:
- runtime, dev, local workflow, deployment/platform, governance/continuity, and generated-artifact classes are now explicitly documented in the standing audit
- root lockfiles are now explicitly treated as a continuity contract until a future audited package-manager consolidation occurs
- `backends.json` is now explicitly recorded as generated App Hosting metadata rather than deploy authority

Manual setup or authentication still required from the user:
- none for the documentation, script, or verification work completed in this pass
- Firebase and Google Cloud auth are still required later for real remote inspection/deploy work, but this task did not need them

Exact systems audited or hardened in this pass:
- canonical stack/build/deployment context
- dependency/tooling classification and delta-recording rules
- contributor continuity requirements that make Codex and Antigravity optional helpers rather than hidden authorities
- root/governance/platform artifact accountability
- repo-memory decision recording for major historical pivots and workflow rules
- inventory tooling for root docs/lockfiles/config-runtime-tooling visibility

Exact safety, moderation, telemetry, and debug additions made:
- no product runtime behavior changed
- continuity safety improved by making deployment authority, dependency classes, and workflow authority explicit in tracked docs
- repo-memory and architecture decisions now have a canonical ledger instead of relying on private context

Current follow-up gaps still open after this pass:
- the detailed body of `EVERY_FILE_FUNCTION_CHECKLIST.md` remains a historical sweep and has not been fully regenerated against the new 614-file baseline
- some historical evidence docs may still contain stale counts or pre-standard wording because they are snapshots, not living policy
- `backends.json` remains a generated platform snapshot and should continue to be treated carefully in future secret-hygiene review rather than as canonical config
- exact historical dates for early static-first to backend/server pivot milestones are still not fully recoverable from current tracked evidence

Commands run in this pass:
- `git status --short`
- `Get-Content FULL_SCALE_CODEBASE_AUDIT.md`
- `Get-Content EVERY_FILE_FUNCTION_CHECKLIST.md`
- `Get-Content package.json`
- `Get-Content functions/package.json`
- `Get-Content firebase.json`
- `Get-Content apphosting.yaml`
- `Get-Content AGENTS.md`
- `Get-Content .dependency-cruiser.cjs`
- `Get-Content .lighthouserc.json`
- `Get-Content eslint.config.mjs`
- `Get-Content playwright.config.ts`
- `Get-Content next.config.ts`
- `Get-Content tsconfig.json`
- `Get-Content knip.json`
- `Get-Content backends.json`
- `Get-Content .agent/workflows/pre-commit.md`
- `npm run trace:adjacent -- scripts/repo-inventory.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `corepack pnpm run check`
- `npx vitest run`

Results:
- all listed commands passed at the end of the pass
- `corepack pnpm run check` passed end to end
- `npx vitest run` passed with `69` files and `380` tests
- `npm run check:continuity` passed with architecture, inventory, and cycle checks green
- staged inventory now resolves to `614` tracked files after adding the repo-memory ledger

Known tolerated warnings/notices in this pass:
- npm unknown env config warnings during chained npm script execution
- Node `punycode` deprecation warnings from current Firebase/Vitest tooling
- informational dotenv logging during `check:firebase-runtime`
- Git warned that `REPO_MEMORY_LEDGER.md` will normalize from LF to CRLF on the next Git touch in this Windows worktree

Inventory changed or not:
- yes
- standing tracked-file baseline is now `614`
- net change in this pass: `613` -> `614`
- root-file baseline is now `42`
- root markdown/docs baseline is now `16`
- root lockfile baseline remains `2`
- root config/runtime/tooling baseline remains `24`

## Previous 2026-04-03 Task-System Audit Reference

Final touched surfaces:
- root/docs
- `src/app/admin/debug`
- `src/app/api/admin/debug`
- `src/lib/tasks`
- `tests`

Final touched files:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/lib/tasks/task-observability.ts`
- `tests/unit/task-observability.spec.ts`
- `tests/unit/performance-bench.spec.ts`
- `tests/unit/server-drops.spec.ts`

Canonical helpers/modules used in this task:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/lib/tasks/task-catalog.ts`
- `src/lib/tasks/task-observability.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/analytics-metric-catalog.ts`
- `src/app/api/admin/debug/route.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/analytics-governance.ts`
- `src/hooks/useAuthSWR.ts`
- existing continuity, telemetry, analytics semantics, TypeScript, ESLint, and Vitest verification entrypoints already codified in the repo

Dependency decisions in this task:
- Installed:
  - none
- Already present and reused:
  - existing repo task, telemetry, analytics semantics, continuity, dependency-graph, and contract tooling only
- Rejected:
  - no new dependency or SDK was needed for this task-system parity pass

Manual setup or authentication still required from the user:
- none for the code paths or local verification run in this pass
- a real authenticated admin session is still required if you want to inspect live production runtime distribution/completion data through the debug UI, and broader admin-route browser automation still depends on the existing auth/emulator seam rather than a fake shadow route

Exact systems audited or hardened in this pass:
- sampled runtime task distribution across current user task state, task lifecycle events, receipts, rollups, and reward claims
- built-in versus custom/admin-authored task auditability on one canonical observability surface
- task telemetry alignment between mapped task definitions, event stats, receipts, and task lifecycle facts
- deterministic admin/auth-bound verification readiness via a shared pure runtime-audit helper and direct unit coverage
- standing audit baseline refresh for the repo inventory drift discovered during this pass

Exact safety, moderation, telemetry, and debug additions made:
- the admin debug route now produces a canonical `runtimeTaskAudit` snapshot built from the existing task catalog, runtime user state, lifecycle events, receipts, reward claims, event stats, and rollups
- built-in and custom task runtime rows now expose assignment counts, completion counts, reward-claim visibility, cooldown conflicts, refresh-metadata warnings, target-user drift, inactive-definition activity, and unsupported runtime records
- task telemetry alignment now explicitly separates mapped task definitions, tracked event stats, receipt visibility, and shared-event ambiguity so admin surfaces stop over-attributing event-level facts to the wrong task
- ambiguous shared-event mappings such as multi-task event names are now surfaced as ambiguity instead of being falsely treated as task-specific truth
- reward-claim matching for task parity now uses canonical definition matching first and records ambiguous/unmatched transactions as runtime drift instead of silently forcing them into the wrong task bucket
- two slow verification-only specs now have explicit per-test timeouts so the repo-wide audit gate remains deterministic under full-suite load without changing product behavior

Current follow-up gaps still open after this pass:
- the debug panel now exposes truthful runtime task sampling, but this local pass does not claim live production parity until an authenticated admin session reviews the new runtime task modules against real data
- admin/auth browser-level verification is more ready because the route aggregation is now unit-testable, but a stronger local auth/emulator seam is still needed before expanding deterministic Playwright coverage for protected admin surfaces
- telemetry/admin metrics are materially less fragmented in the tasks lane, but broader journey analytics across the full product still remain only partially canonical and should continue to be treated carefully outside the task system

Commands run in this pass:
- `git status --short`
- `npm run trace:adjacent -- src/lib/server/daily-tasks.ts`
- `npm run trace:adjacent -- src/lib/tasks/task-observability.ts`
- `npm run trace:adjacent -- src/lib/telemetry-catalog.ts`
- `npm run trace:adjacent -- src/lib/server/analytics.ts`
- `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
- `npx eslint src/lib/tasks/task-observability.ts src/app/api/admin/debug/route.ts src/app/admin/debug/page.tsx tests/unit/task-observability.spec.ts`
- `corepack pnpm exec vitest run tests/unit/task-observability.spec.ts`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `npm run check:continuity`
- `corepack pnpm run check`
- `npx vitest run`

Results:
- all listed commands passed at the end of the pass
- `corepack pnpm run check` passed end to end after tightening the new runtime task types and stabilizing two previously flaky timing-sensitive test timeouts
- `npx vitest run` passed with `69` files and `380` tests

Known tolerated warnings/notices in this pass:
- npm unknown env config warnings during chained npm script execution
- Node `punycode` deprecation warnings from current Firebase/Vitest tooling
- informational dotenv logging during `check:firebase-runtime`

Inventory changed or not:
- yes, the standing baseline was stale and has been refreshed from `611` tracked files to `613`
- this task itself modified existing files only; it did not add or remove tracked files

Current built-in daily task inventory snapshot:
- Built-in tasks audited: `47`
- Unsupported built-in tasks: `0`
- Canonical tracked built-ins: `15`
- Telemetry tracked built-ins: `32`
- Runtime-action built-ins: `12`
- Navigation-action built-ins: `35`
- Criteria-filtered built-ins: `11`
- Unique-keyed built-ins: `26`
- One-time built-ins: `1`
- Group distribution:
  - notifications=`4`
  - visit=`10`
  - wallet=`2`
  - purchase=`2`
  - unwrap=`9`
  - watch=`15`
  - share=`1`
  - feedback=`4`
- Action-type distribution:
  - enable_notifications=`1`
  - open_notifications=`3`
  - open_experiences=`3`
  - open_dashboard=`1`
  - open_library=`17`
  - open_drops=`14`
  - open_wallet=`4`
  - give_feedback=`4`
- Event-category distribution:
  - notifications=`4`
  - engagement=`6`
  - tasks=`5`
  - content=`28`
  - commerce=`4`

Current built-in daily task catalog:

| Task ID | Group | Action | Mode | Event | Tracking | Progress | Criteria | Unique key |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| enable_notifications | notifications | enable_notifications | runtime | task_notifications_enabled | canonical | 1 | no | - |
| open_notifications | notifications | open_notifications | runtime | notifications_dropdown_opened | telemetry | 1 | no | - |
| read_notification | notifications | open_notifications | runtime | notification_marked_read | telemetry | 1 | no | - |
| visit_experiences | visit | open_experiences | navigation | experience_hub_viewed | telemetry | 1 | no | - |
| check_in_today | visit | open_experiences | navigation | daily_check_in_claim | canonical | 1 | no | - |
| open_dashboard | visit | open_dashboard | navigation | dashboard_viewed | telemetry | 1 | no | - |
| open_library | visit | open_library | navigation | library_viewed | telemetry | 1 | no | - |
| preview_two_drops | visit | open_drops | navigation | drop_preview_opened | telemetry | 2 | no | drop_id |
| preview_three_drops | visit | open_drops | navigation | drop_preview_opened | telemetry | 3 | no | drop_id |
| view_three_drop_details | visit | open_drops | navigation | view_drop_details | telemetry | 3 | no | drop_id |
| open_wallet | wallet | open_wallet | runtime | wallet_opened | telemetry | 1 | no | - |
| start_checkout | wallet | open_wallet | runtime | begin_checkout | telemetry | 1 | no | - |
| buy_small_pack | purchase | open_wallet | runtime | gumdrops_purchase_completed | canonical | 1 | yes | - |
| buy_big_pack | purchase | open_wallet | runtime | gumdrops_purchase_completed | canonical | 1 | yes | - |
| unwrap_one_drop | unwrap | open_drops | navigation | unlock_drop_success | canonical | 1 | no | drop_id |
| unwrap_two_drops | unwrap | open_drops | navigation | unlock_drop_success | canonical | 2 | no | drop_id |
| unwrap_spicy | unwrap | open_drops | navigation | unlock_drop_success | canonical | 1 | yes | drop_id |
| open_viewer_once | watch | open_library | navigation | viewer_opened | telemetry | 1 | no | drop_id |
| watch_one_asset | watch | open_library | navigation | viewer_asset_consumed | telemetry | 1 | no | asset_key |
| watch_two_assets | watch | open_library | navigation | viewer_asset_consumed | telemetry | 2 | no | asset_key |
| watch_ninety_seconds | watch | open_library | navigation | viewer_watch_checkpoint | telemetry | 1 | yes | - |
| switch_three_assets | watch | open_library | navigation | viewer_asset_changed | telemetry | 3 | no | asset_key |
| share_one_drop | share | open_drops | navigation | drop_share_copied | telemetry | 1 | no | drop_id |
| submit_feedback | feedback | give_feedback | runtime | feedback_submitted | canonical | 1 | no | - |
| feature_request_feedback | feedback | give_feedback | runtime | feedback_submitted | canonical | 1 | yes | - |
| bug_report_feedback | feedback | give_feedback | runtime | feedback_submitted | canonical | 1 | yes | - |
| high_rating_feedback | feedback | give_feedback | runtime | feedback_submitted | canonical | 1 | yes | - |
| revisit_live_drops | visit | open_drops | navigation | drops_page_viewed | telemetry | 2 | no | - |
| revisit_experiences_hub | visit | open_experiences | navigation | experience_hub_viewed | telemetry | 2 | no | - |
| revisit_library_hub | visit | open_library | navigation | library_viewed | telemetry | 2 | no | - |
| scout_four_drops | unwrap | open_drops | navigation | drop_preview_opened | telemetry | 4 | no | drop_id |
| inspect_six_drop_details | unwrap | open_drops | navigation | view_drop_details | telemetry | 6 | no | drop_id |
| unwrap_three_drops | unwrap | open_drops | navigation | unlock_drop_success | canonical | 3 | no | drop_id |
| unwrap_four_drops | unwrap | open_drops | navigation | unlock_drop_success | canonical | 4 | no | drop_id |
| unwrap_sweet_drop | unwrap | open_drops | navigation | unlock_drop_success | canonical | 1 | yes | drop_id |
| unwrap_raw_drop | unwrap | open_drops | navigation | unlock_drop_success | canonical | 1 | yes | drop_id |
| open_two_unwrapped_drops | watch | open_library | navigation | viewer_opened | telemetry | 2 | no | drop_id |
| complete_one_viewer_session | watch | open_library | navigation | viewer_session_completed | telemetry | 1 | no | drop_id |
| complete_two_viewer_sessions | watch | open_library | navigation | viewer_session_completed | telemetry | 2 | no | drop_id |
| watch_two_full_minutes | watch | open_library | navigation | viewer_session_completed | telemetry | 1 | yes | - |
| finish_two_files | watch | open_library | navigation | viewer_asset_completed | telemetry | 2 | no | asset_key |
| finish_four_files | watch | open_library | navigation | viewer_asset_completed | telemetry | 4 | no | asset_key |
| watch_three_unwrapped_files | watch | open_library | navigation | viewer_asset_consumed | telemetry | 3 | no | asset_key |
| hit_forty_five_seconds | watch | open_library | navigation | viewer_watch_checkpoint | telemetry | 1 | yes | - |
| download_one_unwrapped_file | watch | open_library | navigation | viewer_source_downloaded | telemetry | 1 | no | asset_key |
| chase_a_related_drop | watch | open_library | navigation | viewer_related_drop_clicked | telemetry | 1 | no | destination |
| open_a_notification_update | notifications | open_notifications | runtime | notification_opened | telemetry | 1 | no | notification_id |

Current analytics metric inventory tracked in the standing audit:
- Global metrics:
  - `view_frequency`
  - `multi_page_session_rate`
  - `fast_bounce_rate`
  - `deep_scroll_session_rate`
  - `returning_actor_rate`
  - `home_to_dashboard_transition_rate`
  - `interaction_intensity`
  - `engaged_exit_rate`
- User metrics:
  - `library_visit_rate`
  - `experiences_visit_rate`
  - `profile_visit_rate`
  - `cross_surface_journey_rate`
  - `checkin_conversion_rate`
  - `notification_opt_in_rate`
  - `task_guidance_completion_rate`
  - `signup_to_onboarding_start_rate`
  - `onboarding_step_completion_rate`
- Admin metrics:
  - `admin_multi_page_rate`
  - `analytics_review_rate`
  - `user_drilldown_rate`
  - `admin_engaged_session_rate`
  - `admin_returning_actor_rate`
- Drop metrics:
  - `drop_catalog_reach_rate`
  - `preview_click_through_rate`
  - `preview_to_unlock_rate`
  - `unlock_to_viewer_rate`
  - `viewer_completion_rate`
  - `high_watch_depth_rate`
  - `repeat_viewer_rate`
  - `drop_share_rate`

Current canonical task telemetry/parity functions:
- `trackEvent(...)` in `src/lib/telemetry.ts`
- `buildTelemetryEventMetadata(...)` in `src/lib/telemetry-catalog.ts`
- `resolveTrackedTelemetryEvent(...)` in `src/app/api/telemetry/track/route.ts`
- `recordTelemetryEventStat(...)` in `src/lib/server/daily-tasks.ts`
- `recordCanonicalTaskEvent(...)` in `src/lib/server/daily-tasks.ts`
- `recordDailyTaskProgressFromEvent(...)` in `src/lib/server/daily-tasks.ts`
- `buildDailyTaskInventory(...)` in `src/lib/tasks/task-observability.ts`
- `summarizeDailyTaskInventory(...)` in `src/lib/tasks/task-observability.ts`

Commands run during this task:
- `Get-Content FULL_SCALE_CODEBASE_AUDIT.md`
- `Get-Content EVERY_FILE_FUNCTION_CHECKLIST.md`
- `npm run trace:adjacent -- src/lib/tasks/task-catalog.ts`
- `npm run trace:adjacent -- src/lib/task-guidance.ts`
- `npm run trace:adjacent -- src/lib/telemetry-catalog.ts`
- `git status --short`
- machine-derived task inventory generation via `corepack pnpm exec tsx`
- analytics metric inventory generation via `corepack pnpm exec tsx`
- `npx eslint src/lib/task-guidance.ts src/lib/tasks/task-observability.ts src/lib/server/daily-tasks.ts src/app/api/telemetry/track/route.ts src/app/api/admin/tasks/route.ts src/app/api/admin/debug/route.ts src/app/admin/debug/page.tsx tests/unit/task-guidance.spec.ts tests/unit/task-observability.spec.ts`
- `corepack pnpm exec vitest run tests/unit/task-guidance.spec.ts tests/unit/task-observability.spec.ts`
- `npx vitest run`
- `corepack pnpm run check`

Results:
- all 47 built-in daily tasks now have an auditable action path, event name, tracking source, instruction, and destination in a single machine-derived inventory
- unsupported built-in task count is explicitly verified at `0`
- the guidance activation bug is fixed: only runtime-capable task actions are now treated as task-guidance pending actions
- navigation-backed tasks such as dashboard, drops, experiences, and library tasks now route normally and no longer lose their action handling
- task telemetry parity is stronger because accepted noncanonical telemetry facts now increment `analytics_event_stats`, while canonical task-progress events also write event-stat visibility through the canonical server path
- admin custom-task creation now normalizes event names through the telemetry catalog instead of trusting raw user input
- admin debug now shows richer task coverage truth, including action mode, routing path, criteria presence, and group distribution
- `corepack pnpm run check` passed
- `npx vitest run` passed

Known tolerated warnings and notices:
- npm unknown env config warnings during `pnpm`/`npm` script chains
- Node `punycode` deprecation warnings during Vitest execution
- no lint warnings or type errors remain after this pass

Files needing follow-up:
- production distribution/completion counts still need a live authenticated admin/runtime pull if we want a runtime snapshot beyond the code-backed built-in catalog and current debug endpoints
- user-specific and admin-authored custom tasks still deserve a follow-up audit once there is a real runtime sample of their distribution, cooldown rotation, and reward claim behavior in the live dataset
- if future product work adds new action types, `TASK_GUIDANCE_ACTION_TYPES` and the task observability inventory should be updated together to keep runtime/navigation parity explicit

Inventory changed:
- Yes
- final staged tracked inventory is now `611`
- net change in this pass: `608` -> `611`
- newly tracked runtime/test files:
  - `src/lib/tasks/task-observability.ts`
  - `tests/unit/task-observability.spec.ts`
- top-level baseline counts now also reflect the already-tracked task/debug inventory surfaces that had drifted stale in the standing audit

Final confidence scoring summary:
- task-system truth is materially stronger because the catalog, guidance layer, admin tooling, telemetry path, and standing audit now describe the same built-in task model
- admin/debug observability is stronger because missing-action and missing-tracking gaps are now surfaced via a single inventory and summary path instead of split heuristics
- telemetry confidence is stronger because accepted telemetry facts and canonical task events now both feed event-stat visibility without creating duplicate semantic dialects

## Last Executed Audit
Audit execution recorded at: `2026-04-03 14:59:01 -05:00`

Current audit scope:
- full daily-task catalog sweep
- task guidance activation-path verification
- custom event-name normalization review
- task telemetry parity and event-stat visibility review
- analytics metric inventory capture for global, user, admin, and drop scopes

Current audit findings:
- All 47 built-in daily tasks now resolve through an auditable inventory with explicit group, action type, action mode, event name, tracking source, progress target, criteria flag, and uniqueness key.
- The major task-guidance bug was real: navigation actions were being treated as runtime actions, which could leave some tasks with no functioning action path. That parity gap is now fixed.
- Built-in task coverage currently resolves to 15 canonical-tracked tasks, 32 telemetry-tracked tasks, and 0 unsupported tasks.
- Accepted telemetry events now contribute to `analytics_event_stats` when they are noncanonical telemetry facts, while canonical task progress events also write event-stat visibility through the canonical server path.
- Admin task creation now canonicalizes event names through the telemetry catalog, reducing custom-event alias drift and making task-trigger metrics more trustworthy.
- Full `check` and full `vitest` verification are healthy again on this repo state.

## Current Platform Readiness Summary
What is ready now:
- local dependency graph auditing
- local adjacency tracing for touched files
- tracked-file inventory refreshes
- Playwright accessibility checks against known stable baselines
- Playwright screenshot regression checks for stable public mobile-first surfaces
- local Lighthouse-style mobile audits for stable public routes
- Firebase Firestore and Storage rules tests
- local Firebase CLI and Google Cloud CLI detection

What still needs local setup or authentication later:
- Firebase project auth for remote project inspection and deploy flows
- Google Cloud auth for real project/runtime inspection beyond local CLI presence
- stable local auth/emulator seams before admin-only or auth-only Playwright audits can be expanded safely

What still needs future implementation:
- the later mobile-first debug-panel refactor
- telemetry and analytics parity consolidation
- stronger authenticated/admin route UI audit coverage once local auth seams are standardized
- deeper emulator-backed verification for creator/admin storage and function-triggered flows

What still needs future refactoring:
- fragmented telemetry and analytics truth models
- admin/debug observability consolidation across routes, client actions, and parity side effects
- clearer canonical ownership over active-user, watch-time, drop-off, and user-journey intelligence

What can be trusted today:
- canonical diagnostics helpers
- core lint/type/test/rules verification paths
- the new dependency, adjacency, UI audit, and Lighthouse continuity tooling
- the statement that App Check is no longer part of the current runtime contract

What cannot be treated as fully trustworthy yet:
- admin analytics as a complete reflection of true user journeys
- telemetry-derived user drop-off or bounce intelligence
- full auth-bound/admin-bound UI regression coverage without more local auth/emulator scaffolding

## UI System Planning Prep
This section exists to make future UI standardization auditable before a large refactor starts.

### Current reusable UI reality
- `src/components/ui/Button.tsx`
  Current shared button primitive.
- `src/components/ui/Icon.tsx`
  Current shared icon primitive.
- `src/components/Admin/AdminDashboardModule.tsx`
  Current admin-only expandable module shell.
- `src/components/Admin/AdminPageHeader.tsx`
  Current admin-only page-header composition pattern.
- `src/components/CoreLayoutWrapper.tsx`
  Current global runtime-connected layout shell.

### Runtime-connected modules already in the system
These are components or systems that are already intentionally connected to backend or app-runtime state and should be treated differently from pure presentation:
- global auth modal flow
- purchase modal flow
- notifications runtime bridge
- guided onboarding flow
- admin overview and admin analytics polling modules
- creator waitlist and creator application routing surfaces

### Recommended future component layering
This is the target planning model to keep future UI work consistent and legacy-adaptable:

1. Pure primitives
   Buttons, icons, tags, status chips, spacing wrappers, and typography helpers.

2. Reusable public section shells
   Hero sections, explainer sections, status-summary sections, action rows, and placeholder blocks that accept normalized props only.

3. Backend-connected controllers
   Hooks, route-aware page controllers, and runtime modules that fetch, normalize, diagnose, and pass clean data into reusable presentational sections.

4. Admin or feature-specialized modules
   Modules that are intentionally domain-specific and should not be treated as general-purpose UI primitives.

### Rules for future UI standardization plans
- Prefer existing primitives when they are already truthful and low-friction.
- Do not create a new shared component if it still contains page-specific auth, fetch, or Firestore behavior.
- If a component talks directly to the backend, it must be intentionally classified as runtime-connected.
- If a section can render from normalized props only, it should be moved toward the reusable public shell layer.
- Public copy should only describe behavior that the codebase can currently prove.

## Copy and Product Questions The Codebase Cannot Answer Yet
These are open questions that should be resolved before final copy standardization across creator, admin, and growth surfaces:

1. Is the creator queue meant to be operationally ordered, cosmetically ordered, or hidden entirely from applicants?
2. What exact promise should public copy make about creator review timing, if any?
3. What are the formal approval criteria for creator access?
4. Which creator capabilities unlock immediately after approval, and which remain gated later?
5. Is segment assignment an internal admin-only concept, or should public copy explain it in user-facing language?
6. When legal documents are not yet available, what should the public explanation be for that waiting state?
7. Under what exact conditions should ID verification be requested from a creator?
8. What support path should applicants use if they believe their application is stuck or attached to the wrong account?
9. Can an applicant revise creator details after submission, or is everything frozen until admin review?
10. What permanent definition of the “creator program” should be reused across marketing, intake, waitlist, FAQ, and admin surfaces?

## Audit Outcome States
Every changed file or reviewed file should resolve to one of these states:

- `OK`
- `Needs cleanup`
- `Needs refactor`
- `Needs follow-up`
- `Delete candidate`

No build should be signed off as fully audited if any touched file is still in `Needs cleanup` or `Needs refactor` without an explicit follow-up note.

## Repo-Wide Non-Negotiables
These rules apply across the codebase:

1. No route should invent its own error contract when shared route handling exists.
2. No client surface should silently swallow failures that change apparent product state.
3. No commerce flow should bypass canonical economics or PayPal helpers.
4. No analytics flow should double-count, silently degrade, or drift from canonical event naming.
5. No storage/session/local cache failure should be invisible.
6. No cron or admin side effect should fail only in raw console output if it matters operationally.
7. No timezone or lifecycle logic should use ad hoc local math when a shared helper already exists.
8. No new helper should duplicate an existing shared helper without an explicit reason.
9. No build is complete until the end audit runs and the result is captured.
10. No "looks fine" signoff replaces the required verification commands.

## Continuity and Adjacency Rules
These are mandatory for long-horizon repo safety:

1. Every broad task must identify touched surfaces before code changes begin.
2. Every broad task must review adjacent imports/importers for its highest-risk touched files.
3. If a helper already exists in the canonical map, duplicating it is a continuity failure unless explicitly justified.
4. If a user-facing or admin-facing surface changes, visual and accessibility verification must be planned before coding starts.
5. If Firebase rules, storage, functions, or emulator-sensitive behavior changes, emulator-first verification is required.
6. If loading or rendering paths change, local performance verification must be considered and either run or explicitly rejected with reason.
7. Live-branch or App Hosting assumptions must be recorded whenever deployment behavior, branch safety, or production rollout behavior is relevant.
8. New audit or safety tooling must reduce ambiguity; it must not create a second conflicting process.

## Canonical Helper Map
These are the current source-of-truth helpers and modules to prefer before creating anything new.

### Governance, repo memory, and continuity authority
- `FULL_SCALE_CODEBASE_AUDIT.md`
  Canonical audit standard, build-start/build-end policy, surface map, and helper map
- `REPO_MEMORY_LEDGER.md`
  Canonical concise ledger for major architectural decisions, pivots, deprecated patterns, and workflow-authority rules
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
  Canonical exhaustive historical file/function sweep companion that must stay aligned with the standing audit baseline
- `AGENTS.md`
  Codex-specific workflow guidance; useful, but subordinate to the standing audit and repo-memory ledger
- `.agent/workflows/pre-commit.md`
  Contributor/agent verification workflow guidance that must stay aligned with the current audit contract

### Request, auth, and route handling
- `src/lib/server/auth.ts`
  Canonical API error response handling via `handleApiError(...)`
- `src/lib/server/request-guard.ts`
  Canonical request guard, auth mode, origin checks, and rate-limit entry point
- `src/lib/server/route-diagnostics.ts`
  Canonical server-side route warning/failure reporting

### Structured diagnostics and admin observability
- `src/lib/server/server-diagnostics.ts`
  Canonical persisted server diagnostics
- `src/lib/server/admin-ops-health.ts`
  Canonical admin-facing health/status normalization
- `src/lib/ai-debug-assistant.ts`
  Canonical shared AI debug output contract, model id, prompt version, and feature-flag constants
- `src/lib/server/ai-debug-assistant.ts`
  Canonical server-side Vertex AI debug summarization, fallback behavior, and AI call observability
- `src/app/api/admin/debug/assistant/route.ts`
  Canonical admin-only AI debug summary route
- `src/lib/client-diagnostics.ts`
  Canonical persisted client diagnostics
- `src/lib/client-error-reporting.ts`
  Canonical client-side action/realtime/storage failure reporting
- `src/lib/server/diagnostic-read-fallbacks.ts`
  Canonical "fallback without losing diagnostic context" helpers

### Analytics, telemetry, and parity
- `src/lib/telemetry.ts`
  Canonical client telemetry emitter
- `src/lib/telemetry-catalog.ts`
  Canonical event-name catalog, alias normalization, module/category metadata, and tracked-source metadata
- `src/lib/analytics-metric-catalog.ts`
  Canonical metric inventory for global, user, admin, and drop-level stats
- `src/lib/server/analytics.ts`
  Canonical server analytics/event emission
- `src/lib/server/analytics-governance.ts`
  Canonical analytics governance and mapping rules
- `scripts/audit-telemetry.ts`
  Canonical telemetry coverage audit
- `scripts/check-analytics-semantics.ts`
  Canonical semantics audit

### Commerce and economics
- `src/lib/gumdrop-economics.ts`
  Canonical economics derivation logic
- `src/lib/gumdrop-ledger.ts`
  Canonical source-aware Gum Drop accounting rules
- `src/lib/server/paypal.ts`
  Canonical PayPal access token, order creation, and capture helper
- `src/app/api/paypal/create/route.ts`
  Canonical PayPal create endpoint
- `src/app/api/paypal/capture/route.ts`
  Canonical PayPal capture endpoint

### Drop lifecycle, scheduling, and queue parity
- `src/lib/drop-status.ts`
- `src/lib/drop-queue-lifecycle.ts`
- `src/lib/drop-queue-schedule.ts`
- `src/lib/drop-runtime.ts`
- `src/lib/server/drop-runtime.ts`
- `src/lib/server/process-queue-drops.ts`
- `src/lib/admin-drop-lifecycle.ts`
- `src/lib/admin-drop-queue.ts`

### Storage, caching, and client persistence
- `src/hooks/useAuthSWR.ts`
- `src/lib/navigation-persistence.ts`
- `src/lib/task-guidance.ts`
- `src/lib/tasks/task-observability.ts`
  Canonical built-in task inventory, tracking-source classification, and task action-mode summary helper
- `src/hooks/client-runtime.ts`

### Notifications and messaging
- `src/lib/notification-contracts.ts`
- `src/lib/server/notification-runtime.ts`
- `src/lib/server/notification-inbox.ts`
- `src/lib/notifications.ts`
- `src/hooks/useNotifications.ts`

### Continuity, adjacency, and UI audit tooling
- `.dependency-cruiser.cjs`
  Canonical dependency boundary configuration for architecture drift checks
- `scripts/repo-inventory.ts`
  Canonical tracked-file inventory counter for audit-baseline refreshes, including root doc/lockfile/config-runtime-tooling visibility
- `scripts/trace-adjacent-surfaces.ts`
  Canonical touched-file adjacency review helper for imports, importers, sibling files, and likely related tests
- `scripts/export-dependency-graph.ts`
  Canonical local dependency-graph exporter
- `.lighthouserc.json`
  Canonical local Lighthouse CI configuration for mobile-first route auditing
- `tests/ui-audits/accessibility.spec.ts`
  Canonical Playwright accessibility audit entrypoint
- `tests/ui-audits/visual-regression.spec.ts`
  Canonical Playwright visual regression audit entrypoint

## Audit Surface Map
Every tracked file must fall into one of the surfaces below and satisfy that surface's rules.

| Surface | Current count | Files covered | Audit requirement |
| --- | ---: | --- | --- |
| Root/config/docs | 42 | root files, repo docs, config, lockfiles | Naming, relevance, drift, tooling consistency, no stale operational docs |
| `public` | 11 | static assets, manifest, service worker | Asset still referenced, correct destination, no dead screenshots/icons in runtime paths |
| `src/app` | 116 | pages, layouts, route handlers, loading/error UI | Auth, route semantics, cache rules, diagnostics, no dead route targets |
| `src/components` | 65 | reusable UI and feature modules | Accessibility, explicit loading/error state, correct telemetry, correct runtime action mapping |
| `src/context` | 4 | provider layers | No redundant providers, state shape parity, guest/auth correctness |
| `src/hooks` | 13 | client runtime hooks | Cleanup, error state, diagnostics, polling/realtime parity |
| `src/lib` | 133 | shared client/shared domain helpers | No duplication, canonical helpers, telemetry/economics/time helpers reused |
| `src/lib/server` | 56 | server-only domain helpers | Structured diagnostics, no raw side-effect-only logging, canonical DB/runtime access |
| `src/types` | 3 | shared types | Explicitness, current state-shape parity |
| `functions/src` | 30 | Firebase Functions backend | Runtime parity, orchestration consistency, export coverage |
| `scripts` | 17 | audits, checks, admin scripts | Still useful, current paths, deterministic behavior |
| `tests` | 97 | contracts, unit, visual, rules, benches | Coverage remains aligned to runtime-critical areas |
| `dataconnect` + generated clients | 39 | schema + generated SDKs | Generated artifacts current, schema/runtime parity, no stale generated output |

## Universal Per-File Questions
Apply these to every touched file, regardless of type:

1. Is the file still necessary?
2. Is the file name and location still the right one?
3. Is there a canonical helper this file should be using instead of local logic?
4. Does this file hide any failure that would change the apparent state seen by a user or admin?
5. Does this file emit diagnostics where operational failures should be visible?
6. Does this file use the current domain language and data shape?
7. Does this file drift from shared time, lifecycle, cache, or auth rules?
8. Does this file still point to valid routes, assets, and dependencies?
9. Is the test or verification story for this file still appropriate to its risk?
10. If this file vanished today, would the remaining system become simpler without losing behavior?

## Surface-Specific Audit Rules

### 1. Route handlers: `src/app/api/**`
- Must use `guardApiRequest(...)` unless there is a documented exception.
- Must use `handleApiError(...)` or an explicitly compatible error response path.
- Must use `recordRouteWarning(...)` or equivalent structured diagnostics for non-fatal operational failures.
- Must not rely on bare `console.error(...)` for meaningful side effects.
- Must preserve idempotency, dedupe keys, or safe retry behavior when writes matter.
- Must set cache behavior intentionally.
- Must keep analytics and canonical fact writes aligned.

### 2. Pages/layouts/error/loading UI: `src/app/**`
- Must expose truthful loading and error states.
- Must not pretend "empty" when the real state is "failed."
- Must keep auth and admin gating explicit.
- Must use shared runtime/polling/cache helpers where available.

### 3. Components: `src/components/**`
- Must route action failures through structured client diagnostics when the action matters.
- Must keep accessibility attributes, keyboard flows, and empty states intact.
- Must not duplicate domain logic already living in `src/lib/**`.
- Must not add hidden realtime/polling work without cleanup and a visible loading/error plan.

### 4. Hooks: `src/hooks/**`
- Must return enough state to distinguish loading, success, and failure.
- Must clean up subscriptions/timers.
- Must use `reportRealtimeIssue(...)`, `reportStorageIssue(...)`, or `reportClientIssue(...)` where appropriate.
- Must not silently coerce failed fetches into misleading "loaded" state.

### 5. Shared lib: `src/lib/**`
- Must be the first place to consolidate repeated logic.
- Must keep telemetry naming, time handling, economics, and navigation/state keys canonical.
- Must not spread duplicate validators, lifecycle calculators, or cache keys.

### 6. Server lib: `src/lib/server/**`
- Must be server-only in behavior and assumptions.
- Must emit persisted diagnostics for operationally meaningful failures.
- Must centralize Firestore/PayPal/runtime/parity behavior instead of re-embedding it in routes.
- Must preserve admin dashboard observability.

### 7. Functions backend: `functions/src/**`
- Must stay consistent with app-side canonical semantics and runtime assumptions.
- Must not introduce parallel analytics naming or parity models.
- Must keep orchestration and export flows readable enough to debug from logs plus diagnostics.

### 8. Tests: `tests/**`
- Must reflect current behavior, not retired architecture.
- Must cover canonical helpers and risky flows before covering cosmetic details.
- Benchmark or perf tests must be treated as signal, not accidental blockers, and should remain stable in this environment.

### 9. Scripts: `scripts/**`
- Must still point at live paths and live contracts.
- Must be deterministic and safe to run in the shared repo.
- Must be deleted if they are historical one-offs with no future operational value.

### 10. Public assets, generated files, and Data Connect
- Must still be referenced or intentionally versioned.
- Generated files must correspond to current schema/runtime usage.
- Asset churn without runtime use should be questioned.

## UI Audit Expectations
If a task touches meaningful user-facing or admin-facing UI:

1. Prefer real deterministic public routes first.
2. If the changed surface is auth-bound or admin-bound, document the missing local auth/emulator seam explicitly instead of inventing a UI-only shadow route.
3. Run Playwright accessibility coverage for the changed surface or the closest truthful public route.
4. Run Playwright visual regression coverage for fragile layout/shell work.
5. Auth-bound shell coverage must only be added after a stable local auth/emulator seam exists.
6. Do not claim UI parity from screenshots alone if state truth comes from a backend surface that was not verified.

## Dependency and Architecture Drift Checks
These checks exist to reduce hidden neighboring logic misses:

1. `npm run check:architecture`
   Enforces boundary rules between app runtime, server-only helpers, and Firebase Functions.
2. `npm run trace:adjacent -- <path>`
   Lists direct imports, importers, same-directory siblings, likely related tests, and canonical helpers to review.
3. `npm run graph:architecture`
   Exports a local dependency graph snapshot to `output/dependency-graph.json`.
4. `npm run check:inventory`
   Prints the current tracked-file inventory surface counts used by this audit baseline.

## Telemetry, AI/ML, and Observability Readiness
Use these questions whenever work touches analytics, diagnostics, recommendations, or admin/debug surfaces:

1. Is the current behavior truly tracked, or is the UI implying more certainty than the underlying events support?
2. Is the canonical source of truth Firestore, Realtime Database, Data Connect, Functions materialization, or a downstream export?
3. Is any machine-learning or recommendation language describing a real runtime system, or only a heuristic/readiness flag?
4. If an operational side effect fails, can an admin/operator find that failure in the correct diagnostics surface without tailing raw logs?
5. If a later debug-panel or telemetry refactor is planned, does the current change make that work easier instead of adding one more fragmented pathway?
6. If AI is involved, is the exact model choice explicit and stable in code and audit notes?
7. If AI is involved, is the invocation server-side only unless a later audited pass explicitly approves client-side use?
8. Are AI outputs clearly marked as advisory rather than canonical truth?
9. Are prompt version, model id, fallback status, and latency observable to operators?
10. If AI cannot run because of auth, project setup, or parsing failure, does the surrounding UI remain useful and truthful?
11. If daily tasks are involved, is every built-in task explainable through the task catalog, task guidance, task observability inventory, and either canonical or telemetry-backed tracking?
12. If event-name tracking changes, are aliases normalized and are global/user metric catalogs still aligned with the canonical telemetry event inventory?

Current canonical analytics metric inventory:
- Global metrics:
  `view_frequency`, `multi_page_session_rate`, `fast_bounce_rate`, `deep_scroll_session_rate`, `returning_actor_rate`, `home_to_dashboard_transition_rate`, `interaction_intensity`, `engaged_exit_rate`
- User metrics:
  `library_visit_rate`, `experiences_visit_rate`, `profile_visit_rate`, `cross_surface_journey_rate`, `checkin_conversion_rate`, `notification_opt_in_rate`, `task_guidance_completion_rate`, `signup_to_onboarding_start_rate`, `onboarding_step_completion_rate`

Current canonical task telemetry/parity functions:
- `trackEvent(...)` in `src/lib/telemetry.ts`
- `buildTelemetryEventMetadata(...)` in `src/lib/telemetry-catalog.ts`
- `resolveTrackedTelemetryEvent(...)` in `src/lib/server/analytics-event-utils.ts`
- `recordTelemetryEventStat(...)` in `src/lib/server/daily-tasks.ts`
- `recordCanonicalTaskEvent(...)` in `src/lib/server/daily-tasks.ts`
- `recordDailyTaskProgressFromEvent(...)` in `src/lib/server/daily-tasks.ts`

## Firebase and App Hosting Safety Notes
When Firebase or Google Cloud surfaces are touched:

1. Prefer emulator-first verification for Firestore rules, Storage rules, and Functions-adjacent behavior where practical.
2. Do not assume the current local branch is the live App Hosting branch or rollout target.
3. Record any App Hosting branch, preview, or rollout assumption explicitly in the audit evidence.
4. Avoid introducing tooling that requires production data or production-only secrets to run local checks.
5. Treat Firebase runtime warnings as audit evidence, not silent background noise.
6. Firebase App Check is not part of the current runtime contract in this repo; future work must not assume App Check keys, headers, or verification are active unless a later audited pass explicitly reintroduces them end to end.

## Build Start Audit
Before writing code:

1. Read this file.
2. Read `REPO_MEMORY_LEDGER.md`.
3. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`.
4. Review any audit snapshots named near the top of this file if they still exist.
5. Confirm which audit surfaces the task touches.
6. Check whether a canonical helper already exists for the work.
7. Run `git status --short` and record the current branch / commit.
8. Run `npm run trace:adjacent -- <path>` for the highest-risk touched files before writing code.
9. If tracked-file count changed materially since the last baseline, refresh the inventory numbers in this file.
10. If the task changes runtime, dev, local workflow, platform, governance, or generated-artifact dependencies, record that class before editing.
11. If the task touches routes, diagnostics, telemetry, commerce, or persistence, identify the exact canonical helper/module first.
12. If the task touches user-facing or admin-facing UI, decide up front what Playwright a11y and visual coverage is required.
13. If the task touches Firebase rules, storage, functions, or emulator-sensitive behavior, define the emulator-first verification plan before coding.
14. If the task touches loading, rendering, or mobile-shell performance, decide whether Lighthouse verification is required and record that decision.
15. If the task touches admin or analytics behavior, define where failures should appear in the admin dashboard before writing code.
16. Update the active audit entry in this file before changing application code.

## Build End Audit
Before signoff:

1. Review every touched file against the universal questions and surface rules above.
2. Re-run `npm run trace:adjacent -- <path>` for the most important touched files if the implementation moved into neighboring helpers or routes.
3. Run `corepack pnpm run check`.
4. Run `npx vitest run` when the change is broad, cross-cutting, or touches shared helpers.
5. Run `npm run check:ui:audits` when meaningful UI changed.
6. Run `npm run check:ui:lighthouse` when loading/render/performance-sensitive surfaces changed or when a performance audit was planned at start.
7. Run Firebase emulator/rules verification when Firebase-sensitive surfaces changed.
8. Verify new or changed diagnostics route to the correct client/server channel.
9. Verify analytics/economics/PayPal flows still use canonical helpers.
10. Verify no silent storage/cache/realtime failures were introduced.
11. Verify any new helper truly reduced duplication instead of adding another layer.
12. Record any tolerated warnings explicitly.
13. Update this file if the standard, canonical helper map, inventory baseline, continuity tooling, or dependency classification story changed.
14. Update `REPO_MEMORY_LEDGER.md` if the task created or clarified a durable architectural/workflow decision.
15. Capture the final evidence block before commit.

## Consistency Failure Conditions
The audit fails if any of the following are true:

- A route or admin mutation hides a meaningful failure in raw console output only.
- A client hook or component can no longer distinguish failed state from empty state.
- A PayPal or economics flow bypasses canonical shared logic.
- A telemetry event is emitted outside the catalog/semantics model without justification.
- An AI summary is treated as canonical truth or allowed to mutate product state.
- A new cache or storage key is introduced without a documented consistency reason.
- A new helper duplicates a canonical helper already listed here.
- A critical admin/debug surface loses observability for the exact action that can fail.
- A changed file has no clear verification path.
- A broad change was made without adjacent import/importer review.
- Meaningful UI changed without a documented accessibility and visual verification path.
- Firebase-sensitive changes were signed off without emulator-first verification or an explicit reason it was not practical.
- A task touched loading/render paths but had no stated performance verification stance.
- A local audit/tooling addition created a second conflicting process instead of strengthening this file.
- A dependency, tooling, platform, or generated-artifact change was made without being classified and recorded.
- A future contributor would still need private AI memory or founder memory as the first step to recover current architecture or workflow authority.
- A root/platform/generated artifact meaningfully affects repo truth but is left unexplained in canonical docs.

## Economics and PayPal Audit Rules
These rules are mandatory for any commerce change:

1. PayPal create/capture logic must route through `src/lib/server/paypal.ts`.
2. Gum Drop economics must route through canonical economics and ledger helpers.
3. Client-side purchase failures must be visible through client diagnostics.
4. Server-side purchase and capture failures must be visible through server diagnostics.
5. Admin analytics and overview surfaces must remain capable of explaining commerce failures and partial side-effect failures.
6. No purchase flow may look "complete" if capture, ledger, or canonical tracking meaningfully failed without that being diagnosable.

## Admin Dashboard Observability Rules
If something important fails, an operator should be able to find it.

That means:
- client action failures should hit client diagnostics when they affect user/admin truth,
- route-side warnings should hit server diagnostics,
- analytics fallbacks should preserve an issue trail,
- and non-fatal parity failures must not disappear into console-only logs.

The goal is not more noise. The goal is fewer invisible failures.

## Required Evidence Block For Future Audits
Append or copy this block into future PR notes, audit docs, or build summaries:

```
Audit date:
Branch / commit:
Task summary:
Touched surfaces:
Canonical helpers used:
Commands run:
- corepack pnpm run check
- npx vitest run
- npm run trace:adjacent -- <path>
Result:
Known tolerated warnings:
Dependency/tooling changes:
Files needing follow-up:
Inventory count changed:
This file updated:
Repo memory ledger updated:
```

## Practical Rule For This Repo
If future work adds a file, removes a file, introduces a new shared helper, changes canonical economics/PayPal/diagnostics handling, or alters the build-start/build-end checklist, this file must be updated in the same change.

That is the rule that keeps this audit alive instead of letting it decay into another historical note.

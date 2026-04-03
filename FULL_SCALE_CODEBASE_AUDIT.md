# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-03
Last full-scale audit execution: 2026-04-03 11:27:07 -05:00
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

## Current Baseline
Current tracked inventory baseline after this audited change on 2026-04-03:

- Total tracked files: `606`
- Root files: `41`
- `src`: `350`
- `src/app`: `115`
- `src/components`: `65`
- `src/context`: `4`
- `src/hooks`: `13`
- `src/lib`: `130`
- `src/lib/server`: `55`
- `src/types`: `3`
- `functions`: `36`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `94`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

Current baseline verification on 2026-04-03:
- `corepack pnpm run check` passed
- `npx vitest run` passed
- `npm run check:continuity` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `npm run check:ui:audits` remained green from the prior 2026-04-03 continuity pass
- `npm run check:ui:lighthouse` remained green from the prior 2026-04-03 continuity pass

Current tolerated non-blocking environment notices:
- npm unknown env config warnings printed during some script runs
- Node `punycode` deprecation warnings printed by Firebase/Vitest tooling on current local Node
- Windows Chrome cleanup warning may print after local Lighthouse runs when there is no running Chrome instance left to kill

These notices are not automatic audit failures, but they must stay explicitly known and not silently spread into product behavior.

## Active Audit Entry
Current audit date: `2026-04-03 11:36:42 -05:00`
Current branch / commit: `main / e67ecad`

Current task:
- thread-wide implementation continuity verification and interruption recovery

Current mission:
- verify every implementation-oriented prompt from this chat against the current repo, identify interruption gaps, finish any materially incomplete work, and leave the standing audit consistent with the final verified repository state

Current expected touched surfaces:
- root/docs
- `src/app/admin`
- `src/app/api`
- `src/components`
- `src/context`
- `src/hooks`
- `src/lib`
- `src/lib/server`
- `tests`
- dependency/runtime surfaces directly required by any interrupted implementation prompts discovered during verification

Current canonical helpers/modules expected to be used:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/lib/telemetry.ts`
- existing Vitest, ESLint, Playwright, Firebase runtime, continuity, and dependency-boundary verification entrypoints already codified in the repo

Current continuity note:
- this pass is not allowed to hand-wave prior prompts as complete; every implementation request in the thread must be verified against current code before signoff, and any interruption gap must either be fixed or explicitly captured as still pending

Audit start recorded at: `2026-04-03 11:36:42 -05:00`

Start-of-task audit inputs read:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- current standing audit baseline and checklist companion
- current thread history as the implementation checklist source

End-of-task audit completion recorded at: `2026-04-03 12:14:40 -05:00`

Final touched surfaces:
- root/docs
- dependency/runtime config
- `src/app/admin`
- `src/app/api/admin/debug`
- `src/lib`
- `src/lib/server`
- `tests`

Final touched files:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `eslint.config.mjs`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `src/lib/ai-debug-assistant.ts`
- `src/lib/server/ai-debug-assistant.ts`
- `src/app/api/admin/debug/assistant/route.ts`
- `src/app/admin/debug/page.tsx`
- `tests/unit/ai-debug-assistant.spec.ts`
- `tests/unit/admin-debug-assistant-route.spec.ts`

Canonical helpers/modules used in this task:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-orchestration.ts`
- `src/lib/server/creator-onboarding-diagnostics.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/app/admin/debug/page.tsx`

Dependency decisions in this task:
- Installed:
  - `@google-cloud/vertexai`
- Already present and reused:
  - `@playwright/test`
  - `@axe-core/playwright`
  - `@lhci/cli`
  - `dependency-cruiser`
  - `eslint-plugin-playwright`
  - `@firebase/rules-unit-testing`
  - `firebase-tools`
- Rejected:
  - no new provider SDKs or client-side AI SDKs were added

Manual setup or authentication still required from the user:
- local Vertex AI execution still requires Application Default Credentials if you want live summaries outside Google-managed runtime
- manual local step: `gcloud auth application-default login`
- the Google Cloud project also needs Vertex AI enabled if it is not already enabled for the target runtime project

Exact systems audited or hardened in this pass:
- thread-wide implementation prompt continuity across prior interrupted requests
- admin debug console observability completeness
- internal AI debug assistant readiness and safe fallback behavior
- repo-wide verification continuity so `corepack pnpm run check` is trustworthy again

Exact safety, moderation, telemetry, and debug additions made:
- the only materially incomplete interrupted feature found in thread history was the internal AI debug assistant; it is now implemented as a server-side, admin-only, advisory surface
- Gemini output is bounded to existing canonical summaries from admin ops health, orchestration, and creator onboarding diagnostics
- AI output is structured, prompt-versioned, latency-aware, feature-flagged, and explicitly marked as fallback or live
- deterministic fallback summaries now keep the debug console useful even when Vertex auth, model execution, or parsing fails
- AI call metadata now records through existing admin/server diagnostic pathways instead of disappearing into raw console-only logs
- the admin debug console now exposes AI summary status without depending on model success to render the rest of the page
- the repo-wide ESLint flat-config collision around duplicate `import` plugin registration was removed so the canonical `check` entrypoint passes again

Commands run during this task:
- `git status --short`
- `git rev-parse --abbrev-ref HEAD`
- `git rev-parse --short HEAD`
- `Get-Content FULL_SCALE_CODEBASE_AUDIT.md`
- `Get-Content EVERY_FILE_FUNCTION_CHECKLIST.md`
- targeted code searches confirming prior prompt surfaces already present and identifying the missing AI gap
- `corepack pnpm add @google-cloud/vertexai`
- `Get-Content node_modules/@google-cloud/vertexai/README.md`
- `npm install --package-lock-only --ignore-scripts`
- `npm run trace:adjacent -- src/lib/server/ai-debug-assistant.ts`
- `npm run trace:adjacent -- src/app/api/admin/debug/assistant/route.ts`
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
- `corepack pnpm exec vitest run tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts`
- `npx vitest run`
- `npm run check:inventory`
- `corepack pnpm run check`

Results:
- prior implementation-oriented prompts were reverified against the current repo instead of being assumed complete
- the only confirmed interruption gap was the missing internal AI debug assistant prompt; that gap is now closed
- the admin debug console now has a live/fallback AI summary lane driven by bounded canonical health inputs
- the AI path is server-side only and uses Vertex AI Gemini Flash-Lite with no hardcoded keys and no client-to-model calls
- deterministic fallback behavior covers disabled flag, missing project config, missing ADC/auth, timeout, and malformed model output
- structured unit coverage now exists for prompt assembly, feature-flag disabled behavior, auth-unavailable fallback, malformed output fallback, and the admin debug assistant route
- `corepack pnpm run check` passed
- `npx vitest run` passed

Known tolerated warnings and notices:
- npm unknown env config warnings during `pnpm`/`npm` script chains
- Node `punycode` deprecation warnings during Vitest execution
- `npm install --package-lock-only --ignore-scripts` reported existing dependency audit advisories; no new secret or AI-risking dependency behavior was introduced in this pass

Files needing follow-up:
- local ADC must still be configured before the AI summary can run live outside managed Google runtime
- the Vertex AI SDK used here is the exact dependency required by the original prompt, but its own README now marks it deprecated in favor of a later migration path; future audited work should plan that migration without changing this prompt’s required implementation
- broader debug-panel centralization and telemetry consolidation work remains a separate future implementation surface beyond this interruption-recovery pass

Inventory changed:
- Yes
- final staged tracked inventory is now `611`
- net change in this pass: `606` -> `611`
- newly tracked runtime/test files:
  - `src/lib/ai-debug-assistant.ts`
  - `src/lib/server/ai-debug-assistant.ts`
  - `src/app/api/admin/debug/assistant/route.ts`
  - `tests/unit/ai-debug-assistant.spec.ts`
  - `tests/unit/admin-debug-assistant-route.spec.ts`

Final confidence scoring summary:
- thread-wide prompt continuity is stronger because the missing AI integration gap is now explicitly closed instead of merely claimed in narrative updates
- admin observability confidence is stronger because AI summaries now sit beside canonical diagnostics with explicit fallback and latency metadata
- repo verification confidence is stronger because the canonical `check` entrypoint was repaired and rerun successfully in the same pass

## Last Executed Audit
Audit execution recorded at: `2026-04-03 12:14:40 -05:00`

Current audit scope:
- thread-wide implementation continuity verification
- interrupted-prompt recovery
- internal AI debug assistant completion
- repo verification continuity repair

Current audit findings:
- The repo-wide implementation history in this thread is materially consistent with current code after re-verification.
- The only confirmed interrupted implementation gap was the missing internal AI debug assistant; it is now present as a server-side, admin-only, advisory integration.
- The admin debug console now exposes live or fallback AI root-cause summaries without treating AI output as canonical truth.
- Full `check` and full `vitest` verification are healthy again on this repo state.
- Live AI execution still depends on local or managed Google credentials and must not be assumed active everywhere by default.

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
  Canonical tracked-file inventory counter for audit-baseline refreshes
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
| Root/config/docs | 41 | root files, repo docs, config, lockfiles | Naming, relevance, drift, tooling consistency, no stale operational docs |
| `public` | 11 | static assets, manifest, service worker | Asset still referenced, correct destination, no dead screenshots/icons in runtime paths |
| `src/app` | 116 | pages, layouts, route handlers, loading/error UI | Auth, route semantics, cache rules, diagnostics, no dead route targets |
| `src/components` | 65 | reusable UI and feature modules | Accessibility, explicit loading/error state, correct telemetry, correct runtime action mapping |
| `src/context` | 4 | provider layers | No redundant providers, state shape parity, guest/auth correctness |
| `src/hooks` | 13 | client runtime hooks | Cleanup, error state, diagnostics, polling/realtime parity |
| `src/lib` | 132 | shared client/shared domain helpers | No duplication, canonical helpers, telemetry/economics/time helpers reused |
| `src/lib/server` | 56 | server-only domain helpers | Structured diagnostics, no raw side-effect-only logging, canonical DB/runtime access |
| `src/types` | 3 | shared types | Explicitness, current state-shape parity |
| `functions/src` | 30 | Firebase Functions backend | Runtime parity, orchestration consistency, export coverage |
| `scripts` | 17 | audits, checks, admin scripts | Still useful, current paths, deterministic behavior |
| `tests` | 96 | contracts, unit, visual, rules, benches | Coverage remains aligned to runtime-critical areas |
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
2. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`.
3. Review any audit snapshots named near the top of this file if they still exist.
4. Confirm which audit surfaces the task touches.
5. Check whether a canonical helper already exists for the work.
6. Run `git status --short` and record the current branch / commit.
7. Run `npm run trace:adjacent -- <path>` for the highest-risk touched files before writing code.
8. If tracked-file count changed materially since the last baseline, refresh the inventory numbers in this file.
9. If the task touches routes, diagnostics, telemetry, commerce, or persistence, identify the exact canonical helper/module first.
10. If the task touches user-facing or admin-facing UI, decide up front what Playwright a11y and visual coverage is required.
11. If the task touches Firebase rules, storage, functions, or emulator-sensitive behavior, define the emulator-first verification plan before coding.
12. If the task touches loading, rendering, or mobile-shell performance, decide whether Lighthouse verification is required and record that decision.
13. If the task touches admin or analytics behavior, define where failures should appear in the admin dashboard before writing code.
14. Update the active audit entry in this file before changing application code.

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
13. Update this file if the standard, canonical helper map, inventory baseline, or continuity tooling changed.
14. Capture the final evidence block before commit.

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
Files needing follow-up:
Inventory count changed:
This file updated:
```

## Practical Rule For This Repo
If future work adds a file, removes a file, introduces a new shared helper, changes canonical economics/PayPal/diagnostics handling, or alters the build-start/build-end checklist, this file must be updated in the same change.

That is the rule that keeps this audit alive instead of letting it decay into another historical note.

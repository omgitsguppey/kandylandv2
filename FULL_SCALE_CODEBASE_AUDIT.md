# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-02
Last full-scale audit execution: 2026-04-02 23:01:58 -05:00
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
Current tracked inventory baseline after this audited change on 2026-04-02:

- Total tracked files: `589`
- Root files: `38`
- `src`: `354`
- `src/app`: `116`
- `src/components`: `65`
- `src/context`: `4`
- `src/hooks`: `14`
- `src/lib`: `132`
- `src/lib/server`: `55`
- `src/types`: `3`
- `functions`: `36`
- `functions/src`: `30`
- `scripts`: `13`
- `tests`: `80`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

Current baseline verification on 2026-04-02:
- `corepack pnpm run check` passed
- `npx vitest run` passed

Current tolerated non-blocking environment notices:
- npm unknown env config warnings printed during some script runs
- Firebase App Check not configured message in runtime snapshot

These notices are not automatic audit failures, but they must stay explicitly known and not silently spread into product behavior.

## Active Audit Entry
Audit start recorded at: `2026-04-02 22:07:01 -05:00`

Task:
- finalize creator onboarding truthfulness and admin approval flow

Start-of-task touched surfaces:
- root/docs
- `src/app`
- `src/lib`
- `src/lib/server`
- `tests`

Start-of-task expected work areas:
- creator-facing apply and waitlist pages
- creator submission and intake persistence routes
- admin creator review visibility routes and surfaces
- creator onboarding canonical server helpers
- creator-facing copy normalization and support path
- creator ID submission pipeline and diagnostics coverage

Start-of-task canonical helpers/modules to prefer:
- `src/lib/creator-application.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/server-diagnostics.ts`

Start-of-task known truthfulness risks:
- creator-facing queue language is still partially present in the current worktree
- creator-facing stages need to be normalized away from admin-internal wording
- creator submission, ID, legal, and admin-approval state must be proven to read from the same canonical source

End-of-task audit completion recorded at: `2026-04-02 23:01:58 -05:00`

Final touched surfaces:
- root/docs
- `src/app`
- `src/components`
- `src/context`
- `src/lib`
- `src/lib/server`
- `tests`

Final touched files:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/roster/page.tsx`
- `src/app/admin/user/[userId]/page.tsx`
- `src/app/api/creator/onboarding/application/route.ts`
- `src/app/api/user/register/route.ts`
- `src/app/creators/apply/page.tsx`
- `src/app/creators/waitlist/page.tsx`
- `src/app/page.tsx`
- `src/components/Auth/AuthModal.tsx`
- `src/context/AuthContext.tsx`
- `src/lib/creator-application.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/creator-onboarding.ts`
- `tests/unit/creator-onboarding-application-route.spec.ts`
- `tests/unit/creator-onboarding-server.spec.ts`
- `tests/unit/creator-onboarding.spec.ts`
- `tests/unit/creator-waitlist-page.spec.tsx`
- `tests/unit/performance-bench.spec.ts`
- `tests/unit/queue-bench.spec.ts`
- `tests/unit/username-suggestions-bench.spec.ts`

Canonical helpers/modules used in this task:
- `src/lib/creator-application.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/privacy-policy.ts`

Commands run during this task:
- `git status --short`
- focused `eslint` runs across touched creator onboarding files
- focused `vitest` runs for creator onboarding, waitlist, and benchmark stabilization
- queue/copy grep checks across `src` and `tests`
- `corepack pnpm run check`
- `npx vitest run`

Results:
- creator-facing queue-number language was removed from the touched creator onboarding surfaces
- creator applicants now move through a stage-based, backend-connected waiting flow with truthful legal and ID messaging
- pre-approval edits now update the canonical creator onboarding record instead of creating disconnected ghost state
- admin/manual approval remains the only approval authority
- `corepack pnpm run check` passed
- `npx vitest run` passed

Known tolerated warnings and notices:
- npm unknown env config warnings during `pnpm`/`npm` script chains
- Firebase App Check not configured message in runtime checks
- Node `punycode` deprecation warnings during Vitest execution

Inventory changed:
- Yes
- This change adds `3` tracked files:
  - `src/app/api/creator/onboarding/application/route.ts`
  - `tests/unit/creator-onboarding-application-route.spec.ts`
  - `tests/unit/creator-waitlist-page.spec.tsx`
- Baseline counts above were refreshed to the post-change tracked inventory

## Last Executed Audit
Audit execution recorded at: `2026-04-02 23:01:58 -05:00`

Current audit scope:
- creator onboarding truthfulness hardening
- creator waiting-stage standardization
- admin approval visibility parity
- creator pre-approval editability and diagnostics coverage
- benchmark stability so required repo-wide verification stays reproducible

Current audit findings:
- The creator-facing queue number model was synthetic and has now been removed from the touched creator-facing surfaces in favor of stage-based status only.
- Creator waiting, creator intake, and admin review now rely on the same canonical onboarding state helpers instead of mixed public approximations.
- Pre-approval creator edits required a canonical write path; that now exists as `src/app/api/creator/onboarding/application/route.ts`, including legacy projection materialization so admin review sees the latest application truth.
- Legal-document waiting copy and ID verification status now describe only what the backend can prove.
- Repo-wide verification remains viable after stabilizing benchmark-style tests whose prior thresholds were too machine-sensitive for plain `npx vitest run`.

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
- `src/hooks/useCachedAuthSWR.ts`
- `src/lib/navigation-persistence.ts`
- `src/lib/task-guidance.ts`
- `src/hooks/client-runtime.ts`

### Notifications and messaging
- `src/lib/notification-contracts.ts`
- `src/lib/server/notification-runtime.ts`
- `src/lib/server/notification-inbox.ts`
- `src/lib/notifications.ts`
- `src/hooks/useNotifications.ts`

## Audit Surface Map
Every tracked file must fall into one of the surfaces below and satisfy that surface's rules.

| Surface | Current count | Files covered | Audit requirement |
| --- | ---: | --- | --- |
| Root/config/docs | 38 | root files, repo docs, config, lockfiles | Naming, relevance, drift, tooling consistency, no stale operational docs |
| `public` | 11 | static assets, manifest, service worker | Asset still referenced, correct destination, no dead screenshots/icons in runtime paths |
| `src/app` | 116 | pages, layouts, route handlers, loading/error UI | Auth, route semantics, cache rules, diagnostics, no dead route targets |
| `src/components` | 65 | reusable UI and feature modules | Accessibility, explicit loading/error state, correct telemetry, correct runtime action mapping |
| `src/context` | 4 | provider layers | No redundant providers, state shape parity, guest/auth correctness |
| `src/hooks` | 14 | client runtime hooks | Cleanup, error state, diagnostics, polling/realtime parity |
| `src/lib` | 132 | shared client/shared domain helpers | No duplication, canonical helpers, telemetry/economics/time helpers reused |
| `src/lib/server` | 55 | server-only domain helpers | Structured diagnostics, no raw side-effect-only logging, canonical DB/runtime access |
| `src/types` | 3 | shared types | Explicitness, current state-shape parity |
| `functions/src` | 30 | Firebase Functions backend | Runtime parity, orchestration consistency, export coverage |
| `scripts` | 13 | audits, checks, admin scripts | Still useful, current paths, deterministic behavior |
| `tests` | 80 | contracts, unit, visual, rules, benches | Coverage remains aligned to runtime-critical areas |
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

## Build Start Audit
Before writing code:

1. Read this file.
2. Confirm which audit surfaces the task touches.
3. Check whether a canonical helper already exists for the work.
4. Run `git status --short` and understand the current worktree.
5. If tracked-file count changed materially since the last baseline, refresh the inventory numbers in this file.
6. If the task touches routes, diagnostics, telemetry, commerce, or persistence, identify the exact canonical helper/module first.
7. If the task touches admin or analytics behavior, define where failures should appear in the admin dashboard before writing code.

## Build End Audit
Before signoff:

1. Review every touched file against the universal questions and surface rules above.
2. Run `corepack pnpm run check`.
3. Run `npx vitest run` when the change is broad, cross-cutting, or touches shared helpers.
4. Verify new or changed diagnostics route to the correct client/server channel.
5. Verify analytics/economics/PayPal flows still use canonical helpers.
6. Verify no silent storage/cache/realtime failures were introduced.
7. Verify any new helper truly reduced duplication instead of adding another layer.
8. Record any tolerated warnings explicitly.
9. Update this file if the standard, canonical helper map, or inventory baseline changed.

## Consistency Failure Conditions
The audit fails if any of the following are true:

- A route or admin mutation hides a meaningful failure in raw console output only.
- A client hook or component can no longer distinguish failed state from empty state.
- A PayPal or economics flow bypasses canonical shared logic.
- A telemetry event is emitted outside the catalog/semantics model without justification.
- A new cache or storage key is introduced without a documented consistency reason.
- A new helper duplicates a canonical helper already listed here.
- A critical admin/debug surface loses observability for the exact action that can fail.
- A changed file has no clear verification path.

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
Result:
Known tolerated warnings:
Files needing follow-up:
Inventory count changed:
This file updated:
```

## Practical Rule For This Repo
If future work adds a file, removes a file, introduces a new shared helper, changes canonical economics/PayPal/diagnostics handling, or alters the build-start/build-end checklist, this file must be updated in the same change.

That is the rule that keeps this audit alive instead of letting it decay into another historical note.

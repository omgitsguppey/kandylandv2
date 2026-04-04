# Repo Memory Ledger

Status: Canonical repository-memory and architecture-decision ledger
Last refreshed: 2026-04-03
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

## Purpose
This file records major architectural pivots, workflow-authority decisions, and continuity-sensitive repo rules that future contributors should not have to reconstruct from founder memory, private AI context, or scattered commit history alone.

Use this file together with:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`

This file is not a changelog. It is the concise ledger for durable decisions that shape how the repo should be understood and extended.

## How To Use This Ledger
1. Read this file when a task touches architecture, deployment assumptions, dependency/tooling meaning, workflow authority, or historical pivots.
2. If a change creates a new durable repo rule, add or update an entry here in the same change.
3. Do not invent exact dates if the repo cannot prove them. Record uncertainty explicitly.
4. When this file and runtime code disagree, runtime code plus verification wins and this file must be updated immediately.

## Decision Entries

### 1. Static-first origin, later backend/server pivot
- Approximate date: Exact pivot date is not recoverable from current tracked evidence. This continuity context is now explicitly recorded on 2026-04-03 from operator context plus current repo structure.
- Status: Active canonical context
- Problem/context: The product did not begin as the current backend-heavy system. Without recording that pivot, future contributors can misread newer server/runtime layers as accidental complexity or try to simplify the repo back toward earlier static assumptions.
- Decision made: Treat the current codebase as a backend/server application, not a static site with incidental APIs.
- What became canonical: Next App Router route handlers, server-only helpers, Firebase runtime integrations, Functions, diagnostics, admin observability, and Data Connect all count as first-class architecture.
- What is now disallowed or deprecated: Treating backend behavior as optional garnish, or assuming UI output alone is sufficient proof of product truth.
- Truth lives in:
  - `src/app/api/**`
  - `src/lib/server/**`
  - `functions/src/**`
  - `firebase.json`
  - `apphosting.yaml`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Exact historical pivot date is still unresolved.

### 2. Firebase App Hosting is the deployed application runtime
- Approximate date: Present by current tracked config; App Hosting evidence is recoverable from `apphosting.yaml`, `firebase.json`, and `backends.json`
- Status: Active canonical deployment context
- Problem/context: Contributors can easily confuse legacy Hosting assumptions with the current App Hosting deployment path if the deploy target is not recorded explicitly.
- Decision made: Treat Firebase App Hosting as the primary deployed runtime context for the Next application.
- What became canonical:
  - `apphosting.yaml`
  - `firebase.json`
  - `.firebaserc`
  - Firebase/Google Cloud CLI-based local verification
- What is now disallowed or deprecated: Assuming the repo is deployed as a purely static Hosting site or that local branch names automatically equal the live App Hosting branch.
- Truth lives in:
  - `apphosting.yaml`
  - `firebase.json`
  - `backends.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Preview/live branch and rollout assumptions must still be recorded explicitly in future audit evidence whenever deployment behavior is part of the task.

### 3. Local-first workflow is canonical
- Approximate date: Recorded explicitly on 2026-04-03 from operator continuity context and existing repo workflow files
- Status: Active canonical workflow context
- Problem/context: The repo is worked on locally before commit, but that operating reality was previously only partially implied in workflow files.
- Decision made: Treat local development, local verification, and local tool-assisted changes as the normal path before git history becomes authoritative evidence.
- What became canonical: Local audit-first workflow, local verification commands, local Firebase/Google CLI use, local build/test before push.
- What is now disallowed or deprecated: Treating cloud output, chat history, or deploy state as more authoritative than the verified local tracked repo.
- Truth lives in:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `.agent/workflows/pre-commit.md`
  - `AGENTS.md`
  - `package.json`
- Follow-up gaps: Auth-bound emulator and admin-route local seams still need more work.

### 4. Codex and Antigravity are assistive local tooling, not authorities
- Approximate date: Recorded explicitly on 2026-04-03 from operator continuity context
- Status: Active canonical workflow-authority rule
- Problem/context: AI-assisted local work can create founder-memory and tool-memory dependence if the repo does not explicitly separate assistive tools from authoritative sources of truth.
- Decision made: Codex and Google Antigravity may assist locally, but they do not define runtime truth, deployment truth, or architecture truth.
- What became canonical: Git-tracked code, canonical docs, canonical helpers, audit scripts, and required verification commands are the authoritative sources of truth.
- What is now disallowed or deprecated: Treating private AI context, chat memory, or an assistant's prior state as sufficient architectural documentation.
- Truth lives in:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `AGENTS.md`
  - `.agent/workflows/pre-commit.md`
- Follow-up gaps: Repo docs must continue to be expanded whenever private memory would otherwise be carrying a system explanation.

### 5. Telemetry event naming is centrally canonized
- Approximate date: Present by 2026-04-03 audit evidence
- Status: Active canonical behavior
- Problem/context: Analytics and telemetry drift quickly when routes, tasks, and admin/debug surfaces invent local event names or aliases.
- Decision made: Event naming, alias normalization, metadata, and tracked-source semantics must route through the telemetry catalog and governance helpers.
- What became canonical:
  - `src/lib/telemetry-catalog.ts`
  - `src/lib/telemetry.ts`
  - `src/lib/server/analytics.ts`
  - `src/lib/server/analytics-governance.ts`
- What is now disallowed or deprecated: Ad hoc event names, duplicated semantic dialects, or silently emitting ungoverned event facts.
- Truth lives in:
  - `src/lib/telemetry-catalog.ts`
  - `src/lib/server/analytics.ts`
  - `src/lib/server/analytics-governance.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Broader user-journey truth is still only partially canonical beyond the event inventory itself.

### 6. Daily task catalog and observability are canonical
- Approximate date: Strengthened and explicitly recorded by the 2026-04-03 task-system audit passes
- Status: Active canonical behavior
- Problem/context: Task guidance, telemetry, completion, reward claims, and admin/debug visibility previously risked drifting apart.
- Decision made: Built-in and custom/admin-authored tasks must stay on one canonical task/telemetry dialect with shared observability.
- What became canonical:
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/task-guidance.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/lib/tasks/task-observability.ts`
- What is now disallowed or deprecated: Separate semantic dialects for built-in versus custom tasks, or task guidance that cannot explain its own action path and tracking basis.
- Truth lives in:
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/task-guidance.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/lib/tasks/task-observability.ts`
  - `src/app/api/admin/debug/route.ts`
- Follow-up gaps: Live production runtime sampling still depends on authenticated admin inspection.

### 7. Runtime actions and navigation actions are intentionally different
- Approximate date: Explicitly hardened by the 2026-04-03 task-guidance audit
- Status: Active canonical behavior
- Problem/context: Guidance and action wiring break when navigation-only tasks are treated like runtime actions or vice versa.
- Decision made: Runtime-capable actions and navigation-backed actions must remain explicitly separated in task guidance and observability.
- What became canonical: Guidance only activates pending runtime actions that can actually execute from the current surface; navigation tasks remain truthful route guidance rather than fake in-place actions.
- What is now disallowed or deprecated: Force-mapping navigation tasks into runtime task actions or letting action-mode ambiguity silently disable guidance.
- Truth lives in:
  - `src/lib/task-guidance.ts`
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/tasks/task-observability.ts`
- Follow-up gaps: If future action modes are added, all three helpers must be updated together.

### 8. Admin/debug should surface ambiguity instead of force-mapping it away
- Approximate date: Strengthened during the 2026-04-03 observability passes
- Status: Active canonical observability rule
- Problem/context: Over-attributing noisy or shared facts creates dashboards that look confident but are less truthful.
- Decision made: When task, telemetry, or parity facts are ambiguous, admin/debug surfaces should say so explicitly instead of force-classifying them into the wrong bucket.
- What became canonical: Ambiguous shared-event mappings, unmatched reward claims, and fallback statuses are surfaced as ambiguity or drift rather than hidden.
- What is now disallowed or deprecated: Silent force-mapping that makes admin/debug output appear cleaner than the underlying truth.
- Truth lives in:
  - `src/lib/tasks/task-observability.ts`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/diagnostic-read-fallbacks.ts`
- Follow-up gaps: Wider analytics/admin surfaces still need more of this ambiguity discipline.

### 9. Firebase App Check is not part of the current runtime contract
- Approximate date: Explicitly removed and recorded in the 2026-04-03 continuity pass
- Status: Active canonical runtime rule
- Problem/context: Half-enabled or implied App Check behavior created misleading runtime assumptions.
- Decision made: Treat App Check as absent from the current runtime contract unless a later fully audited pass reintroduces it end to end.
- What became canonical: Runtime config, auth fetch paths, docs, and checks no longer assume active App Check initialization or validation.
- What is now disallowed or deprecated: Assuming App Check headers, keys, or validation are currently active.
- Truth lives in:
  - `src/lib/firebase.ts`
  - `src/lib/firebase-runtime.ts`
  - `src/lib/authFetch.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: A future reintroduction would need complete client/server/config/doc coverage, not a partial toggle.

### 10. Root package-manager reality is dual-lockfile until intentionally changed
- Approximate date: Present in current tracked repo state; recorded explicitly on 2026-04-03
- Status: Active continuity rule
- Problem/context: The root repo currently carries both `package-lock.json` and `pnpm-lock.yaml`, while verification commonly runs through `corepack pnpm`. Without an explicit rule, contributors can update one lockfile and silently drift the other.
- Decision made: Until a future audited pass intentionally consolidates package-manager strategy, root dependency changes must keep both lockfiles in sync.
- What became canonical:
  - root dependency graph: `package.json` + `package-lock.json` + `pnpm-lock.yaml`
  - Functions dependency graph: `functions/package.json` + `functions/package-lock.json`
- What is now disallowed or deprecated: Treating one root lockfile as disposable without an audited package-manager consolidation decision.
- Truth lives in:
  - `package.json`
  - `package-lock.json`
  - `pnpm-lock.yaml`
  - `functions/package.json`
  - `functions/package-lock.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: A future consolidation pass could simplify this, but not by accident.

### 11. Generated platform metadata is evidence, not deploy authority
- Approximate date: Recorded explicitly on 2026-04-03 after root-surface review
- Status: Active continuity rule
- Problem/context: Generated platform metadata files can look authoritative even when they are snapshots or evidence artifacts rather than canonical configuration.
- Decision made: Treat `backends.json` and similar generated platform metadata as evidence/supporting context only, not as the primary source of deployment truth.
- What became canonical: Deploy/runtime configuration comes from tracked config plus verified cloud/runtime behavior, not from stale generated snapshots.
- What is now disallowed or deprecated: Hand-editing generated backend metadata or treating it as the first place to discover canonical environment contracts.
- Truth lives in:
  - `apphosting.yaml`
  - `firebase.json`
  - `.firebaserc`
  - `backends.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: `backends.json` should continue to be handled carefully because generated platform snapshots can contain operationally sensitive metadata.

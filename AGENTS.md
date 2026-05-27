# Agent Instructions

## Doctrine Hierarchy Fast Path

Do not read every Markdown file by default. Load doctrine in this order:

1. Run or read `agent/context/optimized-task-context.generated.json` from `npm run optimize:doctrine-context -- --task "<task>" --changed <path>`.
2. `agent/context/doctrine-registry.json`
3. Task-specific records from `agent/context/doctrine-cards.jsonl`
4. The relevant canonical surface doc under `docs/doctrine/surfaces/`
5. Full Markdown source docs only when compact context leaves uncertainty

Doctrine retrieval is an optimization problem. Agents must load the smallest sufficient context pack based on changed files, task intent, risk, authority, conflicts, legacy warnings, and validator coverage. Full Markdown is fallback evidence, not the default context source.

## Current Operator Doctrine

Current Phase 1 operator doctrine lives at `docs/agent-truth/current-operator-doctrine.md` and wins over older stale docs when they conflict. Future agents must close full source-to-UI loops instead of backend-only or UI-only patches, trace existing measurement paths before adding metrics/events/snapshots, demote stale generated reports to evidence unless fresh and explicitly consumed, and keep missing data distinct from zero. Release-note-only commits must use `[skip release-notes]` and must not create another Beta badge commit. GitHub hosted-runner billing lock is external infrastructure status, not app failure; Firebase App Hosting rollout status and local validators are separate.

## Surface Doctrine Routing

Before editing UI, copy, telemetry, state, admin truth, or server/backend truth, read `agent/context/surface-doctrine-map.json` and `docs/doctrine/03-surface-hierarchy.md`. Resolve exactly one primary surface first, then load the matching doctrine:

- User UI: `docs/doctrine/surfaces/user-ui-doctrine.md`
- Creator UI: `docs/doctrine/surfaces/creator-ui-doctrine.md`
- Admin UI: `docs/doctrine/surfaces/admin-ui-doctrine.md`
- Server Truth: `docs/doctrine/surfaces/server-truth-doctrine.md`
- Shared Brand Primitives: `docs/doctrine/surfaces/shared-brand-primitives.md`

Conflict rules:

- Server truth beats all UI doctrine for data, security, payment, unlock, entitlement, support permission, moderation evidence, and creator monetization.
- Admin UI doctrine beats User UI doctrine inside `src/app/admin/**`.
- Creator UI doctrine beats User UI doctrine inside creator dashboard/tools.
- User UI doctrine beats Admin density rules on public and user-facing surfaces.
- Shared brand primitives apply everywhere unless a surface doctrine overrides density or state presentation.

Operational rule: do not apply admin density to user surfaces, do not apply user conversion copy to admin diagnostics, and do not let client UI state define server truth.

Canonical authority order:

1. Product Constitution: `docs/doctrine/00-product-constitution.md`
2. Source-of-Truth Constitution: `docs/doctrine/01-source-of-truth-constitution.md`
3. Engineering Constitution: `docs/doctrine/02-engineering-constitution.md`
4. Surface Doctrine Cards: `docs/doctrine/surfaces/*.md`
5. Runbooks and ADRs
6. Generated reports as snapshots, not doctrine
7. Legacy docs with `supersededBy`, `reviewBy`, and `removeBy`

Generated reports are evidence snapshots only. `agent/state/*.generated.json`, `agent/index/*.json`, and generated `agent/context/*.json` must never override doctrine or runtime business truth, and they become stale after 24 hours unless an explicit contract says otherwise. Runtime `src/app`, `src/components`, and `src/lib/server` business logic must not import or read them. Use `npm run check:generated-report-authority` when this boundary changes.

Command budget doctrine:

This command budget is mandatory for doctrine and governance work.

- Start with affected-file planning and compact context.
- Use `npm run optimize:doctrine-context -- --task "<task>" --changed <path>` as the first doctrine read path for new agent tasks.
- Use `npm run score:doctrine` and `npm run check:doctrine` for doctrine hierarchy work.
- Use `npm run check:surface-doctrine-split` when changing surface hierarchy, UI doctrine, server truth doctrine, or the path-to-surface map.
- Use `npm run check:doctrine-retrieval-optimizer` when changing doctrine retrieval, compact context selection, or optimizer scoring.
- Use `npm run typecheck` when TypeScript changed.
- Do not run Playwright, Lighthouse, Cypress, deploys, or full `npm run check` by default.

Public beta release notes doctrine:

KandyDrops Beta release notes are user-facing and track accepted public beta releases, not raw commits. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses odometer format `1.<block>.<release>`, where each accepted public beta release increments one counter by exactly 1. The legacy visible version `1.113.4` migrated to `betaReleaseCounter = 201`, which displays as `1.2.1`, and the first accepted public beta release after migration increments to `1.2.2`. Public notes may group multiple commits into one accepted public beta release. Changelog copy must explain what changed for users, not dump technical commit noise.

- Read `docs/agent-truth/public-beta-release-notes.md` before changing release-note automation or the Beta badge.
- Run `npm run release:notes` to normalize bundled/public release-note artifacts.
- Run `npm run release:notes:accept` when a new accepted public beta release should be published.
- Run `npm run check:release-notes` and targeted release-note tests for this lane.
- Do not run Playwright, Lighthouse, Cypress, or full `npm run check` for this lane by default.

Global cost surface doctrine:

KandyDrops cost guardrails cover runtime telemetry, PostHog/GA/session replay, cloud logging, debug evidence, media/storage/image access, auth abuse, notification fan-out, CI/build minutes, visual/browser audit tooling, scheduled rebuilds, analytics materializers, dependency tooling, and admin import/export jobs. Read `src/lib/server/global-cost-surface-contract.ts` and `docs/agent-truth/global-cost-surfaces.md` before changing those surfaces.

- Run `npm run score:global-cost` and `npm run check:global-cost` for global cost guardrail changes.
- Run `npm run typecheck` when TypeScript changed.
- Do not run Playwright, Lighthouse, Cypress, full `npm run check`, deploy commands, `gcloud`, Firebase deploys, or paid AI calls for this lane by default.

Config, rules, environment, CI, and deployment rules:

- Do not treat passing source tests as deployment readiness. Deployment readiness requires current-head score artifacts, release notes, env contract validation, security/rules validation, PR hygiene, rollback status, and explicit operator evidence classification.
- Do not add package scripts, validators, or generated artifacts without checking for existing scripts that already own the same lane. Consolidate aliases and retire stale scripts instead of growing the command surface.
- Every config or deployment change must declare owner, environment, expected command, safety class, cost class, and rollback behavior. Missing env vars, stale release artifacts, or unclassified open PRs must block release readiness.
- Never touch payment runtime, GumDrop math, provider callbacks, Firebase/security rules, middleware, or deployment configs casually. Any change in those lanes requires targeted validators and release note classification.
- Before editing config, deployment, env, CI, package scripts, middleware, Firebase rules, or dependency tooling, classify the lane and read existing policy. Do not add a new check, workflow, or validator if an existing script owns the same exit gate.
- Config and deployment changes are release-risk changes. They require env contract, security/rules classification, cost class, rollback behavior, and current-head score/release packet refresh.
- Dependency PRs are not cleanup. Treat them as a separate dependency window unless security-required. Never merge broad dependency bundles as part of beta-exit hardening.
- Generated artifacts must be compact by default. Do not store thousands of static lines when a summary and drilldown can be derived.

> [!CAUTION]
> **MANDATORY CONTROL TOWER ROUTING:**
> Before touching UI, copy, telemetry, state, admin truth, or Firebase architecture, you MUST start with /control-tower/00-START-HERE.md.
> Do not bypass the control tower execution order.

> [!CAUTION]
> **STRICT DOCTRINE ENFORCEMENT:**
> NO UI, copy, or product-facing adjustment is permitted without first consulting the doctrine files in /docs/doctrine/.
> You are explicitly forbidden from freestyling, guessing, or making improvisational "improvements" to the UI or copy.
> 
> **MANDATORY PRE-REQUISITE:**
> Before modifying any user-facing code, you MUST execute the doctrine-consultation.md skill and follow the ui-copy-refinement-workflow.md located in the /.agent/ directory.
> 
> **CONFLICT RESOLUTION:**
> If the doctrine conflicts with your local LLM intuition or generic "best practices," **THE DOCTRINE WINS.** If the doctrine is insufficient, you must intentionally update the doctrine first before implementing the change.
> 
> **HOLISTIC ENGINEERING:**
> Every touched feature must account for UI, State, Telemetry, and Audit paths.
## Truth Order

Use this authority order for every task:

1. Verified runtime code
2. Verified configuration
3. Verified command output
4. `FULL_SCALE_CODEBASE_AUDIT.md`
5. `REPO_MEMORY_LEDGER.md`
6. `EVERY_FILE_FUNCTION_CHECKLIST.md`
7. `AGENTS.md` and local workflow notes
8. Prior chat context

Repo truth outranks chat, memory, generated agent artifacts, and the SQL/Data Connect mirror.

## Default Startup

For broad work, shared helpers, repo tooling, governance, package/lockfile changes, or multi-surface edits, do this before implementation:

1. Read `FULL_SCALE_CODEBASE_AUDIT.md`.
2. Read `REPO_MEMORY_LEDGER.md`.
3. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`.
4. Run `git status --short`.
5. Identify touched surfaces and canonical helpers.
6. Run `npm run trace:adjacent -- <path>` for the main touched files.
7. Pre-log the pass at the top of `FULL_SCALE_CODEBASE_AUDIT.md`.

For narrow work, use the generated agent context first and only escalate to full governance reads if the task is broad, shared-helper heavy, or continuity-sensitive.

## Open Bot PR Triage

Open bot PRs must be cherry-picked by current-source relevance. Duplicate Bolt/Jules branches should not be merged wholesale. Public beta fixes prioritize current source-of-truth, no UI regression, and targeted validation over broad stale branch merges.

## Device Layout Contract

Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units. Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation. KandyDrops agents must use `src/lib/device-layout-contract.ts`, `src/lib/user-mobile-shell.ts`, and `npm run check:device-layout-contract`, not freestyle layout physics.

## Device Layout Score

KandyDrops layout scoring is deterministic. It detects violations of Google-style structure and Apple-style cohesion using hardcoded file/path/pattern rules. It can auto-fix exact safe token/string replacements only. It must escalate anything involving payments, auth, locked content exposure, keyboard runtime behavior, visual judgment, or product intent.

## Device UI Dry Audit

Device UI dry auditing is a deterministic source-level prediction system. It does not replace screenshots, but it catches known KandyDrops device physics violations before runtime: safe areas, bottom nav, top nav, chat focus, modal density, preview CTA placement, drop grid behavior, image loading, touch targets, and debug truth markers. Agents must run `npm run score:device-ui` and `npm run check:device-ui` before broad browser audits.

## Hydration Performance

KandyDrops hydration uses staged priority lanes. Critical shell and first actions hydrate first. Telemetry/session/privacy truth remains connected. Diagnostics, overlays, bridges, cookie UI, bug reports, onboarding helpers, notification runtime, and PWA enhancement load after paint or idle unless required by the current interaction. No public-beta performance fix may disconnect tracking, privacy consent, parity truth, or source-of-truth debug surfaces.

## Sitewide Image Loading

KandyDrops image loading is surface-based. Above-fold LCP images are eager/preloaded sparingly. Grids, rails, libraries, and below-fold images are lazy. All fill images require accurate sizes. Locked previews never render internal content thumbnails before unlock. Image loading blur and product-state blur are separate truths.

## Watch Time Truth

Watch time is foreground visible content engagement, not page duration. KandyDrops counts only active, visible, or playing viewer intervals, excludes hidden and idle time, scores image and video sessions differently, labels legacy page-duration fallbacks, and feeds behavioral intelligence from watch-session rollups before page duration.

## Ast-Grep Source Rules

KandyDrops ast-grep rules are deterministic source guardrails. They catch forbidden shell, safe-area, preview content-protection, diagnostics, timer, and breakpoint patterns from source files without replacing targeted tests or broad runtime validation. Use `npm run check:ast-grep-rules` before broad browser audits.

## Component Test Doctrine

KandyDrops component tests verify behavior and state truth, not screenshots. Fast UI tests should use shared auth/profile/drop states, exercise real component affordances where practical, and preserve telemetry/source-of-truth contracts without changing product behavior.

## MSW Test Scenarios

KandyDrops MSW scenarios are deterministic API fixtures, not production fallback state. They model wallet, Drops, chat, notifications, support, and creator profile user-side states without Firebase, browser automation, or live network access.

## GumDrop Source-Of-Funds

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments. Wallet UI may display total delivered package value, but backend source-of-funds truth must preserve paid vs reward source correctly.

## Wallet Modal Density

The wallet modal uses compact public-beta density. Package cards show total delivered GumDrops, package label, price, and purple bonus chip only. The visible paid/bonus explanatory subcopy is removed to reduce vertical sprawl. The balance chip shows source-aware free GD and paid GD. Backend source-of-funds accounting and telemetry remain unchanged.

## Public Beta Score

KandyDrops public beta scoring is deterministic and mathematical. It exists to reduce terminal audit sprawl. Agents must use score:beta/check:beta-score and targeted tests first. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime visual verification.

## Codebase Hardening Score

KandyDrops hardening is deterministic first. Agents must score and target the affected domain before broad verification. No full-suite terminal marathons by default. The repo must protect cost surfaces, source-of-truth layers, privacy/telemetry, payments, locked content, chat/support reliability, image/device performance, and legacy cleanup without rewriting stable business logic.

## Speed Security Hardening

KandyDrops speed and security hardening is deterministic. Public/stable surfaces should cache intentionally. User/payment/support/chat/security surfaces stay no-store where needed. Every API route must declare auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failure codes. Firebase rules remain default deny with explicit owner/admin access. App Check is staged from monitor to enforcement. Heavy browser audits are forbidden by default.

## Backend Consolidation Rules

Routes must be thin and route business work into canonical service, math, normalizer, ledger, telemetry, and debug owner modules. Business math must not live in route handlers when a canonical math/service owner exists. New backend route/helper work requires a backend route inventory entry with canonical owner, source truth, cost class, telemetry path, debug lane, and validator. New service work requires an owner system and cost class. Admin/debug backend output must be summary-first, with raw detail only behind explicit paged drilldown. Generated artifacts should be compact summaries by default; full detail belongs behind drilldown or derived at runtime. Every prompt must end by searching for duplicate/stale/orphaned logic in the touched backend domain and updating Codex memory with mistakes found.

Required backend memory lessons:
- Do not add a parallel subsystem when an existing registry/resolver/debug lane already owns the same truth.
- Generated artifacts should be compact summaries by default; full detail belongs behind drilldown or derived at runtime.
- Every new backend route/helper must declare canonical owner, source truth, cost class, telemetry path, debug lane, and validator.
- Every prompt must end by searching for duplicate/stale/orphaned logic in the touched domain.
- A passing terminal run is not enough if source truth, debug, score, release artifacts, and memory are stale.
- Never hardcode gap counts or score-impact values to zero when computed gaps exist.
- Do not use source-only evidence as provider/runtime/admin proof.
- Cost savings must reduce duplicate work, retries, reads, writes, or exports without reducing canonical fact accuracy.

## Frontend Consolidation Rules

Components must stay thin: render canonical state, call canonical hooks/services, and avoid owning business math, permission truth, telemetry pipelines, route truth, or backend rules inline. Do not solve frontend parity by adding another wrapper/hook when an existing surface state, telemetry, or role resolver already owns the behavior. Route components through canonical hooks/resolvers, keep UI components thin, and end every frontend task by searching duplicate state/hook/telemetry logic. Loading, empty, and error states must preserve source and degraded/failure explanations instead of hiding permanent failures behind skeletons. Browser APIs must be guarded, realtime/listener effects must clean up, high-frequency telemetry must be summarized or throttled, and mobile density must use the device layout contract instead of ad hoc viewport checks.

Required frontend memory lesson:
- Do not solve frontend parity by adding another wrapper/hook when an existing surface state, telemetry, or role resolver already owns the behavior.
- Repeated component-level logic creates inconsistent UI states, hydration races, and telemetry duplication.
- Route components through canonical hooks/resolvers, keep UI components thin, and end every frontend task by searching duplicate state/hook/telemetry logic.
- Do not add parallel local state managers, direct trackEvent payload sprawl, or per-component business math.
- Use `check:frontend-component-consolidation` as the preventing validator for frontend consolidation passes.

## Debug Evidence Pipeline

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows.

## Admin Debug Control Tower

Admin Debug v2 is the mobile-first Control Tower. It surfaces generated public-beta reports, live debug evidence, stale/missing state truth, cost/security/device/telemetry/economy/watch-time/support findings, and deterministic next actions. Missing or stale data must never be shown as healthy. Heavy raw JSON stays collapsed. Existing ops health and creator lane parity remain visible, but they no longer define the whole debug truth.

## Phase 1 Debug-First Stabilization

Phase 1 fixes must work from one Debug Control Tower/admin-evidence issue at a time. No broad fixes, unrelated refactors, or cleanup sweeps are canonical in Phase 1 unless a specific selected debug issue demands them.

Every prompt or fix must include:
- `selectedIssueIdOrFingerprint`
- `affectedSurface`
- `expectedUserImpact`
- `filesAllowed`
- `filesForbidden`
- `validatorToRun`
- `releaseNoteImpact`
- `rollbackNote`

KreditFlow by iKandy is Phase 2 only. Advocacy and referral economy work is Phase 3 only, after KreditFlow and current experience loops are stable.

## Admin Moderation Real Risk

KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed. Screenshot-like events are weak heuristic context unless confirmed by a real platform/server source. Moderation decisions are based on evidence-weighted scrape-risk scoring: entitlement failures, abnormal asset requests, viewer velocity, watch-time mismatch, repeated behavior, and server-backed content-protection events. Weak visibility/blur events alone do not justify action.

## Experiences DailyCheckIn Variant

DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.

## Drop Cover Visibility

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar.

## Featured Drop Polish

Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling. Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views. Drop grid view counts remain unchanged. All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected. Video file chips use a 🎥 camera indicator for clarity.

## Locked Drop Preview

Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping.

## Mobile Chat Stable Viewport

The chat route bypasses normal page bottom reservation and owns its own stable mobile viewport shell. Chat list and thread views must remain anchored below the navbar across browser, standalone PWA, keyboard focus, and blur. Composer height must be compact and bottom-nav-safe. Diagnostics must not block tap/focus paths.

## Repo Intelligence Fabric

Use `/agent/` as the default low-token machine-readable context layer:

- `agent/index/*.json`: repo inventory, surface map, canonical helpers, verification commands, package-manager truth, workflow guidance, governance truth, pitfalls, recent passes, observability, dependency summary, blast radius, retrieval index
- `agent/index/ui-surface-coverage.json`: concrete UI surface registry, coverage ownership, hydration mode, runtime canary state, and blocking audit eligibility
- `agent/state/task-context.generated.json`: deterministic task-context pack
- `agent/prompts/task-prompt.short.md`
- `agent/prompts/task-prompt.standard.md`
- `agent/prompts/task-prompt.deep.md`

`/.agent/` remains workflow tooling and local automation notes. It is not the machine-readable repo memory layer.

## Core Commands

Build local indexes:

```bash
npm run agent:index
```

Build the UI surface registry only:

```bash
npm run agent:ui-index
```

Build and sync the derived SQL/Data Connect mirror:

```bash
npm run agent:sync-sql
```

Full refresh:

```bash
npm run agent:refresh
```

Build a task context pack:

```bash
npm run agent:task-context -- --task="tighten admin ai runtime health" --mode=admin --file=src/app/admin/ai/page.tsx
```

Run the agent fast-start wrapper:

```bash
npm run agent:fast-start -- --task="tighten admin ai runtime health" --mode=admin --file=src/app/admin/ai/page.tsx
```

Resolve verification lanes for specific touched files:

```bash
npm run agent:verify -- --paths=src/app/admin/debug/page.tsx,scripts/agent/build-task-context.ts
```

Run the self-check:

```bash
npm run check:agent-context
```

Run the eval harness:

```bash
npm run eval:agent-context
```

Avoid giant freeform prompting when a generated task context pack already exists.

## Agent Fast Path

For narrow and moderate implementation work, prefer this startup sequence before reading large governance artifacts:

1. `git status --short`
2. `npm run agent:fast-start -- --task="<task>" --mode=<mode> --file=<entrypoint>`
3. Review `agent/state/task-context.generated.json`
4. Review `agent/state/verification-plan.generated.json`
5. Use the fast verification lane during iteration
6. Run the signoff lane only when the patch is ready for completion

The fast-start wrapper is the canonical shortcut for:

- current git status
- generated task-context
- adjacency tracing for the declared entrypoints
- deterministic fast vs signoff verification selection from `agent/index/verification-commands.json`
- an issue-style prompt scaffold in `agent/prompts/task-issue-spec.generated.md`

Do not default to `npm run check`, `npm run check:continuity`, or UI audits as the first edit-loop command unless the selector classified the work as broad or signoff-only.

## Issue-Style Task Spec

When handing work to any coding agent, structure the request like a GitHub issue:

- Goal
- Acceptance criteria
- Likely touched files or entrypoints
- Forbidden surfaces
- Exact fast verification lane
- Exact signoff verification lane

Prefer generated prompts over freeform prose when possible:

- `agent/prompts/task-prompt.short.md`
- `agent/prompts/task-prompt.standard.md`
- `agent/prompts/task-prompt.deep.md`
- `agent/prompts/task-issue-spec.generated.md`

## Governance Read Rules

Read the three governance files fully when:

- work is broad
- work touches repo tooling, governance, package/lockfile state, or shared helpers
- the generated context pack marks broad startup protocol as required

Use selective consultation when:

- the task is narrow and local
- `/agent/index/*` already identifies the relevant surfaces, helpers, pitfalls, and checks

Historical evidence docs are selective only. Do not over-read them for narrow tasks.

## Verification And Cleanup

Use existing repo lanes as required by the touched surface:

- `npm run check:architecture`
- `npm run check:inventory`
- `npm run trace:adjacent -- <path>`
- `npm run check:ui:audits`
- `npm run check:ui:coverage`
- `npm run check:ui:runtime`
- `npm run check:ui:continuity`
- `npm run check:ui:lighthouse`
- `npm run check:firebase:rules`
- `npm run check:continuity`
- `npm run check:agent-context`
- `npm --prefix functions run check`

Rules:

- Google/Firebase/Storage/GA/AI/SQL cost-bearing changes require `npm run score:google-cost` and `npm run check:google-cost`. Google cost-bearing surfaces must be declared before use. Firestore, Storage, Google Analytics Data API, Vertex AI, Cloud Run/App Hosting, and any SQL/Data Connect runtime must have route-level cost contracts, budget guards, bounded rate limits, cache policies, and debug evidence. The app must fail audits before it surprises billing.
- Whole-codebase hardening or multi-domain cleanup must run `npm run score:hardening` and `npm run check:hardening` first. Use `npm run repair:hardening` only for dry-run exact safe repairs unless explicitly applying a high-confidence plan.
- Device-level UI and shell changes should run `npm run score:device-ui` and `npm run check:device-ui` before broad browser audits. This deterministic lane predicts known mobile/PWA/tablet/desktop risks from source tokens, component structure, and debug truth markers.
- Fast-loop verification should stay targeted. Use `npm run agent:test -- <path>` before broad repo sweeps when the work is narrow.
- Broad signoff checks should remain separate from the implementation loop. `check:continuity`, UI audits, scheduler/runtime continuity, and Firebase rules are signoff lanes unless the touched surface explicitly requires them during iteration.
- UI/admin UI changes require `npm run check:ui:coverage`, `npm run check:ui:runtime`, and `npm run check:ui:audits`.
- Missing coverage for a blocking UI surface is a signoff failure.
- Broad UI work must use `agent/index/ui-surface-coverage.json` instead of ad hoc prompting or hand-maintained target lists.
- Performance-sensitive UI changes require `npm run check:ui:lighthouse`.
- Firebase rules or emulator-sensitive changes require `npm run check:firebase:rules`.
- Functions runtime or manifest changes require `npm --prefix functions run check`.
- Broad work must update `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and `EVERY_FILE_FUNCTION_CHECKLIST.md` before signoff.

Clean generated noise before completion:

- `output/dependency-graph.json` if created only for local evidence
- `.next`
- `playwright-report`
- `test-results`
- `lighthouse-results`
- `build.log`
- emulator logs

## Data Connect Mirror

The Data Connect / SQL mirror is a derived retrieval plane over generated local truth. It never outranks repo truth, verified code, or verified configuration. If the mirror is stale or unavailable, use `/agent/index/*` and regenerate locally.

Classify `dataconnect/dataconnect.yaml`, `dataconnect/schema/*.gql`, `dataconnect/example/*`, `scripts/agent/sync-sql.ts`, `agent/state/sql-sync.payload.generated.json`, and `agent/state/sql-mirror-status.generated.json` as `sql_dataconnect_agent_context_mirror`. The config targets Cloud SQL instance `kandydrops-db` and PostgreSQL database `kandydrops_db` in `us-central1`; provider billing state is not proven from source. This surface is allowed only for agent/repo intelligence mirror use and is forbidden for user/payment/Drop/chat/support/creator runtime flows unless an explicit SQL/Data Connect `ApiCostContract` approves the route. `agent:sync-sql` must not run automatically during user-facing builds or deploys.

## Cloud Run, SQL, BigQuery Guardrails

KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted. Cloud Run max instances and concurrency must protect Cloud SQL and AI surfaces. BigQuery exports/imports must be validated, documented, and blocked from mutating runtime balances/transactions unless an explicit dry-run/idempotent import contract exists.

Use `npm run score:cloud-cost` and `npm run check:cloud-cost` for this deterministic lane. Do not run `gcloud`, `firebase deploy`, BigQuery jobs, Data Connect deploys, Playwright, Lighthouse, Cypress, or full `npm run check` for this source-only guardrail unless a human explicitly promotes the task.

## Codex Cloud Auth Readiness

Codex must verify authentication before attempting cloud or billing checks. Repo/code changes are native, but Google Cloud, Firebase Console, PayPal, GitHub settings, and secrets require existing CLI/API auth or a configured GitHub Actions Workload Identity Federation path. Read-only checks are allowed after auth verification. Mutations require explicit instruction.

Use `npm run check:codex-auth` to write `agent/state/codex-auth-readiness.generated.json`, `npm run plan:cloud-auth-bootstrap` to print the Workload Identity Federation bootstrap plan, and `npm run check:codex-auth-readiness` to validate the readiness lane. The manual-only `.github/workflows/cloud-readiness-smoke.yml` workflow may run read-only cloud checks only after WIF repo variables are configured.

## Git Push

Remote repo: `https://github.com/omgitsguppey/kandylandv2.git`

Setup if needed:

```bash
git remote add origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

If origin already exists but needs auth:

```bash
git remote set-url origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

This repo's default branch is `main`. If the local branch is `work`, push with:

```bash
git push origin work:main
```

## Phase 1 Final Cleanup Lane

For the final cleanup, normalization, speed, telemetry, cost, and parity pass, run targeted commands only:

- `npm run scan:codebase-junk`
- `npm run check:beta-versioning-final`
- `npm run check:phase-one-final-cleanup`
- `npm run typecheck` when TypeScript changed

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, deploy commands, `gcloud`, or Firebase deploys for this lane by default.

## Legacy Code Handling & Classification
All monolithic paths or legacy pipelines must be explicitly modeled.
- **Active Canonical**: Core pathways verified to standard.
- **Legacy Adapter**: Wrapped legacy code deemed too risky to rewrite wholesale.
- **Deprecated**: Code designated for removal; must produce a system warning if hit.
- **Dead/Deleted**: No ghost code. If safe to delete, delete it.
When adapter-wrapping, write explicit migration notes. Do not duplicate pure source-of-truth.

## Regression Gate Requirements
A feature is NOT complete until all 4 core components are structurally safe:
1. **UI Layer**: Hydration safe, A11y aligned.
2. **Source State Layer**: No stale async overwrites, explicitly marked hot vs. cold.
3. **Telemetry Layer**: Canonical events bind sequentially; no direct isolated side paths.
4. **Admin/Audit Layer**: UI updates visibly feed reporting dashboards truthfully.

**Violations**: No silent catch blocks. No fake \"pass\" states. No hidden fallbacks without visual source-state labels. No detached feature code bypassing canonical hydration.
**Fan Pass GumDrops Rule**: Fan Pass is a paid-source GumDrops subscription. Daily/task/reward GumDrops cannot start or renew Fan Pass; paid package bonus GumDrops count only when wallet capture credited them into purchased balance. Expected Fan Pass failures must return typed safe errors, never generic internal server errors.
**Creator Booking Error Rule**: Expected Live Time booking failures (availability missing/outside window, slot conflict, disabled bookings, unavailable creator, paid-GD shortfall, invalid request, unauthorized) must return typed safe codes and human-readable client copy. Only unexpected route failures may surface as internal server errors.
**Wallet Single PayPal Button Rule**: Wallet v1 renders one PayPal checkout button on-page. KandyDrops does not CSS-hide PayPal iframes or buttons. Funding-source visibility is controlled through PayPal SDK configuration or PayPalButtons fundingSource. PayPal may still offer eligible funding methods after buyer enters PayPal; KandyDrops only controls the on-page button stack.

## File Size & Module Discipline (Mandatory)
Massive monolithic un-maintainable files are forbidden. 
- **View/UI Files**: < 300 lines limit. 
- **Orchestration/Hook Pages**: < 500 lines limit.
- **Decomposition Target Breakdown**: Always isolate logic into View components, State hooks, Telemetry/Diagnostic helpers, and Type definitions. 

## Admin Truth UI Rules (SEO, A11y, Perf)
Operational admin dashboards must explicitly convey exact data source states.
Labels must be explicit: [live], [cached], [stale], [fallback], [partial], [failed], [unknown]. 
If a check fails or lacks canonical telemetry hooks, the admin UI must strictly fail—NO fake fallback \"green/healthy\" blocks.

## A/B Testing Readiness & Safety
Anticipate structural iteration, but do it safely.
- Code must securely centralize feature flags.
- **DO NOT** scatter if (featureA) everywhere loosely. 
- Exposure logging must seamlessly inject into Canonical Telemetry patterns.
- **SAFE SURFACES**: CTA emphasis, visual merchandising, spotlight layouts, hero copy, onboarding flow text.
- **STRICTLY UNSAFE SURFACES**: Wallet state, PayPal integrations, economy operations, Auth session logic.

## Mobile Guest Home Hero Shell
The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate.

## Type Schema DTO Contract Rules
Before adding a new interface, DTO, schema, or contract, search for an existing canonical type. Do not create another shape for the same concept unless replacing the old one and updating imports.
Every shared domain object must have one canonical owner. User, creator, GumDrop, wallet, entitlement, event envelope, debug finding, release evidence, and analytics metric shapes should not be redefined inside random components, routes, tests, or validators.
Generated report schemas must be compact and typed through canonical contracts. Do not create massive generated JSON shapes that drift from source types.
If a validator needs a shape, import or derive the canonical type instead of copy-pasting a near-duplicate test-only interface.
End every type/schema pass by searching for duplicate interface/type names, local DTOs, stale aliases, and unsafe_unknown schema drift.

## AI Governance & Workflow Execution
Antigravity must behave like a disciplined senior engineer. 
**Cycle**: Inspect architecture -> Identify precise owners -> Patch -> Verify Parity -> Verify Regression Safety -> Report.
Guessing logic, injecting blind patches, declaring success without check protocols, or modifying uninvestigated architecture is prohibited. 



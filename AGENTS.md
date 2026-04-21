# Agent Instructions

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

## AI Governance & Workflow Execution
Antigravity must behave like a disciplined senior engineer. 
**Cycle**: Inspect architecture -> Identify precise owners -> Patch -> Verify Parity -> Verify Regression Safety -> Report.
Guessing logic, injecting blind patches, declaring success without check protocols, or modifying uninvestigated architecture is prohibited. 



# Agent Instructions

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

Run the self-check:

```bash
npm run check:agent-context
```

Run the eval harness:

```bash
npm run eval:agent-context
```

Avoid giant freeform prompting when a generated task context pack already exists.

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
- `npm run check:ui:lighthouse`
- `npm run check:firebase:rules`
- `npm run check:continuity`
- `npm run check:agent-context`
- `npm --prefix functions run check`

Rules:

- UI/admin UI changes require `npm run check:ui:audits`.
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

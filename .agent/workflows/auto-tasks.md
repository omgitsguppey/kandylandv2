---
description: "Select the smallest valid KandyDrops verification path."
---

# Task Command Menu

This is a menu, not authority to run every command. Start source-first and promote browser, provider, GitHub, deployment, or full-repository work only when the task, selector, current doctrine, or human operator requires it.

## Start every task

1. Preserve the current worktree:
   `git status --short`

2. Build compact context and a verification plan:
   `npm run agent:fast-start -- --task "<task>" --mode=<mode> --file=<path>`

   If compact context is the only need, use:
   `npm run optimize:doctrine-context -- --task "<task>" --changed <path>`

3. Resolve the selected verification lanes:
   `npm run agent:verify -- --paths=<path1,path2>`

4. Search the affected owner and its callers before adding a second implementation:
   `rg "<symbol-or-contract>" src scripts tests --glob "!node_modules/**" --glob "!.next/**"`

## Verify the changed slice

- TypeScript or shared tooling:
  `npm run typecheck`

- Lint when the touched lane uses it:
  `npm run lint`

- Narrow behavior or contract:
  `npm run agent:test -- <path>`

- Source-heavy/shared code:
  `npm run trace:adjacent -- <path>`

- UI connection or source state:
  `npm run check:ui:coverage`
  `npm run check:ui:runtime`

- Analytics or telemetry:
  `npm run check:telemetry`
  `npm run check:analytics-semantics`

- Dependency or lockfile work:
  `npm run check:deps`

- Agent-context, workflow, or governance work:
  `npm run check:agent-context`
  `npm run check:agent-intelligence`
  `npm run eval:agent-context`

## Promoted signoff only

Use these only when their preconditions are explicitly met. They do not substitute for source evidence and do not clear runtime, provider, payment, admin-truth, or deployment gates by themselves.

- Broad/release-risk source signoff:
  `npm run check:inventory`
  `npm run check:architecture`
  `npm run check:continuity`
  `npm run test:contracts`

- Browser or visual diagnostic after a source finding or explicit request:
  `npm run check:ui:audits`
  `npm run check:ui:lighthouse`
  `npm run test:ui:storybook`

- Firebase/emulator-sensitive behavior with an explicit scope:
  `npm run check:firebase:rules`

## Boundaries

- Dependency changes use [dependency-audit.md](dependency-audit.md); do not install, remove, or upgrade packages as casual cleanup.
- UI and copy changes use [ui-copy-refinement-workflow.md](ui-copy-refinement-workflow.md) and the mandatory doctrine consultation skill.
- Ledger updates use [sync-ledgers.md](sync-ledgers.md) only when governance, ownership, or verification policy changes.
- GitHub, commits, pushes, merges, provider calls, deployment, and production actions need their own explicit authorization.

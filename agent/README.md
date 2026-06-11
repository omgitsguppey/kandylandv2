# Repo Intelligence Fabric

`/agent/` is the committed machine-readable agent context layer.

Truth order:
1. Verified runtime code
2. Verified configuration
3. Verified command output
4. `FULL_SCALE_CODEBASE_AUDIT.md`
5. `REPO_MEMORY_LEDGER.md`
6. `EVERY_FILE_FUNCTION_CHECKLIST.md`
7. `AGENTS.md` and workflow notes
8. Prior chat context

What is generated here:
- `index/`: generated JSON indexes for repo inventory, surfaces, helpers, verification lanes, package-manager truth, workflow guidance, governance truth, pitfalls, recent passes, observability, dependency summary, blast radius, retrieval index
- `state/`: task templates, handoff templates, active-task templates, generated task-context output, SQL mirror status, eval output
- `prompts/`: prompt variants compiled from the generated task-context pack
- `schemas/`: JSON Schemas used by the generator and self-check

What is not authoritative here:
- runtime code and runtime config
- workflow-only notes under `/.agent/`
- the SQL/Data Connect mirror

Artifact lifecycle:
- Preserve `agent/index/*.json`, `agent/state/*.generated.json`, and generated `agent/context/*.json` as repo-memory evidence when they are tracked, but treat them as generated snapshots. They do not override runtime code, verified config, doctrine, or operator evidence.
- Regenerate index/context snapshots with the commands below when their owning scripts or source inputs change. Do not hand-edit large generated JSON unless an owner contract explicitly requires it.
- Keep local build/test/cache output out of broad scans: `node_modules`, `.next`, coverage, Playwright/Lighthouse reports, logs, package-manager caches, and temporary scratch output are replaceable local artifacts.
- Manual-review artifacts such as screenshots, archived audits, import/export samples, or generated reports with source evidence should be preserved until their owner confirms they are obsolete.

Privacy-safe fixtures:
- User activity patterns in tests must be synthetic and shaped from canonical contracts in `src/lib/testing/canonical-test-factories.ts`, analytics event envelopes, identity handoff, person metrics, behavioral facts, and privacy lifecycle modules.
- Raw live user activity must not become fixture content. Avoid real emails, direct identifiers, phone numbers, payment/provider IDs, raw contact details, private media URLs, chat bodies, secrets, and sensitive telemetry.
- Prefer reserved fake IDs and domains such as `fixture_user_001`, `fixture_guest_001`, and `example.test`.
- Label evidence boundaries as fixture-only, source-only, runtime-like, provider-like, admin-like, operator-like, redacted runtime snapshot, or formal provider/runtime proof. Mocks and fixtures never clear provider/runtime/admin proof gates.
- Preserve missing-vs-zero truth: use collecting, source_missing, bridge_missing, materializer_missing, permission_blocked, or provenZero rather than displaying zero without a bounded source window.

Rebuild local indexes:

```bash
npm run agent:index
```

Refresh local indexes plus SQL/Data Connect mirror payload:

```bash
npm run agent:refresh
```

Generate a task context pack:

```bash
npm run agent:task-context -- --task="tighten admin ai runtime health" --mode=admin --file=src/app/admin/ai/page.tsx
```

Generate the full fast-start packet:

```bash
npm run agent:fast-start -- --task="tighten admin ai runtime health" --mode=admin --file=src/app/admin/ai/page.tsx
```

Generate a deterministic verification split for touched files:

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

Output locations:
- `agent/state/task-context.generated.json`
- `agent/state/fast-start.generated.json`
- `agent/state/verification-plan.generated.json`
- `agent/prompts/task-prompt.short.md`
- `agent/prompts/task-prompt.standard.md`
- `agent/prompts/task-prompt.deep.md`
- `agent/prompts/task-issue-spec.generated.md`
- `agent/prompts/verification-plan.generated.md`

Use `agent/index/*` and the generated task context before falling back to large governance-doc prompt payloads.

Fast-path rule:
- Use `agent:fast-start` at the start of narrow or moderate implementation work.
- Use `agent:verify` when the touched files are already known and you only need the fast vs signoff lane split.
- Keep fast-loop verification narrow; reserve continuity, UI audits, and other broad lanes for signoff unless the selector marks them as required.
- Prefer targeted `git ls-files` and `rg` searches with excludes for replaceable artifacts. Avoid full `npm run check`, Playwright, Cypress, Lighthouse, provider-connected checks, and deployment checks unless the task explicitly requires that signoff lane.

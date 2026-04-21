# KandyDrops Agent Workflow

Use the repo intelligence fabric before broad freeform exploration.

Default startup for implementation work:

1. Run `git status --short`
2. Run `npm run agent:fast-start -- --task="<task>" --mode=<mode> --file=<entrypoint>`
3. Read:
   - `agent/state/task-context.generated.json`
   - `agent/state/verification-plan.generated.json`
   - `agent/prompts/task-issue-spec.generated.md`
4. Use the fast verification lane during implementation.
5. Use the signoff verification lane only when the patch is ready to close.

Prompt/task format:

- Goal
- Acceptance criteria
- Likely touched files or entrypoints
- Forbidden surfaces
- Fast verification lane
- Signoff verification lane

Rules:

- Do not default to full-suite verification for narrow tasks.
- Use `npm run agent:test -- <path>` before broad sweeps when the change is local.
- Treat `npm run check:continuity`, `npm run check:ui:audits`, `npm run check:ui:lighthouse`, scheduler/runtime continuity checks, and Firebase rules checks as signoff lanes unless the selector marks them as required.
- Reuse canonical helpers before introducing new ownership paths.
- Do not touch payment, PayPal, GumDrops, wallet, or economy-ledger surfaces unless the task explicitly requires them and repo truth confirms that scope.

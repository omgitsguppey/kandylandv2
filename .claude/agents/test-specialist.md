# Test Specialist

Purpose:
- Generate or repair tests.
- Choose the narrowest valid verification lane.
- Avoid broad product-code refactors unless testability is blocked by a real production defect.

Workflow:
1. Read `AGENTS.md`.
2. Run `git status --short`.
3. Run `npm run agent:verify -- --paths=<touched test path>,<primary code path>`.
4. Use the fast lane first.
5. Escalate to signoff lanes only when the patch is ready or the selector requires them.

Rules:
- Prefer `npm run agent:test -- <path>` over full test sweeps for narrow work.
- Reuse existing fixtures, mocks, and canonical helper modules.
- Do not modify PayPal, wallet, GumDrops, or economy-ledger files unless the task explicitly requires it.
- If the smallest valid lane still fails for unrelated reasons, report that precisely and stop widening the patch without evidence.

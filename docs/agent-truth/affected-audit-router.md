# Affected Audit Router

KandyDrops uses an Nx-style affected planning model and does not require adopting Nx. The model is:

1. Read Git changed files.
2. Map paths through KandyDrops surface map rules.
3. Add dependency and ownership risk hints from generated agent indexes.
4. Select the minimum validators or targeted tests needed for those affected surfaces.
5. Keep full-suite and browser-heavy commands forbidden unless an explicit override with a reason is provided.

Official Nx affected behavior uses Git changed files plus a project graph to identify the minimum affected project set and run tasks only for that subset. This router applies the same principle to KandyDrops audit surfaces rather than Nx projects.

## Command

```bash
npm run plan:affected-audits -- --task "tighten audit routing"
```

Optional inputs:

```bash
npm run plan:affected-audits -- --base origin/main --head HEAD --task "payment route patch"
npm run plan:affected-audits -- --files src/components/PurchaseModal.tsx --task "wallet polish"
npm run plan:affected-audits -- --changed-script check:wallet-density --task "package script edit"
```

The planner writes `agent/state/affected-audit-plan.generated.json`.

## Output Contract

The plan includes:

- `changedFiles`: normalized changed paths from Git or `--files`.
- `affectedSurfaces`: matched KandyDrops surface names.
- `requiredStaticScans`: source-only validators with `whyThisCommand`.
- `requiredTargetedTests`: targeted tests with `whyThisCommand`.
- `optionalChecks`: checks that require explicit user request or critical uncertainty.
- `forbiddenByDefault`: full-suite or browser-heavy commands blocked by default.
- `terminalRunJustification`: the allow-list for terminal commands.
- `maxCommandBudget`: deterministic command budget.
- `skipReasons`: safe skip explanations.
- `whyNotFullCheck`: why broad checks are not selected.

## Routing Examples

- `src/components/PurchaseModal.tsx` routes to `check:wallet-density`, `check:gumdrop-economy`, and `check:purchase-telemetry-truth`; typecheck is optional unless uncertainty remains.
- `src/app/api/paypal/**` routes to purchase truth, GumDrop economy, speed/security, and a targeted route test.
- `src/components/Chat/**` routes to chat shell, telemetry catalog, and device UI dry audit.
- `src/app/dashboard/viewer/**` routes to watch-time truth, content protection, and viewer file tracking.
- `src/app/admin/users/**` routes to admin user behavior truth and telemetry identified parity.
- `firestore.rules` routes to `test:rules:firestore` only.
- `docs/agent-truth/**` routes to docs/generated-artifact consistency and does not trigger typecheck by default.
- `scripts/agent/**` routes to audit runtime/router self-checks and does not trigger app tests by default.

## Command Budget

- Static-only changes: max 1 command.
- Docs-only changes: max 1 command.
- Component-only changes: max 2 commands.
- API/security changes: max 3 commands.
- Agent tooling changes: max 3 commands.
- Payment/auth/unlock/rules changes: max 4 targeted commands.

Full-suite commands remain forbidden by default: `npm run check`, `npm run check:continuity`, UI audit/lighthouse chains, Cypress, and Playwright. The router must explain why not full check for every plan.

## Terminal Gate

No terminal command should run unless one of these is true:

- The affected plan includes the command in `terminalRunJustification`.
- The user explicitly asks for that command and provides a reason.
- A previous static scan finds critical uncertainty.

Optional checks are intentionally not terminal-allowed by default. They are safe skips until a required affected command fails or reports uncertainty.

## Safe Skip Doctrine

Safe skip reasons are required. A plan that does not explain skipped broad checks is incomplete because agents need to know why a command was omitted, not just what to run.

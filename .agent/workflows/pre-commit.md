---
description: Pre-commit verification checklist to run before every git commit and push
---

# Pre-Commit Verification

Run these checks before every `git commit` and `git push` to catch build-breaking, continuity-breaking, and deployment-breaking issues before they reach App Hosting.

## Steps

1. For broad, shared-helper, deployment, or continuity-sensitive work, orient compact-first.

- Run `git status --short`
- Run or read `npm run agent:fast-start -- --task "<task>" --mode=<mode> --file=<path>` or `npm run optimize:doctrine-context -- --task "<task>" --changed <path>`
- Review the generated task context, verification plan, surface map, and relevant doctrine cards before opening long ledgers
- Escalate to `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and `EVERY_FILE_FUNCTION_CHECKLIST.md` only when the generated context marks broad startup as required, the work changes governance/tooling/shared helpers, or source inspection leaves ownership unresolved
- Run `npm run trace:adjacent -- <path>` for the main touched files when the lane is source-heavy or shared

2. Run the light local gate first.

```bash
npm run typecheck
npm run lint
```

3. Run targeted tests for isolated changes, or the full test sweep only for broad changes.

```bash
# Fast: runs tests related to the modified file when the selector can map it
npm run agent:test <path>

# Slow: broad signoff for cross-cutting changes
npx vitest run
```

4. Run source-first surface gates when the touched files require them.

- UI changed:

```bash
npm run check:ui:coverage
npm run check:ui:runtime
```

- Browser/visual reproduction promoted by source findings, selector policy, current doctrine, or an explicit human request:

```bash
npm run check:ui:audits
```

- Browser-based performance reproduction promoted by selector policy, current doctrine, a concrete source finding, or an explicit human request:

```bash
npm run check:ui:lighthouse
```

- Firebase rules/storage/emulator-sensitive behavior changed:

```bash
npm run check:firebase:rules
```

5. If you need a production-style build failure trace, run the debug build.

```bash
npm run build:debug
```

This saves full output to `build.log`.

6. Verify no unauthorized temp/scratch files (e.g. `*_temp.*`, `*.log`) are in the working directory. Do NOT commit agent artifacts to the repo truth unless intended.

7. Ensure all modified UI components have their accompanying test assertions updated if copy or layout was changed. DO NOT skip test suite failures.

8. Use full repo checks as signoff-only for broad, release-risk, package/lockfile, deployment, Firebase, provider, or governance changes. Do not use full `npm run check`, Playwright, Cypress, Lighthouse, provider-connected checks, or deploy commands as the default edit loop.

9. Only commit if the required checks for the touched surfaces pass, and only after required memory/audit files have been updated for that lane.

```bash
git add -- <explicit-paths>
# or use: git add -p
git commit -m "your message"
git push
```

## Available npm Scripts

| Script | Purpose |
|---|---|
| `npm run typecheck` | Fast TypeScript sanity for most code changes |
| `npm run lint` | Fast lint sanity when lint is part of the touched lane |
| `npm run agent:test <path>` | Targeted test selection for narrow changes |
| `npm run check` | Broad signoff gate for explicit broad/release-risk work, not the default edit loop |
| `npx vitest run` | Full unit/contract test sweep for broad changes |
| `npm run check:ui:coverage` | Source-first UI surface coverage and selector/hydration ownership |
| `npm run check:ui:runtime` | Source-level UI runtime contract and client evidence checks |
| `npm run check:ui:audits` | Promoted Playwright accessibility and visual regression diagnostics; not the default source-readiness or beta-exit gate |
| `npm run check:ui:lighthouse` | Promoted local mobile Lighthouse diagnostic; not the default source-readiness or beta-exit gate |
| `npm run check:firebase:rules` | Emulator-backed Firestore and Storage rules verification |
| `npm run build:debug` | TypeScript check plus build with full output saved to `build.log` |

## Common Failure Patterns

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'node:process'` | Edge runtime importing `firebase-admin` or another Node-only package | Switch to `runtime = "nodejs"` or move the import server-side |
| `Module not found: server-only` | Client component importing a server module | Move the import into a server-only path |
| `Module not found: @/components/...` | Component was deleted but still imported | Remove or replace the import |
| `Failed to collect page data` | Runtime crash during SSG | Check the failing route's imports and data reads |
| `Dynamic server usage` | Using cookies or headers in a static page | Add `export const dynamic = "force-dynamic"` where appropriate |
| `Architecture violations from dependency-cruiser` | Cross-runtime imports or forbidden app/functions coupling | Recheck `npm run trace:adjacent -- <path>` and route the code through the canonical helper/runtime layer |
| `Telemetry or analytics semantics audit failure` | Event drift, alias mismatch, or unsupported metric naming | Recheck `src/lib/telemetry-catalog.ts`, `src/lib/server/analytics.ts`, and `src/lib/server/analytics-governance.ts` |
| `Firebase runtime check warnings` | Local env or runtime config drift from the expected public Firebase contract | Recheck `.env.local`, `apphosting.yaml`, `firebase.json`, and `src/lib/firebase-runtime.ts` |

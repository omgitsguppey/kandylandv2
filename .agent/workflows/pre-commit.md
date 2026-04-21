---
description: Pre-commit verification checklist to run before every git commit and push
---

# Pre-Commit Verification

Run these checks before every `git commit` and `git push` to catch build-breaking, continuity-breaking, and deployment-breaking issues before they reach App Hosting.

## Steps

1. For broad, shared-helper, deployment, or continuity-sensitive work, orient first.

- Read `FULL_SCALE_CODEBASE_AUDIT.md`
- Read `REPO_MEMORY_LEDGER.md`
- Read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- Run `git status --short`
- Run `npm run trace:adjacent -- <path>` for the main touched files

2. Run the canonical repo gate.

```bash
corepack pnpm run check
```

3. Run the full test sweep for broad or cross-cutting changes.

```bash
npx vitest run
```

4. Run the surface-specific gates when the touched files require them.

- UI changed:

```bash
npm run check:ui:audits
```

- Loading/render/performance-sensitive paths changed:

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

8. Only commit if the required checks for the touched surfaces pass, and only after the audit file has been updated at the start and at the end.

```bash
git add -A
git commit -m "your message"
git push
```

## Available npm Scripts

| Script | Purpose |
|---|---|
| `corepack pnpm run check` | Canonical repo gate: typecheck, ESLint, architecture, telemetry semantics, Firebase runtime, and contract tests |
| `npx vitest run` | Full unit/contract test sweep for broad changes |
| `npm run check:ui:audits` | Playwright accessibility and visual regression audits |
| `npm run check:ui:lighthouse` | Local mobile Lighthouse audit |
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

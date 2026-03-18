---
description: Pre-commit verification checklist to run before every git commit and push
---

# Pre-Commit Verification

Run these checks before every `git commit` and `git push` to catch build-breaking issues before they reach App Hosting.

## Steps

1. TypeScript check. Catch type errors and missing imports quickly.

```bash
npm run typecheck
```

2. Production build. Catch runtime and bundler errors, including missing modules, SSR failures, and server/client boundary issues.

```bash
npm run build
```

3. If the build output is hard to read, run the debug build.

```bash
npm run build:debug
```

This saves full output to `build.log`.

4. Review the build output for the usual failure patterns.

- `Cannot find module 'node:*'`: Edge runtime importing Node-only modules
- `Failed to collect page data`: SSR or SSG page crash
- `Module not found`: missing or deleted dependency or component
- Any non-zero exit code

5. Only commit if the checks pass.

```bash
git add -A
git commit -m "your message"
git push
```

## Available npm Scripts

| Script | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check only (`tsc --noEmit`) |
| `npm run check` | TypeScript plus ESLint |
| `npm run build` | Standard production build (`prebuild` runs typecheck first) |
| `npm run build:debug` | TypeScript check plus build with full output saved to `build.log` |

## Common Failure Patterns

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'node:process'` | Edge runtime importing `firebase-admin` or another Node-only package | Switch to `runtime = "nodejs"` or move the import server-side |
| `Module not found: server-only` | Client component importing a server module | Move the import into a server-only path |
| `Module not found: @/components/...` | Component was deleted but still imported | Remove or replace the import |
| `Failed to collect page data` | Runtime crash during SSG | Check the failing route's imports and data reads |
| `Dynamic server usage` | Using cookies or headers in a static page | Add `export const dynamic = "force-dynamic"` where appropriate |

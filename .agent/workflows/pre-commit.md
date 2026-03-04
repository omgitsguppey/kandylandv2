---
description: Pre-commit verification checklist to run before every git commit and push
---

# Pre-Commit Verification

// turbo-all

Run these checks **before every `git commit` and `git push`** to catch build-breaking issues before they reach App Hosting.

## Steps

1. **TypeScript Check** — Catch type errors and missing imports instantly (fast, ~5s)
```
npm run typecheck
```

2. **Production Build** — Catch runtime/bundler errors (edge vs node mismatches, missing modules, SSR failures)
```
npm run build
```

3. **If build fails with hard-to-read output**, use the debug build to get a clean log file:
```
npm run build:debug
```
This saves full output to `build.log` — grep it for the actual error.

4. **Review Build Output** — Look for:
   - ❌ `Cannot find module 'node:*'` → Edge runtime importing Node.js-only modules
   - ❌ `Failed to collect page data` → SSR/SSG page crashes
   - ❌ `Module not found` → Missing or deleted component/dependency
   - ❌ Any non-zero exit code

5. **Only commit if both pass with exit code 0**
```
git add -A
git commit -m "your message"
git push
```

## Available npm Scripts

| Script | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check only (`tsc --noEmit`) |
| `npm run check` | TypeScript + ESLint in one shot |
| `npm run build` | Standard production build (auto-runs typecheck via `prebuild`) |
| `npm run build:debug` | TypeScript check → build with full output saved to `build.log` |

## Common Failure Patterns

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'node:process'` | Edge runtime + firebase-admin | Switch `runtime = "edge"` → `"nodejs"` |
| `Module not found: server-only` | Client component importing server module | Move import to server component |
| `Module not found: @/components/...` | Component was deleted but still imported | Remove or replace the import |
| `Failed to collect page data` | Runtime crash during SSG | Check the failing route's imports |
| `Dynamic server usage` | Using cookies/headers in static page | Add `export const dynamic = "force-dynamic"` |

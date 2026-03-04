---
description: Pre-commit verification checklist to run before every git commit and push
---

# Pre-Commit Verification

// turbo-all

Run these checks **before every `git commit` and `git push`** to catch build-breaking issues before they reach App Hosting.

## Steps

1. **TypeScript Check** — Catch type errors
```
npx tsc --noEmit
```

2. **Production Build** — Catch runtime/bundler errors (edge vs node mismatches, missing modules, SSR failures)
```
npm run build
```

3. **Review Build Output** — Look for:
   - ❌ `Cannot find module 'node:*'` → Edge runtime importing Node.js-only modules
   - ❌ `Failed to collect page data` → SSR/SSG page crashes
   - ❌ `Module not found` → Missing or gitignored dependencies
   - ❌ Any non-zero exit code

4. **Only commit if both pass with exit code 0**
```
git add -A
git commit -m "your message"
git push
```

## Common Failure Patterns

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'node:process'` | Edge runtime + firebase-admin | Switch `runtime = "edge"` → `"nodejs"` |
| `Module not found: server-only` | Client component importing server module | Move import to server component |
| `Failed to collect page data` | Runtime crash during SSG | Check the failing route's imports |
| `Dynamic server usage` | Using cookies/headers in static page | Add `export const dynamic = "force-dynamic"` |

# Agent Instructions

## Git Push

Remote repo: `https://github.com/omgitsguppey/kandylandv2.git`

### Setup (run once per session if no remote exists)

```bash
# Use token auth for non-interactive environments
git remote add origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

If origin already exists but needs auth:

```bash
git remote set-url origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

### Push

This repo's default branch is `main`. If your local branch is `work` (as in Codex sandboxes), push with:

```bash
git push origin work:main
```

Do **not** use `git push origin main` unless you are on the `main` branch locally.

## Continuity Protocol

Before broad refactors, shared-helper work, UI work, Firebase work, or agent-driven maintenance:

1. Read `FULL_SCALE_CODEBASE_AUDIT.md`
2. Read `REPO_MEMORY_LEDGER.md`
3. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`
4. Update `FULL_SCALE_CODEBASE_AUDIT.md` at the start and again at the end
5. Run `git status --short`
6. Identify touched surfaces and canonical helpers before editing
7. Run `npm run trace:adjacent -- <path>` for the main touched files so neighboring logic is reviewed on purpose

Codex is assistive local tooling, not an authority. If tracked code, canonical docs, or verification output disagree with prior chat context, the tracked repo wins and the docs must be updated.

Use these repo continuity commands when relevant:

- `npm run check:architecture`
- `npm run graph:architecture`
- `npm run check:inventory`
- `npm run trace:adjacent -- <path>`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npm run check:firebase:rules`

Rules:

- When touching user-facing or admin-facing UI, run the Playwright UI audits.
- When touching render/loading/performance-sensitive paths, run the Lighthouse audit.
- When touching Firebase rules, storage, or emulator-sensitive behavior, prefer emulator-first verification and run the rules checks.
- Do not sign off on broad work without updating the audit file with commands run, results, warnings, and follow-up items.

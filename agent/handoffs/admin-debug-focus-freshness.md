# Codex Handoff

## Task
Admin Debug freshness cleanup.

## Result
Status:
- completed

Summary:
- Updated the admin debug page so the primary truth slices stop preserving stale data while refetching.
- Added a focus and visibility-return refresh path for the primary debug reads.
- Preserved the existing polling cadence and the manual refresh behavior.

## Commit
Branch: main
Commit SHA:
Commit message:

Pending until `npm run typecheck` passes and the requested commit is created.

## Files Changed
- src/app/admin/debug/page.tsx: set primary debug slices to avoid keep-previous-data and refresh on focus
- CODEX_HANDOFF.md: recorded this task handoff
- agent/handoffs/admin-debug-focus-freshness.md: task-specific handoff

## Behavior Changed
Before:
- The main debug snapshot and AI assistant snapshot could keep previous data visible during revalidation.
- The overview lane did not explicitly refresh on focus return from the page layer.

After:
- `/api/admin/debug` and `/api/admin/debug/assistant` no longer keep previous data during revalidation.
- Window focus and document visibility return now trigger `mutate()`, `mutateOverview()`, and `mutateAiDebug()` for the primary debug truth reads.
- `/api/admin/debug/preferences` remains intentionally non-blocking and keeps prior data while it refreshes.

## Validation
Commands run:
- `npm run optimize:doctrine-context -- --task "admin debug freshness cleanup" --changed src/app/admin/debug/page.tsx`: pass
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`: pass
- `npm run typecheck`: pass

Commands not run:
- broad validators: task restricted validation to `npm run typecheck`
- Playwright/Cypress/Lighthouse: not requested

## Risk Notes
- The focus refresh intentionally excludes debug preferences so local admin UI state does not churn.
- This patch does not change polling intervals, manual refresh wiring, or child tab layouts.
- No admin analytics, admin AI route, platform economy, validator, or API route files were touched.

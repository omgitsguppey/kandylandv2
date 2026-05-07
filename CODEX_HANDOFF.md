# Codex Handoff

## Task
Admin Debug freshness cleanup.

## Result
Status:
- completed

Summary:
- Updated the admin debug page so the primary truth slices stop preserving stale data during revalidation.
- Added a focus/visibility revalidation path for the primary debug reads so deploy/focus returns fresh diagnostic state.
- Left the preferences slice intentionally non-blocking and preserved the existing polling and manual refresh behavior.

## Commit
Branch: main
Commit SHA:
Commit message:

Pending until `npm run typecheck` passes and the requested commit is created.

## Files Changed
- src/app/admin/debug/page.tsx: made primary debug truth reads refresh on focus and disabled keep-previous-data on primary slices
- CODEX_HANDOFF.md: recorded this task handoff
- agent/handoffs/admin-debug-focus-freshness.md: task-specific handoff

## Behavior Changed
Before:
- The main debug snapshot and AI assistant snapshot could keep showing previous data while polling/refetching.
- The overview lane relied on polling/manual refresh and did not explicitly refresh when the admin tab regained focus.

After:
- `/api/admin/debug` and `/api/admin/debug/assistant` no longer keep prior data during revalidation.
- Primary debug truth revalidates on window focus and visibility return via `mutate()`, `mutateOverview()`, and `mutateAiDebug()`.
- `/api/admin/debug/preferences` still keeps previous data intentionally because it is non-blocking local admin UI state.

## Validation
Commands run:
- `npm run optimize:doctrine-context -- --task "admin debug freshness cleanup" --changed src/app/admin/debug/page.tsx`: pass
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`: pass
- `npm run typecheck`: pass

Important output:
- `agent/context/optimized-task-context.generated.json` selected the admin surface and admin-debug feature doctrine for this change.
- `trace:adjacent` confirmed the page owns the relevant polling hooks and tab surfaces without requiring API route edits.

Commands not run:
- broad validators: task restricted validation to `npm run typecheck`
- Playwright/Cypress/Lighthouse: task did not call for browser audits

## Risk Notes
- The focus revalidation intentionally excludes debug preferences so tab/filter UI state does not churn.
- `useAdminOverviewRealtime` still owns its own polling interval; this patch only adds focus-triggered refresh from the page.
- No admin analytics, admin AI route, platform economy, validator, or API route files were touched.

## Needs Uylus / ChatGPT Review
- None expected if `npm run typecheck` passes.

## Follow-up Suggestions
- If stale-after-focus reports continue, the next check should be whether any child hook beyond the page still suppresses focus revalidation inside its own module.

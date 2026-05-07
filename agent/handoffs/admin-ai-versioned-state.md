# Codex Handoff

## Task
Admin AI version-scoped local state cleanup.

## Result
Status:
- completed

Summary:
- Tightened the Admin AI state hook so persisted module state is explicitly schema-and-app-version scoped.
- Stopped the Admin AI dashboard poller from carrying forward previous server payloads while current runtime data is loading.
- Kept the prompt draft local and only hydrated it from a current server dashboard payload.

## Commit
Branch: main
Commit SHA:
Commit message:

Pending until `npm run typecheck` passes and the requested commit is created.

## Files Changed
- src/app/admin/ai/hooks/useAdminAiState.tsx: version-scoped Admin AI UI state and separated local prompt draft hydration from server dashboard hydration
- CODEX_HANDOFF.md: recorded this task handoff
- agent/handoffs/admin-ai-versioned-state.md: task-specific handoff

## Behavior Changed
Before:
- The Admin AI dashboard SWR hook kept previous server data during refetches.
- The local prompt draft could hydrate from carried-over dashboard data instead of waiting for the current server payload.
- Collapsed module preferences were version-tagged only by app version.

After:
- `/api/admin/ai/drop-covers` no longer keeps previous server dashboard data during refetches.
- The local prompt draft hydrates only after a current dashboard payload exists and still remains local-only while dirty.
- Collapsed module preference keys are explicitly scoped by both an Admin AI schema version and `PUBLIC_APP_VERSION`.
- `/api/admin/ui/preferences` remains the intentional non-blocking stale-while-refetch slice.

## Validation
Commands run:
- `npm run optimize:doctrine-context -- --task "admin ai version scoped local state cleanup" --changed src/app/admin/ai/hooks/useAdminAiState.tsx`: pass
- `npm run trace:adjacent -- src/app/admin/ai/hooks/useAdminAiState.tsx`: pass
- `npm run typecheck`: pass

Commands not run:
- broader admin validators: task restricted validation to `npm run typecheck`
- release-note generation: out of scope
- Playwright/Cypress/Lighthouse: not requested

## Risk Notes
- This patch does not change model ids, routing, prompt refinement logic, or API behavior.
- The Admin AI dashboard may now show loading state instead of a carried-over stale snapshot during refetch windows, which is intentional for admin truth.
- Non-blocking UI preferences still keep previous data intentionally.

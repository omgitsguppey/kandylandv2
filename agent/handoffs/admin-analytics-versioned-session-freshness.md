# Codex Handoff

## Task
Fix Admin Analytics stale refresh behavior with versioned session freshness.

## Result
Status: completed

## Files Changed
- `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`: version-scoped Admin Analytics sessionStorage keys and restored focus freshness on primary reads
- `CODEX_HANDOFF.md`: task handoff
- `agent/handoffs/admin-analytics-versioned-session-freshness.md`: task handoff copy

## Behavior Changed
Before:
- Admin Analytics hydrated historical overview snapshots from unversioned `sessionStorage` keys.
- Analytics filter state also used an unversioned `sessionStorage` key.
- Primary Admin Analytics SWR reads suppressed focus revalidation with `revalidateOnFocus: false`.

After:
- Admin Analytics sessionStorage keys are version-scoped by `PUBLIC_APP_VERSION`.
- Old unversioned Admin Analytics keys are ignored and cleaned locally on mount for this surface only.
- Primary Admin Analytics reads now revalidate on focus through the default admin polling config.

## Validation
Commands run:
- `npm run typecheck`: pass

Commands not run:
- `full npm run check`: task forbids broad checks
- `Playwright`: task forbids browser automation
- `Cypress`: task forbids browser automation
- `Lighthouse`: task forbids browser automation

## Browser Verification Needed
Check `/admin/analytics`:
- initial load after refresh without clearing storage
- refresh after a new deployed build
- tab away and back for focus refresh
- filters still persist within the same version

## Risk Notes
- I used `PUBLIC_APP_VERSION` as the storage namespace version source. If release version changes more often than desired for admin filter persistence, that is intentional for deploy freshness, but it shortens persistence lifetime.
- I restored focus revalidation for the primary reads in this hook only. Section override hooks outside this file were intentionally left unchanged.
- Legacy key cleanup removes only the exact old Admin Analytics filter key and old overview snapshot key for the current historical URL.

## Task-Specific Storage and Freshness Notes
- Exact storage keys found:
  - overview snapshot key
  - analytics filter key
- Old key format:
  - overview: `kandydrops.admin.analytics.overview.lastValidatedBackendSnapshot:${url}`
  - filters: `${ANALYTICS_FILTER_STORAGE_KEY}:${user.uid}` or `ANALYTICS_FILTER_STORAGE_KEY`
- New key format:
  - overview: `kandydrops.admin.analytics.${PUBLIC_APP_VERSION}.overview.lastValidatedBackendSnapshot:${url}`
  - filters: `kandydrops.admin.analytics.${PUBLIC_APP_VERSION}.filters:${baseAnalyticsFilterStorageKey}`
- Version source used:
  - `PUBLIC_APP_VERSION` from `src/lib/release-notes/public-release-notes.ts`
- SWR reads changed from `revalidateOnFocus: false` to default focus revalidation:
  - `/api/admin/analytics/preferences`
  - `/api/admin/analytics/realtime`
  - historical analytics request keyed by `historicalUrl`
  - `/api/admin/overview`
- SWR reads intentionally left unchanged:
  - section override hooks outside this file, because this task only allowed edits in `useAdminAnalyticsState.tsx`

## Commit
Branch:
Commit SHA:
Commit message:

Not committed because: pending commit step for this task

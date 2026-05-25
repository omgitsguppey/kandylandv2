# Admin Overview - Agent Source-of-Truth

This document is the canonical agent-readable reference for the Admin Overview top section.

## What The Top Section Does

The Admin Overview (`/admin`, rendered by `src/app/admin/page.tsx`) is the landing page for the admin console. Its top section displays:

1. Title: "Admin Overview"
2. Truth chip: concise status for the overview source state
3. Server update subtitle: the most recent server-confirmed snapshot timestamp
4. Issue chip: visible only when source issues exist

## Canonical Data Sources

### Primary: Hourly Hot-Cache Snapshot

`src/hooks/useAdminOverviewRealtime.ts` is now a legacy-named adapter over `/api/admin/overview`. It does not open Firestore listeners. The route reads:

| Source | Purpose |
|---|---|
| `admin_hot_cache_snapshots/admin_overview_snapshot` | Cached overview payload, Platform pulse, chart data, feeds, and freshness |
| `admin_surface_heartbeats/admin_overview_snapshot` | Hourly heartbeat evidence, source counts, duration, and next-due timestamp |

Page load must not run broad fallback reads over users, drops, transactions, telemetry logs, or daily rollups. If the snapshot is missing, the route returns a source-missing state and manual refresh guidance.

### Refresh Lifecycle

Snapshot generation is scheduler/job or explicit-operator work. Admin page load reads snapshot evidence only. The default heartbeat cadence is 3600 seconds.

### Source Hierarchy

1. Fresh hot-cache snapshot: canonical Admin Overview display truth
2. Stale hot-cache snapshot: values remain visible with review freshness
3. Heartbeat evidence: proves refresh lifecycle state, not business metric truth
4. No snapshot: source-missing state

## What Must Never Be Treated As Truth

- AI/model summaries or generated interpretations
- Stale materialized snapshots without timestamps
- `localStorage` or `sessionStorage` cached admin data
- Component-level state that outlives the snapshot lifecycle
- Any data source that does not expose its freshness timestamp

## How Cache State Is Detected

1. `/api/admin/overview` reads the hot-cache snapshot doc and heartbeat doc.
2. Snapshot age is compared against the 3600-second TTL.
3. Missing heartbeat evidence is reported as missing, not healthy.
4. Missing snapshot state does not trigger broad raw fallback reads.

## Avoid Reintroducing The Bug

1. Do not add Firestore listeners to the Admin Overview default path.
2. Do not run broad raw reads from page load when the snapshot is missing.
3. Use hot-cache freshness and heartbeat evidence for truth chips.
4. Keep missing, stale, failed, and refreshing states distinct.
5. Any live admin exception must be drilldown/operator scoped with owner, cost, detach, and fallback evidence.

## Admin Top Spacing Rule

- CSS custom properties `--admin-top-spacing` and `--admin-top-spacing-md` are defined in `src/app/globals.css`.
- The admin layout (`src/app/admin/layout.tsx`) consumes these via the shared admin shell spacing.
- Do not add ad-hoc `pt-*` values to admin pages.

## Hero Truth Display Rule

- The Admin Overview hero actions slot must contain exactly one chip: the truth chip.
- Server update freshness info goes in the `subtitle` prop as inline text.
- Issue counts remain in `AdminStatsBar`, not as standalone hero chips.
- Do not add additional status chips, server update chips, or issue chips to the hero actions slot.

## Shared Admin Truth-Badge Doctrine

Admin Overview uses the canonical truth-state doctrine in `src/lib/admin-truth-state.ts`: `live`, `refreshing`, `stale`, `degraded`, `failed`, `unavailable`, `delayed`, and `review`. Valid values stay visible while transport refresh degrades; missing sources must not claim `live`.

## Deferred Work

- Bottom nav rules for user surfaces are intentionally deferred.
- Admin Analytics bottom-nav behavior must not be changed by Admin Overview tasks.

## Key Files

| File | Role |
|---|---|
| `src/app/admin/page.tsx` | Admin Overview UI |
| `src/app/admin/layout.tsx` | Admin layout |
| `src/hooks/useAdminOverview.ts` | Thin wrapper |
| `src/hooks/useAdminOverviewRealtime.ts` | Legacy-named hot-cache adapter |
| `src/lib/admin-overview.ts` | Shared response and pulse types |
| `src/app/api/admin/overview/route.ts` | Snapshot-first API |
| `src/lib/admin/admin-hot-cache-contract.ts` | Snapshot registry |
| `src/lib/admin/admin-heartbeat-contract.ts` | Heartbeat model |
| `src/components/Admin/AdminPageHeader.tsx` | Shared admin page header |
| `tests/unit/admin-overview-hot-cache.spec.ts` | Snapshot-first route validation |

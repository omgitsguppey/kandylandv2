# Admin Overview — Agent Source-of-Truth

> This document is the canonical agent-readable reference for the Admin Overview top section.
> All agents working on this module must read this document before modifying any Admin Overview code.

## What the Admin Overview top section does

The Admin Overview (`/admin` route, rendered by `src/app/admin/page.tsx`) is the landing page for the admin console. Its top section displays:

1. **Title**: "Admin Overview" (no eyebrow label, no "CONTROL ROOM")
2. **Truth chip**: A concise status badge showing the canonical data source state
3. **Server update chip**: "Last server update X ago" — the most recent server-confirmed timestamp
4. **Issue chip** (conditional): "N issues active" when listener failures or read fallbacks exist

## Canonical data sources

### Primary: Firestore realtime snapshot listeners (client-side)

The `useAdminOverviewRealtime` hook (`src/hooks/useAdminOverviewRealtime.ts`) maintains 3 Firestore `onSnapshot` listeners:

| Listener | Collection / Document | Purpose |
|---|---|---|
| Drops | `drops` (collection) | Live drop counts, top drops, drop status |
| Commerce summary | `analytics_commerce_rollup/summary` (document) | Lifetime revenue and unwrap totals |
| Transactions | `transactions` (collection, ordered desc, limit 20) | Recent transaction feed |

Each listener reads `snapshot.metadata.fromCache` to distinguish server-confirmed data from cached/offline data.

### Secondary: Server API rollup (polled)

The hook also polls `/api/admin/overview` via SWR at a **60-second interval** to fetch:
- Chart data (30-day commerce daily aggregates)
- Trend summaries and deltas
- Admin activity log (telemetry events + admin adjustments)
- User count (aggregation query)

This polling remains because chart/trend/activity data doesn't need sub-minute freshness. The polling is **explicitly labeled** in the truth notes and the `realtimeDebugMeta.pollingActive` flag.

### Source hierarchy (canonical to fallback)

1. **Server-confirmed Firestore snapshot** (fromCache: false) → canonical truth
2. **Cached Firestore snapshot** (fromCache: true) → labeled "Cached snapshot"
3. **Server API rollup** → 60s-stale polled data, labeled as such
4. **No data** → "Waiting for server truth"

## What must NEVER be treated as truth

- AI/model summaries or generated interpretations
- Stale materialized snapshots without timestamps
- `localStorage` or `sessionStorage` cached admin data
- Component-level state that outlives the Firestore listener lifecycle
- Any data source that doesn't expose its freshness timestamp

## What each visible status chip means

| Chip | Meaning | Variant |
|---|---|---|
| **Live server truth** | All 3 Firestore listeners loaded, server-confirmed (not from cache) | `live` (green) |
| **Cached snapshot** | All 3 listeners loaded but at least one returned from Firestore client cache | `cached` (amber) |
| **Realtime warming up** | Some listeners have loaded, none failed, still initializing | `cached` (amber) |
| **Server rollup only** | No realtime listeners active, only the polled server API data | `cached` (amber) |
| **Fallback active — N listener(s) degraded** | At least one Firestore listener has errored | `fallback` (red) |
| **Waiting for server truth** | No data available yet | `waiting` (gray) |
| **N issues active** | N listener failures or server read fallbacks detected | amber badge |
| **Last server update X ago** | Time since most recent server-confirmed snapshot or transaction | neutral |

## How realtime vs cache vs fallback is detected

1. Each `onSnapshot` callback reads `snapshot.metadata.fromCache`.
2. The `listenerState` tracks per-listener `fromCache` booleans.
3. `resolveTruthChipLabel()` (exported from `useAdminOverviewRealtime.ts`) applies a deterministic state machine:
   - Failed listeners → "Fallback active"
   - All loaded + none from cache → "Live server truth"
   - All loaded + some from cache → "Cached snapshot"
   - Partial → "Realtime warming up"
   - No realtime + server data → "Server rollup only"
   - Nothing → "Waiting for server truth"

## What caused this bug

The original implementation used bracket-prefixed developer jargon (`[PARTIAL] FEED`, `[DEGRADED]`, `Last txn`) that:

1. **Didn't check `fromCache`** — all Firestore snapshots were treated as "live" regardless of whether they came from the server or the client cache.
2. **Used vague labels** — `[PARTIAL]` was ambiguous: was it partial because of failed listeners, because of cache, or because the server rollup hadn't arrived yet?
3. **`Last txn` lied** — it reported the last transaction timestamp without indicating whether that timestamp was server-confirmed.
4. **"CONTROL ROOM" eyebrow** — meaningless label that added visual clutter.

## How to avoid reintroducing this bug

1. **Always check `snapshot.metadata.fromCache`** on any Firestore client snapshot used for admin truth.
2. **Never label data as "live" unless it is server-confirmed** (fromCache === false).
3. **Use `resolveTruthChipLabel()` for all truth chips** — don't construct ad-hoc bracket strings.
4. **Include `realtimeDebugMeta` in any merged admin response** — debug visibility is required.
5. **If polling must remain, label the interval explicitly** in both the truth notes and the debug meta.

## Admin top spacing rule

- CSS custom properties `--admin-top-spacing` (16px mobile) and `--admin-top-spacing-md` (24px desktop) are defined in `src/app/globals.css`.
- The admin layout (`src/app/admin/layout.tsx`) consumes these via `pt-[var(--admin-top-spacing)]`.
- Do NOT add ad-hoc `pt-*` values to admin pages. Use the tokens.
- The sticky admin console nav grid handles its own offset from the top navbar via `top-[calc(3.5rem+env(safe-area-inset-top))]`.

## Deferred work (do NOT touch in Admin Overview tasks)

- **Bottom nav rules for user surfaces** are intentionally deferred.
- **Admin Analytics bottom-nav behavior** must NOT be changed by this task or related tasks. That surface currently hides the bottom nav and we are leaving that alone.

## Key files

| File | Role |
|---|---|
| `src/app/admin/page.tsx` | Admin Overview UI (renders title, chips, modules) |
| `src/app/admin/layout.tsx` | Admin layout (top spacing, nav grid) |
| `src/hooks/useAdminOverview.ts` | Thin wrapper → delegates to realtime hook |
| `src/hooks/useAdminOverviewRealtime.ts` | Realtime hook (Firestore listeners + SWR poll + truth state) |
| `src/lib/admin-overview.ts` | Shared types (AdminOverviewResponse, AdminOverviewRealtimeDebugMeta) |
| `src/app/api/admin/overview/route.ts` | Server API rollup (charts, deltas, activity, truth notes) |
| `src/components/Admin/AdminPageHeader.tsx` | Shared admin page header (eyebrow, title, actions) |
| `src/app/globals.css` | Admin spacing CSS tokens |
| `tests/unit/admin-overview-truth.spec.ts` | Targeted validation for truth chips, copy, and type contracts |

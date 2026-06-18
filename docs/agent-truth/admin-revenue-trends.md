# Admin "Revenue + Unwraps" — Agent Source-of-Truth

> This document is the canonical agent-readable reference for the Admin Overview "Revenue + Unwraps" accordion module (formerly "Revenue trends").
> All agents working on this module must read this document before modifying any revenue/unwrap chart code.

## What the section does

The "Revenue + Unwraps" section is an accordion module within the Admin Overview page (`/admin`). It shows:

1. **Time-range filter**: compact pill selector for 24h, 7d, 14d, 30d, All
2. **Truth chip**: dot + label showing the combined overview listener state
3. **Metric cards**: Revenue total, Unwraps total, Best revenue day, Best unwrap day, Days with sales, Top drop — in a compact 3×2 grid
4. **Combined chart**: dual-axis ComposedChart with revenue area (left Y-axis, $) + unwrap bars (right Y-axis, count)
5. **Top drops table**: compact searchable/paginated list of top-ranked drops — see [admin-revenue-top-drops.md](admin-revenue-top-drops.md) for full details

> The "Top performing drops" standalone accordion was removed and merged into this module to reduce vertical sprawl.

## Why this replaces the old "Revenue trends" module

The old module had:
- A two-tab switch ("Revenue view" / "Unwrap view") — unnecessary vertical sprawl and hid data behind a toggle
- Hardcoded pink colors (`#d946ef`, `#f472b6`) — the site accent is purple
- A static "Last 30 days" chip — no time range filtering
- "1 read issue" vague diagnostic copy
- "9 of 30 active days" — unclear metric label

All of these were removed or replaced.

## Data sources

### Primary: Server overview API rollup

| Property | Detail |
|---|---|
| Endpoint | `/api/admin/overview` |
| Polling | SWR at 60-second interval |
| Chart data source | `analytics_commerce_daily` Firestore collection |
| Revenue field | `revenueCentsTotal` or `grossRevenueCents` per day doc |
| Unwrap field | `unlockCount` or `unlocks` per day doc |
| Purchase field | `purchaseCount` or `purchaseTransactionCount` per day doc |
| Window | Last 30 days + previous 30 days for delta comparison |
| Day key format | `YYYY-MM-DD` in CST timezone |
| Timezone policy | All day keys use `APP_TIMEZONE` (US Central / America/Chicago) |

### Secondary: Realtime Firestore listeners

The overview hooks also maintain realtime listeners for:
- `drops` collection — live drop counts
- `analytics_commerce_rollup/summary` — lifetime revenue/unwrap totals
- `transactions` collection — recent transaction feed

These listeners contribute to the truth chip state but do NOT directly feed the chart data. Chart data comes from the server API rollup.

### Tertiary: Drop-level unwrap data

| Property | Detail |
|---|---|
| Collection | `analytics_drop_daily` |
| Query | `dayKey >= currentStartDayKey` |
| Purpose | Determine the "Top drop" by unwrap count in the selected window |
| Fields | `unlockTransactionCount`, `unlockCount`, `unwrapCount` |

## What counts as revenue

- Revenue is sourced from `analytics_commerce_daily` → `revenueCentsTotal` / `grossRevenueCents`
- These are materialized daily summaries built by the commerce rollup Cloud Function
- Only successful completed payments are counted in the rollup
- Failed, pending, refunded, test, and duplicate transactions are excluded at rollup time
- Revenue is stored in cents and converted to dollars for display

## What does NOT count as revenue

- Pending payments
- Refunded amounts
- Test/sandbox transactions
- Admin balance adjustments (these are tracked separately as `admin_adjustment` type)
- Free unwraps or promotional unlocks

## What counts as an unwrap

- An unwrap (unlock) is counted from `analytics_commerce_daily` → `unlockCount` / `unlocks`
- These are canonical unlock events materialized by the commerce rollup
- Each unique user-drop unlock is counted once

## What does NOT count as an unwrap

- Duplicate unlock attempts for the same user-drop pair
- Failed unlock transactions
- Preview or admin test unlocks (if any)

## How time ranges work

The server API always returns a 30-day chart window. The client-side time-range filter slices this data:

| Range | Client behavior |
|---|---|
| 24h | `chartData.slice(-1)` — last 1 day point |
| 7d | `chartData.slice(-7)` — last 7 day points |
| 14d | `chartData.slice(-14)` — last 14 day points |
| 30d | Full `chartData` array — uses server-computed `trendSummary` directly |
| All | Same as 30d — labeled "All recorded activity · last 30 days" |

For 30d and All, the component uses the server-computed `trendSummary` values directly (canonical). For shorter ranges, it re-aggregates from the filtered chart data on the client.

## How previous-window comparison works

For ranges shorter than 30d, the client computes the previous window from the complement:
- Example: 7d filter → previous window = `chartData.slice(-14, -7)`
- If the previous window slice is empty, shows "No prior window"
- If previous window has zero value and current has positive value, shows "New activity"
- If both are zero, shows "No prior activity"
- Division by zero is prevented by the `calculateOverviewMetricDelta` helper (returns `percentChange: null` when previous is 0)

For 30d, the server-computed `trendSummary.previousRevenueCents` / `previousUnwraps` are used directly.

For All, previous-window comparison shows "No prior window" since there is no prior-to-all-time window.

## How chart data is built

1. Server creates a 30-day array of `AdminOverviewDayPoint` entries (key, date label, revenue, unwraps, purchases)
2. Iterates `analytics_commerce_daily` docs, adds revenue/unwrap/purchase values to matching day slots
3. Day labels are formatted with `Intl.DateTimeFormat` in CST timezone
4. Revenue in chart is stored as dollars (cents / 100)
5. Client filters this array by selected time range

## Chart colors

| Dataset | Color | Token |
|---|---|---|
| Revenue area | `#b28cff` | `--color-brand-purple` (canonical KandyDrops accent) |
| Revenue gradient | `#b28cff` → transparent | Vertical gradient fill |
| Unwrap bars | `#d8b4fe` at 50% opacity | Lighter purple tint for contrast |

**Never use** `#d946ef` (fuchsia/pink) or `#f472b6` (pink) for chart elements. These were the old hardcoded colors and are not part of the KandyDrops design language.

## What the visible truth chips mean

The truth chip is shared with the overall Admin Overview truth system:

| State | Label | Meaning |
|---|---|---|
| All live upgrade listeners loaded, none cached | "Updated" | All displayed sources are confirmed by server |
| Verified server data or cache is visible | "Showing last verified data" | Useful data is visible while cache/live metadata is not fully current |
| Partial live upgrade listeners loaded | "Refreshing overview" | Some live updates are still connecting |
| Nothing loaded | "Collecting activity" | No verified overview data exists yet |
| Listener failures | "Live updates delayed" | Some live update sources failed |

## What debug metadata is exposed

The `AdminOverviewRealtimeDebugMeta` type exposes:
- `dropsFromCache`, `summaryFromCache`, `transactionsFromCache` — per-listener cache state
- `lastServerConfirmedAt` — epoch ms of last server-confirmed snapshot
- `lastClientSnapshotAt` — epoch ms of last client snapshot (cache or server)
- `pollingActive` — whether SWR polling is running
- `pollingIntervalMs` — polling interval (60000ms)
- `legacyDataMapped` — whether legacy records were normalized into the timeline

## Why "1 read issue" was removed

The old `issueCount` prop surfaced vague diagnostic language like "1 read issue" in the visible UI. This violated the truth-labeling standard:
- Admins cannot act on "1 read issue" — it doesn't say what failed or what to do
- The truth chip system already provides specific, actionable labels
- Debug detail belongs in the admin debug panel, not the chart header

## Why "9 of 30 active days" was replaced

The "Active days" metric showed `revenueActiveDays of windowDays` but was unclear:
- "Active" could mean any kind of activity, not specifically revenue
- The format "N of M" was confusing without context
- Replaced with "Days with sales" — clearer that it counts days with revenue > $0

## What must NEVER happen

1. **Never use pink/fuchsia colors** — `#d946ef` and `#f472b6` are forbidden
2. **Never show "read issue" language** — use specific truth labels
3. **Never show a two-tab revenue/unwrap switch** — both datasets are visible simultaneously
4. **Never claim "Live" without checking fromCache** — cached data must be labeled as cached
5. **Never divide by zero in delta math** — use `calculateOverviewMetricDelta` which handles it safely
6. **Never add full-history chart queries** without server-side aggregation support
7. **Never block Admin Overview shell** on this module loading

## Key files

| File | Role |
|---|---|
| `src/components/Admin/AdminAnalyticsCharts.tsx` | UI component (chart, metrics, time filter) |
| `src/app/api/admin/overview/route.ts` | Server API: chart data builder, trend summary |
| `src/hooks/useAdminOverviewRealtime.ts` | Realtime listeners + truth chip resolver |
| `src/hooks/useAdminOverview.ts` | Thin wrapper delegating to realtime hook |
| `src/lib/admin-overview.ts` | Shared types, delta calculator, pagination |
| `src/lib/timezone.ts` | CST timezone utilities for day keys |
| `docs/agent-truth/admin-overview.md` | Parent module source-of-truth |
| `tests/unit/admin-overview-truth.spec.ts` | Targeted validation tests |

# Admin "Top Drops Table" — Agent Source-of-Truth

> This document is the canonical agent-readable reference for the compact "Top drops" table integrated inside the Admin Overview "Revenue + Unwraps" module.
> All agents working on top drop ranking, search, or pagination must read this document first.

## Why "Top performing drops" was removed as a standalone accordion

The old standalone "Top performing drops" accordion:
- Created excessive vertical sprawl on the admin overview page
- Used oversized card layouts with too much padding
- Duplicated data scanning that belongs in the analytics context
- Was disconnected from the time-range filter used by revenue/unwrap metrics

It was removed and its content merged into the "Revenue + Unwraps" module as a compact searchable table.

## Where the compact top drops list now lives

The top drops table is rendered by `TopDropsTable.tsx` inside `AdminAnalyticsCharts.tsx`, which is inside the "Revenue + Unwraps" accordion on the Admin Overview page (`/admin`).

Rendering order inside the accordion:
1. Time-range pill filter + truth chip
2. Window label
3. Metric cards (3×2 grid)
4. Combined revenue/unwrap chart
5. **Top drops table** (search bar + compact rows + pagination)

## What the list ranks by

Drops are ranked by `totalUnlocks` (all-time unwrap counter stored on each drop document in Firestore). This is the same ranking used by the server API and the realtime listener.

**This is all-time ranking, not time-range-scoped ranking.** The `totalUnlocks` field on a drop document is a lifetime counter, not a windowed aggregate. True time-scoped ranking would require joining per-drop daily analytics from `analytics_drop_daily`, which is out of scope for this targeted fix.

The debug metadata explicitly declares this: `rankingSource: "drop.totalUnlocks (all-time counter on drop document)"`.

## Canonical sources

### Drop metadata
- **Source**: Firestore `drops` collection
- **Processing**: Normalized by `normalizeAndApplyDropStatusOrNull`, filtered by `isDropHiddenFromPublic`
- **Fields used**: `id`, `title`, `imageUrl`, `status`, `unlockCost`, `totalUnlocks`, `totalClicks`, `creatorId`

### Unwrap count
- **Source**: `drop.totalUnlocks` (all-time counter on drop document)
- **What counts**: Each unique user-drop unlock event
- **What doesn't count**: Duplicate unlock attempts, failed transactions, admin test unlocks

### Click count
- **Source**: `drop.totalClicks` (optional field on drop document)
- **Note**: Clicks come from a different tracking path than unwraps. Clicks are card/promo link clicks; unwraps are currency-based unlock transactions. Debug metadata notes this source difference.

### Price
- **Source**: `drop.unlockCost` (GumDrops currency cost per unlock)
- **Display**: "{cost} GD"
- **Note**: This is the current price, not historical. If the price changed after some unlocks occurred, the displayed price reflects the current value.

### Revenue per drop
- **NOT available.** There is no materialized per-drop revenue in the data pipeline. The `analytics_commerce_daily` collection aggregates all drops together. Individual transactions have `relatedDropId` but joining and summing them per-drop for arbitrary time ranges is not implemented.
- **Decision**: Show price (unlockCost in GD) instead of revenue. Documented explicitly here and in debug metadata.
- **Future**: If per-drop revenue is needed, a new `analytics_drop_revenue_daily` materialized view should be created in the commerce rollup Cloud Function.

### Status
- **Source**: `drop.status` after normalization (lifecycle status applied based on validFrom/validUntil timestamps)
- **Clean labels**: Live, Scheduled, Expired, Queued, Draft, Review
- **No bracket labels**: Status is never shown as `[active]` or `[EXPIRED]`
- **No duplicates**: Each drop shows exactly one status pill

## How the time-range filter affects the list

The same 5-option time-range filter (24h, 7d, 14d, 30d, All) controls both the chart and the top drops table. When the time range changes:
1. The chart data re-filters
2. Revenue/unwrap metrics re-aggregate
3. **The top drops table resets pagination to page 1**
4. The search query is preserved but re-filters against the (same) bounded result

**Important**: Currently, the time-range filter does NOT re-rank drops by time-scoped activity. Drops are always ranked by all-time `totalUnlocks`. The time-range filter's primary effect on the table is resetting pagination state. This is documented in debug metadata as `rankingMetric: "totalUnlocks"` and `rankingSource: "drop.totalUnlocks (all-time counter on drop document)"`.

## How search works

- **Mode**: `local-bounded` — searches over the bounded result set (up to 20 drops) already loaded in memory
- **Fields searched**: title, status, drop ID, creatorId
- **Debounce**: 300ms to avoid excessive re-renders
- **Page reset**: Search changes reset pagination to page 1
- **Empty state**: "No drops match this search."
- **No full catalog hydration**: Search only filters the pre-loaded bounded set. It does not query Firestore for additional results.
- **Debug**: `searchMode: "local-bounded"`, `searchQuery: "<value>"`

## How pagination works

- **Mode**: `bounded-result` — client-side pagination over the server's bounded result (up to 20 drops)
- **Page size**: 5 rows
- **Controls**: Prev/Next buttons + "Showing X–Y of Z" label
- **No offset pagination**: No Firestore `.offset()` or `.startAt()` is used for this list
- **No cursor pagination**: The full bounded set is loaded once; pagination is pure array slicing
- **Reset**: Page resets to 1 on time-range change and on search change
- **Debug**: `paginationMode: "bounded-result"`, `pageSize: 5`, `currentPage: N`

The server sends up to 20 drops (`.slice(0, 20)`). The realtime listener also limits to 20. This is sufficient for the overview dashboard. Full drop catalog browsing is available in the Drops Manager.

## How legacy records map into the timeline

Legacy drop records are normalized by `normalizeAndApplyDropStatusOrNull` which:
- Applies lifecycle status based on current time vs validFrom/validUntil
- Filters hidden drops via `isDropHiddenFromPublic`
- Normalizes field names across schema versions

Legacy drops appear in the same ranked list as modern drops, using the same `totalUnlocks` counter.

## How duplicates are prevented

- **Dedup key**: `drop.id` (Firestore document ID)
- Each drop appears exactly once in the list
- The `totalUnlocks` counter on a drop document is itself deduplicated at the transaction level (each user-drop unlock is counted once)

## What visible columns mean

| Column | Source | Meaning |
|---|---|---|
| Rank (#) | Array index after sort | Position by totalUnlocks descending |
| Thumbnail | `drop.imageUrl` | Cover image, 28×28 rounded square |
| Title | `drop.title` | Drop name |
| Status | `drop.status` (normalized) | Current lifecycle state |
| Unwraps | `drop.totalUnlocks` | All-time unique unlock count |
| Clicks | `drop.totalClicks` | All-time card/link click count (hidden on mobile) |
| Price | `drop.unlockCost` | Current GumDrops cost to unlock |

## What debug fields prove the list is truthful

The `TopDropsTableDebugMeta` type exposes:
- `rankingSource` — declares the ranking data source
- `rankingMetric` — the metric used for sorting
- `tieBreaker` — how ties are resolved
- `searchMode` — how search operates (local-bounded)
- `paginationMode` — how pagination operates (bounded-result)
- `pageSize`, `currentPage` — current pagination state
- `totalDrops` — total drops in the bounded set
- `visibleDrops` — drops visible after search filter
- `searchQuery` — current search term
- `timeRangeKey` — current time range selection
- `thumbnailSource` — where thumbnails come from
- `dropMetadataSource` — where drop data comes from
- `clickSource`, `unwrapSource` — data sources for metrics
- `dedupeKeys` — how duplicates are prevented
- `excludedRecords` — what records are excluded and why
- `firstRenderMs` — time to first render
- `searchReadyMs` — time for last search to resolve
- `pageChangeMs` — time for last page change

## What future agents must NOT reintroduce

1. **Giant card sprawl** — the old TopDropsPanel used oversized article cards with excessive padding
2. **Standalone accordion** — top drops must remain inside the Revenue + Unwraps module
3. **Duplicate status labels** — each drop shows exactly one clean status pill
4. **Stale client ranking** — ranking source must always be declared in debug
5. **Offset pagination** — never use `.offset()` for Firestore queries
6. **Pink/fuchsia colors** — `#d946ef` and `#f472b6` are forbidden
7. **Full catalog hydration on search** — search must not fetch all drops from Firestore
8. **"Top performing drops" as section title** — use "Top drops in this range" or similar
9. **Revenue-per-drop without materialized source** — do not fake per-drop revenue from transaction joins
10. **Vague diagnostic labels** — "1 read issue" or bracket-jargon like `[PARTIAL]`

## Key files

| File | Role |
|---|---|
| `src/components/Admin/TopDropsTable.tsx` | Compact table component (search, pagination, rows) |
| `src/components/Admin/AdminAnalyticsCharts.tsx` | Parent: chart + metrics + top drops table |
| `src/app/admin/page.tsx` | Admin overview page (accordion host) |
| `src/app/api/admin/overview/route.ts` | Server API: top drops ranking + limit |
| `src/hooks/useAdminOverviewRealtime.ts` | Realtime listener: drops sorting + limit |
| `src/types/db.ts` | `Drop` interface definition |
| `docs/agent-truth/admin-revenue-trends.md` | Parent module source-of-truth |
| `tests/unit/admin-overview-truth.spec.ts` | Contract + validation tests |

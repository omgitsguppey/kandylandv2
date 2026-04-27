# Admin "Drops at a Glance" — Agent Source-of-Truth

> This document is the canonical agent-readable reference for the Admin Overview "Drops at a glance" accordion module.
> All agents working on this module must read this document before modifying any drops panel code.

## What the section does

The "Drops at a glance" section is an accordion module within the Admin Overview page (`/admin`). It shows:

1. **Action buttons**: Create drop, Drops manager link, Queue settings link
2. **Search bar**: Client-side substring filter on loaded drops by title
3. **Truth chip**: A dot + label showing the drops Firestore listener state (Live, Cached, Loading, Error)
4. **Summary counters**: Total, Live, Scheduled, Queued, Pending review — with a `[live]`/`[cached]`/`[filtered]` source label
5. **Compact card grid**: 2×2 mobile, 4-column xl — each card shows thumbnail, status pill, title, metrics, and action buttons
6. **Pagination**: 8 cards per page, with Previous/Next controls

## Data sources

### Primary: `useAdminDropsFeed` — Firestore realtime listener

| Property | Detail |
|---|---|
| Collection | `drops` |
| Query | `orderBy("validFrom", "desc")` |
| Listener type | `onSnapshot` (realtime) |
| Normalization | `normalizeDropRecordOrFallback()` from `drop-read-models.ts` |
| Error handling | `createAutoHealingObserver` with exponential backoff |
| `fromCache` tracking | Reads `snapshot.metadata.fromCache` on every callback |

The hook returns: `drops`, `legacyQueueIds`, `loading`, `loadError`, `fromCache`

### Secondary: Queue config — SWR polled

| Property | Detail |
|---|---|
| Endpoint | `/api/admin/queue` |
| Polling interval | 30 seconds |
| Hook | `useAdminPollingSWR<AdminDropQueueConfig>` |
| Purpose | Queue order, cooldown config, timesPerDay |

### Tertiary: `useNow` — 60-second interval clock

Used for time-sensitive status resolution (lifecycle kind, queue slot timing). Only enabled when `drops.length > 0`.

## How `fromCache` is detected and surfaced

1. `useAdminDropsFeed` reads `snapshot.metadata.fromCache` on each Firestore snapshot callback
2. State defaults to `fromCache = true` until first server-confirmed snapshot
3. The panel's `resolveDropsTruthLabel()` function maps state to:
   - `loadError` → `"Error"` (red dot)
   - `loading` → `"Loading…"` (gray dot, pulsing)
   - `fromCache === true` → `"Cached"` (amber dot)
   - `fromCache === false` → `"Live"` (green dot)
4. Summary counter chips show `[live]`, `[cached]`, or `[filtered]` labels below values

## Card sort order

Cards are sorted by **priority tier** then by **timestamp** (descending):

| Priority | Status | Rationale |
|---|---|---|
| 0 | Pending review | Needs admin action first |
| 1 | Rejected | Needs creator action |
| 2 | Live | Currently active — most operationally relevant |
| 3 | Queued | Scheduled for auto-rotation |
| 4 | Scheduled | Has a future `validFrom` date |
| 5 | Ended | Historical |

Within each tier, newer drops (higher `validFrom` or `createdAt`) appear first.

## Lifecycle resolution

Each drop's lifecycle kind is resolved by `resolveAdminDropLifecycleFacts()` from `admin-drop-lifecycle.ts`:

1. `approvalStatus === "pending_review"` → `pending_review`
2. `approvalStatus === "rejected"` → `rejected`
3. `resolveDropStatusFromTiming()` returns `"active"` → `live`
4. Queue-managed + cooldown → `cooldown`
5. Queue-managed + queued/scheduled → `queued`
6. Timing returns `"scheduled"` → `scheduled`
7. Default → `ended`

## Search behavior

- **Scope**: Client-side only — filters the `rows` array already loaded from Firestore
- **Match**: Case-insensitive substring on `drop.title`
- **Page reset**: Automatically resets to page 0 when search text changes
- **Counter update**: Summary counters reflect the filtered set, labeled `[filtered]`
- **Empty results**: Shows "No drops match" with a "Clear search" button
- **No Firestore query change**: Search does not trigger new Firestore queries

## Layout structure

```
┌──────────────────────────────────────────┐
│ [Create drop]  [Drops manager]  [Queue]  │  ← action buttons
├──────────────────────────────────────────┤
│ 🔍 Search drops…              ● Live    │  ← search + truth chip
├──────────────────────────────────────────┤
│ Total │ Live │ Sched │ Queue │ Pending  │  ← summary counters
│   12  │   3  │   2   │   4   │   1      │     with [live] labels
├─────────────┬────────────────────────────┤
│ ┌─────┐     │ ┌─────┐                   │
│ │Card1│     │ │Card2│                   │  ← 2×2 grid (mobile)
│ └─────┘     │ └─────┘                   │     4-col (xl)
│ ┌─────┐     │ ┌─────┐                   │
│ │Card3│     │ │Card4│                   │
│ └─────┘     │ └─────┘                   │
├──────────────────────────────────────────┤
│ 1–8 of 12                  [Prev] [Next] │  ← pagination
└──────────────────────────────────────────┘
```

## What must NEVER happen

1. **Never claim "Live" without checking `fromCache`** — if `snapshot.metadata.fromCache === true`, the data is from the Firestore client cache, not server-confirmed
2. **Never hide queue state** — if a drop is queue-managed, it must show the Queued status pill and queue label
3. **Never use bracket-prefixed developer jargon** — `[PARTIAL]`, `[DEGRADED]`, `[FEED]` are forbidden
4. **Never show stale counts without a source label** — counters must always indicate `[live]`, `[cached]`, or `[filtered]`
5. **Never add server-side search queries** without updating the Firestore index and documenting the query change here
6. **Never assume `drops` array is small** — while currently manageable, the client-side search will need a server query if the catalog grows past ~500 drops

## Key files

| File | Role |
|---|---|
| `src/components/Admin/AdminDropsAtGlancePanel.tsx` | UI component (cards, search, counters, pagination) |
| `src/hooks/useAdminDropsFeed.ts` | Firestore listener (drops + legacyQueueIds + fromCache) |
| `src/lib/admin-drop-lifecycle.ts` | Lifecycle kind resolver |
| `src/lib/admin-drop-formatting.ts` | Date/time formatting helpers |
| `src/lib/admin-drop-queue.ts` | Queue projection builder |
| `src/lib/admin-overview.ts` | Shared types + pagination helper |
| `src/lib/drop-read-models.ts` | Drop normalization utilities |
| `src/components/ui/TitleMarquee.tsx` | Title overflow marquee animation |
| `docs/agent-truth/admin-overview.md` | Parent module (Admin Overview) source-of-truth |
| `tests/unit/admin-overview-truth.spec.ts` | Targeted validation tests |

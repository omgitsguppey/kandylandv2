# Admin Analytics Overview — Agent Truth

> **Surface**: Admin Analytics top overview grid
> **Path**: `src/app/admin/analytics/page.tsx`
> **State hook**: `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
> **Realtime hook**: `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts`
> **Runtime**: `src/lib/admin-analytics-live-runtime.ts`

---

## Why the Old Design Was Purged

The previous "Mobile Monitoring Station" surface violated the truth-first doctrine:

- **Fake zeros**: Revenue showed `$0.00` and Purchases showed `0` when the historical API had not responded. These were default values from `commerce.revenueUsd` and `funnel.purchases`, not actual data.
- **Vague labels**: Truth chips showed generic "Cached" or "Fallback" instead of honest per-metric provenance.
- **Vertical sprawl**: Giant tile-based tab nav, a multi-paragraph module filter explanation card, and multi-paragraph alert banners consumed excessive scroll depth before any analytical content.
- **No `fromCache` tracking**: Firestore listeners did not use `includeMetadataChanges`, so cache vs server truth was unknowable.
- **No debug instrumentation**: No mechanism for operator tooling to inspect metric provenance at runtime.

---

## Canonical Source Hierarchy

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | **Firestore realtime** | Live `onSnapshot` with `includeMetadataChanges: true` across 4 collections |
| 2 | **Server-confirmed API** | `/api/admin/analytics/historical` and `/api/admin/analytics/realtime` |
| 3 | **Polled fallback** | API polling when realtime listeners fail |
| 4 | **Unavailable** | No data source has responded; display `"—"` with `unavailable` truth chip |

---

## Metric Registry

| Metric | Canonical Source | Fake-Zero Protected |
|--------|-----------------|---------------------|
| **Live Active** | Firestore realtime → API polling fallback | Yes — `"—"` when `effectiveLiveResponse` is null |
| **Mobile Share** | `/api/admin/analytics/historical` devices breakdown | Yes — `"—"` when `historicalResponse` is null |
| **Revenue** | `/api/admin/analytics/historical` commerce.revenueUsd | Yes — `"—"` when `historicalResponse` is null |
| **Purchases** | `/api/admin/analytics/historical` funnel.purchases | Yes — `"—"` when `historicalResponse` is null |

---

## Truth Chip Vocabulary

| Chip | Meaning | When |
|------|---------|------|
| `live` | Server-confirmed, fresh data | API responded with no errors |
| `stale` | Serving previous response; revalidation failed | `historicalResponse` exists but `historicalError` also exists |
| `failed` | No data and not loading | No response and not in loading state |
| `unavailable` | Source has not loaded yet | Response is null, displayed as `"—"` |
| `fallback` | Realtime failed, using polled data | Live feed fell back to API polling |
| No chip | Still loading | `historicalLoading === true` |

---

## Fake-Zero Prevention Policy

**Rule**: If a data source has not responded, display `"—"` (em dash) instead of a computed value. Never display `$0.00`, `0`, or `0%` as if they are real data when the source is unavailable.

**Implementation**:
```typescript
const revenueDisplay = historicalResponse ? formatMoney(commerce.revenueUsd) : "—";
const purchasesDisplay = historicalResponse ? formatCompactNumber(funnel.purchases) : "—";
const mobileShareDisplay = historicalResponse ? formatPercent(mobileShare) : "—";
const liveActiveDisplay = effectiveLiveResponse ? formatCompactNumber(effectiveLiveResponse.totalActive ?? 0) : "—";
```

---

## Realtime Observer Architecture

Four Firestore listeners, each with `includeMetadataChanges: true`:

| Listener | Collection | Order Field |
|----------|-----------|-------------|
| eventFacts | `analytics_event_facts` | `timestamp` desc |
| guestBatches | `analytics_guest_batches` | `receivedAtMs` desc |
| guestSessions | `analytics_sessions` | `lastReceivedAtMs` desc |
| watchSessions | `analytics_watch_sessions` | `lastSeenAtMs` desc |

Each listener tracks:
- `loaded` / `failed` / `fromCache` state
- `mountedAtMs` — when the listener was mounted
- `lastEventAtMs` — last time any snapshot was received
- `lastServerConfirmedAtMs` — last time a `fromCache === false` snapshot was received
- `errorMessage` — last error message if failed

All exposed via `listenerDebugMeta` in the hook return for admin debug panels.

---

## Debug Meta Registry

The hook exports `analyticsOverviewDebugMeta` with:
- Per-metric: `canonicalSource`, `currentSource`, `truthState`, `value`, `isFakeZero`
- `realtimeListenerDebug` — full listener health
- `historicalTruthState` / `historicalSourceLabel`
- `backgroundIssueCount`
- `analyticsWarmState`

---

## Layout Density Rules

- MetricCard padding: `p-2.5` (not `p-3.5`)
- Value font: `text-[1.45rem]` (not `text-[1.7rem]`)
- Tab nav: inline segmented controls (`flex flex-wrap gap-1.5`) with `py-1.5 px-3 text-xs`, not tile grid
- Module filter explanation: **purged entirely** — replaced with conditional clear-filter button
- Alert banner: single-line compact (`px-3 py-2`, icon + inline text), not multi-paragraph
- Loading spinner min-height: `20vh` (not `40vh`)

---

## Prohibited Patterns

1. **"Mobile Monitoring Station"** branding — purged, do not reintroduce
2. **"Cached" as a normal state** — use `live` / `stale` / `unavailable` instead
3. **Fake zero display** — always use `"—"` when source is unavailable
4. **Multi-paragraph alert banners** — use single-line `"Degraded: issue1 · issue2"`
5. **Module filter explanation cards** — documentation belongs in docs, not in the UI
6. **Tile-based tab nav** — use compact inline segmented controls
7. **`onSnapshot` without `includeMetadataChanges`** — required for `fromCache` tracking

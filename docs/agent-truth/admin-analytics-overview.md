# Admin Analytics Overview

Surface: `src/app/admin/analytics/page.tsx`

State owner: `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`

Card primitive: `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx`

## Badge Containment Rule

Metric card badges must never overflow card containers. The card header owns a two-column layout: flexible label content with `min-w-0`, and a constrained badge slot with a max width.

Visible badge labels stay short:

- LIVE
- UPDATED
- REFRESHING
- DELAYED
- EST
- PARTIAL
- WAIT
- REVIEW
- ERROR
- SNAP

Full status detail belongs in `title`, `aria-label`, and Admin Debug metadata. Do not place long source descriptions inside the visible badge.

## Analytics Hydration Rule

Admin Analytics overview cards must render immediately. If fresh realtime or historical data is not ready, the shell shows a truthful state instead of waiting for the slowest analytics source.

The last verified overview snapshot should render quickly while `/api/admin/analytics/historical` refreshes in the background. When server-confirmed data arrives, it replaces the snapshot. If refresh fails, the snapshot remains visible and is labeled as last verified or delayed.

## Fake-Zero Prevention

Fake zeros are forbidden unless zero is server-confirmed. Revenue, purchases, mobile share, and live active show a verified value when a snapshot exists, or a specific no-snapshot/waiting label when no verified snapshot exists. Loading longer than 3 seconds while a snapshot exists is a hydration regression and must be reported in debug metadata.

## Degraded Copy Rule

The main UI gets one short plain-English delayed sentence:

`Live updates are delayed. Showing last verified data.`

If historical guest traffic is estimated, a second short line is allowed:

`Guest traffic is estimated for this range.`

## Prohibited Patterns

Detailed lane failures belong in Admin Debug. Avoid jargon such as `identified event realtime lane`, `guest batch realtime lane`, `viewer watch-session realtime lane`, `failed closed`, and `polled route snapshot` in the main visible UI.

## Debug Metadata

The page exposes `window.__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__` with per-metric fields:

- `metricKey`
- `visibleValue`
- `valueSource`
- `truthState`
- `badgeLabel`
- `fullStatusLabel`
- `fromCache`
- `serverConfirmed`
- `stale`
- `lastValidatedAt`
- `realtimeLaneStatus`
- `backendSnapshotStatus`
- `backendRefreshStatus`
- `hydrationMs`
- `firstTruthyValueMs`
- `exceededHydrationBudget`
- `usedFallbackSnapshot`
- `fakeZeroPrevented`

The Admin Debug route also exposes an `adminAnalyticsOverview` contract pointer so agents know where to inspect the client-side runtime metadata.

## Official Source Basis

- Firestore listeners need `includeMetadataChanges` when UI logic depends on cache/server metadata: https://firebase.google.com/docs/firestore/query-data/listen
- Firestore `SnapshotMetadata.fromCache` distinguishes cached snapshots from server-current snapshots: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- GA4 BigQuery daily tables are the completed export surface, while `events_intraday_YYYYMMDD` is continuously populated and removed after the daily table is complete: https://support.google.com/analytics/answer/7029846

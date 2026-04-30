# Admin Analytics Audience Snapshot

Audience Snapshot shows selected-range audience shape. It must not imply authenticated-only data is total audience, and it must not hide guest/public uncertainty.

## Source Meaning

- GA users: total users reported by Google Analytics for the selected range.
- Identified first-party traffic: KandyDrops first-party authenticated activity, currently exposed as identified views and sessions, not a distinct identified-user count in this route.
- Guest visits: anonymous/public traffic from first-party anonymous batches when available.
- Estimated guest visits: used only when first-party anonymous batches are missing and GA totals can be compared with identified first-party traffic for the same range.
- Sessions, views, average session, and engagement: GA metrics, with sessions/views allowed to use first-party fallback when that backend source is higher for the same range.

## Guest Estimate Rule

Guest/public traffic may be estimated only for the selected range and only when GA totals and identified first-party traffic are both present. The formula lives in debug metadata:

`max(exact guest visits, GA total views - identified first-party views)`

If the raw estimate is negative, clamp to zero only with `guestEstimateClamped: true` and a debug warning. The main UI says `Guest traffic is estimated until anonymous batches arrive.`

## Identified-Only Rule

If GA totals are unavailable and only identified first-party activity is available, the UI must say `identified only`. Future agents must not display authenticated-only or identified-only activity as total audience.

## Fake Zero Rule

Do not show zero for unavailable/null audience sources. Show `Waiting` while loading and `Unavailable` when no validated source exists. A numeric zero is allowed only when the backend source is server-confirmed.

## GA4 Daily vs Intraday

GA4 BigQuery `events_YYYYMMDD` daily tables are the stable completed-day export. `events_intraday_YYYYMMDD` is current-day streaming data and can be incomplete. This route currently receives GA Data API results, so BigQuery daily/intraday availability is marked `unknown_from_data_api_route` in debug rather than guessed.

## First-Party Anonymous Batches

First-party anonymous batches are the preferred source for exact guest/public traffic. When they are missing, the UI may show estimated guest traffic, but the estimate must be visibly labeled as estimated and the formula must remain in debug metadata.

## Chart Rule

The Audience Snapshot primary line is white. A second comparative line may remain purple only when its source is labeled in the legend. Mobile chart height must stay compact; current token is `h-44 md:h-64`.

## Badge Rule

Audience Snapshot metric badges use the shared metric-card containment behavior. Visible labels stay short: `LIVE`, `STALE`, `EST`, `CACHE`, `WAIT`, `ERROR`. Full details belong in tooltip, aria/title, and debug metadata.

## Debug Metadata

The page exposes `window.__KANDYDROPS_ADMIN_ANALYTICS_AUDIENCE_SNAPSHOT_DEBUG__` with selected range, metric values, source classifications, cache/refresh state, guest estimate formula/clamp status, chart series sources, chart height token, badge containment state, and fake-zero prevention state. The Admin Debug route exposes `adminAnalyticsAudienceSnapshot` as the agent-readable pointer.

## Official Source Basis

- GA4 BigQuery daily tables use `events_YYYYMMDD`; intraday streaming uses `events_intraday_YYYYMMDD` and is not the stable completed-day export: https://support.google.com/analytics/answer/7029846
- Firestore cache/server state must use `SnapshotMetadata.fromCache` when cache truth matters: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firestore listeners need `includeMetadataChanges` to receive metadata-only cache/server transitions: https://firebase.google.com/docs/firestore/query-data/listen

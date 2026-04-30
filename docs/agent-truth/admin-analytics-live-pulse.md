# Admin Analytics Live Pulse

Live Pulse shows first-party realtime presence for the last 30 minutes: active actors, guest/auth mix, top surfaces, graph health, and active identity context.

## Source Hierarchy

First-party realtime presence is the preferred source for Live Pulse. In this codebase the Admin Analytics Live Pulse surface currently reads Firestore realtime listeners over `analytics_event_facts`, `analytics_guest_batches`, `analytics_sessions`, and `analytics_watch_sessions`.

Backend or polled snapshots are fallback/snapshot data, not exact live presence. GA4 intraday and BigQuery `events_intraday_YYYYMMDD` are live-ish analytics sources and may be incomplete; they must not be labeled as exact first-party presence. GA4 daily `events_YYYYMMDD` tables are the stable completed-day source and are not a realtime presence source.

## Presence Lifecycle

If a future implementation uses Firebase Realtime Database presence, it must register `onDisconnect` before writing online state. The disconnect operation must be re-established after reconnect. Presence rows should include a last-seen server timestamp where possible.

Short rule for agents: onDisconnect before writing online state, every time.

If Firestore listeners drive the UI, cache/server transitions must be explicit. Use `includeMetadataChanges` when `SnapshotMetadata.fromCache` affects truth labels.

## Active Identities

Raw IDs must not be the primary visible label. Active identity rows should show:

- actor type: guest, user, admin, or creator when available
- display label: username, display name, safe email prefix, or a short session fallback
- route/surface
- event/action
- last seen
- freshness/truth state
- source classification

Full raw IDs belong in Admin Debug or a detail/title field, not in the main label.

## Graph Hydration

The chart shell should render immediately. If realtime graph points exist, chart them. If active presence rows exist but the graph has no points, derive a lightweight graph from presence timestamps and expose `graphDerivedFromPresence` plus `graphSourceMismatch` in Debug. If no source exists, show a compact waiting/unavailable state instead of a large blank chart.

Graph hydration metadata must include first presence row timing, first graph point timing, graph point count, graph hydrated state, and whether the 3 second budget was exceeded.

## UI Rule

Live Pulse should be compact on mobile. Use a small metric strip, compact chart height, dense surface rows, and compact active identity rows. Do not reintroduce giant identity cards or oversized blank charts.

Approved visible status labels are LIVE, STALE, SNAP, WAIT, ERROR, GUEST, and AUTH. Full source explanations belong in Admin Debug.

Official references:
- [Firebase Realtime Database offline and presence](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Firebase OnDisconnect JavaScript API](https://firebase.google.com/docs/reference/js/database.ondisconnect)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)

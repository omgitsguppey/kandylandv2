# Admin Analytics Live Pulse

Activity Snapshot shows first-party recent activity for the last 30 minutes: active actors, guest/auth mix, top surfaces, graph health, and active identity context.

## Source Hierarchy

First-party materialized snapshots are the preferred source for the compact Admin Analytics activity view. In this codebase the Admin Analytics surface uses the snapshot-first realtime route and `analytics_admin_metric_snapshots`; the old client Firestore listener hook has been retired from the default display path.

GA4 intraday and BigQuery `events_intraday_YYYYMMDD` are second-source analytics evidence and may be incomplete; they must not be labeled as exact first-party presence. GA4 daily `events_YYYYMMDD` tables are the stable completed-day source and are not a first-party product-truth source.

## Presence Lifecycle

If a future implementation uses Firebase Realtime Database presence, it must register `onDisconnect` before writing online state. The disconnect operation must be re-established after reconnect. Presence rows should include a last-seen server timestamp where possible.

Short rule for agents: onDisconnect before writing online state, every time.

If a future explicit debug-only Firestore listener is approved, cache/server transitions must be explicit. Use `includeMetadataChanges` when `SnapshotMetadata.fromCache` affects truth labels, keep the listener out of default Admin Analytics, and show the fallback snapshot path.

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

Activity Snapshot should be compact on mobile. Use a small metric strip, compact chart height, dense surface rows, and compact active identity rows. Do not reintroduce giant identity cards or oversized blank charts.

Approved visible status labels are Current, Cached, Refresh due, Collecting, No source, Failed, Guest, and Signed in. Full source explanations belong in Admin Debug.

## Phase 5 Snapshot Migration

Activity Snapshot reads the Admin Analytics snapshot registry and snapshot-first route first. Raw client listeners are not a default display dependency. Raw actor IDs stay out of primary labels, and graph hydration mismatches, actor/session classification, source freshness, and fake-zero prevention go to Admin Debug.

Official references:
- [Firebase Realtime Database offline and presence](https://firebase.google.com/docs/database/web/offline-capabilities)
- [Firebase OnDisconnect JavaScript API](https://firebase.google.com/docs/reference/js/database.ondisconnect)
- [Firestore realtime listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firestore offline metadata](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [GA4 BigQuery export](https://support.google.com/analytics/answer/9358801)
- [GA4 BigQuery export schema](https://support.google.com/analytics/answer/7029846)

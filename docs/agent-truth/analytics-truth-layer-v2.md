# Analytics Truth Layer v2

Status: Phase 1 doctrine and discovery contract
Last updated: 2026-04-30

## Purpose

Analytics Truth Layer v2 is the repo contract for moving Admin Analytics away from realtime-dependent loading and toward verified, source-labeled analytics. This phase does not rewrite behavior. It maps the truth model, source hierarchy, module blast radius, and validation expectations that later phases must implement.

## New Doctrine

Admin Analytics must render the latest verified hot cache snapshot first when one exists. A verified hot cache snapshot is a server-built read model with source metadata, validation metadata, and a timestamp that proves when it was last built.

Realtime listeners are an upgrade path, not the only loading path. A realtime listener may improve values after the hot cache has rendered, but it must not block the dashboard from showing verified cached facts. When a listener is used, `SnapshotMetadata.fromCache` and `hasPendingWrites` must be respected before the UI calls the data server-confirmed.

Manual refresh is allowed. A manual refresh must start a backend rebuild or route refresh, dedupe concurrent refreshes, expose refresh status, and keep the last verified snapshot visible while the refresh runs.

Blank loading is forbidden when a verified snapshot exists. The shell can show a loading state only before any verified snapshot is available. If a verified snapshot is stale, show it as `[stale]` or `[cached]` and explain that refresh is pending or available.

Fake live states are forbidden. A value is live only when the source proves it is current enough for that module and the source path is server-confirmed or explicitly realtime with metadata.

Fake zeros are forbidden. A zero can render only when the denominator/source is present and confirms zero. Missing, partial, delayed, or unavailable sources must render `Waiting`, `Unavailable`, `No sample`, or another explicit non-zero fallback label.

## Deprecated Doctrine

The old realtime-only loading dependency is deprecated. It made the admin dashboard wait on listener hydration, GA4 live-ish data, or polled route snapshots even when a verified backend snapshot already existed. It also encouraged blank sections, fake live labels, fake zero values, and module-specific fallback logic.

The replacement doctrine is:

1. Read verified hot cache first.
2. Show its source, freshness, and selected range immediately.
3. Start realtime upgrade or background refresh second.
4. Label cache, stale, intraday, estimated, fallback, and unavailable states plainly.
5. Expose parity and failure detail in Admin Debug.

## Truth Lanes

### Raw Event Ledger

The raw event ledger is first-party KandyDrops telemetry, such as `analytics_event_facts`, guest batches, task lifecycle logs, watch sessions, purchase facts, unlock facts, notification facts, and route diagnostics. It is the product behavior source before provider exports. Raw events are not automatically funnels, unique users, ordered journeys, or live presence unless the model proves those definitions.

### Identity Graph

The identity graph links anonymous sessions, guest visitors, authenticated users, creators, admins, and system actors without erasing earlier guest history. A guest-to-user link should add an identity link event and preserve the original guest session lane. Admin, creator, and system actions must stay separate from user and guest analytics unless a module explicitly tracks those actor lanes.

### Verified Hot Cache Snapshot

A verified hot cache snapshot is the fast admin display truth. It is a materialized backend read model with:

- selected range
- generated timestamp
- source labels
- cache state
- stale state
- validation state
- enough payload fields for the module to avoid fake zeros

Admin Analytics should prefer these snapshots for first paint. Later phases should consolidate module-specific caches behind a consistent snapshot shape.

### Realtime Listener Upgrade

Realtime upgrade means Firestore or RTDB listeners can replace or enrich the hot cache after first render. Listener values must expose:

- `fromCache`
- `hasPendingWrites`
- server confirmation where available
- reconnect or fallback status
- whether the listener is guest-inclusive, authenticated-only, admin-only, or mixed

Firestore cached snapshots can render as cached or waiting, but not server-confirmed live. Local pending writes are not admin truth.

### GA4 and BigQuery Validation

GA4 and BigQuery are verification/export lanes, not product truth by default. BigQuery daily `events_YYYYMMDD` tables are stable historical exports for completed days. BigQuery intraday `events_intraday_YYYYMMDD` tables and GA4 realtime/current-day reports are incomplete/live-ish and must be labeled directional or intraday.

GA4 totals may support audience or event validation, but raw GA event counts must not replace first-party product records without a reconciliation rule and a visible source label.

### Admin Debug Parity Validation

Admin Debug is where detailed source and parity checks belong. It should compare first-party ledger, hot cache snapshots, realtime listeners, BigQuery/GA4, backend cache, and legacy recovered data. Analytics modules should show compact operator signals; Debug should show detailed formulas, drift, missing samples, stale cache, and recovery status.

## Actor Separation

Analytics must separate these lanes:

- guest
- anonymous visitor
- session
- authenticated user
- creator
- admin
- system
- unknown

Guest/public analytics are not authenticated-user analytics. Creator behavior is not ordinary fan behavior unless the module intentionally tracks creator operations. Admin and system events must be excluded from user/guest behavior analytics by default and visible in Debug as excluded counts when relevant.

## Global Events vs User Behavior

Global event tracking counts everything that happened in a selected range after source filters. Specific user behavioral tracking follows actor identity, session, route, action, and time order. A high event count does not prove a unique user count, a sequential funnel, a live session, or a successful user journey.

Admin modules must name their counting mode:

- raw events
- unique users
- unique sessions
- ordered journey
- state-derived
- mixed
- estimated
- unavailable

## Legacy Data Recovery

Legacy recovery is allowed when older data uses an older field name, document id shape, or rollup format. Recovery must:

- preserve the selected range
- name the recovered fields or collections in Debug
- never silently overwrite stronger canonical facts
- expose stale or compatibility status when the recovered data is not current
- avoid fake zeros when legacy data is missing

Examples include historical page rollups deriving date from document ids, accepting legacy view fields, or reading old task lifecycle log shapes.

## Labeling Rule

Every admin analytics value must carry a source truth label. Required states include:

- live
- cached
- stale
- fallback
- partial
- estimated
- intraday
- unavailable
- failed
- loading

Unlabeled stale cache, unlabeled fallback, unlabeled intraday/current-day GA4, and unlabeled estimates are forbidden.

## Manual Refresh Rule

Manual refresh belongs in Analytics only as a compact control or module action. It must:

- keep the last verified snapshot visible
- dedupe duplicate refresh requests
- show refresh status in Debug
- label failed refreshes without clearing verified data
- record last refresh attempt and last validated timestamp

Refresh does not make a value live by itself. The source freshness decides the label.

## Admin Analytics vs Admin Debug

Admin Analytics is the operator insight surface. It should show compact, source-labeled, actionable summaries.

Admin Debug is the validation surface. It should show source hierarchy, raw counts, formulas, parity checks, missing samples, drift, stale cache, route health, and recovery details.

Long audit lists, raw backend lane names, and detailed parity failures belong in Debug. Analytics can show a compact health or truth summary that links to Debug.

## Phase Plan

Phase 1 creates doctrine, file inventory, source hierarchy, actor taxonomy, module map, machine-readable index, and a targeted validation guard. It must not rewrite production analytics behavior.

Phase 2 should add shared snapshot contracts and module normalizers without changing UI scale beyond the targeted module work already approved.

Phase 3 should move module hydration to verified hot cache first, realtime upgrade second, and manual refresh third.

Phase 4 should centralize Admin Debug parity validation and legacy recovery reporting.

Phase 5 should remove obsolete realtime-only fallbacks and stale route snapshots after parity proves replacement coverage.

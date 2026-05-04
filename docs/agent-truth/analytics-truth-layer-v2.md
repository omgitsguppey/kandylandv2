# Analytics Truth Layer v2

Status: Phase 1 doctrine and discovery contract
Last updated: 2026-04-30

## Purpose

Analytics Truth Layer v2 is the repo contract for moving Admin Analytics away from realtime-dependent loading and toward verified, source-labeled analytics. This phase does not rewrite behavior. It maps the truth model, source hierarchy, module blast radius, and validation expectations that later phases must implement.

## 2026-05-01 Human-Readable Admin Copy Update

Admin Analytics now has a required operator/developer copy split. Primary module copy must say plain-English states such as "Live updates are delayed. Showing last verified data.", "Guest traffic is estimated for this range.", "Purchase tracking needs review.", or "No verified data yet. Refresh to check again." Exact route names, collection names, formulas, parity deltas, raw event keys, and source paths belong in Debug technical evidence. Future agents must use `src/lib/admin-copy/admin-truth-copy.ts` and `docs/agent-truth/human-readable-admin-truth.md` before adding new Admin Analytics status copy.

## 2026-05-01 Refresh-Based Cache Update

Refresh-based cache now outranks time-limit display gating. A verified snapshot remains displayable after its ideal freshness window and becomes `stale_but_verified` instead of disappearing. Manual and background refresh replace that snapshot only after a new payload is verified; refresh failure records metadata and leaves the last verified value visible. The central contract is `src/lib/cache/refresh-cache-contract.ts`, and Admin Debug exposes cache key, refresh/source version, invalidation, estimate, and blocking metadata.

## New Doctrine

Admin Analytics must render the latest verified hot cache snapshot first when one exists. A verified hot cache snapshot is a server-built read model with source metadata, validation metadata, and a timestamp that proves when it was last built.

Realtime listeners are an upgrade path, not the only loading path. A realtime listener may improve values after the hot cache has rendered, but it must not block the dashboard from showing verified cached facts. When a listener is used, `SnapshotMetadata.fromCache` and `hasPendingWrites` must be respected before the UI calls the data server-confirmed.

In implementation terms, realtime is an upgrade. Missing realtime can annotate a rendered snapshot, but it cannot blank a module that already has a verified snapshot or last validated backend snapshot.

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

Watch sessions are stronger than page duration for content engagement only when they prove foreground visible viewer content. They must exclude hidden, offscreen, modal-covered, and idle intervals; behavioral scoring must label current rollups as `watch_session_rollup` and legacy duration fallbacks as `legacy_page_duration`.

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

## Ingest Boundary Rule

Every writer into `analytics_event_facts` must resolve event names through the shared telemetry catalog before write. Client-side `trackEvent` and server-side `trackServerEvent` already reject unsupported names, and `/api/analytics/ingest-identified` must do the same at the route boundary because posted payloads cannot be trusted just because the current browser client is clean.

Compatibility aliases can be accepted only when they are stored as their canonical event name and preserve the original name in legacy metadata such as `legacy_event_name`. Diagnostics that are not cataloged product events belong in server diagnostics, not in analytics facts.

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

## Phase 2 Canonical Event Spine

Phase 2 adds the typed event spine without rewriting every emitter. The canonical contract lives at `src/lib/analytics/analytics-event-contract.ts` and every future analytics writer, cache materializer, validator, and Debug surface should converge on it.

A canonical event must carry:

- `eventId`, `eventName`, `eventVersion`, `schemaVersion`
- `occurredAt` and `receivedAt`
- actor fields: `actorType`, `anonymousVisitorId`, `sessionId`, `userId`, `creatorId`, `adminId`
- surface fields: `surface`, `route`, `component`
- object fields: `objectType`, `objectId`
- source fields: `source`, `consentState`, `dedupeKey`
- legacy fields: `legacySource`, `legacyId`, `legacyConfidence`, `mappingWarnings`

The contract separates global event tracking from user behavior. Global events may include guest, user, creator, admin, system, and unknown actor lanes, but they must preserve actor classification. User behavior lanes must exclude admin and system events, and creator events must stay in the creator lane unless a module explicitly and visibly compares lanes.

`identity_linked` is the required bridge from anonymous/session history to authenticated user history. It records the anonymous visitor id, session id, user id, link timestamp, method, eligible past sessions when safe, source, and confidence. It does not rewrite old guest events into user events.

## Phase 2 Debug Contract

Event-level Debug metadata should be able to show:

- actor classification and reasons
- source lane
- guest/user/creator/admin/system separation
- inclusion or exclusion reason
- dedupe key
- identity linkage state
- legacy mapping confidence
- fake-zero prevention rule

This metadata belongs in Admin Debug and validation helpers first. Admin Analytics modules can consume it later after their hot-cache snapshots are refactored.

## Phase 2 Legacy Recovery

Legacy recovery is documented in `docs/agent-truth/analytics-legacy-recovery.md` and implemented as a mapper skeleton in `src/lib/analytics/legacy-event-mapping.ts`. The mapper creates canonical event-shaped candidates from old sources and marks them with `legacySource`, `legacyConfidence`, and `mappingWarnings`.

Legacy-derived records are not server-confirmed current events. They are directional until a future backfill dry run, parity check, and versioned write path proves otherwise.

## Phase 3 Verified Hot-Cache Snapshots

Phase 3 adds the Admin Analytics snapshot layer. The snapshot contract lives at `src/lib/analytics/admin-metric-snapshot.ts`, storage and refresh state live at `src/lib/server/admin-analytics-snapshots.ts`, and module registry ownership lives at `src/lib/server/admin-analytics-materializers.ts`.

Snapshots are persisted in `analytics_admin_metric_snapshots`. Admin Analytics should read the latest verified snapshot first through the safe client helper in `src/hooks/useAdminAnalyticsSnapshot.ts`, then use `/api/admin/analytics/refresh` for manual or background refresh. Existing realtime and historical routes are not deleted in this phase; they remain old data paths until module-by-module migration proves parity.

Phase 3 source modes are `live`, `verified_cache`, `stale_cache`, `intraday`, `estimated`, `fallback`, `unavailable`, and `mixed`. A snapshot cannot be called verified without `lastVerifiedAt`, formulas/source metadata, and fake-zero protection. If a materializer is not ready, it must return an unavailable snapshot with the reason and Debug parity metadata.

Admin Debug exposes snapshot metadata so operators and future agents can inspect module/range freshness, refresh status, duplicate refresh prevention, source breakdown, formulas, warnings, parity, legacy confidence, stale reasons, and unavailable reasons.

## Phase Plan

Phase 1 creates doctrine, file inventory, source hierarchy, actor taxonomy, module map, machine-readable index, and a targeted validation guard. It must not rewrite production analytics behavior.

Phase 2 adds the canonical event contract, actor/session identity lanes, exclusion helpers, identity link event, legacy recovery plan, and legacy mapper skeleton.

Phase 3 adds the verified hot-cache snapshot contract, storage helper, refresh route, materializer registry, snapshot-first client helper, and Admin Debug metadata.

Phase 4 centralizes Admin Debug parity validation and legacy recovery reporting.

## Phase 5 Admin Analytics Migration

Phase 5 migrates Admin Analytics and Admin Debug onto the verified hot-cache snapshot architecture. Admin Analytics renders compact operator-facing modules from the latest verified snapshot first, keeps stale verified snapshots visible while refresh runs, and treats realtime listeners or old historical routes as upgrades rather than loading dependencies.

Every Admin Analytics module must expose `sourceMode`, `truthState`, `lastVerifiedAt`, `refreshStatus`, and a `debugPath`. Manual refresh is allowed through the snapshot refresh route, but duplicate refresh storms must be prevented and refresh failures must not erase the last verified snapshot.

Admin Analytics visible copy stays short and plain English. It must not show fake zeros, fake live labels, raw backend jargon, authenticated-only values as total audience, raw event ratios as ordered funnels, or task telemetry counts as canonical lifecycle without reconciliation. Full formulas, parity checks, source breakdowns, legacy recovery details, lane failures, actor classification, and validation proof live in Admin Debug.

The page exposes Phase 5 migration metadata through `window.__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__` and the Admin Debug route exposes `adminAnalyticsSnapshotMigration`.

Phase 5 does not delete old routes yet. Compatibility remains until snapshot parity proves each replacement lane.

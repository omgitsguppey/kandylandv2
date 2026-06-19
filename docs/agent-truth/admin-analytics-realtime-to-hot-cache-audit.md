# Admin Analytics Realtime To Hot Cache Audit

Admin Analytics must not treat realtime as the primary loading dependency. Realtime is an upgrade only when an explicit debug/operator exception owns it. The first render path is the latest verified snapshot, verified route hot cache, or last validated backend snapshot for the selected range. Raw client listeners are not part of the default compact Admin Analytics display path.

## Policy

- A verified snapshot or backend hot cache renders first.
- A stale cache renders with a stale label instead of pretending to be live.
- Raw listener failure is a Debug-only concern when an explicit debug listener exists.
- Missing raw realtime does not make a module unavailable when snapshot values exist.
- No fake zero: null or unavailable metrics stay unavailable until a source confirms zero.
- Manual refresh keeps the snapshot visible while refresh runs.
- Detailed source paths, listener failures, and parity proof belong in Admin Debug.

## Findings

`live_pulse` had the active contradiction. The old state hook merged the backend realtime route and client Firestore listeners, but still passed the listener `failed` state into the Live Pulse model even when the backend route/hot summary was available. That made the visible module say it was unavailable while the page banner said a last validated backend snapshot was showing.

The fix adds `resolveAdminAnalyticsDisplayState` and applies it to Activity Snapshot. If a backend snapshot exists, Admin Analytics renders the snapshot and keeps raw listener details out of the compact display path. Graph gaps are scoped to the graph area only.

## Module Source Order

- `platform_pulse`: historical backend route plus realtime hot summary; realtime is not a first-render blocker.
- `audience_snapshot`: historical backend route/section override; no pure realtime dependency found.
- `commerce_snapshot`: historical backend route/section override; no pure realtime dependency found.
- `live_pulse`: backend hot summary or snapshot first; raw client listener hook retired.
- `journey_funnel`: historical backend route/section override; no pure realtime dependency found.
- `auth_outcomes`: historical backend route/section override; no pure realtime dependency found.
- `onboarding_performance`: historical backend route/section override; no pure realtime dependency found.
- `daily_task_pipeline`: historical backend route/section override; no pure realtime dependency found.
- `notification_funnel`: historical backend route/section override; no pure realtime dependency found.
- `event_mix`: historical backend route/section override; no pure realtime dependency found.
- `live_interaction_stream`: historical recent-event rows with source labels; realtime-adjacent but not a first-render blocker.
- `data_health_summary`: Debug validation metadata only.

## Fixed

- Added the shared display state policy helper.
- Activity Snapshot now resolves snapshot/hot-cache source order before rendering module state.
- Activity Snapshot no longer uses missing realtime as the top-level unavailable state when a backend snapshot exists.
- The retired raw Firestore listener hook is no longer preserved as source coverage.
- Surface detail empty state no longer exposes presence-row jargon.
- Admin Debug metadata now documents display source, snapshot availability, realtime listener state, fallback snapshot use, fake-zero prevention, and lane failures.
- The module-by-module audit now lives in this compact doc. `agent/state/admin-analytics-realtime-hot-cache.generated.json` records the current retired-listener and snapshot-first evidence.

## Remains

Persisted per-module materializers still need promotion for modules whose snapshot registry entries are placeholders. That is separate from this pass. Until then, the existing historical backend route and realtime hot summary are the verified display sources for affected modules.

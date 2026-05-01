# Admin Analytics Realtime To Hot Cache Audit

Admin Analytics must not treat realtime as the primary loading dependency. Realtime is an upgrade. The first render path is the latest verified snapshot, verified route hot cache, or last validated backend snapshot for the selected range. Realtime listeners can upgrade the module or annotate freshness after the verified source is already visible.

## Policy

- A verified snapshot or backend hot cache renders first.
- A stale cache renders with a stale label instead of pretending to be live.
- Realtime listener failure is a Debug lane failure when snapshot values exist.
- Missing realtime does not make a module unavailable when snapshot values exist.
- No fake zero: null or unavailable metrics stay unavailable until a source confirms zero.
- Manual refresh keeps the snapshot visible while refresh runs.
- Detailed source paths, listener failures, and parity proof belong in Admin Debug.

## Findings

`live_pulse` had the active contradiction. The state hook merged the backend realtime route and client Firestore listeners, but still passed the listener `failed` state into the Live Pulse model even when the backend route/hot summary was available. That made the visible module say it was unavailable while the page banner said a last validated backend snapshot was showing.

The fix adds `resolveAdminAnalyticsDisplayState` and applies it to Live Pulse. If a backend snapshot exists, Live Pulse now renders the snapshot, labels realtime as delayed, and keeps listener details in Debug/client metadata. Graph gaps are scoped to the graph area only.

## Module Source Order

- `platform_pulse`: historical backend route plus realtime hot summary; realtime is not a first-render blocker.
- `audience_snapshot`: historical backend route/section override; no pure realtime dependency found.
- `commerce_snapshot`: historical backend route/section override; no pure realtime dependency found.
- `live_pulse`: backend hot summary or snapshot first; realtime listener is upgrade-only.
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
- Live Pulse now resolves snapshot/hot-cache source order before rendering module state.
- Live Pulse no longer uses missing realtime as the top-level unavailable state when a backend snapshot exists.
- The chart empty state now says `Graph waiting for live data.` when snapshot cards can still render.
- Surface detail empty state no longer exposes presence-row jargon.
- Admin Debug metadata now documents display source, snapshot availability, realtime listener state, fallback snapshot use, fake-zero prevention, and lane failures.
- `agent/state/admin-analytics-realtime-dependency-audit.generated.json` records the module-by-module audit.

## Remains

Persisted per-module materializers still need promotion for modules whose snapshot registry entries are placeholders. That is separate from this pass. Until then, the existing historical backend route and realtime hot summary are the verified display sources for affected modules.

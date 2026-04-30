# Admin Analytics Hot Cache

Status: Phase 3 snapshot contract
Last updated: 2026-04-30

## Purpose

Admin Analytics must render verified backend snapshots first, then refresh in the background or on command. Realtime is an upgrade path, not the loading dependency. This keeps Admin Analytics from waiting on raw realtime listeners, cold GA4/Data API calls, BigQuery reads, or broad Firestore scans when a verified snapshot already exists.

## Snapshot Schema

The canonical contract lives in `src/lib/analytics/admin-metric-snapshot.ts`.

Every snapshot includes:

- `moduleKey`
- `rangeKey`
- `values`
- `sourceBreakdown`
- `formulas`
- `confidence`
- `truthState`
- `sourceMode`
- `generatedAt`
- `lastVerifiedAt`
- `expiresAt`
- `maxAgeMs`
- `refreshStatus`
- `refreshStartedAt`
- `refreshCompletedAt`
- `warnings`
- `parity`
- `legacyIncluded`
- `legacyConfidence`
- `debugPath`

Supported ranges are `24h`, `7d`, `14d`, `30d`, and `all`.

Source modes are:

- `live`
- `verified_cache`
- `stale_cache`
- `intraday`
- `estimated`
- `fallback`
- `unavailable`
- `mixed`

## Verified Cache First

A verified cache snapshot is a backend-built read model with source metadata, formulas, parity information, freshness, and fake-zero protection. If one exists, Admin Analytics should render it immediately and show whether it is verified or stale. A blank loading screen is allowed only when no verified snapshot exists.

Snapshots are stored in `analytics_admin_metric_snapshots` through `src/lib/server/admin-analytics-snapshots.ts`.

## Manual Refresh

Manual refresh goes through `/api/admin/analytics/refresh`.

The route:

- requires admin auth
- accepts `moduleKey`, `rangeKey`, and optional `force`
- prevents duplicate refresh storms
- calls the module materializer registry
- returns snapshot metadata, warnings, and refresh status
- keeps the last verified snapshot visible if refresh fails

`force=false` is the default. `force=true` may bypass refresh locks only when the caller intentionally requests it.

## Refresh Lifecycle

Refresh states are:

- `idle`
- `queued`
- `refreshing`
- `completed`
- `failed`
- `duplicate_prevented`
- `unavailable`

The helper records `refreshStartedAt`, `refreshCompletedAt`, `refreshFailedAt`, `refreshError`, and `duplicateRefreshPrevented`.

## Module Registry

The registry lives in `src/lib/server/admin-analytics-materializers.ts`.

It registers:

- `platform_pulse`
- `audience_snapshot`
- `commerce_snapshot`
- `live_pulse`
- `journey_funnel`
- `auth_outcomes`
- `onboarding_performance`
- `daily_task_pipeline`
- `notification_funnel`
- `event_mix`
- `live_interaction_stream`
- `data_health_summary`

Each entry names supported ranges, canonical sources, required parity checks, legacy support, and implementation status. A module with no safe materializer must return an unavailable snapshot with a reason. It must not invent values or mark the snapshot verified.

## Parity Rules

Every snapshot can carry parity rows for:

- raw ledger vs snapshot value
- Firestore/business records vs snapshot value
- GA4/BigQuery vs first-party value where applicable
- legacy mapped value vs current canonical value
- source drift
- fake zero prevention
- stale, intraday, estimated, fallback, and unavailable states

Parity detail belongs in Admin Debug. Admin Analytics can show compact state labels and actionable summaries.

## Fake Zero Rule

Missing metrics must use `value: null`, `available: false`, and `fakeZeroPrevented: true`. A snapshot is invalid if it renders zero while the metric is unavailable. Zero is allowed only when the source and denominator prove zero.

## Stale Cache Rule

Stale cache is useful and allowed. It must be labeled `stale_cache` or `stale`, include the last verification time, and keep refresh state visible. Stale cache must not be presented as live.

## Realtime Upgrade Rule

Realtime listeners can upgrade a rendered snapshot only after server metadata proves truth. Firestore listeners must respect `fromCache` and `hasPendingWrites`. RTDB presence must prove server timestamps and `onDisconnect` lifecycle when used. Realtime upgrade cannot erase a verified snapshot or clear refresh failure metadata.

## Admin Debug Responsibilities

Admin Debug exposes snapshot metadata under the hot-cache debug surface:

- module and range
- source mode and truth state
- generated/verified timestamps
- refresh status and duplicate-refresh prevention
- values, formulas, source breakdown, warnings, parity
- legacy inclusion/confidence
- stale and unavailable reasons

Long parity failures and unavailable materializer reasons belong in Debug, not large Analytics warning cards.

## Future-Agent Rule

Future agents must not reintroduce realtime-only loading, page-load BigQuery/GA4 cold reads, fake zeros, unlabeled stale snapshots, or a module-specific cache shape that bypasses this contract.

## Phase 5 Admin Analytics Migration

Phase 5 applies this contract to Admin Analytics UI and Admin Debug. Each Analytics module reads the snapshot registry, renders the latest verified snapshot immediately when one exists, exposes a compact manual refresh control, and sends detailed proof to Debug through its snapshot `debugPath`.

Realtime, historical route cache, and module-specific fetches are upgrade or compatibility lanes. They must not create a 30 second blank page when a verified snapshot exists. If no snapshot exists, the module shows a compact waiting or unavailable state instead of fake zeros.

Admin Debug owns the long-form snapshot proof: source mode, truth state, last verified time, generated time, refresh status, duplicate refresh prevention, values, formulas, source breakdown, warnings, parity, legacy inclusion, confidence, and unavailable reasons.

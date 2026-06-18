# Global Loading Performance Doctrine

Admin Analytics and shared app loading must render verified hot cache first. Realtime listeners, manual refreshes, and slow backend recomputes are upgrades after first useful paint, not prerequisites for showing already verified data.

## Staged Hydration Doctrine

KandyDrops hydration uses staged priority lanes. Critical shell and first actions hydrate first. Telemetry/session/privacy truth remains connected. Diagnostics, overlays, bridges, cookie UI, bug reports, onboarding helpers, notification runtime, and PWA enhancement load after paint or idle unless required by the current interaction. No public-beta performance fix may disconnect tracking, privacy consent, parity truth, or source-of-truth debug surfaces.

This doctrine is now implemented through the refresh-based cache contract in `docs/agent-truth/refresh-based-hot-cache.md` and `src/lib/cache/refresh-cache-contract.ts`. Time-limit expiration changes labels and refresh priority; it does not remove a verified display snapshot.

## Global Speed/Hydration Finalization

Age changes the label, not the existence of the data. Verified data stays visible until replaced by a newer verified payload or explicitly invalidated with a recorded reason. A refresh failure keeps the previous verified payload visible and must surface a source-state note instead of blanking the module.

One slow module cannot block unrelated modules. Server routes should fetch independent sources with `Promise.all`, `Promise.allSettled`, or safe diagnostic wrappers where one optional source can fail. Client hooks should dedupe refreshes, preserve previous data while refreshing, and show skeletons only before the first verified payload for that user/surface.

Waiting must say why. Acceptable waiting reasons are first snapshot pending, no verified snapshot yet, source unavailable, or auth/session still resolving. Generic `Waiting` remains forbidden when any verified value is already available.

Private/admin data must not be publicly CDN cached. Private routes may use internal hot snapshots or per-process stale-while-revalidate route caches, but response headers must stay private/no-store/no-cache as appropriate for the data. Public or non-sensitive route data can be dynamic, but it must not become authoritative for wallet/payment/user balances.

Recent user activity now follows the same refresh-based rule as Admin Analytics: `/api/user/activity` keeps a validated per-user activity payload displayable beyond the freshness window, starts a background refresh, and returns cache/debug timing metadata so Debug and validators can distinguish `fresh_backend`, `verified_route_cache`, `staleButVerified`, and first-snapshot states.

## Hot-Cache-First Rule

If a route or module has a valid verified snapshot, the initial UI renders that snapshot immediately. The UI may label it as cache, stale, fallback, or refreshing, but it must not show a blank panel or top-level waiting card while that verified value exists.

## What Waiting May Mean

Waiting is allowed only when no verified snapshot or valid source value exists yet. Waiting copy must name the reason:

- Collecting activity
- No verified snapshot yet
- Source unavailable

Generic `Waiting` or `Waiting for analytics` is forbidden for Admin Analytics cards when a verified snapshot value exists.

## Snapshot-First Render Rule

Revenue, purchases, mobile share, and live active must prefer the latest validated snapshot or route hot cache before any realtime or refresh result. If refresh is running, the existing value remains visible with refreshing/stale/cache truth state. If realtime fails, the existing snapshot remains visible with realtime delayed/fallback truth state. Missing values must not become fake zeroes.

## Suspense And Streaming Rule

Route loading boundaries and component-level Suspense should isolate slow modules. Shared admin shell/navigation remains interactive while route segments load. A slow Live Pulse or backend refresh must not block revenue, purchases, or mobile share.

## Manual And Background Refresh Rule

Manual refresh and background refresh must never clear visible verified snapshots. Refresh failure returns metadata and preserves stale snapshot state when a snapshot exists. Debug metadata must expose refresh status, first snapshot timing, first useful value timing, waiting reason, and whether realtime or refresh blocked first render.

## Cache-Control And App Hosting Notes

Private admin analytics routes must not be publicly CDN cached. Read-only snapshot routes use authenticated private no-store responses while relying on internal hot-cache/snapshot reads for speed. Cacheable public GET behavior is reserved for non-sensitive routes.

## Firestore Metadata Rule

Where Firestore cache/server transitions affect displayed truth, listeners must account for cache metadata, including `SnapshotMetadata.fromCache` and `includeMetadataChanges` when the UI needs to distinguish cached data from server-confirmed upgrades.

Future agents must not make slow backend refresh, realtime listeners, or full-module recomputation block first useful Admin Analytics UI when verified data exists.

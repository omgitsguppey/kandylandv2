# Global Loading Performance Doctrine

Admin Analytics and shared app loading must render verified hot cache first. Realtime listeners, manual refreshes, and slow backend recomputes are upgrades after first useful paint, not prerequisites for showing already verified data.

## Hot-Cache-First Rule

If a route or module has a valid verified snapshot, the initial UI renders that snapshot immediately. The UI may label it as cache, stale, fallback, or refreshing, but it must not show a blank panel or top-level waiting card while that verified value exists.

## What Waiting May Mean

Waiting is allowed only when no verified snapshot or valid source value exists yet. Waiting copy must name the reason:

- Waiting for first snapshot
- No verified data yet
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

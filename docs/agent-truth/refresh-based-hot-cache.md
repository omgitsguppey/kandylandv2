# Refresh-Based Hot Cache Doctrine

KandyDrops uses refresh-based verified hot cache for admin analytics and slow hydration surfaces. A timer can change a label from cache to stale, but it cannot remove a usable verified snapshot.

## Global Hydration Rule

Age changes the label, not the existence of the data. Verified data stays visible until replaced by a newer verified snapshot or explicitly invalidated for correctness. This applies beyond Admin Analytics to user dashboard activity, Drops feed hydration, notifications, chat background refresh, wallet package loading, and any shared hook that already has a verified payload.

A refresh failure keeps the previous verified payload visible. If a module has no verified payload, it can show a compact first-snapshot state. If a module has verified data, it can show `refreshing`, `stale_but_verified`, `refresh_failed`, `estimated`, or `mixed`, but it cannot clear the value solely because the ideal freshness window elapsed.

Refresh storms are defects. Hooks and route caches must dedupe in-flight refresh work by cache key or surface key. Slow modules should use partial payloads, `Promise.allSettled`, safe diagnostic readers, or independent Suspense/loading boundaries so one route failure does not blank a whole page.

## Core Rule

The app shows the last verified snapshot immediately. Realtime, cold server recompute, and manual refresh are upgrades. They replace the visible snapshot only after the replacement is verified.

## Cache States

The shared contract lives in `src/lib/cache/refresh-cache-contract.ts` and defines:

- `verified`
- `refreshing`
- `refresh_failed`
- `stale_but_verified`
- `unavailable`
- `pending_first_snapshot`
- `server_confirmed`
- `cache_confirmed`
- `estimated`
- `mixed`
- `legacy_mapped`

Every cached snapshot records cache identity, module/surface/range, payload, generated and verified timestamps, refresh timestamps, `refreshVersion`, `sourceVersion`, invalidation reason, source mode, truth state, confidence, parity warnings, estimated flags, and legacy flags.

## Time-Limit Expiration

Time-limit expiration is deprecated as display gating. Age can make a snapshot `stale_but_verified`, but it does not make it disappear. A verified snapshot can be blocked only by explicit correctness invalidation with an `invalidationReason`.

## Manual Refresh

Manual refresh requests mark refresh metadata and dedupe concurrent work by cache key. The old value remains visible during refresh. `refreshVersion` increments only after a verified replacement completes. Failed refresh records `lastRefreshFailedAt` and `refresh_failed` while preserving the old display snapshot.

## Background Refresh

Background refresh must not clear values, charts, or cards. Stale route payloads remain displayable while the server refreshes in the background. If the new payload fails validation, the old validated payload remains the display source and Debug records the failure.

## Next.js Revalidation

`router.refresh()` re-renders route segments but is not cache invalidation. Intentional data invalidation uses explicit snapshot refresh and, where public/static route cache is in play, `revalidatePath` or `revalidateTag` after successful refresh. Private admin analytics routes use authenticated `private, no-store` responses and internal snapshots rather than public CDN caching.

## Firestore Metadata

Firestore realtime data is an upgrade only when metadata proves it. `SnapshotMetadata.fromCache` and `hasPendingWrites` distinguish cache, pending local writes, and server-confirmed snapshots. When cache-to-server transitions affect UI truth, listeners must include metadata changes.

## Guest Estimates

Guest traffic estimates can display immediately when the formula and source flags are recorded. Missing anonymous batches add an estimate caveat; they do not blank total metrics if a verified estimate exists. Authenticated-only counts must never be labeled as total audience.

## No Fake Waiting Or Fake Zero

`Waiting` is allowed only before the first verified snapshot exists. Visible waiting copy must say `Waiting for first snapshot`, `No verified snapshot yet`, or `Source unavailable`. Missing values stay `null` with fake-zero prevention metadata until a source confirms zero.

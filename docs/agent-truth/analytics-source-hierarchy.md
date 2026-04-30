# Analytics Source Hierarchy

Status: Phase 1 source contract
Last updated: 2026-04-30

## Canonical Hierarchy

### 1. Product Truth

Product truth comes from first-party event ledgers and business records. These are the facts KandyDrops owns directly:

- `analytics_event_facts`
- `analytics_guest_batches`
- `analytics_sessions`
- `analytics_page_daily`
- task user state and lifecycle logs
- notification inbox/runtime records
- purchase, PayPal capture, and commerce rollups
- unlock and GumDrops ledger records
- onboarding step events/state
- watch sessions and viewer capture health
- route diagnostics and runtime health

Product truth wins over provider summaries unless a later reconciliation job explicitly promotes another source.

### 2. Fast Admin Display Truth

Fast admin display truth is the verified hot cache snapshot. It is a backend-built read model intended for first paint in Admin Analytics. It can be fresh or stale, but it must be labeled and must include enough metadata to prevent fake zeros.

Examples already present in the repo include:

- `analytics_aggregate_stats/realtime_summary`
- historical route stale-while-revalidate payloads from `/api/admin/analytics/historical`
- validated backend cache payloads from `src/lib/server/ephemeral-route-cache.ts`

Later phases should align every Admin Analytics module to this hot-cache-first contract.

### 3. Realtime Upgrade Truth

Realtime upgrade truth comes from Firestore or RTDB listeners after a verified snapshot is on screen. It can be stronger than cache only when metadata proves it:

- `SnapshotMetadata.fromCache === false` for Firestore server snapshots
- `hasPendingWrites === false` for Firestore local write safety
- RTDB presence lifecycle is backed by server timestamps and `onDisconnect` where presence is used
- selected range/window matches the module
- actor lane is classified

Cached listener snapshots are not server-confirmed live truth.

### 4. Historical Verification Truth

Historical verification truth comes from GA4 BigQuery daily export tables, especially `events_YYYYMMDD`. Daily tables are stable historical exports for completed days and are useful for parity, source drift, and provider-vs-first-party validation.

Daily GA4/BigQuery data is still not automatically product truth. It must be compared with first-party facts and labeled by source.

### 5. Current-Day Directional Truth

Current-day directional truth comes from GA4 intraday/current-day sources such as `events_intraday_YYYYMMDD`, GA4 realtime reports, and live-ish provider summaries. These sources are incomplete by design and must be labeled as intraday, partial, live-ish, or directional.

They must not be presented as final totals, strict funnels, exact audience truth, or exact business records.

### 6. Debug Truth

Debug truth is parity between all sources. Admin Debug owns:

- source freshness checks
- route/cache/listener status
- GA4 daily vs intraday labels
- first-party vs GA drift
- purchase and unlock parity
- task lifecycle/state/telemetry reconciliation
- notification pipeline dedupe and read persistence
- onboarding source mismatch
- legacy recovery status
- fake zero prevention metadata

Debug can show detailed source names and formulas that would be too heavy for Analytics.

## Never Canonical

These sources must never be treated as canonical analytics truth:

- AI/model summaries
- stale route snapshots without a stale label
- local-only UI state
- unlabeled fallback
- unlabeled stale cache
- unlabeled GA4 intraday/current-day reports
- fake zeros
- raw GA event counts without definitions
- raw event counts presented as ordered journeys
- polled snapshots labeled as live
- missing samples labeled as pass
- admin/system activity mixed into user/guest analytics

## Source Promotion Rule

A weaker source can support a module only when the UI and Debug metadata name that source. Promotion to a stronger truth tier requires:

1. a writer path
2. a reader path
3. selected-range consistency
4. actor classification
5. freshness metadata
6. parity or reconciliation evidence
7. fake-zero prevention

Without those seven items, the source remains partial, fallback, estimated, or unavailable.

## Phase 2 Canonical Contract Placement

`src/lib/analytics/analytics-event-contract.ts` is the contract boundary between raw product facts and later display snapshots. It does not make a source stronger by itself; it gives every event a consistent shape, actor lane, dedupe key, consent state, source lane, and Debug explanation.

Canonical event contract facts can be produced from:

- current first-party event writers
- server-side business records
- hot-cache materializers
- realtime listener upgrade processors
- legacy mappers

Only the first two are product truth by default. Hot caches are fast display truth, realtime listeners are upgrades with metadata, BigQuery/GA4 are validation lanes, and legacy mappers are recovery candidates until a backfill parity run promotes them.

## Phase 2 Dedupe and Idempotency Rule

Every current or future canonical writer needs a deterministic `dedupeKey`. The key should include the event name, actor lane/id, source lane, object type/id, and a safe time bucket or business id. Random browser ids can remain `eventId`, but they must not be the only idempotency control for business facts such as purchases, unlocks, tasks, notifications, or identity links.

Legacy records mapped into canonical shape must keep `legacySource` and `legacyId` so they cannot silently mix with server-confirmed current events.

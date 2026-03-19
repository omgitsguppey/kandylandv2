# Analytics System Audit

Date: 2026-03-18

## Scope

This audit covers the full analytics path used by the site today:

- client identified telemetry: `src/lib/telemetry.ts`
- client guest analytics batching: `src/components/Analytics/DeepTracker.tsx`
- request ingest routes:
  - `src/app/api/telemetry/track/route.ts`
  - `src/app/api/analytics/ingest/route.ts`
- authoritative Firestore materializers in `functions/src/analytics-*.ts`
- admin analytics readers in `src/lib/server/admin-analytics-data.ts` and `src/app/api/admin/analytics/**`
- Data Connect schema and connector surface in `dataconnect/**`

## Source Of Truth

The analytics stack now has explicit layers:

1. Request-path ingestion
   - Accepts authenticated telemetry and anonymous guest batches.
   - Writes canonical Firestore facts/batches only.

2. Internal materialization
   - Cloud Functions build the operational Firestore rollups used by the app/admin dashboard.
   - These remain the canonical internal reporting source.

3. External reporting export
   - A dedicated Data Connect connector now exposes export-safe analytics read models.
   - Separate Cloud Functions mirror authoritative Firestore rollups into Data Connect with deterministic ids.
   - This export layer is intentionally downstream of internal materialization so external dashboards do not compete with the site’s core analytics engine.

## Conflicts Found And Addressed

### 1. Data Connect schema existed without a hardened export path

- The repo already had analytics tables in `dataconnect/schema/schema.gql`.
- The live codebase was not publishing those tables from the authoritative Firestore rollups.
- Result: Data Connect looked analytics-ready, but there was no reliable external dashboard pipeline.

Resolution:

- Added a dedicated `analytics_export` connector under `dataconnect/analytics_export`.
- Added explicit export queries and mutations for external reporting.
- Added export sync Functions in `functions/src/analytics-export-sync.ts`.

### 2. Existing generated Data Connect surface was partial/stale

- The checked-in generated SDKs only exposed a small subset of analytics operations.
- The connector naming and generated output still reflected an older/example-oriented surface.

Resolution:

- External analytics export no longer depends on the older generated SDK.
- Functions use the Firebase Admin Data Connect API directly with an explicit connector config.

### 3. External sync could have conflicted with internal analytics writes

- If Data Connect export had been added directly inside the existing ingestion/materializer request path, retries could have created extra failure/latency coupling.

Resolution:

- Export sync is isolated on authoritative rollup docs only.
- Internal analytics materialization still finishes first.
- Export sync is deterministic and retry-safe through stable ids.
- Export sync now also handles source deletions and alert-type removals so Data Connect rows cannot silently go stale after internal cleanup.

## Current External Reporting Surface

The export connector now covers:

- export health/status
- commerce daily + rollup
- bundle daily
- top pages by day
- top drops by day
- top users by day
- top users all time
- task daily
- task rollup
- security daily
- top user security rollups
- alert history

## Remaining Intentional Boundaries

These are not part of the new external signal export layer today:

- raw authenticated event facts
- raw guest batches
- session facts
- heatmap point exports
- target-level click/hover exports

Reason:

- external dashboards were scoped to stable signals/rollups first
- these raw/high-cardinality surfaces would add cost and drift risk without helping the initial external reporting goal

## Confidence

The main conflict between internal analytics and Data Connect export is resolved:

- Firestore rollups remain the app/admin source of truth
- Data Connect is now a downstream external-read surface, not a competing analytics engine
- Functions own the mirror
- connector operations are contract-tested
- export status reflects healthy, deleted, and error states for mirrored domains

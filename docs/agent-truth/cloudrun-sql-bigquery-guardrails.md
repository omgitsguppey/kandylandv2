# Cloud Run, SQL, And BigQuery Guardrails

Status: deterministic Cloud cost and data-pipeline guardrail  
Scorer: `npm run score:cloud-cost`  
Validator: `npm run check:cloud-cost`  
Generated report: `agent/state/cloudrun-sql-bigquery-guardrails.generated.json`

## Doctrine

KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted. Cloud Run max instances and concurrency must protect Cloud SQL and AI surfaces. BigQuery exports/imports must be validated, documented, and blocked from mutating runtime balances/transactions unless an explicit dry-run/idempotent import contract exists.

## Cloud Run

Cloud Run/App Hosting surfaces must have max-instance and concurrency guidance before they can trigger expensive or backing-service-heavy work.

Default public beta guardrails:

- Public App Hosting shell: recommended max instances 5, concurrency 80, current source config `apphosting.yaml` uses `maxInstances: 2` and `concurrency: 80`.
- Admin analytics refresh/rebuild: recommended max instances 2, concurrency 20.
- AI routes: recommended max instances 1, concurrency 5.
- Media proxy routes: recommended max instances 2, concurrency 20.
- Cron/materializers: recommended max instances 1, concurrency 1.
- BigQuery export function: recommended max instances 2, concurrency 10.
- Data Connect agent mirror: recommended max instances 1, concurrency 10.

The scorer only emits suggested commands such as:

```bash
gcloud run services update SERVICE --region REGION --max MAX --concurrency CONCURRENCY
```

It must not execute `gcloud` or change deployed settings automatically.

## SQL/Data Connect

`dataconnect/dataconnect.yaml` is classified as `firebase_dataconnect` and `sql_dataconnect_agent_context_mirror`.

Confirmed source config:

- Service: `kandydrops`
- Region: `us-central1`
- PostgreSQL database: `kandydrops_db`
- Cloud SQL instance: `kandydrops-db`

Allowed purpose: `agent_context_mirror`.

Allowed paths:

- `dataconnect/**`
- `scripts/agent/sync-sql.ts`
- `agent/state/sql-*.generated.json`

Forbidden runtime paths without an explicit owner-approved SQL/Data Connect contract:

- `src/app/api/**`
- payment routes
- unlock routes
- GumDrops routes
- chat routes
- support routes
- creator booking/subscription/request routes

Cloud SQL can bill while provisioned/running. Confirm `kandydrops-db` status in Cloud Console. Source config does not prove whether the instance is active, paused, deleted, or billed. Current source-only status is `source_configured_provider_state_unverified`.

Provider fields that must be manually recorded before treating the mirror as cost-safe:

- active/paused/deleted status
- machine tier
- storage auto-increase setting
- backup setting
- maintenance/HA/read replica status
- monthly budget target

Data Connect operation/query/mutation additions must declare purpose, table/type touched, expected rows, max execution frequency, allowed environments, whether user/runtime data can be touched, and estimated billing risk.

## BigQuery

BigQuery is a validation/export lane, not product truth by default. BigQuery and GA exports are analytics evidence only.

High-volume 4xx traffic should be rejected before Cloud Run reaches heavy route logic whenever possible. Bot/probe, malformed payload, and legacy-path traffic must avoid SQL/BigQuery-affecting refresh paths and keep response/log overhead minimal.

Current export owner:

- File: `functions/src/analytics-bigquery-export.ts`
- Firebase product/source: first-party Firestore `analytics_event_facts`
- BigQuery project id: provider project for `kandydrops-by-ikandy` unless overridden by credentials
- Dataset id: `kandydrops_canonical_analytics`
- Table pattern: `raw_events`
- Schedule: Firestore-triggered export, not Firebase Analytics daily export
- Export mode: app-generated event-fact streaming insert
- Validation heartbeat: `analytics_export_status/bigquery_raw_events`
- First export freshness window: Firebase/GA linked BigQuery exports can take up to 48h initially; this app-generated exporter should not be treated as confirmed until heartbeat is fresh.
- Analytics event filtering: unverified from local source; owner must confirm provider-side GA/Firebase export filtering if linked Firebase exports are enabled.

BigQuery warnings:

- Google Analytics BigQuery export is limited to 1M events/day unless Analytics 360.
- Initial Firebase/GA export propagation can take up to 48h.
- Daily sync timing must not be assumed as exact runtime truth.
- BigQuery load jobs are limited, including 1,500 load jobs per table per day.
- BigQuery extract/export has 50 TiB/day shared-pool no-cost default and 1GB single-file extract limits.

BigQuery runtime imports are blocked. BigQuery import into Firestore/user runtime state is forbidden unless a future contract proves:

- dry-run mode
- schema validation
- idempotency
- validation report before mutation
- capped rows per run
- explicit manual approval before touching GumDrops balances, transactions, unlocks, creator subscriptions, or support messages

Imported rows must map to canonical event facts or metric facts only. They must not write legacy admin metric snapshots directly, and they must not mutate runtime balances, unlocks, purchases, or user rollups.

The current import status is `runtime_import_blocked`; `importBackToRuntimeAllowed: false` remains the active doctrine.

## Manual Cloud Console Checklist

- Check Cloud Run max instances for each deployed service
- Check Cloud Run concurrency
- Check Cloud SQL instance `kandydrops-db` active/paused/deleted
- Check Cloud SQL tier/storage/backups/HA/read replicas
- Check Data Connect operation usage
- Check BigQuery linked Firebase exports
- Check BigQuery datasets/tables freshness
- Check BigQuery import jobs/load jobs
- Check budget alerts for Cloud SQL/Data Connect/BigQuery/Cloud Run

## Verification

Run:

```bash
npm run score:cloud-cost
npm run check:cloud-cost
```

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, `gcloud`, `firebase deploy`, BigQuery jobs, or Data Connect deploys for this source-only guardrail.

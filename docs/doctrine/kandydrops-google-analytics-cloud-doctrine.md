# KandyDrops Google Analytics and Cloud Doctrine

## Purpose
This doctrine defines how KandyDrops uses Google Analytics 4, BigQuery, Firebase, Cloud Run, Firestore, and Firebase SQL Connect for admin analytics truth. It exists to keep the admin console fast, source-labeled, and operationally honest.

## Official Google Constraints
- GA4 Measurement Protocol supplements browser/app tagging; it must not replace `gtag`, Tag Manager, Firebase Analytics, or first-party KandyDrops event facts.
- Measurement Protocol can return `2xx` even when a payload is malformed or not processed. Production writes must keep first-party Firestore facts and server diagnostics as the canonical delivery proof.
- GA4 Data API requests consume property quotas. Admin pages must prefer cached or materialized KandyDrops read models before issuing live GA4 report calls.
- GA4 BigQuery export can stop because of billing, missing/deleted service accounts, or organization policy. KandyDrops must expose export heartbeat state in Admin Debug before treating warehouse delivery as healthy.
- BigQuery query cache and materialized views are optimization layers, not the primary app source of truth. Materialized views are acceptable for warehouse reporting when refresh state and staleness remain visible.
- BigQuery and GA exports are analytics evidence only. They cannot overwrite runtime balances, unlocks, purchases, user rollups, or legacy admin metric snapshots.
- Firestore read-time aggregations are useful for small summary checks, but large admin dashboards must prefer write-time aggregates or scheduled materializers.
- Firebase scheduled functions are the approved backend mechanism for periodic hot summaries. Scheduled functions can overlap, so they must be idempotent and write source-state metadata.
- Cloud Run and App Hosting services that serve admin analytics must keep at least one warm instance when latency matters.
- Firebase SQL Connect is backed by Cloud SQL for PostgreSQL. The SQL schema is the database source of truth, while SQL Connect schema/connectors define how the app can access it. Schema diff/migrate must be explicit before relying on SQL data.

## Required KandyDrops Setup
Use these environment variables and resources for production analytics:

```bash
GA_PROPERTY_ID=524442937
GA_MEASUREMENT_ID=G-V8PWC2L31H
GA_API_SECRET=<Secret Manager secret>
NAVIGATION_COOKIE_SECRET=<Secret Manager secret>
BQ_ANALYTICS_DATASET_ID=kandydrops_canonical_analytics
BQ_ANALYTICS_RAW_EVENTS_TABLE_ID=raw_events
```

Cloud/App Hosting:

```yaml
runConfig:
  minInstances: 1
  maxInstances: 2
```

Firebase scheduled hot summaries:

```ts
export const refreshAdminAnalyticsRealtimeSummary = onSchedule({
  schedule: "every 1 minutes",
  region: REGION,
  retryCount: 0,
}, async () => {
  await rebuildAdminAnalyticsRealtimeSummary();
});
```

Firebase SQL Connect checks:

```bash
firebase dataconnect:services:list
firebase dataconnect:sql:diff
firebase deploy --only dataconnect
```

## Data Connect Agent Mirror Boundary

The repo includes Firebase Data Connect config at `dataconnect/dataconnect.yaml` for service `kandydrops` in `us-central1`, PostgreSQL database `kandydrops_db`, and Cloud SQL instance `kandydrops-db`. This surface is classified as `sql_dataconnect_agent_context_mirror` and is allowed only for agent/repo intelligence mirror infrastructure.

Allowed files are `dataconnect/dataconnect.yaml`, `dataconnect/schema/*.gql`, `dataconnect/example/*`, `scripts/agent/sync-sql.ts`, `agent/state/sql-sync.payload.generated.json`, and `agent/state/sql-mirror-status.generated.json`.

Rules:
- Data Connect is forbidden for user, payment, Drop, chat, support, or creator runtime flows unless an explicit owner-approved SQL/Data Connect route contract exists.
- Data Connect is forbidden inside `src/app/api` runtime routes unless the route has an `ApiCostContract` with SQL/Data Connect classification.
- `agent:sync-sql` must not run automatically during user-facing builds or deploys.
- New Data Connect operations must declare purpose, table/type touched, expected rows, max execution frequency, allowed environments, whether user/runtime data can be touched, and estimated billing risk.
- Source config does not prove provider billing state. The current billing state for `kandydrops-db` is `source_configured_provider_state_unverified` until confirmed by an owner.

## Cloud Cost And Pipeline Guardrails

KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted. Cloud Run max instances and concurrency must protect Cloud SQL and AI surfaces. BigQuery exports/imports must be validated, documented, and blocked from mutating runtime balances/transactions unless an explicit dry-run/idempotent import contract exists.

- Cloud Run/App Hosting services that can trigger AI, media proxying, analytics rebuilds, admin refresh, cron, Data Connect, Cloud SQL, or BigQuery must have max-instance and concurrency guidance before launch.
- Cloud SQL-backed Data Connect is cost-bearing twice: Data Connect operations and the Cloud SQL PostgreSQL instance. Provider-side instance state, tier, storage, backups, HA/read replicas, and budget alerts must be checked in Cloud Console before treating the mirror as cost-safe.
- BigQuery export/import status must be explicit. Missing export config is `[unconfirmed]`, missing import safety is `[blocked]`, and BigQuery data must never overwrite GumDrops balances, transactions, unlocks, creator subscriptions, or support messages without manual approval.
- Imported analytics rows must map into normalized event facts or canonical metric facts only, with dry-run and schema validation recorded before any approved mutation path exists.
- The deterministic guardrail lane is `npm run score:cloud-cost` and `npm run check:cloud-cost`. It may suggest `gcloud run services update ...` commands as documentation, but agents must not execute `gcloud`, deploy, run BigQuery jobs, or deploy Data Connect from this lane.

## Admin Truth Rules
- Admin analytics may render `[cached]` only for validated backend cache.
- Admin analytics must render `[stale]` when the newest usable snapshot is older than the freshness budget.
- Admin analytics must render `[fallback]` when GA4, BigQuery, SQL Connect, or a primary Firestore lane fails and another source is used.
- A healthy numeric sample is evidence, not an issue count. Do not display sample counts as degraded signals.
- Default analytics views must be hot-cache-first. Cold GA4/Data API, BigQuery, SQL Connect, or full Firestore scans are allowed only as backend refresh or explicit drill-down paths.
- Per-user analytics must prefer user rollups and daily summaries, then ordered event/session facts for recovery. Unordered fact reads are not acceptable for user timelines.
- SQL Connect and BigQuery never outrank first-party Firestore facts unless a reconciliation job has recorded parity.

## Verification
Run these checks when touching analytics/cloud dependency code:

```bash
npm run check:dependency-truth
npm run check:telemetry
npm run check:analytics:continuity
npm run check:admin-truth
npm --prefix functions run check
firebase dataconnect:sql:diff
```

If any Google/cloud service is not locally authenticated, record that as `[unavailable]` or `[degraded]`; do not mark the admin surface healthy from configuration guesses.

## Official References
- Google Analytics Measurement Protocol: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- Measurement Protocol reference and validation behavior: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
- Google Analytics Data API quotas: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas
- GA4 BigQuery export setup and failures: https://support.google.com/analytics/answer/9823238
- BigQuery cached results: https://cloud.google.com/bigquery/docs/cached-results
- BigQuery materialized views: https://cloud.google.com/bigquery/docs/materialized-views-intro
- Cloud Run minimum instances: https://cloud.google.com/run/docs/configuring/min-instances
- Firestore aggregation queries: https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Firestore indexes: https://firebase.google.com/docs/firestore/query-data/indexing
- Firebase scheduled functions: https://firebase.google.com/docs/functions/schedule-functions
- Firebase SQL Connect: https://firebase.google.com/docs/sql-connect
- SQL Connect schema/deploy workflow: https://firebase.google.com/docs/sql-connect/manage-schemas-and-connectors

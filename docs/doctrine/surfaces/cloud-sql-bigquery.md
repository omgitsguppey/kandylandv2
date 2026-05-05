# Cloud SQL And BigQuery Doctrine

Authority level: 4

Owner: cloud/sql/bigquery

## Must

- Treat Firebase Data Connect and Cloud SQL as agent-context mirror infrastructure unless explicitly promoted.
- Keep BigQuery exports/imports dry-run, idempotent, and blocked from mutating runtime balances/transactions unless a contract approves it.
- Protect Cloud Run max instances and concurrency around SQL and AI surfaces.

## Must Not

- Use SQL/Data Connect for user, payment, Drop, chat, support, or creator runtime flows without an explicit ApiCostContract.
- Run `gcloud`, Firebase deploys, Data Connect deploys, or BigQuery jobs from default audit lanes.

## Source Truth

- Data Connect config, cloud cost contract, API cost contract, SQL mirror status.

## Validators

- `check:cloud-cost`
- `score:cloud-cost`
- `check:google-cost`

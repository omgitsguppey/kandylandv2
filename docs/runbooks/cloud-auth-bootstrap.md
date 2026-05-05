# Cloud Auth Bootstrap Runbook

## Owner

Engineering / DevOps owner with GitHub repo admin rights and Google Cloud IAM admin rights.

## Purpose

Enable Codex and GitHub Actions to run repeatable read-only cloud readiness checks without manual Console work. Workload Identity Federation is preferred; service account JSON keys are not the default and should not be introduced for this lane.

## Manual Bootstrap

Manual bootstrap is required when local CLI auth is missing, the active Google Cloud project is wrong, or the current principal cannot create GitHub repo variables and Google Workload Identity Federation bindings.

1. Run `npm run check:codex-auth` locally.
2. Review `agent/state/codex-auth-readiness.generated.json`.
3. Run `npm run plan:cloud-auth-bootstrap`.
4. Confirm the active Google Cloud project is `kandydrops-by-ikandy`.
5. Create a read-only service account for cloud readiness checks.
6. Create a GitHub OIDC Workload Identity Pool and Provider scoped to `omgitsguppey/kandylandv2`.
7. Grant the service account only read roles needed for Cloud SQL, App Engine, Cloud Run, Scheduler, Functions, BigQuery metadata, Artifact Registry, and Service Usage visibility.
8. Add GitHub repo variables:
   - `GCP_PROJECT_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`
9. Run the manual `Cloud Readiness Smoke` workflow.

## Required Checks

- `npm run check:codex-auth`
- `npm run check:codex-auth-readiness`
- Manual workflow: `.github/workflows/cloud-readiness-smoke.yml`

## Safety Rules

- Do not run `firebase deploy`.
- Do not run `gcloud run services update/delete`.
- Do not run `gcloud sql instances stop/delete/patch/restart`.
- Do not run `gcloud app services delete` or `gcloud app versions delete`.
- Do not run `bq load`, mutating `bq query`, or `bq rm`.
- Do not print secret values.
- Do not create service account key JSON unless a separate security exception approves it.

## Rollback

1. Remove the three GitHub repo variables if the workflow should stop authenticating.
2. Remove the IAM binding that allows the GitHub OIDC principal to impersonate the readiness service account.
3. Disable or delete the Workload Identity Provider only after confirming no other workflow uses it.
4. Keep the service account disabled before deletion if audit evidence is needed.
5. Re-run `npm run check:codex-auth` to confirm the report shows manual bootstrap required.

## Evidence

The smoke workflow writes `cloud-readiness-smoke.json` as an artifact. It contains command ids, command strings, exit codes, and short error previews only; it does not store raw cloud resource payloads or secret values.

# Codex Native Auth Readiness

Generated: 2026-05-05

Codex must verify authentication before attempting cloud or billing checks. Repo/code changes are native. Cloud console, Firebase console, PayPal, GitHub settings, and secrets require existing CLI/API auth or a configured GitHub Actions Workload Identity Federation path. Read-only checks are allowed after auth verification. Mutations require explicit instruction.

## What This Lane Does

- Runs local read-only probes through `npm run check:codex-auth`.
- Writes `agent/state/codex-auth-readiness.generated.json`.
- Classifies each surface as `ok`, `missing_auth`, `tool_missing`, `wrong_project`, `insufficient_scope`, `manual_required`, or `unknown`.
- Lists exactly which read commands are safe and which mutation commands remain blocked.
- Produces a Workload Identity Federation bootstrap plan for repeatable GitHub Actions cloud read checks.

## Surfaces Checked

- GitHub CLI auth, repo permission, workflow metadata, secret-name metadata, and variable-name metadata.
- Google Cloud CLI auth, active project, project describe, and enabled services.
- Firebase CLI auth, project metadata, app metadata, and App Hosting backend metadata when supported.
- BigQuery dataset metadata.
- Cloud SQL/Data Connect read metadata for `kandydrops-db`.
- App Engine service/version metadata.
- Cloud Run/App Hosting service metadata.
- Cloud Scheduler and Cloud Functions metadata.
- Artifact Registry repository and image metadata when discoverable.
- PayPal, PostHog, and GA env/config key presence only.

## Safety Boundaries

- No deploy commands.
- No Cloud SQL stop/delete/patch/restart.
- No App Engine service/version deletion.
- No BigQuery query/load/remove jobs.
- No GitHub secret or variable mutation during read-only mode.
- No PayPal live API calls.
- No secret values printed or stored in the generated report.

## Workflow

1. Run `npm run check:codex-auth`.
2. Read `agent/state/codex-auth-readiness.generated.json`.
3. If cloud auth is missing, run `npm run plan:cloud-auth-bootstrap` to print the WIF setup plan.
4. Use `.github/workflows/cloud-readiness-smoke.yml` only after GitHub repo variables and Google WIF are configured.

## Official References

- [Google GitHub auth action](https://github.com/google-github-actions/auth) recommends Workload Identity Federation over long-lived service account key JSON.
- [Google Cloud Workload Identity Federation for deployment pipelines](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) documents `id-token: write` and `contents: read` for GitHub Actions.
- [GitHub OIDC with Google Cloud](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform) documents keyless OIDC authentication and warns to scope trust conditions.
- [Firebase CLI reference](https://firebase.google.com/docs/cli) documents project selection, Firebase auth, and Firebase project/app read commands.

## Validator

`npm run check:codex-auth-readiness` confirms the scripts, report, manual-only workflow, docs, and package wiring exist and that read-only command lists do not contain blocked production mutations.

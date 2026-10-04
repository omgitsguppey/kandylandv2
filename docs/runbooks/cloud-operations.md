# KandyDrops cloud operations — draft

Owner: site operator. Verified checkpoint: 2026-10-04. Keep maintenance enabled until the owner releases it. This is the operations runbook; [cloud-auth-bootstrap](cloud-auth-bootstrap.md) owns coding-agent readiness authentication.

## Where everything lives

| Resource | Cloud owner / location |
| --- | --- |
| Source | [GitHub main](https://github.com/omgitsguppey/kandylandv2/tree/main); edit or revert through GitHub from any device |
| Website | Firebase project `kandydrops-by-ikandy`, App Hosting backend `kandydrops`, `us-central1`; domain `kandydrops.com` |
| Data / uploads | Firestore `(default)` in `us-central1`; Firebase Storage bucket named in `apphosting.yaml`; retain both ai-studio databases in `us-west1` |
| Runtime configuration | `apphosting.yaml` for names/references; Google Secret Manager for private values; Firebase Admin and GA clients support cloud application-default credentials |
| Backups | Daily `(default)` schedule `71865dbc-d893-4e87-8b7b-0be55cb868d2`, 14 days; ai-studio backups remain disabled pending separate approval |

Use the Firebase/Google Cloud account with access to this project. An unrelated signed-in Google account can show permission errors. Never put credentials in GitHub, chat, command arguments, or screenshots.

## Deploy and verify

1. Review a branch/PR before merging to `main`. There is currently no verified staging backend; do not call a PR a running preview.
2. A main push automatically starts App Hosting. In Firebase console → App Hosting → `kandydrops` → rollouts, verify the source SHA, successful build and 100% serving traffic. Confirm the maintenance page and authenticated `/admin` from the phone.
3. Cloud Build → triggers → `kandydrops-main-ci` is the source CI lane. **Automatic CI is currently blocked:** its Firebase GitHub connection forwards events to Firebase rather than Cloud Build. A manual green build does not clear this requirement. Its replacement connection attempt failed before creation because the Cloud Build service agent lacks required Secret Manager permissions.

## Roll back

Firebase console → App Hosting → `kandydrops` → rollout history → select the last verified rollout → use its rollback action. Verify traffic and maintenance again. Revert the offending change through GitHub so the next automatic deployment retains the fix. A source rollback does not restore database mutations or revoke leaked credentials.

## Back up and restore without the PC

Open Google Cloud console → Cloud Shell (phone browser; actual phone operation remains untested). These read-only commands show the schedule and available recovery points:

```sh
gcloud firestore backups schedules list --project=kandydrops-by-ikandy --database='(default)'
gcloud firestore backups list --project=kandydrops-by-ikandy --location=us-central1
```

Before restoring, obtain explicit cost approval: restore is charged per GiB and creates a database with ongoing storage/operation charges. Choose a READY backup and a new recovery database ID. Preserve the live database:

```sh
gcloud firestore databases restore --project=kandydrops-by-ikandy \
  --source-backup=projects/kandydrops-by-ikandy/locations/us-central1/backups/BACKUP_ID \
  --destination-database=kandydrops-recovery-YYYYMMDD
```

Verify the restore operation finishes and reconcile users, entitlements and payment ledger against the chosen recovery point. Restoration into a new database does not reconnect the application: `(default)` is the current runtime database. Keep maintenance on and plan the reviewed data recovery/cutover before directing runtime consumers elsewhere. No restore has been executed or validated yet; the new schedule had no completed backup at the checkpoint.

## Rotate a leaked secret

Open the provider's existing application, generate its replacement privately, and save it directly in Google Secret Manager as a new version of the same named secret. Use App Hosting secret references; remove matching plaintext backend overrides. Deploy, prove the serving revision uses the replacement, and verify provider authentication before revoking the old credential. Never revoke first. A rollout rollback cannot revive a revoked credential.

For PayPal, the owner completes sign-in/MFA and final credential-generation/revocation controls in the dashboard. `PAYPAL_CLIENT_SECRET_LIVE` is the destination. The old credential is still valid pending rotation. Local recovery `.env.local` is retained; full secret migration is not yet verified.

## Completion / recovery boundary

Admin sign-in and user listing worked in a live desktop browser. Overview data was unavailable and user metrics stale; promotion, actual phone operation, staging, completed-backup restore, secret migration and the PC-off test remain unverified. The local preview launcher is not retired. This draft does not certify portable operation. Final acceptance requires the PC powered off while the owner deploys through GitHub, completes a reversible admin action, and loads the site from the phone.

# KandyDrops Billing Runtime Audit

Generated: 2026-05-05

Scope: source-only infrastructure and billing-risk audit for `omgitsguppey/kandylandv2`. No deploys, no `gcloud`, no Firebase deploys, no runtime changes, and no deletion were performed.

## Executive Summary

KandyDrops' minimum live product stack is Firebase App Hosting, its managed Cloud Run service, Firebase Auth, Firestore, Firebase/Cloud Storage, Secret Manager-backed runtime configuration, PayPal, and the subset of Cloud Run Functions/Scheduler jobs that keep drops, notifications, analytics truth, and admin materializers current.

The strongest billing-drag candidate is Cloud SQL / Firebase Data Connect. Source review found Data Connect configured in Firebase deployment metadata, but no product-runtime import or generated Data Connect SDK usage in tracked `src/**` or `functions/src/**`. The repo documents Data Connect as an agent/repo intelligence mirror only and forbids runtime use. That makes Cloud SQL/Data Connect safe to investigate first, but not safe to delete blindly without GCP Console confirmation and a rollback plan.

Firebase App Hosting settings appear intentional production armor, not obvious waste. `apphosting.yaml` currently sets `cpu: 1`, `memoryMiB: 2048`, `concurrency: 80`, `minInstances: 1`, and `maxInstances: 2`. Given recent deployment memory failures and prior `minInstances: 0` instability, do not reduce these from source-only evidence.

App Engine cost cannot be proven from source. The repo does not contain an App Engine standard service config. It may be Firebase/App Hosting plumbing, a legacy default service, old deployed versions, logs, or related default project resources. This requires GCP Console confirmation.

## Do Not Touch Yet

- App Hosting `memoryMiB: 2048`, `minInstances: 1`, and `maxInstances: 2`: recent operational history makes these production armor unless runtime metrics prove otherwise.
- Firestore: core product truth for users, drops, payments, unlocks, chat, support, admin, telemetry, and materializers.
- Firebase Auth: required for public user sessions and admin enforcement.
- Firebase/Cloud Storage: required for avatars, creator assets, drop content, and admin content operations.
- Secret Manager-backed runtime secrets: required by App Hosting and Cloud Build release-note automation.
- Cloud Run Functions as a whole: several exports maintain drop lifecycle, notifications, analytics truth, transaction truth, and admin reports.
- Realtime Database until chat presence usage is verified in Console: source proves active chat presence code.
- PayPal environment/secrets: payment runtime depends on them.

## Safe To Investigate First

- Cloud SQL instance `kandydrops-db` and database `kandydrops_db`: source says agent-context mirror only; confirm zero runtime traffic and cost in Console.
- Firebase Data Connect service `kandydrops`: configured but not proven product-runtime active.
- App Engine billed resources: source does not explain cost; inspect services, versions, and traffic before deleting anything.
- BigQuery dataset/table for analytics raw event export: admin/observability value only, not payment or unlock truth.
- Vertex AI admin generation: admin-only and gated; review usage/cost before disabling.
- Cloud Scheduler jobs with high cadence, especially the 1-minute admin realtime summary, if Console billing shows measurable cost.
- Artifact Registry image retention and Cloud Build history: deployment/CI cost, not live user runtime.
- Google Analytics Data API usage: admin analytics only, not canonical revenue/unlock truth.

## Likely Billing Drag

- Cloud SQL / Data Connect if the Console confirms no active runtime queries, no required Data Connect clients, and no human process depends on the mirror.
- App Engine if cost is from stale default services or old versions with zero traffic.
- BigQuery if raw analytics export is not needed for current admin reporting.
- Vertex AI if admin AI generation is unused or settings are disabled.
- Artifact Registry storage if old images are retained without cleanup.
- Cloud Build if release-note automation or CI triggers fire more often than intended.

## Per-Service Runtime Classification

| Service | Classification | Source-grounded verdict |
| --- | --- | --- |
| Firebase App Hosting | Required for public and admin runtime | Required. `apphosting.yaml`, `firebase.json`, and `backends.json` describe the live backend. Do not lower current resource settings from this audit. |
| Cloud Run service behind App Hosting | Required for public and admin runtime | Required. `backends.json` names managed Cloud Run service `kandydrops` in `us-central1`. |
| Cloud Run Functions | Mixed: required runtime, analytics, admin, scheduler | Required subset. `functions/src/index.ts` exports event triggers, scheduled jobs, analytics, notifications, and materializers. Some exports are analytics/admin-only. |
| Cloud Scheduler | Required only for scheduled functions | Not direct public runtime, but supports drop lifecycle, notification lifecycle, profile building, analytics truth, and admin realtime summary. |
| Firebase Auth | Required for public and admin runtime | Required. Client and server auth are used across guarded app/API routes. |
| Firestore | Required for public and admin runtime | Required. Payment capture, unlocks, drops, chat, support, admin, analytics, queue, and functions all use Firestore. |
| Realtime Database | Required for chat presence if feature is live | Source proves active chat presence in `src/components/Chat/ChatExperience.tsx`; not payment/content truth. Console should confirm usage volume. |
| Cloud Storage / Firebase Storage | Required for media/content runtime | Required. Direct drop content access is denied by rules and routed through server-checked content/admin/creator routes. Egress risk scales with traffic. |
| Cloud SQL | Required only for agent/dev/audit context if Data Connect is deployed | No product-runtime use proven. Likely billing drag candidate pending Console confirmation. |
| Firebase Data Connect | Required only for agent/dev/audit context | Configured in Firebase deployment metadata. No tracked product runtime imports found. |
| App Engine | Configured/billed but not proven active from source | Requires GCP Console confirmation. No source App Engine standard service config was found in this audit. |
| Vertex AI | Admin-only optional cost surface | Admin AI generation routes are under `/api/admin/ai/**`, require admin auth/trusted origin/rate limit/settings gates, and use model allowlists/cost estimates. |
| BigQuery | Required only for analytics/observability | `functions/src/analytics-bigquery-export.ts` exports canonical analytics facts to BigQuery. It is not source truth for revenue/unlocks. |
| Cloud Build | Required for repo automation/deploy CI, not product runtime | `cloudbuild.yaml` and `cloudbuild.release-notes.yaml` define CI/release-note automation. |
| Artifact Registry | Deployment/build artifact support | Not app truth. Required by Cloud Run/App Hosting/Functions build pipeline while deployed artifacts exist. |
| Secret Manager | Required for runtime/deploy secrets | App Hosting references secrets for PayPal, Firebase server config, GA, and navigation cookies. Cloud Build release notes references `GITHUB_TOKEN`. |
| Google Analytics Data API / GA4 | Analytics/admin observability only | GA4 property/API config exists. Admin analytics routes read GA data; server analytics can emit Measurement Protocol events. Not canonical payment/unlock truth. |

## Cloud SQL / Data Connect Verdict

Source-only verdict: Data Connect and Cloud SQL are not proven product-runtime dependencies. They are configured as an agent/repo intelligence mirror.

Evidence:

- `firebase.json` contains `dataconnect.source: "dataconnect"`, which keeps Data Connect attached to the Firebase deploy universe.
- `dataconnect/dataconnect.yaml` defines service `kandydrops`, location `us-central1`, Cloud SQL instance `kandydrops-db`, database `kandydrops_db`, and connector directory `./example`.
- `dataconnect/schema/agent-context.gql` models agent/repo inventory, surface maps, helper indexes, verification commands, task contexts, handoffs, and retrieval edges.
- `dataconnect/schema/structured_profiles.gql` explicitly says structured/vector profiles are not approved active runtime storage.
- `scripts/agent/sync-sql.ts` writes local generated mirror payload/status files and marks runtime use forbidden.
- `agent/state/sql-mirror-status.generated.json` classifies the mirror as `sql_dataconnect_agent_context_mirror` and `source_configured_provider_state_unverified`.
- Tracked-source search found no product runtime import of `DataConnect`, `dataConnect`, `@firebase/data-connect`, generated Data Connect SDK code, `kandydrops-db`, or `kandydrops_db` in active `src/**` or `functions/src/**`.

Safest investigation path:

1. In GCP Console, confirm Cloud SQL `kandydrops-db` connections, CPU, storage, backups, HA, and daily cost.
2. In Firebase/Data Connect Console, confirm Data Connect operations, query/mutation traffic, linked service, and last deploy time.
3. Confirm no external human workflow depends on Data Connect outside this repo.
4. If confirmed mirror-only, take a Cloud SQL backup/export and record restore details.
5. Temporarily suspend/disable the Data Connect/Cloud SQL sidecar from Console or a controlled infra change, then watch App Hosting, Functions, admin, payments, unlocks, chat, and support.
6. Only after observation, prepare a separate PR to remove or legacy-wrap the `firebase.json` Data Connect block and `dataconnect/**` deploy config.

Rollback-safe plan:

1. Preserve `firebase.json`, `dataconnect/dataconnect.yaml`, and `dataconnect/schema/**` in git until removal is proven safe.
2. Create or verify a Cloud SQL backup before disabling anything.
3. Record current SQL instance tier, region, database name, service id, and connector dirs.
4. If disabling causes impact, re-enable the SQL instance/Data Connect service and redeploy the Data Connect config.
5. If no impact after an agreed observation window, mark the mirror as legacy/disabled in docs and remove deploy attachment in a separate reviewed commit.

## App Hosting Verdict

`apphosting.yaml` confirms:

- `cpu: 1`
- `memoryMiB: 2048`
- `concurrency: 80`
- `minInstances: 1`
- `maxInstances: 2`

Verdict: keep as-is for now. The source and operational history indicate these are stability settings, not proven waste. Lowering memory or `minInstances` would be a runtime experiment and should require App Hosting revision metrics, memory utilization, cold-start evidence, and a rollback window.

## App Engine Unknowns And Console Checks

Source does not prove why App Engine is billing. There is no audited source file that defines an App Engine standard service as product runtime.

Check in GCP Console:

- App Engine > Services: list services, versions, traffic split, instance class, instance count, and last request time.
- App Engine > Versions: identify old versions receiving traffic or retaining instances.
- App Engine > Settings: confirm default service state and whether Firebase/App Hosting created dependent plumbing.
- Cloud Logging: filter App Engine logs for real requests versus deployment/build/system noise.
- Billing report: break App Engine down by SKU and label to separate serving, storage, logging, and legacy resources.
- Cloud Scheduler / Tasks: confirm no App Engine target jobs are firing.

Treat App Engine as unsafe to remove without Console confirmation because Firebase projects can retain default App Engine resources that are not obvious from source.

## Cloud Run, Functions, And Scheduler Findings

Functions are configured in `firebase.json` with source `functions`. `functions/src/index.ts` sets global options to region `us-central1`, memory `512MiB`, and max instances `10`.

Scheduled functions found:

- `processQueueLifecycle`: every 15 minutes, retryCount `0`; supports queued drop lifecycle.
- `notifyActiveDropsLifecycle`: every 5 minutes, retryCount `0`; supports active/expired drops and targeted notifications.
- `reconcileAnalyticsTruthLayers`: every 1 hour, retryCount `0`; analytics truth repair/materialization.
- `buildMLFeatureProfiles`: every 4 hours, retryCount `0`; behavioral/profile materialization.
- `refreshAdminAnalyticsRealtimeSummary`: every 1 minute, retryCount `0`; admin realtime summary.

Event triggers and callable/API functions include analytics event facts, BigQuery export, timelines, guest analytics batches, daily tasks, transactions, notifications, watch sessions/assets, creator monetization/events, support/chat-related Firestore surfaces, and runtime warnings/repair actions.

Cost note: the 1-minute admin realtime summary is the highest-cadence scheduler source found. It may be justified for admin truth, but it is not public runtime oxygen and should be reviewed if Scheduler/Functions cost is material.

## Vertex AI / AI Route Audit

Vertex AI usage is admin-only from source.

Evidence:

- `src/app/api/admin/ai/drop-covers/generate/route.ts` requires admin auth, trusted origin, `ADMIN_AI_GENERATE` rate limit, `settings.enabled`, and a valid model id.
- `src/app/api/admin/ai/drop-descriptions/generate/route.ts` requires admin auth, trusted origin, and `ADMIN_AI_CONTROL` rate limit.
- `src/lib/server/ai-drop-covers.ts` and `src/lib/server/ai-drop-descriptions.ts` call Vertex AI REST generation endpoints through Google auth.
- `src/lib/ai-drop-covers.ts` defines model options and per-generation estimates; default settings are disabled.

No public route that can trigger AI generation was proven from source. Vertex AI remains a cost-bearing admin feature and should have Console usage reviewed before disabling.

## Media And Storage Egress Audit

Storage is required, but egress risk is traffic-dependent.

Source controls found:

- `storage.rules` denies direct client access to `drops/**`, `landing/**`, and `creator-onboarding/**`; avatars and creator message attachments are scoped.
- `src/app/api/drops/content/route.ts` acts as an authenticated media proxy with ownership/unlock checks, `MEDIA_PROXY` rate policy, trusted origin, no-store cache, and 250 MiB max bytes per request.
- `src/app/api/admin/content/route.ts` is admin-only and rate limited for content management.
- `src/app/api/creator/drops/assets/route.ts` is creator-authenticated and rate limited for upload.
- Telemetry/catalog guardrails forbid raw content URL leakage.

Verdict: storage is runtime-critical. Egress risk is currently bounded by source rules, but high traffic or repeated media proxy requests can still cost real money.

## Exact Repo Files Causing Service Attachment

| Service | Source files/configs |
| --- | --- |
| App Hosting / managed Cloud Run | `apphosting.yaml`, `firebase.json`, `.firebaserc`, `backends.json`, `cloudbuild.yaml` |
| Functions / Cloud Run Functions | `firebase.json`, `functions/package.json`, `functions/src/index.ts`, `functions/src/**` |
| Cloud Scheduler | `functions/src/index.ts`, `functions/src/analytics-truth-schedule.ts`, `functions/src/profile-builder.ts`, `functions/src/analytics-realtime-summary.ts` |
| Firebase Auth | `src/lib/firebase-data.ts`, `src/lib/server/firebase-admin.ts`, guarded routes under `src/app/api/**` |
| Firestore | `firestore.rules`, `firestore.indexes.json`, `src/lib/firebase-data.ts`, `src/lib/server/firebase-admin.ts`, most `src/app/api/**`, `functions/src/**` |
| Realtime Database | `database.rules.json`, `src/lib/firebase-data.ts`, `src/components/Chat/ChatExperience.tsx`, `src/lib/chat.ts` |
| Storage | `storage.rules`, `src/lib/firebase-data.ts`, `src/lib/server/firebase-admin.ts`, `src/app/api/drops/content/route.ts`, `src/app/api/admin/content/route.ts`, `src/app/api/creator/drops/assets/route.ts`, `next.config.ts` |
| Cloud SQL / Data Connect | `firebase.json`, `dataconnect/dataconnect.yaml`, `dataconnect/schema/**`, `dataconnect/example/**`, `scripts/agent/sync-sql.ts`, `agent/state/sql-*.generated.json` |
| Vertex AI | `src/app/api/admin/ai/drop-covers/generate/route.ts`, `src/app/api/admin/ai/drop-descriptions/generate/route.ts`, `src/lib/server/ai-drop-covers.ts`, `src/lib/server/ai-drop-descriptions.ts`, `src/lib/ai-drop-covers.ts`, `src/lib/ai-drop-descriptions.ts`, `package.json` |
| BigQuery | `functions/src/analytics-bigquery-export.ts`, `functions/package.json`, `src/lib/server/cloud-cost-contract.ts`, `docs/agent-truth/cloudrun-sql-bigquery-guardrails.md` |
| Cloud Build | `cloudbuild.yaml`, `cloudbuild.release-notes.yaml`, `.github/workflows/**` fallback workflows |
| Artifact Registry | Indirect through App Hosting/Cloud Run/Functions build outputs; no app source truth depends on it |
| Secret Manager | `apphosting.yaml`, `cloudbuild.release-notes.yaml` |
| GA4 / Google Analytics Data API | `apphosting.yaml`, `src/lib/server/analytics.ts`, `src/lib/server/admin-analytics-data.ts`, `src/lib/server/admin-analytics-shared.ts`, `src/app/api/admin/analytics/**` |

## Exact GCP Console Checks Needed

- Billing > Reports: group last 7 and 30 days by service and SKU, then filter KandyDrops project labels where available.
- Firebase App Hosting: confirm backend revision CPU, memory, concurrency, min/max instances, request count, errors, and memory pressure.
- Cloud Run: inspect App Hosting managed service plus Functions services for request count, instance count, memory, CPU, and traffic split.
- Cloud Functions: list deployed functions, invocations, errors, memory, max instances, and trigger type.
- Cloud Scheduler: list jobs, frequency, target, last run, retries, and failures.
- Cloud SQL: inspect `kandydrops-db` state, tier, storage, backups/PITR, HA/read replicas, deletion protection, connections, CPU, and cost.
- Firebase Data Connect: inspect service `kandydrops`, linked SQL instance/database, query/mutation traffic, operations, and last deploy.
- BigQuery: inspect datasets/tables, streaming inserts, storage bytes, query jobs, partition/retention settings, and service account usage.
- Vertex AI: inspect generative model calls, custom jobs/endpoints, regional cost, and quota usage.
- App Engine: inspect services, versions, instances, traffic, cron/dispatch, logs, and SKU-level billing.
- Cloud Storage: inspect bucket size, egress, object lifecycle policy, public access, and top object prefixes.
- Artifact Registry: inspect repositories, image count/age/size, cleanup policy, and App Hosting/Functions artifact retention.
- Cloud Build: inspect triggers, build history, minutes, failed/retried builds, and log storage.
- Secret Manager: inspect active secrets, versions, access frequency, and rotation status without printing values.
- GA4 / Analytics Data API: inspect API quota/calls and whether admin routes are driving measurable usage.

## Recommended Next Actions Ranked By Risk/Reward

1. High reward / low risk: confirm Cloud SQL/Data Connect daily cost, active connections, and Data Connect operation counts in Console.
2. High reward / medium risk: if confirmed mirror-only, backup Cloud SQL and temporarily suspend the Data Connect/Cloud SQL sidecar during a monitored window.
3. High reward / medium risk: identify App Engine SKU/source in Console and disable only stale versions/services with zero traffic.
4. Medium reward / low risk: add or confirm Artifact Registry cleanup policy for old build images.
5. Medium reward / low risk: review the 1-minute admin realtime summary scheduler cost before changing cadence.
6. Medium reward / low risk: review BigQuery raw analytics export storage/query cost and retention settings.
7. Medium reward / low risk: review Vertex AI admin usage; keep disabled by default if not actively needed.
8. Low risk / high safety: keep App Hosting memory/minInstances unchanged until App Hosting revision metrics prove a lower setting is safe.

## Final KandyDrops Alive Minimum Stack

Minimum runtime oxygen:

- Firebase App Hosting with current production armor.
- Managed Cloud Run service behind App Hosting.
- Firebase Auth.
- Firestore.
- Firebase/Cloud Storage for media and profile assets.
- Secret Manager runtime secrets.
- PayPal external payment API and current payment route secrets.
- Cloud Run Functions/Scheduler subset needed for drop lifecycle, notification lifecycle, analytics truth, transaction/watch/session/admin materializers.
- Realtime Database if chat presence remains part of live chat UX.

Not minimum product oxygen unless Console proves otherwise:

- Cloud SQL.
- Firebase Data Connect.
- BigQuery.
- Vertex AI.
- Google Analytics Data API.
- App Engine.
- Cloud Build and Artifact Registry beyond deployment/ops needs.

## Audit Boundary

This report is source-grounded. Provider state, active deployed resources, historical traffic, and SKU attribution cannot be proven from the repo. Anything marked as Console confirmation required should not be removed based on source alone.

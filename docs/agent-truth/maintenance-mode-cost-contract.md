# KandyDrops canonical maintenance-mode contract

Status: active when `KANDY_MAINTENANCE_MODE` resolves to `on` (`1`, `true`, or `on`). The public gate and all maintenance-incompatible background consumers fail closed when the variable is missing or ambiguous.

Owner: KandyDrops runtime/platform owner. Canonical source: `shared/runtime/maintenance-mode-contract.ts`. Local validator: `npm run check:maintenance-config`. Provider state is separate evidence and must be checked explicitly by an operator.

Cloud Scheduler jobs must be paused during maintenance. Source/config tests cannot prove provider state.

## Canonical architecture

There is one state variable and one parser:

`KANDY_MAINTENANCE_MODE` → `shared/runtime/maintenance-mode-contract.ts` → Next middleware, navigation-session policy, Functions scheduled-job guard, scheduler manifest, SQL policy, and admin-route policy.

App Hosting and Functions receive the same variable independently. App Hosting configuration does not automatically configure Functions. Cloud Scheduler and Cloud SQL are provider resources, so their state is represented by checked-in expectations and changed only by the operator plan below.

The state machine is:

| Resolved state | Public request | Background work | Safe interpretation |
| --- | --- | --- | --- |
| `on` | Serve the maintenance response | Skip before the guarded callback | Maintenance active |
| `off` | Continue normal routing | May run under normal route/job contracts | Normal mode |
| `unknown` | Serve maintenance response | Skip | Fail closed; never infer normal mode |

The shared contract is pure. It imports no Firebase, Next.js, Firestore, Cloud SQL, BigQuery, messaging, or other billable runtime dependency.

## Maintenance behavior

| Surface | Decision while maintenance is on | Evidence/owner |
| --- | --- | --- |
| Public static/inline maintenance page | ALLOWED | `middleware.ts` returns the 503 response before normal continuation. |
| Normal application UI and SSR | OFF | The request does not continue past the maintenance branch. |
| Normal API routes | OFF | Middleware returns a 503 JSON response before route auth/data work. |
| `/maintenance/admin` | ALLOWED | Static bootstrap page only. |
| `POST /api/auth/navigation-session` | EXPLICITLY ALLOWED | Authenticated, rate-limited bootstrap; one `users/{uid}` read establishes the admin role and issues a 15-minute ticket. This is the only intentional maintenance Firestore read in the bootstrap path. |
| Signed `/admin/**` repair UI | EXPLICITLY ALLOWED | Short-lived maintenance ticket plus the route’s normal admin authorization. Operator-driven only; no maintenance polling or batch refresh is authorized. |
| Signed `/api/admin/**` repair APIs | EXPLICITLY ALLOWED, bounded | Short-lived ticket plus route-owned `guardApiRequest` authorization/rate limits. The prefix is a repair exception, not a cheap path. |
| `/api/admin/analytics/**` | OFF | Analytics snapshot reads/writes are not required for the maintenance page and are blocked before route import. |
| `/api/admin/ai/**` and `/api/admin/debug/assistant/**` | OFF | AI/assistant work is not maintenance-critical and is blocked before route import. |
| `/api/drops/duplicate-filenames` | EXPLICITLY ALLOWED | Signed operator preflight only; no product runtime data path. |
| Firestore reads/writes | OFF except the navigation-session role read and an explicitly approved repair | Scheduled callbacks are not entered when the guard is active. Public routes do not reach Firestore. |
| Scheduled analytics/materialization | OFF | All checked-in schedules use the shared registry and `runIfMaintenanceAllows`. Provider jobs must also be paused. |
| Queue lifecycle | OFF | `processQueueLifecycle` is disabled by contract. |
| Notifications | OFF | `notifyActiveDropsLifecycle` is disabled by contract. |
| ML profile builds | OFF | `buildMLFeatureProfiles` is disabled by contract; its normal-mode memory contract is explicit at 512MiB. |
| Catalog refresh and daily task materialization | OFF | No checked-in scheduled materializer is maintenance-allowed. |
| BigQuery export | OFF | The source-only schedule is guarded even if later deployed. |
| Payment/webhook processing | NO APPROVED EXCEPTION | No change in this remediation authorizes payment or webhook work. A future exception requires a named route/function, data dependency, cost ceiling, and rollback. |
| Cloud SQL compute | OFF | Stop both instances only after the operator confirms retention/connector ownership. |
| Cloud SQL storage | RETAINED | Storage is the retained-data cost; stopping compute must not delete data. |
| Firestore/Storage/Artifact Registry retention | ALLOWED | Fixed retention costs are not maintenance traffic. |
| Logging | MINIMAL | Routine maintenance responses and skipped jobs do not emit per-request/per-run application logs. Errors, security events, transitions, and approved admin operations remain auditable. |
| Health checks | ALLOWED only if cheap/required | Do not use a health check as a reason to wake the normal application runtime. |

## Admin exceptions

Every signed admin exception has four controls: short-lived authorization, route-owned authorization/rate limiting, bounded operator invocation, and audit/debug output from the route. The maintenance middleware does not grant product authorization by itself.

## Scheduled jobs and provider drift

The shared registry is the source of truth for cadence, maintenance eligibility, and scheduled max instances. The five currently deployed provider jobs are all disabled by contract:

| Function | Source cadence | Current provider finding | Maintenance decision |
| --- | --- | --- | --- |
| `refreshAdminAnalyticsRealtimeSummary` | Every 5 minutes | Provider was every 1 minute; source/provider drift confirmed | DISABLED; correct provider to 5 minutes before normal re-enable |
| `reconcileAnalyticsTruthLayers` | Every 1 hour | Enabled; repeated 256MiB failures | DISABLED; normal mode requires bounded 512MiB execution or further workload profiling |
| `processQueueLifecycle` | Every 15 minutes | Enabled | DISABLED |
| `notifyActiveDropsLifecycle` | Every 5 minutes | Enabled | DISABLED |
| `buildMLFeatureProfiles` | Every 4 hours | Enabled; repeated 256MiB failures | DISABLED; normal mode requires bounded 512MiB execution or further workload profiling |

Checked-in but not part of the current five-job provider inventory are daily task materialization, user-index materialization, and the daily BigQuery export. They are also OFF during maintenance and cannot be enabled silently: their source cadence is owned by the same registry and their handlers are guarded.

Every scheduled handler now calls the pure guard before its callback. The two failing rebuild handlers and queue/realtime scheduled wrappers dynamically import their expensive runtime after the guard. The aggregate Firebase Functions entrypoint still contains event-trigger imports, so provider Scheduler pause is the strict no-invocation boundary; the local guard is defense in depth and prevents Firestore/workload execution if a stale trigger fires.

Retry behavior is bounded: the five maintenance jobs have `retryCount: 0`; the source-only daily task materializer retains one bounded retry for normal operation but is also maintenance-blocked. No memory increase was invented for maintenance. The failing rebuilds are explicitly declared at 512MiB in source because the source already declares that global allocation and the provider was observed at 256MiB. At minimum instances zero, this changes only normal-mode execution allocation; maintenance cost remains zero when triggers are paused/guarded. The normal-mode memory effect is proportional to billed memory GB-seconds, with a 2x allocation ceiling versus 256MiB for those executions; the exact dollar delta must be verified after deployment from billing.

## Firestore boundary

The maintenance boundary is before normal route continuation and before scheduled callback work. No public maintenance route can initialize normal server data paths. The navigation-session exception is deliberate and bounded to one authenticated profile document read to establish the admin role; it is not a public maintenance-page dependency.

The scheduled guard callback test proves that blocked work does not call its injected Firestore/runtime callback. Source tests do not query production documents. After cloud remediation, the operator must verify default Firestore read/write metrics fall toward zero and that only the explicit admin bootstrap/approved repair lane remains.

## Cloud SQL ownership

The canonical checked-in SQL owner is `kandydrops-db` / database `kandydrops_db` in `us-central1`, and its only approved purpose is the Data Connect agent/repo-intelligence mirror described in `dataconnect/dataconnect.yaml`. No checked-in product runtime, payment, Drop, chat, support, creator, or Functions route uses a SQL/Data Connect client. `scripts/agent/sync-sql.ts` is manual-only and writes local mirror artifacts; it is not a production runtime consumer.

| Instance | Local ownership finding | Maintenance behavior | Later action |
| --- | --- | --- | --- |
| `kandydrops-db` | Canonical repo mirror target; no product runtime consumer found | Stop compute; retain storage while the mirror is intentionally retained | Decommission only after the mirror-retirement decision and recovery proof |
| `kandydrops-by-ikandy-instance` | No checked-in product consumer. Provider metadata showed a separate legacy/external Data Connect service/connector, so uniqueness and data ownership are not proven locally | Stop compute only after the operator confirms its connector/data role | Candidate decommission after provider connector, export/backup, retention, and rollback review |

This remediation removes local architectural ambiguity without deleting or mutating either cloud instance. The second instance is not called “safe to delete” from source evidence alone.

## Minimum-instance policy

Maintenance target is zero minimum instances for App Hosting and all scheduled/event-driven Functions. The source has no minimum-instance declaration for Functions; the checked-in provider expectation records zero for the five schedules, the five event-driven analytics/security/transaction functions, and the App Hosting SSR function. The current live v2 Function payload exposes `maxInstanceCount` values of 10/20 and the SSR service exposes max scale 3, but it does not expose a nonzero minimum count for the inspected services. Do not describe those max values as warm minimums. The operator must still verify minimum counts after the reviewed deployment; event-driven functions should remain zero permanently unless an explicit latency SLO approves a warm instance. The normal App Hosting source already declares `minInstances: 0`.

## Cost model

### Current post-maintenance model

Full UTC days Aug 3–8 averaged **$0.701397/day** for project `kandydrops-by-ikandy`:

| Cost source | Daily cost | Share | Classification while maintenance is active |
| --- | ---: | ---: | --- |
| Cloud SQL PostgreSQL Zonal Micro compute, two `db-f1-micro` instances | $0.504000 | 71.86% | UNNECESSARY unless an explicitly retained capability proves otherwise |
| Cloud SQL PostgreSQL storage | $0.109656 | 15.63% | EXPECTED retained-data cost |
| Firestore storage | $0.059214 | 8.44% | EXPECTED retained-data cost |
| Firestore read operations | $0.027080 | 3.86% | UNNECESSARY scheduled/background activity; bootstrap/approved repair is the exception |
| Cloud Storage, Artifact Registry, and remainder | $0.001447 | 0.21% | EXPECTED small retention/build residue |
| **Total** | **$0.701397** | **100%** |  |

App Hosting/Cloud Run was effectively zero after the middleware gate. The “approximately $2/day” report is not reproduced by the KandyDrops project export in this window; the attributed KandyDrops post-maintenance project spend is about $0.70/day. The evidence-backed remediation target is based on that project-scoped total.

### Target maintenance model

| Component | Target behavior | Estimated daily cost |
| --- | --- | ---: |
| App Hosting/Cloud Run | Zero minimum; static/inline maintenance response | ~$0 variable |
| Cloud Scheduler/Functions | Provider jobs paused; handlers fail closed | ~$0 variable |
| Firestore reads/writes | Near-zero except approved admin bootstrap/repair | ~$0 variable |
| Cloud SQL compute | Both instances stopped | ~$0 compute |
| Cloud SQL storage | Retained | ~$0.109656 |
| Firestore storage | Retained | ~$0.059214 |
| Storage/Artifact Registry/remainder | Retained | ~$0.0014 |
| **Target** | **retained-storage territory** | **~$0.1703/day or lower** |

The target is an estimate, not a provider guarantee. It becomes lower only if an operator safely decommissions redundant SQL storage or other retained assets. Billing must be verified after propagation.

## Operator entry checklist

Do not execute these commands from local tests. They are the ordered cloud actions for an authorized operator:

1. Deploy the reviewed App Hosting/Functions source so the shared gate, handler guard, route blocks, and source cadence are present. Why: make the local boundary executable. Cost effect: prevents variable runtime/background work after the flag is set. Risk: deployment/config mismatch; verify ready revision, function revisions, and rollback artifact. Rollback: redeploy the prior known-good revision without enabling schedules.
2. Set `KANDY_MAINTENANCE_MODE=1` in both App Hosting and Firebase Functions runtime configuration. Why: one state source must reach both runtimes. Cost effect: blocks requests/jobs; no direct fixed-cost change. Risk: missing Functions env would permit stale jobs; verify the deployed environment and a public 503/maintenance response. Rollback: set explicit `0` only as part of the exit checklist.
3. Pause the five maintenance-incompatible Scheduler jobs. Why: a handler guard cannot prevent a function invocation/module load, and the provider cadence was already drifting. Cost effect: removes scheduler-triggered Function/Firestore variable work. Risk: delayed analytics/queue/notification work; verify each job is `PAUSED`, not merely source-disabled. Rollback: resume only the named job after maintenance state is explicitly off and its cadence matches source.
4. Correct `refreshAdminAnalyticsRealtimeSummary` provider cadence from 1 minute to 5 minutes before any normal-mode resume. Why: eliminate 5x trigger frequency/source drift. Cost effect: approximately 1,152 fewer invocations/day than the observed 1-minute cadence if enabled; actual billed cost depends on execution. Risk: slower admin freshness; verify scheduler job schedule and source registry. Rollback: restore only if an owner accepts the cost/freshness tradeoff and updates the source contract first.
5. Set maintenance-incompatible Function minimum instances to zero: the five schedules, the five event-driven functions listed in `config/maintenance-provider-expectations.json`, and `ssrkandydropsbyikandy`/App Hosting SSR. Why: enforce the checked-in scale-to-zero contract and prevent future provider drift; the current live inspection confirmed max-scale settings, not nonzero minimums. Exact savings depend on provider billing. Risk: cold starts in normal mode; verify min instance settings and latency after exit. Rollback: restore only a named latency-approved minimum.
6. Stop Cloud SQL compute for `kandydrops-db` and `kandydrops-by-ikandy-instance` only after the operator confirms no retained capability needs a live connection. Why: compute is $0.504/day, the largest current driver. Cost effect: remove approximately $0.504/day. Risk: Data Connect/legacy connector outage and cold-start time; verify instances are stopped, storage remains, backups/exports/restore path are available. Rollback: start only the required canonical instance and verify `RUNNABLE`/connection health.
7. Decide whether to retain or decommission the second SQL instance after provider Data Connect connector/data ownership review. Why: remove a likely redundant/legacy owner without deleting unique data. Cost effect: possible additional storage savings; amount is not proven from source. Risk: irreversible data/service loss; verify export, row/data ownership, dependencies, and a tested restore. Rollback: restore into a replacement instance only after the recovery proof exists.
8. Verify Firestore metrics after at least one normal scheduler window: read/query operations, writes, listener/trigger activity, and error logs. Why: prove the variable read activity stopped. Cost effect: target near-zero variable reads. Risk: telemetry delay; verify against a comparable pre-change window. Rollback: do not resume all jobs; re-enable one explicitly approved job only after finding its caller.
9. Verify billing after the provider propagation window using the project-scoped export. Why: reconcile the entire cost model. Cost effect: confirm approximately $0.17/day retained-storage territory. Risk: partial-day/late export misread; verify complete UTC days and line-item/SKU attribution. Rollback: restore the last known-safe retained resource only, not every paused component.

## Operator exit checklist

1. Start only the SQL instance(s) required by an explicitly approved normal-mode capability; wait for `RUNNABLE` and test the owning Data Connect/route connection.
2. Restore only the approved Scheduler jobs; verify each job matches the shared source cadence, max-instance bound, retry policy, and maintenance guard.
3. Set `KANDY_MAINTENANCE_MODE=0` in both runtimes and deploy/verify the normal revision. Do not leave one runtime on and the other off.
4. Verify public route health, admin authorization, Firestore read/write rates, Function errors, and billing. Keep event-driven minimums at zero unless a latency decision says otherwise.

## Read-only provider verification commands

These are intentionally separate from `npm run check:maintenance-config` and must be run only by an authorized operator with read-only intent. The optional `npm run check:maintenance-config:live` wrapper performs the same read-only comparison and is never called by ordinary tests or CI.

```powershell
gcloud scheduler jobs list --project kandydrops-by-ikandy --location us-central1 --format="table(name,state,schedule,timeZone)"
gcloud functions list --v2 --project kandydrops-by-ikandy --regions us-central1 --format="table(name,state,serviceConfig.minInstanceCount,serviceConfig.maxInstanceCount,serviceConfig.availableMemory)"
gcloud run services describe kandydrops --project kandydrops-by-ikandy --region us-central1 --format="yaml(spec.template.metadata.annotations,spec.template.spec.containerConcurrency,status.traffic)"
gcloud sql instances describe kandydrops-db --project kandydrops-by-ikandy --format="yaml(name,state,settings.activationPolicy,settings.tier,settings.dataDiskSizeGb)"
gcloud sql instances describe kandydrops-by-ikandy-instance --project kandydrops-by-ikandy --format="yaml(name,state,settings.activationPolicy,settings.tier,settings.dataDiskSizeGb)"
```

These commands do not prove billing by themselves. They must be paired with the project billing export/console and Firestore metrics. Do not run the existing scheduler-freshness check during this task because it reads a production Firestore collection.

## Exact operator change sequence (not executed locally)

The commands below are a later operator runbook, not local-test commands. Confirm the project and identity first, preserve existing secret values, and take a before-state capture of Scheduler, Functions, App Hosting, and Cloud SQL. The Google CLI supports pausing and resuming Scheduler jobs, updating an HTTP job schedule, setting Function minimum instances, and changing Cloud SQL activation policy; the Firebase CLI supports partial Function/App Hosting deployments. See the [Scheduler pause command](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/pause), [Scheduler HTTP update command](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http), [Functions deployment command](https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy), [Firebase partial deployments](https://firebase.google.com/docs/cli), and [Cloud SQL start/stop guidance](https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance).

```powershell
$Project = "kandydrops-by-ikandy"
$Region = "us-central1"
$SchedulerJobs = @(
  "firebase-schedule-refreshAdminAnalyticsRealtimeSummary-us-central1",
  "firebase-schedule-reconcileAnalyticsTruthLayers-us-central1",
  "firebase-schedule-processQueueLifecycle-us-central1",
  "firebase-schedule-notifyActiveDropsLifecycle-us-central1",
  "firebase-schedule-buildMLFeatureProfiles-us-central1"
)

# Read-only before-state capture. Do not continue if names, project, or target
# function revisions differ from the checked-in expectation manifest.
gcloud scheduler jobs list --project $Project --location $Region --format="table(name,state,schedule,timeZone)"
gcloud functions list --v2 --project $Project --regions $Region --format="table(name,state,serviceConfig.minInstanceCount,serviceConfig.maxInstanceCount,serviceConfig.availableMemory)"
gcloud run services describe kandydrops --project $Project --region $Region --format="yaml(spec.template.metadata.annotations,status.traffic)"
gcloud sql instances describe kandydrops-db --project $Project --format="yaml(name,state,settings.activationPolicy,settings.tier,settings.dataDiskSizeGb)"
gcloud sql instances describe kandydrops-by-ikandy-instance --project $Project --format="yaml(name,state,settings.activationPolicy,settings.tier,settings.dataDiskSizeGb)"
```

1. Deploy the reviewed App Hosting source with `KANDY_MAINTENANCE_MODE=1` and `runConfig.minInstances: 0`. Verify the backend ID returned by `firebase apphosting:backends:list --project $Project`; deploy only that backend (expected local identifier: `kandydrops`) with `firebase deploy --project $Project --only apphosting:kandydrops`. If the backend is not linked to this checkout, stop and use the owning App Hosting rollout workflow rather than guessing.
2. Put `KANDY_MAINTENANCE_MODE=1` into the existing Functions runtime environment without replacing existing secrets, then deploy the reviewed Functions source. The source now owns `minInstances: 0`, scheduled `maxInstances: 1`, retry bounds, and the 512MiB normal-mode allocation for the two failing rebuilds. Deploy the changed/exported functions in bounded groups:

   ```powershell
   firebase deploy --project $Project --only functions:refreshAdminAnalyticsRealtimeSummary,functions:reconcileAnalyticsTruthLayers,functions:processQueueLifecycle,functions:notifyActiveDropsLifecycle,functions:buildMLFeatureProfiles,functions:onAnalyticsEventFactCreated,functions:onDailyTaskEventCreated,functions:onGuestAnalyticsBatchCreated,functions:onSecurityEventCreated,functions:onTransactionCreated
   ```

   Verify the Functions revision environment and minimum counts before touching Scheduler. Do not use legacy `functions:config:set`; the checked-in Functions runtime uses environment-file/runtime configuration.
3. Pause each maintenance-incompatible Scheduler job; do not delete it:

   ```powershell
   foreach ($Job in $SchedulerJobs) {
     gcloud scheduler jobs pause $Job --project $Project --location $Region
   }
   ```

   Verify every job is `PAUSED`. This is required even after deployment because a handler guard does not prevent a Scheduler invocation or function-container startup.
4. While the refresh job is paused, correct the confirmed provider/source drift. The observed provider job is an HTTP Scheduler job; update only its cadence and timezone, preserving its URI, auth, headers, and retry settings:

   ```powershell
   gcloud scheduler jobs update http firebase-schedule-refreshAdminAnalyticsRealtimeSummary-us-central1 --project $Project --location $Region --schedule="every 5 minutes" --time-zone="UTC"
   ```

   Re-list the job and confirm `every 5 minutes`, `UTC`, and `PAUSED`. If its target type is no longer HTTP, stop and use the matching `scheduler jobs update` subcommand rather than changing the target accidentally.
5. Confirm the reviewed Functions deployment reports minimum instances of zero for the five schedules and the five event-driven functions listed in the manifest. Confirm the App Hosting Cloud Run service reports minimum scale zero. Do not use a broad provider edit that changes unrelated runtime settings.
6. After connector/ownership verification, stop SQL compute while retaining storage:

   ```powershell
   gcloud sql instances patch kandydrops-db --project $Project --activation-policy=NEVER
   gcloud sql instances patch kandydrops-by-ikandy-instance --project $Project --activation-policy=NEVER
   ```

   Verify each instance is stopped and `settings.activationPolicy=NEVER`; verify the disk size remains unchanged. The second instance is not eligible for decommissioning until its Data Connect connector, unique data, export/backup, and rollback owner are proven. Do not run a delete command as part of maintenance entry.
7. After at least one complete scheduler interval, verify Firestore read/query/write metrics and logs fall to the approved bootstrap/repair baseline. Then verify complete UTC billing days by project, service, SKU, and SQL resource. Compare against the `$0.1703/day or lower` retained-storage target; do not treat a partial export day as the steady state.

Normal-mode rollback is the inverse, component by component: set both runtime flags explicitly to `0` through the owning deployment workflows, resume only the named Scheduler jobs after source cadence verification, and set `--activation-policy=ALWAYS` only on the SQL instance required by the capability being restored. Never roll back by resuming all jobs or starting both instances without a named dependency.

## Rollback

Rollback is component-scoped: restore the last known-good app/function revision, keep public maintenance on while investigating, start only the SQL instance named by the failed capability, and resume only the single Scheduler job required by the recovery. Never roll back by re-enabling all schedules, all minimum instances, or both SQL instances at once.

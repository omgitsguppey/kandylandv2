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
| Normal application UI and SSR | OFF for public traffic; signed admin browsing allowed | Existing short-lived ticket gates operator page GET/HEAD requests. |
| Normal API routes | OFF except exact signed operator reads | `MAINTENANCE_ADMIN_BROWSE_READ_PATHS` owns reviewed read exceptions; unreviewed routes and product mutations return 503. |
| `/maintenance/admin` | ALLOWED | Static bootstrap page only. |
| `POST /api/auth/navigation-session` | EXPLICITLY ALLOWED | Authenticated, rate-limited bootstrap; one `users/{uid}` read establishes the admin role and issues a 15-minute ticket. This is the only intentional maintenance Firestore read in the bootstrap path. |
| Signed `/admin/**` repair UI | EXPLICITLY ALLOWED | Short-lived maintenance ticket plus the route’s normal admin authorization. Operator-driven only; no maintenance polling or batch refresh is authorized. |
| Signed `/api/admin/**` repair APIs | EXPLICITLY ALLOWED, bounded | Short-lived ticket plus route-owned `guardApiRequest` authorization/rate limits. The prefix is a repair exception, not a cheap path. |
| `GET /api/admin/analytics/refresh` | EXPLICITLY ALLOWED, bounded | Exact stored-snapshot read only, after a valid 15-minute maintenance ticket and the existing route-owned admin authorization/rate limits. No snapshot refresh, lease or materializer writes. |
| Other methods and paths under `/api/admin/analytics/**` | OFF | POST/materialization, HEAD, raw/live/realtime and unreviewed analytics owners stay blocked before route import. |
| `/api/admin/ai/**` and `/api/admin/debug/assistant/**` | OFF | AI/assistant work is not maintenance-critical and is blocked before route import. |
| `/api/drops/duplicate-filenames` | EXPLICITLY ALLOWED | Signed operator preflight only; no product runtime data path. |
| Firestore reads/writes | OFF except navigation-session role read, reviewed operator browsing and approved repair | Operator reads retain existing bounds. Scheduled callbacks are not entered; public routes do not reach Firestore. |
| Scheduled analytics/materialization | OFF | All checked-in schedules use the shared registry and `runIfMaintenanceAllows`. Provider jobs must also be paused. |
| Queue lifecycle | OFF | `processQueueLifecycle` is disabled by contract. |
| Notifications | OFF | `notifyActiveDropsLifecycle` is disabled by contract. |
| ML profile builds | OFF | `buildMLFeatureProfiles` is disabled by contract; its normal-mode memory contract is explicit at 512MiB. |
| Catalog refresh and daily task materialization | OFF | No checked-in scheduled materializer is maintenance-allowed. |
| BigQuery export | OFF | The source-only schedule is guarded even if later deployed. |
| Payment/webhook processing | NO APPROVED EXCEPTION | No change in this remediation authorizes payment or webhook work. A future exception requires a named route/function, data dependency, cost ceiling, and rollback. |
| Cloud SQL compute | OFF | The operator selected both connectors paused with both databases retained; recovery and stop settlement are recorded below. |
| Cloud SQL storage and recovery backups | RETAINED | Stopping compute must not delete data. Retained storage, backups and idle public IPv4 remain billable. |
| Firestore/Storage/Artifact Registry retention | ALLOWED | Fixed retention costs are not maintenance traffic. |
| Logging | MINIMAL | Routine maintenance responses and skipped jobs do not emit per-request/per-run application logs. Errors, security events, transitions, and approved admin operations remain auditable. |
| Health checks | ALLOWED only if cheap/required | Do not use a health check as a reason to wake the normal application runtime. |

## Admin exceptions

Every signed admin exception has four controls: short-lived authorization, route-owned authorization/rate limiting, bounded operator invocation, and audit/debug output from the route. The maintenance middleware does not grant product authorization by itself.

The operator explicitly requested site browsing as an admin during maintenance. A valid existing 15-minute maintenance ticket now permits page `GET`/`HEAD` requests and the exact read owners in `MAINTENANCE_ADMIN_BROWSE_READ_PATHS`, plus a single chat-thread detail read. These owners keep their existing authenticated actor checks, bounded queries and rate limits; this enables operator inspection, not public traffic. Middleware continuation is private/no-store and varies by cookie. The existing auth route may clear both navigation cookies with `DELETE`, including after ticket expiry, under its trusted-origin guard.

The exact public brand/release asset allowlist is owned by `MAINTENANCE_PUBLIC_ASSET_PATHS`; a file extension never creates an exemption. Creator-profile GET is a single-segment reviewed read: its existing public-safe media projection, one-user lookup, follower count and 40-drop bound remain; maintenance suppresses its view-count write and uses private, no-store caching. Page browsing does not enable checkout, unlock/content access, telemetry ingestion, creator-profile view writes, unreviewed API reads, refresh/materialization, AI, cron or product mutations. Existing reviewed admin repair actions keep their route authorization. Cloud Scheduler remains paused and both SQL engines remain stopped. Rollback is the retained prior App Hosting source with maintenance on; this contract changes no provider capacities or retained data.

The sole Analytics exception is exact `GET /api/admin/analytics/refresh`; omitted methods, `HEAD`, `POST`, other verbs, descendants and similar prefixes remain blocked. Middleware only admits a valid maintenance ticket; the GET still enforces its independent normal admin authorization, pre-auth and caller-scoped rate limits, registered module/range validation, and private/no-store response. A query such as `force=true` does not start work on GET.

The GET reads one existing stored snapshot record, then passes that exact object (including explicit null) to verification and metadata projections. It does not acquire a refresh lease, run a materializer, call live/raw analytics sources, schedule work, or write snapshot state. Missing, failed or stale source truth remains visible as returned by the existing snapshot owner. This is operator inspection, not a source-health or data-parity claim.

This one-record limit describes the snapshot source lookup, not total Firestore operations. Existing admin authentication, abuse/rate limits and `withRouteRuntimeHealth` audit/health recording remain unchanged; health recording has its own existing transaction and may write. No new polling, cadence or automatic refresh is authorized. Cloud Scheduler remains paused and both SQL engines remain stopped with their databases retained. Source tests establish only this boundary; real signed navigation/reload and real Admin data correctness require separate current runtime evidence.

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
| `kandydrops-db` | Canonical repo mirror target; no product runtime consumer found | Compute stopped; original storage, database binding and recovery backup retained | Start only for a named approved capability; retirement requires a separate decision |
| `kandydrops-by-ikandy-instance` | Separate legacy/external Data Connect binding with unique connector source; it is retained | Compute stopped under the owner's explicit pause-both decision; original storage, database binding and recovery backup retained | Start only for a named approved capability; no deletion is authorized |

The owner chose “Pause both connectors; retain both databases.” Both original instance settings changed only from activation policy `ALWAYS` to `NEVER` after actual backup, isolated restore and exact temporary cleanup. Neither original instance, database, connector nor recovery backup was deleted. The legacy connector is not called redundant from source evidence alone.

## Provider review captured October 1, 2026

The exact-project receipts are retained locally under `output/manual-provider-cost-review-20261001/`; `billing-custody.json` records the selected project number, report URLs, period, raw CSV hashes and matching totals. The existing completion table in `FULL_SCALE_CODEBASE_AUDIT.md` owns the verdicts.

- Billing: the September 1–30 project-filtered service and SKU exports agree at $21.059663 net ($21.06 displayed). All 92 SKU rows were retained and the project/date/SKU selection and displayed total survived reload. SQL compute accounts for $15.12; SQL storage for $3.399840. The App Engine service charge is Firestore storage/read SKUs, not evidence of a separate App Engine application.
- Time boundary: this is a pre-deployment billing baseline. [Billing Reports use Pacific-time charge-period days and service reporting can lag](https://docs.cloud.google.com/billing/docs/how-to/reports). It does not satisfy the propagated full-UTC-day maintenance predicate below. Preserve usage cost, savings and net cost separately; zero net cost does not mean no work.
- SQL before recovery: `sql-recovery-metadata.json` observes both instances RUNNABLE, ALWAYS, ZONAL, 10GB, with automated backups disabled and empty unpaginated backup histories. A configured retention count of seven does not establish seven available backups. The September 24–October 1 UTC aggregate metrics observe connections and transactions on both instances; they can include internal work and do not identify a retained consumer. The connector detail receipt distinguishes the canonical empty connector source from the legacy connector's two returned source files. The later authorized recovery and shutdown are recorded next.
- Warehouse: `bigquery-provider-metadata.json` observes the canonical `raw_events` table last modified August 2 at 05:42:08.067 UTC. The bounded job receipt contains six successful GA4 load jobs since September 24 and no canonical destination job. GA4 activity does not clear first-party warehouse heartbeat or parity; no query or row read was performed.
- Gemini/Vertex: the deployed public Firebase project binding and the inspected server resolvers identify `kandydrops-by-ikandy`. The full September SKU export contains no Gemini/Vertex service entry. Current explicit-action, admin/origin, rate and budget source guards remain separate source evidence; no AI request was made, and the billing observation does not prove absence of unbilled usage or normal-mode runtime behavior.

### SQL recovery and shutdown settlement

Exact-project receipts are under `output/manual-sql-maintenance-recovery-20261001/`. `operation-envelope.json` fixes authority, source and temporary identities, one attempt per mutation, retained backups, resource ceilings, all terminal states and exact cleanup before dispatch.

- `backup-settlement.json`: one successful standard on-demand backup per original, retained in the `us` multi-region. These backups remain under the existing instance owner; [standard on-demand backups persist until the backup or owning instance is deleted](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options). This is not a claim that retention-on-instance-deletion is enabled. Keep both backups throughout maintenance. Provider expiry and chargeable-byte fields were omitted; do not convert them to zero or claim free storage.
- `restore-verification.json`: both backups restored into absent, task-labelled temporary instances with their actual PostgreSQL 18/17 engines RUNNABLE. Each restored database inventory, charset/collation and user metadata matches its source. No application rows were read; row-level business parity and normal-mode availability were not tested.
- `cleanup-settlement.json`: both task-created restore instances were deleted only after terminal successful recovery, exact create identity and task-label checks. The inventory confirms both temporary names absent. Original databases and recovery backups were retained.
- `maintenance-settlement.json`: both original pause operations settled DONE without error at 20:14:32 UTC on October 1. Both remain 10GB/ZONAL with unchanged settings apart from activation policy and its version. The two Data Connect schema bindings and connector update times/source-file counts match the pre-change metadata. All five schedules are PAUSED and the serving app flag is `1`.
- Stop interpretation: SQL Admin's instance lifecycle can remain `RUNNABLE` while `settings.activationPolicy=NEVER` stops the engine. The database-list endpoint then returns HTTP 400 because the instance is not running. Verify the stop operation, activation policy, retained storage and Console's **Stopped** status; do not restart the engine merely to reread database metadata. The original metadata was verified before shutdown and on the actual restore. Console inventory after reload agrees and shows only the two retained originals.
- Availability: the owner chose offline connectors during maintenance. Neither instance has regional HA; automated backups and PITR remain disabled. The retained on-demand backups and actual restores support offline recovery, not an uptime or normal-mode HA claim. Reassess backup cadence, recovery targets and HA before an approved normal-mode restart.
- Firestore: the comparable two-hour aggregate receipt returns 2,259 reads and 702 writes for September 30, but no returned read/write/delete points for October 1. The current sums are **unknown**, not zero; this does not close metrics or propagated billing acceptance.

The read-only settlement capture initially assumed database lists stayed available after stopping and counted an absent connector list as PowerShell's `@($null)`. The capture now classifies the direct offline response and counts only returned files. The source metadata and actual restore supply retention evidence; no provider write was retried to repair the evidence collector.

## Minimum-instance policy

Maintenance target is zero minimum instances for App Hosting and all scheduled/event-driven Functions. The existing Functions defaults are registered in `functions/src/firebase-runtime.ts` before endpoint construction; this applies the declared 512MiB allocation and zero minimum to re-exported endpoints as well as direct exports. The existing maintenance test checks actual SDK descriptors, since a source marker in the entrypoint did not catch initialization order. The checked-in provider expectation records zero for the five schedules, the five event-driven analytics/security/transaction functions, and the App Hosting SSR function. Earlier provider observations exposed maximum counts of 10/20 and SSR maximum scale 3, not nonzero warm minimums. The operator must still verify minimum counts and serving allocation after each scoped deployment; event-driven functions should remain zero unless an explicit latency SLO approves a warm instance. App Hosting source declares `minInstances: 0`.

When a reviewed source update also corrects memory through the Functions v2 API, carry the verified CPU/concurrency pair in the explicit field mask. The [REST API calculates its CPU default from memory](https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions#ServiceConfig), while [Firebase v2 defaults to one CPU and requires a full CPU for concurrent requests](https://firebase.google.com/docs/functions/manage-functions#override_cpu_defaults). An actual memory-only correction was rejected before an operation was created because fractional CPU conflicted with retained concurrency. Preserve the existing one-CPU/concurrency-80 pair for these five schedules; this is configuration preservation, not capacity expansion. Retain the failed receipt, reconcile the exact target and uploaded generation, then verify memory, CPU, concurrency, scaling, maintenance, environment references and serving traffic in both provider planes. Do not repeat the upload or dispatch when a named operation remains unresolved.

## Cost model

### Historical post-maintenance baseline

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
| Cloud SQL storage | Both original 10GB disks retained | ~$0.109656 from the historical baseline |
| Idle public IPv4 | Both original addresses retained while compute is stopped | ~$0.480000 at current list rate |
| SQL recovery backups | Two successful on-demand backups retained | Additional; chargeable bytes and actual billed cost unconfirmed |
| Firestore storage | Retained | ~$0.059214 |
| Storage/Artifact Registry/remainder | Retained | ~$0.0014 |
| **Current retained-resource estimate** | **Storage plus two idle addresses, before backup charges and variable work** | **~$0.6503/day plus backups** |

The former ~$0.1703/day target omitted idle public IPv4 and the new recovery backups. It is a storage-only subtotal, not the attainable complete cost of the retained current configuration. [Cloud SQL lists idle IPv4 at $0.01 per address-hour](https://cloud.google.com/sql/pricing), so two stopped instances imply $0.48/day before credits, tax and billing adjustments. Stopping removes compute allocation; it does not establish a $0.504/day net saving. The estimate combines historical storage/remainder with a current list rate, so it is not a measured current daily total. Reconcile complete post-change usage, savings and net SKU costs after propagation.

Both originals have public IPv4 and no private IP. The read-only VPC inventory shows the default auto network and no peerings. [Disabling public IP requires private IP and later re-enabling allocates a different address](https://docs.cloud.google.com/sql/docs/postgres/configure-ip); [private IP cannot be disabled once configured and adding it restarts an existing instance](https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip). The [SQL Connect CLI also checks existing-instance public-IP compatibility](https://firebase.google.com/docs/sql-connect/cli-reference). A private-network change therefore needs a separate dependency, connector compatibility, authority and recovery review. Retain the current networking and both databases under this maintenance decision; do not silently enable permanent private connectivity or delete retained resources to reach the obsolete subtotal.

## Operator entry checklist

Do not execute these commands from local tests. They are the ordered cloud actions for an authorized operator:

1. Deploy the reviewed App Hosting/Functions source so the shared gate, handler guard, route blocks, and source cadence are present. Why: make the local boundary executable. Cost effect: prevents variable runtime/background work after the flag is set. Risk: deployment/config mismatch; verify ready revision, function revisions, and rollback artifact. Rollback: redeploy the prior known-good revision without enabling schedules.
2. Set `KANDY_MAINTENANCE_MODE=1` in both App Hosting and Firebase Functions runtime configuration. Why: one state source must reach both runtimes. Cost effect: blocks requests/jobs; no direct fixed-cost change. Risk: missing Functions env would permit stale jobs; verify the deployed environment and a public 503/maintenance response. Rollback: set explicit `0` only as part of the exit checklist.
3. Pause the five maintenance-incompatible Scheduler jobs. Why: a handler guard cannot prevent a function invocation/module load, and the provider cadence was already drifting. Cost effect: removes scheduler-triggered Function/Firestore variable work. Risk: delayed analytics/queue/notification work; verify each job is `PAUSED`, not merely source-disabled. Rollback: resume only the named job after maintenance state is explicitly off and its cadence matches source.
4. Correct `refreshAdminAnalyticsRealtimeSummary` provider cadence from 1 minute to 5 minutes before any normal-mode resume. Why: eliminate 5x trigger frequency/source drift. Cost effect: approximately 1,152 fewer invocations/day than the observed 1-minute cadence if enabled; actual billed cost depends on execution. Risk: slower admin freshness; verify scheduler job schedule and source registry. Rollback: restore only if an owner accepts the cost/freshness tradeoff and updates the source contract first.
5. Set maintenance-incompatible Function minimum instances to zero: the five schedules, the five event-driven functions listed in `config/maintenance-provider-expectations.json`, and `ssrkandydropsbyikandy`/App Hosting SSR. Why: enforce the checked-in scale-to-zero contract and prevent future provider drift; the current live inspection confirmed max-scale settings, not nonzero minimums. Exact savings depend on provider billing. Risk: cold starts in normal mode; verify min instance settings and latency after exit. Rollback: restore only a named latency-approved minimum.
6. Stop Cloud SQL compute for both named originals only after connector availability, retained data, backup and actual recovery are resolved. Why: remove compute while preserving the owner's offline database capability. Cost effect: remove compute allocation, with idle public IPv4, storage and backups still billable. Risk: connector outage and restart delay; verify DONE operations, `NEVER`, retained disks/backups/bindings, actual restore and temporary cleanup. This entry is settled; do not repeat it because lifecycle still says `RUNNABLE`. Rollback: start only the required named instance and verify its owning connection.
7. Retain both originals and recovery backups under the owner's current decision. A future decommission or permanent network change requires unique-data/connector ownership, recovery and explicit scope. Potential storage or address savings are unproven until that decision and propagated billing; this runbook does not authorize deletion.
8. Verify Firestore metrics after at least one normal scheduler window: read/query operations, writes, listener/trigger activity, and error logs. Why: prove the variable read activity stopped. Cost effect: target near-zero variable reads. Risk: telemetry delay; verify against a comparable pre-change window. Rollback: do not resume all jobs; re-enable one explicitly approved job only after finding its caller.
9. Verify billing after the provider propagation window using the project-scoped export. Why: reconcile compute, idle IPv4, storage, retained backups and variable usage. Compare complete UTC usage days with the current estimate; classify Pacific-time Billing Reports separately. Risk: late or partial data and omitted SKUs; actual steady-state cost and savings remain unconfirmed until this review.

## Operator exit checklist

1. Review backup cadence, recovery targets, HA and connector/network compatibility for the named capability. Start only its required SQL instance(s); verify `ALWAYS`, successful start settlement and the owning Data Connect/route connection. Lifecycle `RUNNABLE` alone does not prove an active engine.
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

## Exact operator change sequence and replay boundary

The commands below describe the owning interfaces, not a batch to replay or local-test authority. The October 1 app, five Function, Scheduler and SQL operations have their own settled receipts; reconcile those identities before any successor. Confirm the exact project and identity, preserve existing secret values and before-state recovery, and bound any new operation separately. The Google CLI supports pausing and resuming Scheduler jobs, updating an HTTP job schedule, setting Function minimum instances, and changing Cloud SQL activation policy; the Firebase CLI supports partial Function/App Hosting deployments. See the [Scheduler pause command](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/pause), [Scheduler HTTP update command](https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/update/http), [Functions deployment command](https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy), [Firebase partial deployments](https://firebase.google.com/docs/cli), and [Cloud SQL start/stop guidance](https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance).

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

   Verify DONE stop operations, `settings.activationPolicy=NEVER`, unchanged disks and retained backups/bindings, and Console **Stopped** status. `RUNNABLE` lifecycle can coexist with stopped compute. Both originals are retained and neither is eligible for deletion under this decision. Do not replay the patches for already settled operations.
7. After at least one complete scheduler interval, verify Firestore read/query/write metrics fall to the approved bootstrap/repair baseline; no returned points remain unknown. Then verify propagated complete UTC usage days by project, service, SKU and SQL resource, including idle IPv4 and backups. Compare against the current retained-resource estimate; the old storage-only subtotal and a partial export day cannot establish steady state.

Normal-mode rollback is the inverse, component by component: set both runtime flags explicitly to `0` through the owning deployment workflows, resume only the named Scheduler jobs after source cadence verification, and set `--activation-policy=ALWAYS` only on the SQL instance required by the capability being restored. Never roll back by resuming all jobs or starting both instances without a named dependency.

## Rollback

Rollback is component-scoped: restore the last known-good app/function revision, keep public maintenance on while investigating, start only the SQL instance named by the failed capability, and resume only the single Scheduler job required by the recovery. Never roll back by re-enabling all schedules, all minimum instances, or both SQL instances at once.

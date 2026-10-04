# Environment Deployment Truth

Status: launch deployment truth gate
Recorded: 2026-05-01

Machine-readable audit: `agent/state/environment-deployment-truth-audit.generated.json`
Validator: `npm run check:environment-deployment-truth`

## Canonical Production Origin

The canonical production origin is `https://kandydrops.com`.

`https://www.kandydrops.com` is an alias only until DNS/domain mapping is explicitly verified. The Firebase App Hosting generated backend host is also an alias for provider routing and trusted-origin compatibility, not the product canonical URL.

Runtime owners:

- `apphosting.yaml`: production App Hosting origin and aliases.
- `src/lib/site-origin.ts`: code fallback origin, alias list, and trusted-origin source.
- `src/lib/server/request-origin.ts`: trusted origin and host comparison for state-changing routes.

## Firebase And App Hosting

Production Firebase project: `kandydrops-by-ikandy`.

App Hosting uses:

- `runConfig.minInstances: 0`
- `runConfig.maxInstances: 2`
- `firebase.json` framework backend region `us-central1`
- `.firebaserc` default project `kandydrops-by-ikandy`

`firebase.json` also routes local source archives to the existing App Hosting
backend `kandydrops`. Use
`firebase deploy --only apphosting:kandydrops --project kandydrops-by-ikandy`
for this lane. The explicit backend filter excludes Hosting, Functions, rules,
and Data Connect deployments. The archive excludes local environment files,
credentials, installed dependencies and recovery output. Cloud Build resolves
the runtime secret references from `apphosting.yaml`; local environment files
are not deployment inputs. The existing GitHub connection remains available.

After an authorized archive deployment, identify the operation from that
dispatch's accepted create response. Retain only its build/operation resource
names and the uploaded archive URI; never copy raw CLI debug payloads or secret
values. Read the named build directly and require its project, backend and
`source.archive.userStorageUri` to match the reviewed dispatch. A failed or
uncertain command still needs exact-operation settlement before any retry.
Use a historical build listing only when the accepted reference is unavailable
or does not reconcile. This replaces post-dispatch discovery scans only: the
nonterminal preflight inventory, uploaded source comparison, rollout/serving
agreement, maintenance controls and recovery evidence remain separate checks.

Keep the post-dispatch dependency order explicit: accepted resource reference,
then the exact authoritative Build GET and its owned build-dispatch receipt,
then uploaded archive comparison. Verify the receipt and helper prerequisites
before invoking the archive verifier. The retained build015 verifier startup
failure made no provider call or source change; the missing direct-GET helper
and receipt were restored from their existing owner before the verifier ran
once successfully. Evidence belongs to
`output/manual-infrastructure-users-release-20261003/`; do not dispatch another
build to recover a missing local verification input.

Do not replace complete nonterminal preflight with an assumed state filter. The
current documented filter field does not establish support for a particular
state expression: the retained inequality probe and one equality capability
probe returned 400, with the latter's structured `filter` violation retained in
`output/manual-apphosting-filter-research-20261003/filter-equality-probe.json`.
Keep bounded complete pagination; do not repeat the same rejected filter or
treat a single known-state result as coverage of other or unknown states.

When selected checks regenerate repository evidence, retain their exact existing
inputs before running the generator, including compact routing inventory. Keep
the generated output separately. Restore original derived bytes only after
classifying the actual diff: a timestamp or an inventory entry for a generated
report does not promote new canonical rules. Unrelated rule or source changes
still require review. Verify restored bytes and the source fingerprint before
continuing. The takeover evidence owner already creates its baseline; do not
write another receipt at that reserved path.

Pass the canonical `output/<taskKey>/input.json` to the takeover owner and scoped
checks. A release-folder copy is a scope reference; it does not acquire the task
key's baseline. Validate that binding before creating runner custody. When
adapting an existing release helper, update prior-serving references separately
from stable recovery-evidence references, verify both against their actual
owners, and retain their hashes. A broad path replacement is not dependency
review.

After a check-runner interruption, preserve the original command results and
failure. Resume only unsettled checks whose source inputs still agree, using a
new receipt identity; combine the original valid results with the continuation
results for the final gate review. A helper failure does not erase a command's
result or clear an unrun gate. The reviewed routing-only recovery and remaining
gate execution are retained in
`output/manual-monitoring-body-release-v2-20261003/`.

On Windows, an `UNKNOWN` write or copy error is not enough to diagnose a lock.
The Discovery release retained the original failure and checked space,
attributes and the native error before recovery. The native error identified a
file with an open mapped section. Repeating a truncating write or copy did not
resolve that condition. For the exact owned generated target, create a
replacement on the same volume and use `System.IO.File.Replace` with an
explicit retained backup; use `File.Move` only when that target is absent.
Resolve both paths within the workspace before the operation. This follows the
[Windows replacement contract](https://learn.microsoft.com/windows/win32/api/winbase/nf-winbase-replacefilew)
and the [.NET API](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.replace).
Verify the restored hash and complete source fingerprint. Keep the generated
diff and original bytes for review; do not terminate unrelated processes or
clear a gate by discarding its result. Actual recovery and the failed attempts
belong to `output/manual-discovery-modal-release-v2-20261003/`. This bounded
recovery does not establish that every repository generator uses an atomic
writer.

The Analytics continuation retains a wrong copied-input startup and a wrong
stable evidence path under `output/manual-analytics-composed-release-20261003/`.
Its 18 settled commands were retained, exact derived routing was restored, and
only the 28 unsettled commands resumed. The subsequent Batch29 scope failure is
a separate source-reader finding, not a runner interruption or a waived gate.

Resolve Windows search inputs with `rg --files` before reading a guessed path;
use exact returned paths or `rg -g` filters instead of passing a literal glob as
a path. A path-resolution failure is not evidence that the source is absent.

When concurrent real-CLI fixtures exceed their existing deadline, retain the
failed run and classify the actual durations and competing workload first.
Serialize only the affected owner with the existing Vitest worker controls;
keep assertions and timeouts unchanged. Reconcile its fresh case identities
with unaffected, input-valid passing cases and report the actual execution
count. The retained Analytics run and four-case serialized recovery are under
`output/manual-release-note-integrity-release-20261003/`; they do not establish
production performance or justify replaying the whole suite.

Repo automation uses Cloud Build, not GitHub-hosted runner billing, for automated verification:

- `cloudbuild.yaml` owns lightweight CI checks.
- `cloudbuild.release-notes.yaml` owns public release-note generation and generated changelog commits.
- GitHub Actions workflows are manual fallback only while hosted-runner billing is not a reliable source of truth.

Firebase Functions may orchestrate webhooks or record automation evidence, but Cloud Build/App Hosting must execute build, typecheck, and validator work.

Runtime secrets that the app reads must be declared in `apphosting.yaml` under `env` using `secret:`. Do not rely on top-level App Hosting `secrets:` blocks for runtime variables.

Required secret references:

- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE`
- `PAYPAL_CLIENT_SECRET_LIVE`
- `GA_API_SECRET`
- `CRON_SECRET`
- `NAVIGATION_COOKIE_SECRET`

App Hosting secret access must be granted through
`firebase apphosting:secrets:grantaccess` or an equivalent IAM policy. The
build/runtime service account needs `roles/secretmanager.secretAccessor`, the
build service account needs `roles/secretmanager.viewer`, and the Firebase App
Hosting service agent needs `roles/secretmanager.secretVersionManager` on the
secret. `secretAccessor` alone does not satisfy App Hosting's build-time secret
resolution contract.

The tracked `backends.json` file is a generated deployment snapshot only. It must not contain raw override values; keep snapshot values redacted.

## PayPal

PayPal is live-mode only for production.

- Client SDK: `src/components/PayPalProvider.tsx`
- Create order route: `src/app/api/paypal/create/route.ts`
- Capture route: `src/app/api/paypal/capture/route.ts`
- Server PayPal API owner: `src/lib/server/paypal.ts`

PayPal return/cancel/webhook position:

- KandyDrops currently uses the PayPal JS SDK inline approval flow.
- Return and cancel URLs are handled by the client SDK flow, not standalone return/cancel API route files.
- Purchase completion is server-confirmed through `/api/paypal/capture`.
- There is no PayPal webhook route in the app today. Do not configure a PayPal dashboard webhook to this repo unless a guarded webhook route, signature verification, and tests are added first.

## GA4 And BigQuery

GA4 production config:

- Property ID: `524442937`
- Measurement ID: `G-V8PWC2L31H`
- API secret: Secret Manager reference only

Server Measurement Protocol is an upgrade path, not canonical delivery proof. First-party Firestore event facts and diagnostics remain the operational truth.

BigQuery raw event export:

- Dataset: `kandydrops_canonical_analytics`
- Table: `raw_events`
- Owner: `functions/src/analytics-bigquery-export.ts`

Functions default those names in code so local deploy config remains deterministic even when Function env vars are not explicitly set.

## FCM And Service Worker

FCM browser push requires `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in App Hosting.

Notification service worker truth:

- File: `public/firebase-messaging-sw.js`
- Scope: `/`
- Manifest scope: `/`
- API routes are excluded from service-worker caching.
- Browser notification icons use `/icon-192x192.png`.

Service-worker cache names must stay explicitly release-versioned from the root-scope registration URL. Static cache names such as `kandydrops-app-shell-v3` and `kandydrops-runtime-v3` are stale-cache regressions.

The PWA runtime must use the consolidated public release-note artifact as the no-store deployed-version freshness probe so an already-open tab can clear managed KandyDrops caches and reload once when the accepted Beta version advances.

## Manifest And Assets

`public/manifest.json` must reference current KandyDrops icons only:

- `/icon-192x192.png`
- `/icon-512x512.png`

Legacy starter assets such as `next.svg`, `vercel.svg`, `file.svg`, `window.svg`, and `globe.svg` must not be referenced by the manifest or launch-critical visible app metadata.

## Future Agent Rules

- Do not print or commit secret values.
- Do not add sandbox PayPal defaults to production code.
- Do not make `www` canonical until DNS/domain mapping is verified and the origin doctrine is updated.
- Do not configure PayPal webhooks without a verified route, signature validation, idempotency, and tests.
- Do not cache private/admin/API data through the service worker.
- Do not treat generated App Hosting snapshots as source-of-truth over `apphosting.yaml`, `firebase.json`, and verified runtime output.

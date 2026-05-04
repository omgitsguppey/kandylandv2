# Google Cost Bleed Score

Status: deterministic Google/Firebase/API cost and rate-limit audit guard  
Report artifact: `agent/state/google-cost-bleed.generated.json`  
Scorer: `npm run score:google-cost`  
Validator: `npm run check:google-cost`

## Doctrine

Google cost-bearing surfaces must be declared before use. Firestore, Storage, Google Analytics Data API, Vertex AI, Cloud Run/App Hosting, and any SQL/Data Connect runtime must have route-level cost contracts, budget guards, bounded rate limits, cache policies, and debug evidence. The app must fail audits before it surprises billing.

## Contract Owner

`src/lib/server/api-cost-contract.ts` owns the `ApiCostContract` schema and route classification list. Route groups are allowed when they are explicit, conservative, and include:

- route pattern and methods
- cost class
- rate policy
- cache policy
- auth level
- trusted-origin requirement
- budget guard requirement
- expected per-call/per-minute bounds
- notes explaining the cost boundary

Every `src/app/api/**/route.ts` must match a contract or the score report flags it. Matching a contract does not mean the route is safe; the scorer still checks source evidence for missing trusted origins, remote Firestore rate-limit write risks, unbounded Firestore reads, media egress, GA quota handling, paid AI fences, Cloud Run cron frequency, and forbidden runtime SQL.

## Cost Classes

- `free_read`
- `firestore_read`
- `firestore_write`
- `firestore_transaction`
- `firestore_listener`
- `storage_egress`
- `ga_quota`
- `ai_paid`
- `sql_dataconnect_agent_context_mirror`
- `sql_forbidden`
- `cloud_run_compute`
- `payment_sensitive`
- `support_admin`
- `unknown`

## Audit Rules

- POST, PUT, PATCH, and DELETE routes must use `guardApiRequest` with `requireTrustedOrigin: true` unless their contract explicitly exempts them.
- Payment and admin mutations without trusted-origin protection are critical findings.
- AI/Vertex routes are admin-only by default, must use feature toggles, model allowlists, bounded inputs/outputs, deterministic cost estimates or token counts, and budget/rate guards.
- Google Analytics Data API routes must prefer hot-cache/snapshot layers, request quota data where supported, and record quota/debug evidence.
- Firestore collection reads must be bounded by pagination, limit, or materialized snapshot ownership.
- Public cheap GET routes using Firestore-backed rate limiting are reported because the limiter itself can create write cost.
- Storage/media routes must enforce entitlement, `MEDIA_PROXY` or equivalent rate limits, no-store cache behavior, and byte-size expectations.
- Runtime SQL/Data Connect/Postgres/MySQL/Prisma usage is forbidden unless explicitly contracted. The agent-context mirror is the allowed cost-bearing Data Connect exception and is classified as `sql_dataconnect_agent_context_mirror`.
- Cron/Admin refresh/AI/media routes must have cost contracts and max-frequency/budget evidence.

## Data Connect Agent Context Mirror

The repo does include Firebase Data Connect config at `dataconnect/dataconnect.yaml`. It targets service `kandydrops` in `us-central1`, PostgreSQL database `kandydrops_db`, and Cloud SQL instance `kandydrops-db`. This is allowed only as the agent/repo intelligence mirror and must be classified as `sql_dataconnect_agent_context_mirror`.

Allowed mirror surfaces:

- `dataconnect/dataconnect.yaml`
- `dataconnect/schema/*.gql`
- `dataconnect/example/*`
- `scripts/agent/sync-sql.ts`
- `agent/state/sql-sync.payload.generated.json`
- `agent/state/sql-mirror-status.generated.json`

Rules:

- The Data Connect mirror is allowed only for agent/repo intelligence retrieval.
- It is forbidden for user, payment, Drop, chat, support, or creator runtime flows unless an explicit owner-approved `ApiCostContract` classifies that route as SQL/Data Connect.
- It is forbidden inside `src/app/api` runtime routes unless the route has SQL/Data Connect cost classification and budget/rate/cache policy.
- `agent:sync-sql` must not run automatically during user-facing builds or deploys unless that behavior is explicitly intended and documented.
- Any new Data Connect operation/query/mutation must declare purpose, table/type touched, expected rows, max execution frequency, CI/build/dev/prod eligibility, whether it can touch user/runtime data, and estimated billing risk.
- Audits fail if Cloud SQL/Data Connect is used outside `dataconnect/*`, `scripts/agent/sync-sql.ts`, or generated agent SQL state artifacts without approval.

Billing state note: source config proves the Cloud SQL target name, database, and region, but it does not prove provider-side state. As of this doctrine update, `kandydrops-db` billing/active/paused/deleted state is `source_configured_provider_state_unverified`; an owner must confirm provider billing state before treating the mirror as cost-safe.

## Autofix

No autofix is enabled by default. Cost, auth, media, payment, AI, analytics, and SQL boundaries are advisory-only in this lane. The scorer can suggest targeted fixes, but it must not change business logic, add paid APIs, add SQL, remove telemetry, weaken auth, or alter payment/unlock enforcement.

## Verification

Run:

```bash
npm run score:google-cost
npm run check:google-cost
```

Do not use Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audits for this source-only lane.

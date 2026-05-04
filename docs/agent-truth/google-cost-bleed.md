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
- Runtime SQL/Data Connect/Postgres/MySQL/Prisma usage is forbidden unless explicitly contracted. The local `scripts/agent/sync-sql.ts` JSON mirror is the allowed non-runtime exception.
- Cron/Admin refresh/AI/media routes must have cost contracts and max-frequency/budget evidence.

## Autofix

No autofix is enabled by default. Cost, auth, media, payment, AI, analytics, and SQL boundaries are advisory-only in this lane. The scorer can suggest targeted fixes, but it must not change business logic, add paid APIs, add SQL, remove telemetry, weaken auth, or alter payment/unlock enforcement.

## Verification

Run:

```bash
npm run score:google-cost
npm run check:google-cost
```

Do not use Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audits for this source-only lane.

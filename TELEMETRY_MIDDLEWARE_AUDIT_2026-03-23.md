# Telemetry & Middleware Audit

Date: 2026-03-23

## Scope

This audit covers the current middleware, telemetry, analytics, diagnostics, and export/reporting path used by the site:

- root navigation middleware
- API request guard stack
- auth, App Check, origin, and rate-limit enforcement
- guest analytics capture and ingest
- identified telemetry capture and ingest
- task-telemetry progression coupling
- Functions materializers and realtime mirrors
- admin analytics/debug readers
- Data Connect analytics export mirrors

## Executive Summary

The stack is largely organized into the right layers already, and the biggest win is that the codebase now has a mostly coherent source-of-truth hierarchy:

1. `src/lib/telemetry-catalog.ts`
   Canonical telemetry event catalog and metadata registry.

2. `src/app/api/analytics/ingest/route.ts`
   Guest raw ingest entrypoint.

3. `src/app/api/telemetry/track/route.ts`
   Authenticated raw ingest entrypoint.

4. `functions/src/analytics-*.ts`
   Canonical internal materializers that turn raw facts/batches into rollups and realtime mirrors.

5. `src/app/api/admin/analytics/**` and `src/app/api/admin/debug/route.ts`
   Reporting and inspection readers.

6. `functions/src/analytics-export-sync.ts`
   Downstream export mirror for external dashboards through Data Connect.

The main remaining hardening work is not “missing telemetry everywhere.” It is mostly about making the ownership boundaries impossible to misunderstand:

- root middleware is not the source of truth for API policy
- `analytics_event_facts` and `analytics_guest_batches` are the raw canonical streams
- RTDB telemetry logs, `analytics_active_users`, and `analytics_sessions` are supporting mirrors/indexes, not equal peers
- admin analytics payloads are blended reporting views, not canonical counters
- semantic context logic is intentionally dual-homed in app/functions and protected by parity tests, but it is still the main drift surface

## Main Systems

### 1. Root Navigation Middleware

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\middleware.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\navigation-persistence.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\navigation-session.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\site-origin.ts`

What it does:

- canonicalizes bare-domain requests to `www`
- uses the signed navigation session cookie to redirect authenticated users away from `/`
- keeps non-admin users out of `/admin`
- preserves preferred authenticated landing paths

Source-of-truth status:

- Healthy for navigation only
- Not the source of truth for API auth, analytics gating, or telemetry validation

Refinement needed:

- Document this more explicitly in future architecture docs because teams can easily assume “middleware protects everything”

### 2. API Request Guard Layer

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\request-guard.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\auth.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\request-origin.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\rate-limit.ts`

What it does:

- central API middleware-equivalent layer
- trusted-origin checks
- optional App Check enforcement
- user/admin auth verification
- pre-auth and post-auth rate limiting

Source-of-truth status:

- This is the real request-policy source of truth for APIs

Refinement needed:

- `request-origin.ts` still trusts by host matching only
- `rate-limit.ts` identity is still mainly `IP + user-agent` unless a scoped id is provided
- there is no explicit route-policy manifest that declares which endpoints require trusted origin, App Check, auth, or admin

### 3. Telemetry Event Catalog

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\telemetry-catalog.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\analytics-client-engine.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\analytics-event-utils.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\scripts\audit-telemetry.ts`

What it does:

- defines canonical event names, labels, categories, modules, aliases, and source metadata
- powers client canonicalization and server canonicalization
- drives the emitter audit script

Source-of-truth status:

- Strong
- This is the canonical event taxonomy already

Refinement needed:

- a generated schema layer would make the catalog even more authoritative for fixtures, CI validation, and exports

### 4. Guest Analytics Engine

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\components\Analytics\DeepTracker.tsx`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\analytics\ingest\route.ts`

What it does:

- captures anonymous page lifecycle, click, hover, scroll, and visibility events
- persists the queue in session storage
- flushes guest batches to `/api/analytics/ingest`
- request route writes:
  - `analytics_guest_batches`
  - `analytics_sessions`

Source-of-truth status:

- `analytics_guest_batches` should be treated as the canonical guest raw stream
- `analytics_sessions` behaves like a session index/summary companion, not an equal raw source

Refinement needed:

- make the “canonical vs helper” distinction explicit in comments/docs and admin readers
- do not let future systems treat `analytics_sessions` as a second raw guest source

### 5. Identified Telemetry Engine

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\telemetry.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\telemetry\track\route.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\analytics-identifiers.ts`

What it does:

- queues authenticated telemetry client-side
- canonicalizes events through the catalog
- adds semantic/session metadata
- sends to `/api/telemetry/track`
- route writes:
  - `analytics_event_facts`
  - RTDB mirrors under `telemetry/events/*`
  - RTDB mirrors under `telemetry/users/*`
  - `analytics_active_users`
  - optional task progression for telemetry-backed tasks

Source-of-truth status:

- `analytics_event_facts` is the canonical authenticated raw event ledger
- RTDB telemetry paths are mirrors for live inspection/recovery
- `analytics_active_users` is presence-ish operational state, not canonical history

Refinement needed:

- document RTDB and active-user docs as derived/operational only
- if the future AI engine will consume behavior histories, it should read facts/rollups, not RTDB mirrors

### 6. Semantic Context Layer

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\analytics-semantics.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\analytics-semantics.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-semantics.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\scripts\check-analytics-semantics.ts`

What it does:

- resolves semantic scope/category/surface for pages and drops
- builds semantic params client-side
- builds semantic summaries server-side
- materializes semantic daily rollups in Functions
- runs parity checks between app and Functions semantic resolution

Source-of-truth status:

- Good but still split
- The parity script is the current protection against drift

Refinement needed:

- this is the clearest remaining shared-logic split that could become a real source-of-truth problem later
- long term, prefer generating or sharing the resolver instead of duplicating it

### 7. Functions Materializer Layer

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-event-facts.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-guest-batches.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-task-events.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-security-events.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-transactions.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-schedules.ts`

What it does:

- converts raw facts and guest batches into rollups
- maintains page, drop, user, task, commerce, security, and session summaries
- refreshes cached window summaries and anomaly alerts
- maintains realtime dashboard mirrors

Source-of-truth status:

- This is the canonical internal reporting/materialization layer

Refinement needed:

- keep request-path ingest thin and preserve this layer as the place where durable reporting meaning is derived

### 8. Diagnostics and Pipeline Health

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\server-diagnostics.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\analytics-pipeline-health.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\admin-ops-health.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\admin\debug\route.ts`

What it does:

- records server diagnostics and pipeline failures
- exposes ops-health summaries to admin debug and analytics

Source-of-truth status:

- Operational truth only
- Not canonical user/product analytics

Refinement needed:

- keep these separate from behavioral analytics in docs and downstream consumers

### 9. Admin Readers

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\lib\server\admin-analytics-data.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\admin\analytics\realtime\route.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\admin\analytics\historical\route.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\api\admin\debug\route.ts`

What it does:

- builds blended admin dashboards from:
  - GA4
  - Firestore facts and rollups
  - RTDB telemetry logs
  - diagnostics and pipeline health

Source-of-truth status:

- Reporting truth, not canonical truth
- These routes aggregate and reconcile across sources

Refinement needed:

- add explicit metric provenance/ownership metadata so every panel can say whether it is:
  - GA4-led
  - Firestore-led
  - blended
  - realtime mirror

### 10. Data Connect Export Layer

Files:

- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-export-sync.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\functions\src\analytics-export-dataconnect.ts`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\dataconnect\analytics_export\connector.yaml`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\dataconnect\analytics_export\queries.gql`
- `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\dataconnect\analytics_export\mutations.gql`

What it does:

- mirrors internal Firestore rollups into export-safe Data Connect models
- provides external dashboard read surfaces

Source-of-truth status:

- Downstream mirror only
- Should stay read-only and derived

Refinement needed:

- keep external dashboards and future AI systems from writing back into this layer

## Source Of Truth Hierarchy

### Canonical registries

- Event catalog: `src/lib/telemetry-catalog.ts`
- Semantic context model: currently shared-by-contract between app and Functions

### Canonical raw data

- Guest: `analytics_guest_batches`
- Authenticated: `analytics_event_facts`
- Task lifecycle: `daily_task_events`
- Security ledger: `security_events`
- Commerce ledger: `transactions`

### Derived operational mirrors

- `analytics_sessions`
- `analytics_active_users`
- RTDB `telemetry/events/*`
- RTDB `telemetry/users/*`
- RTDB `analytics/realtime/*`

### Canonical internal reporting

- Firestore daily/rollup collections written by Functions:
  - `analytics_page_daily`
  - `analytics_drop_daily`
  - `analytics_user_daily`
  - `analytics_users_rollup`
  - `analytics_task_daily`
  - `analytics_task_rollup`
  - `analytics_commerce_daily`
  - `analytics_commerce_rollup`
  - `analytics_semantic_daily`
  - related rollups

### Downstream external reporting

- Data Connect export mirrors

## Main Findings

### 1. The API guard, not root middleware, is the real policy source of truth

Risk:

- Future work can easily harden `middleware.ts` and assume API protection improved when it did not.

Recommendation:

- Create a route-policy manifest that can be referenced by API guards and, where relevant, root middleware docs/tests.

### 2. Guest raw truth and guest session summaries still need a stronger ownership statement

Risk:

- `analytics_sessions` can be mistaken for an equal raw source beside `analytics_guest_batches`.

Recommendation:

- Document `analytics_guest_batches` as canonical guest raw ingest.
- Treat `analytics_sessions` as a helper/session index only.

### 3. Authenticated telemetry still couples canonical facts with operational mirrors in one request

Risk:

- `telemetry/track` owns:
  - fact creation
  - RTDB mirrors
  - active-user updates
  - task progression
- This is workable, but it means future changes can blur which writes are essential and which are operational.

Recommendation:

- Keep `analytics_event_facts` explicitly canonical.
- Mark RTDB and `analytics_active_users` as operational mirrors.
- Before the later AI engine work, consider moving nonessential mirrors behind a materializer or queue.

### 4. Semantic logic remains the main drift surface

Risk:

- semantic context exists in both app and Functions
- parity is enforced, but duplication still means future edits can split meaning

Recommendation:

- consolidate to a generated/shared resolver when practical
- until then, keep the parity script mandatory in CI

### 5. Admin analytics is a blended reporting layer, not a canonical data layer

Risk:

- external dashboards or future AI reasoning could mistake blended panel outputs for canonical counters

Recommendation:

- add a metric provenance registry
- expose panel metadata like:
  - `owner`
  - `source_type`
  - `canonical_collection`
  - `blend_strategy`
  - `freshness`

### 6. Origin and rate-limit rules are serviceable, but still basic

Risk:

- host-only origin trust
- IP + user-agent rate-limit identity
- both are acceptable now, but not ideal for external-signal expansion and stricter abuse prevention

Recommendation:

- add forwarded-host/protocol aware trust rules
- add per-session or per-client scoped keys for telemetry-heavy endpoints

## Recommended Dependency Additions

These are recommendations only. Nothing in this audit requires them immediately.

### 1. `dependency-cruiser`

Why:

- stronger than `madge` for policy-style boundary rules
- can enforce architecture like:
  - client code cannot import server-only telemetry helpers
  - admin readers cannot leak into ingest paths
  - request routes cannot import UI modules
  - future AI engine adapters can only depend on approved reporting contracts

Best use here:

- codify telemetry/middleware layering as rules, not tribal knowledge

Source:

- [dependency-cruiser README](https://github.com/sverweij/dependency-cruiser)

### 2. `pino` and `pino-pretty`

Why:

- structured JSON logging with low overhead
- transport model is a good fit for server diagnostics, middleware, auth, and telemetry route logs

Best use here:

- replace ad hoc `console.error` / `console.warn` in telemetry and middleware-adjacent paths with one structured logger wrapper
- keep pretty printing for local development only

Source:

- [Pino README](https://github.com/pinojs/pino)

### 3. `ajv-cli`

Why:

- schema-first fixture validation in CI
- useful for validating request payload fixtures, export payloads, and generated telemetry contracts

Best use here:

- validate canonical telemetry payload fixtures and Data Connect export fixtures without writing custom validation code for every case

Source:

- [Ajv documentation](https://ajv.js.org/)

### 4. `fast-check`

Why:

- property-based testing is ideal for telemetry ids, timestamp normalization, dedupe logic, session stitching, and semantic resolver edge cases

Best use here:

- fuzz:
  - event-id generation
  - timestamp normalization
  - alias canonicalization
  - guest queue persistence/replay
  - route policy edge cases

Source:

- [fast-check documentation](https://fast-check.dev/)

### 5. `@opentelemetry/api` plus the Node SDK/exporter stack

Why:

- gives request tracing and cross-service correlation for:
  - middleware redirects
  - auth verification
  - telemetry ingest
  - Functions materializers
  - export mirrors

Best use here:

- especially useful before the later all-encompassing AI engine, because it will let you distinguish:
  - user telemetry
  - system telemetry
  - AI orchestration spans

Source:

- [OpenTelemetry JavaScript docs](https://opentelemetry.io/docs/languages/js/)

## Recommendation On Schema Generation

If you want generated JSON Schemas from Zod request schemas, a practical option is:

- `zod-to-json-schema`

That would help turn existing Zod route schemas into reusable CI contracts for telemetry payloads and export fixtures.

Important note:

- the project still works for current Zod usage, but the upstream repo explicitly says it is no longer receiving updates, so I would treat it as optional rather than foundational.

Source:

- [zod-to-json-schema repository](https://github.com/StefanTerdell/zod-to-json-schema)

## Recommended Next Steps

### Highest value, low-risk

1. Add a route-policy manifest for middleware/request-guard expectations.
2. Add architecture rules with `dependency-cruiser`.
3. Add provenance metadata for admin analytics panels and exported metrics.
4. Add property-based tests around telemetry identity, dedupe, and timestamp logic.

### Before the future AI engine

1. Make canonical vs operational telemetry collections explicit in docs and code comments.
2. Decide whether `analytics_active_users` stays request-path updated or moves behind a presence/materializer layer.
3. Decide whether semantic context remains dual-homed or becomes generated/shared.
4. Add tracing/structured logging so AI-engine failures do not get mixed into product telemetry without context.

## Overall Readiness

Current telemetry and middleware readiness for the next architecture phase: strong, but not yet “self-explaining.”

The stack is already good enough to support:

- reliable internal analytics
- admin reporting
- debug/ops inspection
- downstream external dashboard mirrors

The main improvement needed now is not more tracking volume. It is stronger architectural enforcement and clearer source-of-truth ownership so future systems, especially the planned AI engine, cannot accidentally treat helper mirrors and blended readers as canonical truth.

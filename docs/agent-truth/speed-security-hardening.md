# Speed Security Hardening

Status: deterministic sitewide speed, cache, API exploit, Firebase rules, App Check, and runaway-cost audit guard  
Report artifact: `agent/state/speed-security-hardening.generated.json`  
Scorer: `npm run score:speed-security`  
Validator: `npm run check:speed-security`  
Safe repair: `npm run repair:speed-security`

## Doctrine

KandyDrops speed and security hardening is deterministic. Public/stable surfaces should cache intentionally. User/payment/support/chat/security surfaces stay no-store where needed. Every API route must declare auth, trusted origin, rate limit, idempotency, cost risk, cache mode, and expected failure codes. Firebase rules remain default deny with explicit owner/admin access. App Check is staged from monitor to enforcement. Heavy browser audits are forbidden by default.

## Owners

- Cache intent: `src/lib/server/route-cache-contract.ts`
- API security posture: `src/lib/server/security-hardening-contract.ts`
- Source-only scoring: `scripts/agent/score-speed-security-hardening.ts`
- Schema and doctrine validation: `scripts/agent/validate-speed-security-hardening.ts`
- Exact safe repair dry-run/apply gate: `scripts/agent/repair-speed-security-hardening-safe.ts`

## Route Cache Contract

Every public page or API route must be classified before agents change caching:

- `static` and `force_cache` are for stable public data or static product metadata.
- `swr` is for public freshness surfaces such as Drops, creator discovery, creator public pages, and homepage data.
- `hot_cache` is for admin analytics/materialized truth, especially GA/Data API or BigQuery-derived data.
- `no_store` is for authenticated user/admin routes where correctness depends on private state.
- `must_not_cache` is for payment, unlock, support, chat, creator monetization, analytics ingest, media proxy, cron, and other sensitive state mutation or private payload routes.

Public/stable routes should not use `no-store` or `force-dynamic` without a source-visible reason. User/account/payment/support/chat/media/security routes remain no-store or must-not-cache when correctness requires it.

## API Exploit Contract

`SecurityRouteContract` declares, per route group:

- auth requirement
- trusted-origin requirement
- App Check recommendation
- rate-limit policy
- body limit
- idempotency requirement
- CSRF risk
- cost risk
- sensitive write status
- expected safe failure codes

POST, PUT, PATCH, and DELETE routes must use `guardApiRequest` with `requireTrustedOrigin: true` unless a webhook or cron exception is documented. Payment, unlock, creator monetization, wallet, support write, admin write, media proxy, analytics ingest, and private user routes require rate-limit evidence. Money, entitlement, account, and monetization writes require idempotency or duplicate-prevention evidence.

Admin moderation is a security workspace, but it must still avoid fake or unbacked actions. KandyDrops moderation must never pretend browser/PWA screenshot detection is confirmed. Screenshot-like events are weak heuristic context unless confirmed by a real platform/server source. Moderation decisions are based on evidence-weighted scrape-risk scoring, and weak visibility/blur events alone do not justify action. Missing moderation action backends render disabled `not_implemented` controls instead of fake success.

## Firebase Rules

Firestore and Storage rules remain default-deny. Client access must be path/auth scoped:

- users read only their own user/runtime/notification/support data unless admin
- support threads and nested messages are owner/admin scoped
- chat threads/messages are participant/admin scoped
- transactions are owner/admin scoped
- Drops public browsing goes through sanitized server/API paths
- locked media is never broadly public-readable from Storage

Server SDK code bypasses Firebase rules, so server routes must rely on IAM plus request guards, auth checks, trusted-origin checks, rate limits, idempotency, and entitlement verification.

## App Check Readiness

App Check is staged, not blindly enforced. The source contract currently records readiness as off/contract-only, with protected surfaces listed for future monitor rollout. The rollout order is:

1. Add/verify client token attachment path.
2. Add server verification in monitor mode.
3. Review real traffic and webhook/cron exceptions.
4. Enforce only high-abuse custom backend routes after validation.

Do not accidentally break PayPal webhooks, cron routes, admin refresh flows, or legitimate PWA/browser clients.

## 4xx Cost Lane

4xx traffic is treated as a speed/security cost lane. Known bot probes and stale legacy paths should be short-circuited in middleware or prevalidation, API 4xx bodies must be minimal and typed, and repeated 4xx diagnostics should be deduped/sampled instead of written as unlimited unique records.

## Timeout And Runaway Work

Cloud Run can time out while route work continues. Cost-sensitive routes and scripts must use bounded work:

- no unbounded Firestore `.get()` in API routes without limit, pagination, or hot-cache ownership
- no unbounded `Promise.all(...map(...))` fanout over unknown data sets
- cleanup/delete loops require batch limits
- paid Google API calls require timeout, budget, quota, kill-switch, or hot-cache evidence
- SQL/Data Connect remains agent-context mirror only unless explicitly contracted

## Safe Repair

`repair:speed-security` is dry-run by default. Apply mode is restricted to exact high-confidence repairs such as `100vh` to `100dvh` in approved shell files. It must not repair payments, auth, entitlements, security rules permissions, App Check enforcement, Cloud Run settings, SQL/Data Connect, BigQuery import/export, wallet/creator spend policy, route caching when data sensitivity is uncertain, or product copy.

## Verification

Run:

```bash
npm run score:speed-security
npm run check:speed-security
npm run repair:speed-security
```

Use targeted route or rules tests only when those files change. Use `npm run typecheck` when TypeScript source changed.

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, broad UI audits, deploy commands, `gcloud`, or Firebase deploys from this lane.

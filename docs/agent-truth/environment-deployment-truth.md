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

- `runConfig.minInstances: 1`
- `runConfig.maxInstances: 2`
- `firebase.json` framework backend region `us-central1`
- `.firebaserc` default project `kandydrops-by-ikandy`

Runtime secrets that the app reads must be declared in `apphosting.yaml` under `env` using `secret:`. Do not rely on top-level App Hosting `secrets:` blocks for runtime variables.

Required secret references:

- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE`
- `PAYPAL_CLIENT_SECRET_LIVE`
- `GA_API_SECRET`
- `NAVIGATION_COOKIE_SECRET`

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

Service-worker cache names must stay explicitly versioned. Increment the version if precached shell assets or offline behavior change.

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

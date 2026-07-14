# Guest User Analytics Cutover

Status: canonical Phase 1 cutover for guest + identified behavioral truth.

## Doctrine

KandyDrops analytics is first-party first. Guest and identified behavior flow into one behavioral timeline with actor/target separation, source reliability, consent state, and confidence caps. Google Analytics is optional external evidence and cannot be required for product truth. Behavioral confidence is source-derived and outcome-aware.

## Canonical Contracts

- `src/lib/behavioral/behavioral-timeline-contract.ts`
- `src/lib/analytics/identity-link-contract.ts`
- `src/lib/analytics/google-analytics-source-policy.ts`
- `src/lib/behavioral/behavioral-confidence-v2.ts`
- `src/lib/behavioral/guest-user-behavior-contract.ts`

## Runtime Writers

- Guest ingest atomically writes timeline facts and deterministic user-index outbox requests: `src/app/api/analytics/ingest/route.ts`
- Identified ingest atomically writes timeline facts and deterministic user-index outbox requests: `src/app/api/analytics/ingest-identified/route.ts`
- Identity linking: `src/lib/server/analytics-identity-linking.ts`
- Rollups: `src/lib/server/guest-user-behavior-rollup.ts`

## Guardrails

- GA4 is optional evidence only; missing GA must not fail canonical truth.
- Privacy-limited paths must be labeled `privacy_limited`, not forced into dormant/low-engagement outcomes.
- Low-value hover/visibility/page-leave events are diagnostic-only and must not inflate confidence.
- Page duration is diagnostic and is never watch truth.

## Stage 5 Guest Analytics Lock

### Canonical guest identity hierarchy

The canonical guest actor is the client anonymous visitor id from `getClientAnalyticsIdentitySnapshot` when it is present, consent-allowed, and matches the app's safe client identity pattern. Current client identities use the `subject_*` family. The server `anon_*` cookie identity is a transport/session fallback and dedupe key, not the primary guest actor when a valid client `anonymousVisitorId` exists.

`identity_linked` continuity must use that same canonical guest actor path. Guest facts must not be written only under `anon_*` while ignoring a valid client `anonymousVisitorId`. Denied-consent paths must preserve existing privacy behavior and must not persist an anonymous visitor id.

### Server cookie role

The server cookie/session key remains required for storage continuity, idempotent guest batch document ids, and fallback continuity. It may appear as `sessionKey` or `serverSessionKey`, but canonical guest actor fields should prefer the validated client `anonymousVisitorId`.

### GA4 user_id hygiene

Never send `user_id` for never-signed-in guests. Signed-in analytics may use only the real assigned user id. Signout may clear GA4 with `user_id: null` if the runtime supports clearing. Never send blank, whitespace, `"null"`, `"NULL"`, `"undefined"`, or `"UNDEFINED"` as `user_id`.

### Retry dedupe

DeepTracker must keep a stable `batchId` for the same queued payload across retries. Successful flush clears the stable batch id. A materially different payload group receives a new `batchId`. Server ingest dedupes with the existing storage key path and must not add a new dedupe collection or extra read lane.

### Semantic guest parity

Cataloged guest semantic events may ride the existing guest ingest batch path. Uncataloged or malformed semantic payloads must be ignored/dropped safely. Guest semantic payloads should include canonical `anonymousVisitorId` when available, and authenticated semantic ingest must remain separate so one action is not double-counted as both guest and authenticated.

### Materialized snapshot-first

Admin guest analytics display must prefer the materialized `guestAnalyticsSnapshot` exposed from `analytics_aggregate_stats/realtime_summary`. Repeated admin display work must not bypass that snapshot with broad raw scans of `analytics_guest_batches`, `behavioral_timeline_facts`, guest indexes, or BigQuery. Zero guest count is valid only when `guestSamplesAvailable` or positive `sourceSampleCounts` proves guest source collections were sampled.

### Admin truth display

Missing samples render `unavailable` or `needs_review`, not `0`, `live`, or healthy. Stale snapshots render stale/unavailable. GA-derived guest estimates must be labeled estimated and must not override first-party snapshot truth. Debug surfaces should expose source, confidence, and degradation reason when available.

### Cost boundaries

Guest analytics lock work must not add client events, Firestore listeners, BigQuery jobs, provider calls, or unbounded materializer frequency. The registered user-index worker is the one bounded exception: it runs through the existing CRON-authenticated scheduler lane, is off by default, and caps each run at 5 subjects and 200 facts per subject. Repeated analytical reads belong in bounded materialized snapshots or cached projections.

### Validators

Run these after guest analytics changes:

- `npm run check:guest-analytics-lock`
- `npm run check:guest-user-analytics`
- `npm run check:analytics-event-contract`
- `npm run check:admin-analytics-hot-cache`
- `npm run check:admin-analytics-no-pure-realtime`
- `npm run check:admin-analytics-guest-bounce-quality`
- `npm run check:admin-analytics-live-pulse`
- `npm run typecheck` when TypeScript changed

## User Index Read Models

Per-user and per-guest behavioral serving now routes through canonical user tracking indexes. Timeline facts remain the ingest truth, and index materializers provide reusable read models for admin, recommendations, moderation, and user diagnostics.

The source-owned execution chain is timeline fact + deterministic outbox request in one transaction, CRON-authenticated internal consumption, shadow publication, two distinct clean current-source shadow windows, then active publication. Source/config readiness does not prove deployment, secrets, scheduler invocation, shadow-window cleanliness, admin truth, or production data correctness.

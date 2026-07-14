# User Tracking Indexes

Status: canonical per-user and per-guest tracking read model cutover.

## Doctrine

KandyDrops user tracking is index-based. UI emits normalized runtime facts, server/materializers build per-user and per-guest indexes, and admin/recommendation/moderation surfaces read indexes. UI components and admin pages cannot hard-write production user metrics.

## Canonical Indexes

- `user_tracking_indexes`
- `guest_tracking_indexes`
- `user_entity_affinity_indexes`
- `user_value_indexes`
- `user_journey_indexes`
- `user_notification_indexes`
- `user_content_consumption_indexes`
- `identity_lineage_indexes`

## Source Truth

- Purchase/value: server transaction truth first.
- Unlocks: server entitlement/unlock truth first.
- Watch: watch-session/canonical server truth first.
- Notification behavior: canonical notification read/open actions.
- Guest behavior: behavioral timeline guest facts.
- Google Analytics: optional evidence only.
- Legacy page-duration: diagnostic fallback only.

## Materializer Contract

`src/lib/server/user-index-materializer.ts` is the unique consumer owner. Ingest uses `src/lib/server/behavioral-timeline-writer.ts` to commit each timeline fact and its deterministic outbox request atomically. The registered internal route and scheduled Function execute the consumer outside the ingest request.

- mode defaults to `off`; `shadow` must produce two distinct clean current-source windows before `active`
- maximum 5 leased requests per run
- maximum 200 facts per subject and 50 lineage records per lineage query
- maximum 30-second consumer runtime
- deterministic request ids, leases, retry backoff, and bounded attempts
- exact replay, linked guest/user copy, lineage conflict, admin, and system exclusions
- explicit source window and source fingerprint

The scheduled Function runs every five minutes with one instance and calls the CRON-secret-authenticated internal route through the bounded HTTP client. Before any secret is attached, the target must be HTTPS on the default port, match the exact internal materializer path, and match `USER_INDEX_MATERIALIZER_ALLOWED_HOSTS`; URL credentials, query strings, fragments, redirects, and unapproved hosts are rejected. It must not perform unbounded full-collection scans in production paths.

Outbox requests and terminal request records carry a 30-day `expiresAt` Firestore Timestamp. Shadow publications carry a 30-day timestamp, and window receipts carry a 90-day timestamp. These fields are source readiness only: Firebase TTL policies must be configured and observed externally before cleanup can be claimed.

Source/config readiness is not runtime proof. Deployment, endpoint/allowed-host/secret configuration, scheduler invocation, Firestore index and TTL-policy rollout, observed expiry, two clean shadow windows, active promotion, admin truth sampling, and production data correctness remain external evidence until observed. Rollback is `USER_INDEX_MATERIALIZER_MODE=off`; raw batches, timeline facts, requests, and indexes are retained.

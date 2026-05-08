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

`src/lib/server/user-index-materializer.ts` is bounded:

- `maxUsers`
- `maxFacts`
- `runtimeCapMs`
- `dryRun`
- source window range

It must not perform unbounded full-collection scans in production paths.

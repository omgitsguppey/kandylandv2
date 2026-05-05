# Telemetry Doctrine

Authority level: 4

Owner: analytics/telemetry

## Must

- Separate actor ids from target ids.
- Map fan/user `creator_id` to targetCreatorId, not actorCreatorId.
- Treat client events as funnel/context unless server truth owns the fact.
- Exclude admin, owner, projection, and synthetic activity from user behavior metrics.

## Must Not

- Let client-only purchase or unlock events inflate revenue or unlock metrics.
- Count notification opened and read as separate behavioral facts.
- Treat projection writes as live creator/user behavior.

## Source Truth

- Analytics event contract, identified ingest, event-fact normalizer, server analytics.

## Validators

- `check:analytics-event-contract`
- `check:actor-target-telemetry`
- `check:purchase-telemetry-truth`
- `check:unlock-telemetry-truth`
- `check:admin-projection-analytics-exclusion`

# Count Deduplication Normalization

Generated: 2026-06-20T21:30:41.821Z
Current head: ad14b5fe71513600251e0c078c42f373b89c8091
Status: pass

## Contract

- Unique event priority is canonical eventId, then dedupeKey, then sessionId/eventName/objectId/timestamp bucket.
- Linked guest to user actions count once globally and once under the best user identity only.
- Weak or unknown legacy confidence counts in the legacy bucket, not exact user buckets.
- Retry/replay events do not increment standard user-facing counts unless replay is the metric itself.
- Formula references are registered for required count domains.

## Debug Lane

- Label: Count dedupe math
- Required domains covered: 16
- Duplicate risk count: 3
- Legacy bucket count: 1
- Replay suppressed count: 1
- Missing formula references: 0

## Dirty Files

- none

## Open PR Classification

- none

## Validation Failures

- none

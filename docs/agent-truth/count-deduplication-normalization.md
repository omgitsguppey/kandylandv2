# Count Deduplication Normalization

Generated: 2026-06-21T00:51:14.989Z
Current head: 55c7685ba6d9b11f792ce5bfbed99b72e0ccbf3c
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

- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/canonical-math-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/launch-analytics-recovery.generated.json: stale_generated_artifact_to_regenerate
- agent/state/metric-canonicalization-legacy-recovery.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-panel-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/canonical-math-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/launch-analytics-recovery.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/metric-canonicalization-legacy-recovery.md: stale_generated_artifact_to_regenerate

## Open PR Classification

- none

## Validation Failures

- none

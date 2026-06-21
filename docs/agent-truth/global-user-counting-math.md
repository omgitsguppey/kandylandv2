# Global User Counting Math

Generated: 2026-06-21T21:45:48.038Z
Current head: 2cb7d4c056b8ae36044f523a38222516ffc81179
Status: pass

## Contract

- Global metrics count unique real actions once per dedupe key.
- Guest metrics count pre-login guest actions only.
- Signed-in metrics count authenticated actions only.
- Linked-person metrics combine guest and signed-in events only when link evidence exists.
- Creator role metrics are signed-in metrics with role context and do not create another person.
- Admin projections and system events never count as user behavior.
- Unknown legacy can count only as safe global evidence and never as exact user truth.

## Exact Dedupe Windows

- surface viewed: eventName + surface + actor/session + 60s
- click/action: eventName + objectId + actor/session + 5s
- signup/login: authAttemptId or userId + method + 10m
- wallet checkout: idempotency key
- payment approval: provider/order fingerprint only
- drop unlock: dropId + user/linkedPerson + unlockId
- watch session: watchSessionId
- chat message: messageId/idempotency key
- task reward: taskId + resetWindowId + user
- notification: intentId + recipient + 1h

## Dirty Files

Total dirty files seen: 6
Examples shown: 6

### Dirty File Classifications

- current_generated_artifact_to_commit: 2
- stale_generated_artifact_to_regenerate: 2
- real_source_change_needs_review: 2

### Dirty File Examples

- agent/state/global-user-counting-math.generated.json: current_generated_artifact_to_commit
- agent/state/global-user-dedupe-normalization.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-user-counting-math.md: current_generated_artifact_to_commit
- docs/agent-truth/global-user-dedupe-normalization.md: stale_generated_artifact_to_regenerate
- src/lib/analytics/global-user-dedupe-engine.ts: real_source_change_needs_review
- tests/unit/global-user-dedupe-normalization.spec.ts: real_source_change_needs_review

## Open PR Classification

- none

## Validation Failures

- none

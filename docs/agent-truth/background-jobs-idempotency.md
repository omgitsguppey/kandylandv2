# Background Jobs Idempotency

KandyDrops background work is treated as at-least-once. Scheduled functions, cron routes, Firestore triggers, manual scripts, and queue replays may run more than once. A job is launch-safe only when a retry either no-ops or completes the same intended work without duplicating user-visible side effects.

## Launch Rules

- Every job needs a stable job key and an idempotency strategy.
- User-visible writes need a deterministic receipt, lock, activation key, or document id.
- Money, rewards, unlocks, and entitlement writes must happen in server-side transactions.
- Refresh jobs must dedupe in progress work and keep the previous verified snapshot visible on failure.
- Notification jobs must use deterministic notification ids, deterministic browser tags, and recorded dispatch outcomes.
- A job must record a heartbeat, runtime warning, dispatch outcome, route warning, snapshot status, or equivalent diagnostic when it writes or fails.
- Missing idempotency must be explicit in the audit before retries are enabled.

## Queue And Drop Lifecycle

`processQueueLifecycle` schedules queued drops from the resolved queue config. It is safe to replay because the runtime projects the desired drop state from the current queue slot, existing status, `validFrom`, `validUntil`, and `activationCount`.

`notifyActiveDropsLifecycle` activates scheduled drops, expires active drops, returns auto-queued drops to the queue, and sends live notifications. The live notification side effect uses two guards:

- `activationKey = drop-activation:{dropId}:{validFrom}`
- deterministic notification id from the notification idempotency key

The Functions scheduler path and app-server path must both use data-only FCM payloads for service-worker display. FCM `notification` auto-display payloads are forbidden for these scheduled drop notifications because the service worker also owns visible browser display. Browser tags must come from the idempotency key.

## Notifications

Drop notifications use deterministic idempotency keys that include notification type, lifecycle event, drop id, and audience. Backend notification creation must write `notifications/{deterministicId}` in a transaction. Browser-visible notifications must use the deterministic `tag` and `renotify: false`.

Dispatch diagnostics must include skipped permission, skipped preference, missing token, duplicate token, invalid token cleanup, FCM success/failure, duplicate-created prevention, duplicate-push prevention, and browser tag/idempotency evidence. Admin Debug owns the full proof.

## Money, Rewards, And Access

Daily check-in reward grants are idempotent by user/day state. Task completion reward grants are idempotent by `daily_task_event_receipts/{uid}:{eventName}:{receiptKey}`. PayPal capture is idempotent by `paymentLocks/{orderId}`. Drop unlocks are idempotent by the user's existing entitlement and transactionally skip duplicate charges when `unlockedContent` already contains the drop id.

No client-provided balance, purchase completion, reward amount, or unlock entitlement can be the source of truth.

## Analytics And Refresh Jobs

Admin analytics snapshot refresh uses explicit refresh status and dedupe locks. A refresh may mark data refreshing or failed, but it must not clear the last verified snapshot. Refresh version increments only after a completed verified refresh.

Analytics replacement snapshots are retry-safe when they write fixed docs from deterministic source reads. Incremental Firestore rollup triggers must keep event-level dedupe before enabling provider retries. If an incremental rollup has no explicit processed-event marker, the audit must mark that risk instead of pretending the retry path is fully idempotent.

Transaction commerce rollups use `analytics_projection_receipts/transactions:{transactionId}:commerce_rollup` in the same batch as aggregate increments. Duplicate provider delivery must fail on that receipt before changing analytics counters. The transaction source document remains the money truth; this guard only protects analytics projections.

## Runtime Warnings And Debug

Runtime warnings, queue heartbeats, and notification dispatch outcomes use stable ids so diagnostics update in place. Admin Debug must show:

- queue job freshness and last error
- runtime warning code, surface, execution layer, and detail
- notification activation key, idempotency key, browser tag, duplicate prevention, skip counts, and FCM outcome
- analytics refresh status, dedupe hit, refresh version, and stale-but-verified state
- payment/unlock/task parity evidence without exposing private secrets

## Future Agents

Do not add a background job, cron route, scheduled function, Firestore trigger, notification send, reward grant, wallet write, unlock write, analytics refresh, or manual rebuild without adding it to `agent/state/background-job-idempotency-audit.generated.json` and `scripts/agent/validate-background-job-idempotency.ts`.

Do not enable retries on a job that increments aggregate state unless the source event has a deterministic processed marker or the target write is replacement-style. Do not add generated notification ids, random browser tags, auto-display FCM payloads, fake success diagnostics, or writes that can fail silently.

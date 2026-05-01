# Notification Pipeline Truth

KandyDrops notifications move through one pipeline: backend creation, optional web push send, browser/PWA display, open, read, and clear. Admin Analytics shows only a compact Notification Funnel summary. Detailed delivery, dedupe, skip, and persistence details belong in Admin Debug.

## FCM Foreground And Background

Foreground messages are handled by the client `onMessage` listener. Background and closed-PWA messages are handled by `firebase-messaging-sw.js` through `onBackgroundMessage`.

Web push messages sent by KandyDrops should be data-only when the service worker is expected to display them. A payload with an FCM `notification` object may auto-display in the background. If the service worker also calls `showNotification` for that same payload, users can see duplicate alerts.

## Deterministic idempotency key rule

Every drop notification needs a deterministic idempotency key. The key must include notification type, drop id, lifecycle event, and recipient or audience segment.

Examples:

- `drop_live:drop_live:<dropId>:global`
- `drop_requeued_live:drop_requeued_live:<dropId>:global`
- `drop_ending:drop_ending:<dropId>:<recipientId>`

Backend notification creation must be idempotent. A retry, rerender, scheduler rerun, or queue runtime replay must not create a second in-app notification for the same intended event.

## Browser notification tag rule

Visible browser notifications must use deterministic `tag` values derived from the idempotency key. Random notification ids are forbidden as browser tags. The browser tag lets the browser replace an existing alert for the same drop/event instead of stacking duplicates.

Use `renotify: false` unless the product intentionally wants an existing tagged alert to alert again.

## Auto-queued drop return-live notification rule

When an auto-queued drop returns live, the notification lifecycle event is `drop_requeued_live`. It should create exactly one intended notification per eligible audience/recipient. Backend activation reservation and notification idempotency both apply.

Debug must expose skipped recipients when preferences are disabled, push tokens are missing, permission is denied, or recipient lookup fails.

## Skip diagnostics rule

Server push dispatch must record enough counts to explain why a notification did not reach a browser:

- permission/browser-push disabled
- notification preference disabled
- push token missing
- duplicate push token suppressed
- FCM send failure
- invalid token cleanup

These counts belong in dispatch detail and Debug. Admin Analytics may summarize failed/skipped only when the joined source exists. Do not show fake zeros for missing skip telemetry.

## Read/persistence rule

Marking a notification read updates local unread UI immediately, then persists server read state through `/api/notifications`. If persistence fails, the UI must reconcile and refetch. Closing or dismissing a notification that was already read must not restore it to unread.

Opening the dropdown does not mark everything read. Clicking or explicitly reading a notification records read/open behavior only through the intended event path.

## Clear-all rule

Clear all means clearing the unread inbox, not deleting source-truth notification documents. The client may remove cleared unread notifications from the visible dropdown immediately, but the server must persist read state through `/api/notifications`. If only part of the mutation succeeds, restore the failed unread notifications and keep successfully cleared notifications hidden.

## Multi-tab unread count reconciliation rule

After read or clear-all mutations, tabs should synchronize through the existing notification runtime event. Service-worker notification clicks should post a client message so the app can record open/read state while focusing or navigating the window.

The shared runtime event must initialize BroadcastChannel listeners in tabs that load the notification hook, and mutations must dispatch with cross-tab broadcast enabled.

## Notification Funnel

The Admin Analytics Notification Funnel is a compact summary only. It may show prompted, enabled, sent, opened, read, cleared, duplicate prevented, and failed/skipped states when sources exist. Missing delivery or skip telemetry must show Waiting or Debug-only, not fake zero.

Detailed notification health lives in Admin Debug: idempotency keys, browser tags, duplicate-created prevention, duplicate-push prevention, duplicate-browser-display prevention, skipped reasons, foreground/background counts, service-worker display counts, click handler wiring, read persistence lag, and unread reconciliation.

## Phase 5 Snapshot Migration

Notification Funnel reads the Admin Analytics snapshot registry first and remains a compact Analytics summary only. Prompt, enabled, sent, opened, read, cleared, duplicate-prevented, failed, and skipped counts must not show fake zeros when telemetry is missing. Admin Debug owns service-worker, push, dedupe, queued-drop-return-live, read persistence, and snapshot parity proof.

## Fake zero prevention

Do not show `0` for enablement, sent, duplicate-prevented, failed/skipped, read, or clear metrics unless the selected source is present and server-confirmed or telemetry-confirmed for the selected range. Missing source means Waiting or Unavailable.

## Future agents

Do not reintroduce duplicate drop alerts, random browser notification tags, FCM notification auto-display plus manual service-worker display, clear-all flows that only change local state, giant Notification Funnel cards, stale unread counts, or stale funnel data labeled as live.

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

## Read/persistence rule

Marking a notification read updates local unread UI immediately, then persists server read state through `/api/notifications`. If persistence fails, the UI must reconcile and refetch. Closing or dismissing a notification that was already read must not restore it to unread.

Opening the dropdown does not mark everything read. Clicking or explicitly reading a notification records read/open behavior only through the intended event path.

## Multi-tab unread count reconciliation rule

After read or clear-all mutations, tabs should synchronize through the existing notification runtime event. Service-worker notification clicks should post a client message so the app can record open/read state while focusing or navigating the window.

## Notification Funnel

The Admin Analytics Notification Funnel is a compact summary only. It may show prompted, enabled, sent, opened, read, cleared, duplicate prevented, and failed/skipped states when sources exist. Missing delivery or skip telemetry must show Waiting or Debug-only, not fake zero.

Detailed notification health lives in Admin Debug: idempotency keys, browser tags, duplicate-created prevention, duplicate-push prevention, duplicate-browser-display prevention, skipped reasons, foreground/background counts, service-worker display counts, click handler wiring, read persistence lag, and unread reconciliation.

## Fake zero prevention

Do not show `0` for enablement, sent, duplicate-prevented, failed/skipped, read, or clear metrics unless the selected source is present and server-confirmed or telemetry-confirmed for the selected range. Missing source means Waiting or Unavailable.

## Future agents

Do not reintroduce duplicate drop alerts, random browser notification tags, FCM notification auto-display plus manual service-worker display, giant Notification Funnel cards, stale unread counts, or stale funnel data labeled as live.

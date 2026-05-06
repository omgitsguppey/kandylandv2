# Telemetry Identified Parity

KandyDrops identified analytics must derive one canonical parity layer before admin metrics, user detail, action ledgers, recommendations, or moderation consume user behavior.

## Rules

- Actor and target are separate truths.
  - User follows creator: actor user, target creator.
  - Admin projection: actor admin, target creator, excluded from user behavior.
- Purchases and revenue are server or transaction truth first.
- Unlocks are server entitlement truth first.
- Watch time is watch-session truth first.
- Notification scoring treats `notification_marked_read` as canonical. Opened and dropdown events remain diagnostics only.
- Daily check-in aliases normalize to `daily_checkin_claimed`.
- `identity_linked` must be emitted on signup, login, and session restore.
- Privacy-limited identified telemetry is not a broken source. It is an excluded source with a reason.
- Server/system events may be excluded from user behavior scoring when they carry an explicit reason. Foreground user telemetry still requires actor, route, and session context. Server/system `server_drop_clicked` records without user/session attribution are review/excluded until ownership is resolved; they must not be silently counted as user behavior.

## Active User Split

`analytics_active_users` must separate:

- `lastSeenAt`
- `lastSeenEventName`
- `lastMeaningfulActionAt`
- `lastMeaningfulActionName`
- `lastCommerceActionAt`
- `lastContentActionAt`
- `lastWatchActionAt`
- `lastSupportActionAt`

Low-value UI events can update `lastSeenAt`, but they must not overwrite meaningful-action truth.

## Validation

Use:

- `npm run score:telemetry-identified-parity`
- `npm run check:telemetry-identified-parity`

Critical failures:

- creator target id forces creator actor classification
- purchases counted from client-only telemetry
- unlocks counted from client-only telemetry
- admin/projection behavior included in user metrics
- page duration treated as verified watch time
- `identity_linked` missing entirely

# Creator Broadcasts

Status: launch-hardening truth note

Creator broadcasts are real, visible, and manageable from the Creator Dashboard.

Required behavior:

- Show newest-first broadcast history.
- Show `draft`, `scheduled`, `sent`, `failed`, and `canceled` statuses.
- Show created time, scheduled time, sent time, audience summary, delivery count, and open count only when the backend tracks them.
- Show `Not tracked yet` when a metric does not exist.
- Provide an empty state when no broadcasts exist.
- Provide a real `Create broadcast` action only when the backend is live.

Security:

- Creator broadcasts are server-written.
- Admin projection is read-only.
- Broadcast write routes must verify creator ownership.

Telemetry:

- `creator_broadcast_manager_viewed`
- `creator_broadcast_created`
- `creator_broadcast_creation_failed`
- `creator_broadcast_detail_viewed`
- `creator_broadcast_empty_state_viewed`

Validation:

- Broadcast history must never be simulated.
- Broadcast creation must not expose admin/debug truth to normal creators.

# Creator Dashboard Settings

Status: launch-hardening truth note

Creator Dashboard owns creator operations.

Sections:

- Public Profile
- Broadcasts
- Fan Pass
- Messages
- Requests
- Live Time / Bookings
- Availability
- Earnings / Payout status
- Notifications / Audience

Truth rules:

- Every section must show a real truth state such as `live`, `unavailable`, `not_configured`, `blocked`, `needs_setup`, or `error`.
- No fake healthy state.
- Admin projection must be read-only.
- Creator write actions must be owned by the creator account and validated on the server.

Telemetry:

- `creator_dashboard_settings_viewed`
- `creator_settings_section_opened`

Broadcast manager:

- Broadcast history must read the real broadcast collection.
- Empty state is `No broadcasts yet`.
- If a metric is not tracked, show `Not tracked yet` instead of fake zero.

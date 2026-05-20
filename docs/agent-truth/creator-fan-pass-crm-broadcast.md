# Creator Fan Pass CRM And Broadcast Semantics

Creator Dashboard subscriber rows are CRM rows, not raw database rows. Normal creator UI must show readable fan identity: username first, display name next, then a safe masked fallback when identity is unavailable.

Raw user IDs are debug/admin-only and must not be the default creator-facing subscriber label. Subscriber rows must not expose private email by default. Fan Pass subscriber CRM is creator-scoped and must not show other creators' subscribers.

Fan Pass CRM rows should prioritize quick identity, status, renewal, price, and last activity when available. Mobile layout should stay compact and action-oriented without pretending unavailable actions exist.

Broadcast audience must be explicit:

- `all_fans`
- `followers`
- `fan_pass_subscribers`
- `followers_and_subscribers`
- `selected_segment`
- `unknown` or `unavailable`

If a broadcast route currently supports only one target, the route and UI must expose that supported audience. Unsupported audiences must return a human-safe validation error instead of silently sending to the wrong people.

Creator-facing broadcast copy uses Followers, not legacy all_fans or blast language, when describing the broadcast notification audience. Fan Pass subscriber CRM copy may still say Fan Pass subscribers where that is the exact paid subscriber audience. Internal relationship source names may remain where they describe backend records, but product UI and route response semantics must be audience-explicit.

If broadcasts are not configured or source state is unavailable, Creator Dashboard should show a compact unavailable state instead of implying a working blast is ready.

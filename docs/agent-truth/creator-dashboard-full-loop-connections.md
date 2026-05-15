# Creator Dashboard Full-Loop Connections

Authority: Supporting evidence for Creator Dashboard Phase 1 and Phase 2 connection fixes.
Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

## Rules

- Creator Dashboard cards must not show orphan buttons or self-loop links.
- A visible action must have a real route/action, permission guard, pending guard, unavailable state, and error path.
- All creator mutating routes in this lane use `readBoundedJsonBody` before schema parsing.
- Creator dashboard managers use manual refresh and request-id guards only. No polling, realtime listeners, or broad collection reads are allowed.

## Connected In This Pass

- Requests management uses the existing `/api/creator/requests` GET/PUT route.
- `CreatorRequestsManager` loads only when custom requests are enabled, unrestricted, and a creator id is known.
- Request actions are disabled in read-only admin projection mode and protected by a pending action guard.
- Bookings management uses the existing `/api/creator/bookings` GET/PUT route.
- `CreatorBookingsManager` loads by explicit creator id, disables actions in read-only projection mode, and uses a pending action guard.
- Fan Pass dashboard visibility uses the existing `/api/creator/subscriptions` GET route for subscriber rows.
- `CreatorFanPassManager` is read-only subscriber visibility only. Public creator flows own Fan Pass membership changes.
- Broadcasts remain the fully connected send flow and keep capped broadcast history and follower recipient reads.

## Configuration-Only States

- Fan Pass remains configuration-only when pricing is missing or subscriptions are disabled/restricted.
- Bookings remain configuration-only until bookings are enabled and availability windows are configured.
- Messages link to `/dashboard/chat` only when messaging is enabled and unrestricted. Chat internals stay untouched.
- Subscriptions route POST remains fan-side only and is not exposed in the creator dashboard.

## Route Guards

- `/api/creator/bookings` POST and PUT use `readBoundedJsonBody`.
- `/api/creator/subscriptions` POST uses `readBoundedJsonBody`.
- Creator dashboard managers pass explicit creator id query parameters or rely on verified projection headers from `authFetch`.

## Next Gaps

- Build deeper booking scheduling tools only if a dedicated route/source supports the workflow safely.
- Add subscriber mutation tools only after a creator-side route and permissions contract are explicitly designed.

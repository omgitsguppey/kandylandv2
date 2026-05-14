# Creator Dashboard Full-Loop Connections

Authority: Supporting evidence for Creator Dashboard Phase 1 connection fixes.  
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
- Broadcasts remain the fully connected send flow and keep capped broadcast history and follower recipient reads.

## Configuration-Only States

- Fan Pass is configuration/count only in the Creator Dashboard until a subscriber management route/panel is proven.
- Bookings are configuration/count only in the Creator Dashboard until a dedicated booking management panel is connected.
- Messages link to `/dashboard/chat` only when messaging is enabled and unrestricted. Chat internals stay untouched.

## Next Gaps

- Build a focused booking management panel only if the existing booking route supports the needed creator-side workflow safely.
- Add subscriber management only after a route/source returns safe creator subscriber rows and mutation permissions.

# Creator Monetization Gates Lock

This lock gates the user-facing creator monetization surfaces:

- creator chat messages
- Fan Pass
- live-time bookings
- custom requests
- creator paid media or paid chat, when present

The public rule is simple:

- paid-source GumDrops are required for creator monetization
- free GumDrops are only for unwrapping Drops
- blocked states must explain why access is blocked and what to do next
- Wallet is the primary recovery path
- `Go unwrap drops` is the secondary path where relevant

This lock does not change wallet accounting, paid-only policy, or chat shell layout. It only hardens guidance, error copy, and the next-action surfaces that appear before a user would otherwise hit a monetization block.

The current implementation uses:

- a shared compact paid-GD guidance card for creator experiences
- typed API problems for subscriptions, bookings, requests, and chat send failures
- server-owned low paid-GD reminder cycle logic that re-arms only on paid refill

If any future change makes a creator monetization action look wallet-neutral, free-GD-enabled, or generic/internal-error-driven, this lock should fail and the affected surface should be re-evaluated before release.

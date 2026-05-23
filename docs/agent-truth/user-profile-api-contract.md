# User Profile API Contract

Generated: 2026-05-23T02:10:38.917Z

## Status

passed

## Contract

- Canonical route: `/api/user/profile`
- Contract: `src/lib/user/user-profile-contract.ts`
- Source truth: `users/{uid}`
- Account Settings consumers stay on the canonical profile endpoint.

## Guardrails

- Arbitrary client `userId` and identity fields are blocked by the write sanitizer.
- Server-only fields, including `role`, `email`, balances, and `creatorSettings`, are not writable through the user profile route.
- Creator Settings remains owned by `/api/creator/settings`.
- Route diagnostics and human-readable profile errors are required.
- Settings save telemetry is emitted through the existing telemetry catalog event.

## Failures

- None

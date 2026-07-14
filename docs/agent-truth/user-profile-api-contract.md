# User Profile API Contract

Generated: 2026-07-14T16:11:01.216Z

## Status

failed

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

- protected surfaces changed: src/app/api/chat/attachments/cancel/route.ts, src/app/api/chat/attachments/complete/route.ts, src/app/api/chat/attachments/prepare/route.ts, src/app/api/chat/threads/[threadId]/messages/route.ts, src/app/api/creator/bookings/route.ts, src/app/api/creator/drops/assets/route.ts, src/app/api/creator/drops/route.ts, src/app/api/creator/messages/route.ts, src/app/api/creator/onboarding/application/route.ts, src/app/api/creator/onboarding/contract-signature/route.ts, src/app/api/creator/onboarding/id-submission/route.ts, src/app/api/creator/onboarding/intro/route.ts, src/app/api/creator/payouts/route.ts, src/app/api/creator/relationships/route.ts, src/app/api/creator/requests/route.ts, src/app/api/creator/settings/route.ts, src/app/api/creator/subscriptions/route.ts, src/app/api/paypal/capture/route.ts, src/app/api/paypal/create/route.ts, src/app/api/wallet/packages/route.ts, src/components/Chat/ChatExperience.tsx, src/components/Navigation/NotificationBell.tsx, src/components/Navigation/ProfileDropdown.tsx, src/lib/creator-settings/creator-settings-contract.ts

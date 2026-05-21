# Error Language Contract

Generated: 2026-05-21T02:22:17.116Z

Current head: `dc77dba983af6f0a79040c44c792e78ae0c5baec`

## Status

Phase 1 creates the shared human error contract, dictionary, resolver, API payload helper, and client notice component. It does not wire every product surface yet.

## Rules

- Normal user and creator UI must show plain-language messages, not raw route, provider, Firebase, validation, or stack details.
- Raw details stay in route diagnostics, Debug, and operator evidence.
- User copy explains what happened, what it blocks, who can fix it, and what action to take next.
- `rewardEligible` marks translated platform errors that can use the Phase 2 bug-report reward flow.

## Coverage

- Dictionary entries: 47
- Bug-report eligible entries: 18
- Reward eligible entries: 1
- Surfaces covered: admin_debug, admin_truth, analytics, auth, creator_booking, creator_chat, creator_dashboard, creator_drops, creator_profile, creator_request, creator_settings, fan_pass, gumdrop_purchase, navigation, runtime, unknown, wallet

## Deferred Wiring

- creator_dashboard: Managers still need Phase 2 adoption of translated payloads.
- wallet: Payment provider behavior is forbidden in this phase; translation adoption is deferred.
- creator_chat: Chat send/realtime error translation needs a focused wiring pass.

## Next Fix Order

1. Adopt resolveHumanError in creator dashboard managers that currently display body.error or body.message.
2. Adopt buildHumanApiErrorPayload in creator experience routes after preserving existing problem codes.
3. Connect translated platform errors to the future bug-report reward flow without exposing raw details.

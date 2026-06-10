# Error Language Contract

Generated: 2026-06-10T03:58:28.208Z

Current head: `48af9a1a6bd27583e0d97501a8b14f411a248a44`

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
- Error translation queue findings: 40
- Protected-domain queue findings: 40

## Error Translation Coverage Queue

Categories: raw_user_facing_error, raw_debug_only_error, unknown_catch_block, provider_error_without_safe_translation, retryable_non_retryable_mismatch, missing_debug_fingerprint, missing_recovery_action

Top findings:

1. missing_debug_fingerprint in `src/app/%5F%5F/auth/[...path]/route.ts:54` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
2. unknown_catch_block in `src/app/%5F%5F/auth/[...path]/route.ts:54` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
3. retryable_non_retryable_mismatch in `src/app/api/admin/ai/drop-covers/generate/route.ts:74` (api_route, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
4. raw_user_facing_error in `src/app/api/viewer/watch-session/route.ts:660` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
5. missing_debug_fingerprint in `src/app/api/wallet/packages/route.ts:52` (wallet_payment, protected=payment_provider) - Protected payment/provider lane: classify only, then use the existing error language contract in a targeted approved payment-modal or provider route pass.
6. missing_recovery_action in `src/components/Admin/AdminCreatorViewAsControls.tsx:85` (creator, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
7. raw_user_facing_error in `src/components/Admin/AdminCreatorViewAsControls.tsx:85` (creator, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
8. provider_error_without_safe_translation in `src/components/Auth/AuthModal.tsx:29` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
9. missing_recovery_action in `src/components/Auth/AuthModal.tsx:80` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.
10. missing_recovery_action in `src/components/Auth/AuthModal.tsx:181` (auth, protected=auth) - Protected auth lane: preserve missing/expired/malformed/permission distinctions and route through canonical safe auth error translation.

## Deferred Wiring

- creator_dashboard: Managers still need Phase 2 adoption of translated payloads.
- wallet: Payment provider behavior is forbidden in this phase; translation adoption is deferred.
- creator_chat: Chat send/realtime error translation needs a focused wiring pass.

## Next Fix Order

1. Adopt resolveHumanError in creator dashboard managers that currently display body.error or body.message.
2. Adopt buildHumanApiErrorPayload in creator experience routes after preserving existing problem codes.
3. Connect translated platform errors to the future bug-report reward flow without exposing raw details.

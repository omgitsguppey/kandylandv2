# Analytics Panel Hydration

Generated: 2026-05-27T02:53:36.720Z
Current head: dd4b37320ddd4e920d6633c91d90b01243089231

## Summary

- Total panels: 41
- Hydrated: 9
- Collecting: 2
- Stale: 0
- Source missing: 27
- Materializer missing: 0
- Bridge missing: 0
- External required: 3
- Permission blocked: 0
- Broken: 0

## Contract

- Missing panel data is collecting, source-missing, materializer-missing, bridge-missing, external-required, permission-blocked, or broken. It is not zero.
- A panel may display zero only when a bounded source loaded and proved zero.
- Hydrated panel evidence can reduce manual evidence scope; stale, collecting, source-only, or external-required panels cannot clear formal provider/runtime/billing gates.
- The report uses local source and generated artifacts only. It performs no production reads or provider calls.

## Live Evidence

- Contributes live evidence: new_users_signups, creator_follows, drops_live, watch_time, completion_rate, auth_attempts_failures, search_queries, search_zero_results_clicks, support_account_actions
- Collecting with source: error_rate_4xx, debug_backlog
- Blocked: traffic_overview, active_users, returning_users, guest_to_user_handoff, creator_count, creator_profile_views, drop_opens, unlocks, unwraps, wallet_opens, package_selections, checkout_starts, gumdrop_balances, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, chat_blocks_errors, notification_prompts, notification_tokens, notification_intents, session_restores, media_uploads_access_blocks, journey_funnel, realtime_health
- External required: payment_approvals, payment_failures, cost_risk

## Top Hydration Failures

- Traffic overview: source_missing; next=Repair src/app/api/admin/analytics/historical/route.ts so Traffic overview can hydrate.
- Active users: source_missing; next=Repair src/app/api/admin/analytics/realtime/route.ts so Active users can hydrate.
- Returning users: source_missing; next=Repair src/app/api/behavior so Returning users can hydrate.
- Guest-to-user handoff: source_missing; next=Repair src/lib/analytics/identity-handoff-engine.ts so Guest-to-user handoff can hydrate.
- Creator count: source_missing; next=Repair src/lib/admin/user-management-contract.ts so Creator count can hydrate.
- Creator profile views: source_missing; next=Repair src/app/api/behavior so Creator profile views can hydrate.
- Drop opens: source_missing; next=Repair src/app/api/behavior so Drop opens can hydrate.
- Unlocks: source_missing; next=Repair src/app/api/drops/unlock/route.ts so Unlocks can hydrate.
- Unwraps: source_missing; next=Repair src/app/api/behavior so Unwraps can hydrate.
- Wallet opens: source_missing; next=Repair src/app/api/wallet so Wallet opens can hydrate.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=9; collecting=2; sourceMissing=27; materializerMissing=0; bridgeMissing=0; externalRequired=3; broken=0

## Validation Failures

- none

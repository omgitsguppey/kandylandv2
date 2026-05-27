# Analytics Panel Hydration

Generated: 2026-05-27T01:56:07.083Z
Current head: 8f23958018f38ac40561b5c1c76baaaf92f5673e

## Summary

- Total panels: 41
- Hydrated: 0
- Collecting: 17
- Stale: 0
- Source missing: 21
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

- Contributes live evidence: none
- Collecting with source: new_users_signups, returning_users, creator_count, creator_follows, drops_live, watch_time, completion_rate, chat_blocks_errors, notification_tokens, notification_intents, auth_attempts_failures, media_uploads_access_blocks, search_queries, search_zero_results_clicks, support_account_actions, error_rate_4xx, debug_backlog
- Blocked: traffic_overview, active_users, guest_to_user_handoff, creator_profile_views, drop_opens, unlocks, unwraps, wallet_opens, package_selections, checkout_starts, gumdrop_balances, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, notification_prompts, session_restores, journey_funnel, realtime_health
- External required: payment_approvals, payment_failures, cost_risk

## Top Hydration Failures

- Traffic overview: source_missing; next=Repair src/app/api/admin/analytics/historical/route.ts so Traffic overview can hydrate.
- Active users: source_missing; next=Repair src/app/api/admin/analytics/realtime/route.ts so Active users can hydrate.
- Guest-to-user handoff: source_missing; next=Repair src/lib/analytics/identity-handoff-engine.ts so Guest-to-user handoff can hydrate.
- Creator profile views: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Creator profile views can hydrate.
- Drop opens: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Drop opens can hydrate.
- Unlocks: source_missing; next=Repair src/app/api/drops/unlock/route.ts so Unlocks can hydrate.
- Unwraps: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Unwraps can hydrate.
- Wallet opens: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Wallet opens can hydrate.
- Package selections: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Package selections can hydrate.
- Checkout starts: source_missing; next=Repair src/lib/analytics/person-metrics-contract.ts so Checkout starts can hydrate.

## Panels

- traffic_overview: source_missing; display=show_not_connected; freshness=unknown; reason=Traffic overview has no safe recent source connected for admin analytics historical snapshot totals.
- active_users: source_missing; display=show_not_connected; freshness=unknown; reason=Active users has no safe recent source connected for snapshot-first realtime active users.
- new_users_signups: collecting; display=show_collecting; freshness=unknown; reason=New users/signups has a connected source and is collecting; do not display zero until a bounded source proves zero.
- returning_users: collecting; display=show_collecting; freshness=unknown; reason=Returning users has a connected source and is collecting; do not display zero until a bounded source proves zero.
- guest_to_user_handoff: source_missing; display=show_not_connected; freshness=unknown; reason=Guest-to-user handoff has no safe recent source connected for identity handoff and global-user dedupe summaries.
- creator_count: collecting; display=show_collecting; freshness=unknown; reason=Creator count has a connected source and is collecting; do not display zero until a bounded source proves zero.
- creator_profile_views: source_missing; display=show_not_connected; freshness=unknown; reason=Creator profile views has no safe recent source connected for creator profile event facts.
- creator_follows: collecting; display=show_collecting; freshness=unknown; reason=Creator follows has a connected source and is collecting; do not display zero until a bounded source proves zero.
- drops_live: collecting; display=show_collecting; freshness=unknown; reason=Drops live has a connected source and is collecting; do not display zero until a bounded source proves zero.
- drop_opens: source_missing; display=show_not_connected; freshness=unknown; reason=Drop opens has no safe recent source connected for drop open event facts.
- unlocks: source_missing; display=show_not_connected; freshness=unknown; reason=Unlocks has no safe recent source connected for server unlock entitlement facts.
- unwraps: source_missing; display=show_not_connected; freshness=unknown; reason=Unwraps has no safe recent source connected for payload reveal or consumed drop facts.
- watch_time: collecting; display=show_collecting; freshness=unknown; reason=Watch time has a connected source and is collecting; do not display zero until a bounded source proves zero.
- completion_rate: collecting; display=show_collecting; freshness=unknown; reason=Completion rate has a connected source and is collecting; do not display zero until a bounded source proves zero.
- wallet_opens: source_missing; display=show_not_connected; freshness=unknown; reason=Wallet opens has no safe recent source connected for wallet UI event facts.
- package_selections: source_missing; display=show_not_connected; freshness=unknown; reason=Package selections has no safe recent source connected for wallet package selector event facts.
- checkout_starts: source_missing; display=show_not_connected; freshness=unknown; reason=Checkout starts has no safe recent source connected for checkout intent telemetry.
- payment_approvals: external_required; display=show_external_required; freshness=unknown; reason=Payment approvals requires external/provider or billing evidence and cannot be proven by screenshots.
- payment_failures: external_required; display=show_external_required; freshness=unknown; reason=Payment failures requires external/provider or billing evidence and cannot be proven by screenshots.
- gumdrop_balances: source_missing; display=show_not_connected; freshness=unknown; reason=GumDrop balances has no safe recent source connected for source-of-funds wallet ledger summary.
- reward_gd_grants: source_missing; display=show_not_connected; freshness=unknown; reason=Reward GD grants has no safe recent source connected for daily task reward ledger.
- task_starts: source_missing; display=show_not_connected; freshness=unknown; reason=Task starts has no safe recent source connected for daily task lifecycle event facts.
- task_completions: source_missing; display=show_not_connected; freshness=unknown; reason=Task completions has no safe recent source connected for daily task completion facts.
- task_rewards: source_missing; display=show_not_connected; freshness=unknown; reason=Task rewards has no safe recent source connected for server reward truth and reward receipt events.
- chat_opens: source_missing; display=show_not_connected; freshness=unknown; reason=Chat opens has no safe recent source connected for chat open/thread event facts.
- chat_messages: source_missing; display=show_not_connected; freshness=unknown; reason=Chat messages has no safe recent source connected for redacted chat message event facts.
- chat_blocks_errors: collecting; display=show_collecting; freshness=unknown; reason=Chat blocks/errors has a connected source and is collecting; do not display zero until a bounded source proves zero.
- notification_prompts: source_missing; display=show_not_connected; freshness=unknown; reason=Notification prompts has no safe recent source connected for notification permission lifecycle summaries.
- notification_tokens: collecting; display=show_collecting; freshness=unknown; reason=Notification tokens has a connected source and is collecting; do not display zero until a bounded source proves zero.
- notification_intents: collecting; display=show_collecting; freshness=unknown; reason=Notification intents has a connected source and is collecting; do not display zero until a bounded source proves zero.
- auth_attempts_failures: collecting; display=show_collecting; freshness=unknown; reason=Auth attempts/failures has a connected source and is collecting; do not display zero until a bounded source proves zero.
- session_restores: source_missing; display=show_not_connected; freshness=unknown; reason=Session restores has no safe recent source connected for auth persistence/session restore summaries.
- media_uploads_access_blocks: collecting; display=show_collecting; freshness=unknown; reason=Media uploads/access blocks has a connected source and is collecting; do not display zero until a bounded source proves zero.
- search_queries: collecting; display=show_collecting; freshness=unknown; reason=Search queries has a connected source and is collecting; do not display zero until a bounded source proves zero.
- search_zero_results_clicks: collecting; display=show_collecting; freshness=unknown; reason=Search zero results/clicks has a connected source and is collecting; do not display zero until a bounded source proves zero.
- support_account_actions: collecting; display=show_collecting; freshness=unknown; reason=Support/report issue/delete/data export has a connected source and is collecting; do not display zero until a bounded source proves zero.
- error_rate_4xx: collecting; display=show_collecting; freshness=unknown; reason=Error rate/4xx has a connected source and is collecting; do not display zero until a bounded source proves zero.
- cost_risk: external_required; display=show_external_required; freshness=unknown; reason=Cost risk requires external/provider or billing evidence and cannot be proven by screenshots.
- journey_funnel: source_missing; display=show_not_connected; freshness=unknown; reason=Journey funnel has no safe recent source connected for user journey behavioral intelligence summary.
- realtime_health: source_missing; display=show_not_connected; freshness=unknown; reason=Realtime health has no safe recent source connected for snapshot-first realtime route and debug evidence.
- debug_backlog: collecting; display=show_collecting; freshness=unknown; reason=Debug backlog has a connected source and is collecting; do not display zero until a bounded source proves zero.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=0; collecting=17; sourceMissing=21; materializerMissing=0; bridgeMissing=0; externalRequired=3; broken=0

## Validation Failures

- none

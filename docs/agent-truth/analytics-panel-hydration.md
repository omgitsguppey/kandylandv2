# Analytics Panel Hydration

Generated: 2026-06-18T03:44:04.552Z
Current head: f7a59c4b735f9c81a849e3fd56ef82e8b0895ef5

## Summary

- Total panels: 41
- Hydrated: 10
- Collecting: 0
- Source-ready waiting for activity: 3
- Not observed but expected: 22
- Stale: 0
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 2
- Admin truth source required: 0
- Provider gated: 2
- External required: 4
- Permission blocked: 0
- Broken: 0

## Contract

- Missing panel data is collecting, source-missing, materializer-missing, bridge-missing, external-required, permission-blocked, or broken. It is not zero.
- A panel may display zero only when a bounded source loaded and proved zero.
- Hydrated panel evidence can reduce formal evidence scope; stale, collecting, source-only, runtime-required, admin-truth-required, or external-required panels cannot clear formal provider/runtime/billing gates.
- The report uses local source and generated artifacts only. It performs no production reads or provider calls.

## Live Evidence

- Contributes live evidence: new_users_signups, creator_follows, drops_live, unlocks, watch_time, completion_rate, auth_attempts_failures, search_queries, search_zero_results_clicks, support_account_actions
- Collecting with source: unwraps, package_selections, checkout_starts
- Blocked: traffic_overview, active_users, returning_users, guest_to_user_handoff, creator_count, creator_profile_views, drop_opens, wallet_opens, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, chat_blocks_errors, notification_prompts, notification_tokens, notification_intents, session_restores, media_uploads_access_blocks, journey_funnel, realtime_health
- Runtime evidence required: error_rate_4xx, debug_backlog
- Admin truth source required: none
- External required: payment_approvals, payment_failures, gumdrop_balances, cost_risk

## Top Hydration Failures

- Traffic overview: not_observed_but_expected; next=Verify analytics_event_facts with bounded recent summaries before treating Traffic overview as hydrated or zero.
- Active users: not_observed_but_expected; next=Verify analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time with bounded recent summaries before treating Active users as hydrated or zero.
- Returning users: not_observed_but_expected; next=Verify analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time with bounded recent summaries before treating Returning users as hydrated or zero.
- Guest-to-user handoff: not_observed_but_expected; next=Verify analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time with bounded recent summaries before treating Guest-to-user handoff as hydrated or zero.
- Creator count: not_observed_but_expected; next=Verify settings surfaces and settings route telemetry with bounded recent summaries before treating Creator count as hydrated or zero.
- Creator profile views: not_observed_but_expected; next=Verify analytics_event_facts and creator relationship funnel telemetry with bounded recent summaries before treating Creator profile views as hydrated or zero.
- Drop opens: not_observed_but_expected; next=Verify analytics_event_facts with bounded recent summaries before treating Drop opens as hydrated or zero.
- Wallet opens: not_observed_but_expected; next=Verify wallet UI telemetry with bounded recent summaries before treating Wallet opens as hydrated or zero.
- Payment approvals: provider_gated; next=Attach redacted external evidence for server purchase verification facts; do not use screenshots as backend proof.
- Payment failures: provider_gated; next=Attach redacted external evidence for payment failure telemetry; do not use screenshots as backend proof.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=10; collecting=0; sourceReady=3; notObservedButExpected=22; sourceMissing=0; materializerMissing=0; bridgeMissing=0; runtimeEvidenceRequired=2; adminTruthSourceRequired=0; providerGated=2; externalRequired=4; broken=0

## Validation Failures

- none

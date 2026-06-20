# Analytics Panel Hydration

Generated: 2026-06-20T18:18:33.571Z
Current head: 57abdf608ff4935e4647996841aa5e976c8b88e8

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
- Collecting with source: traffic_overview, active_users, returning_users, guest_to_user_handoff, creator_count, creator_profile_views, drop_opens, unwraps, wallet_opens, package_selections, checkout_starts, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, chat_blocks_errors, notification_prompts, notification_tokens, notification_intents, session_restores, media_uploads_access_blocks, journey_funnel, realtime_health
- Blocked: none
- Runtime evidence required: error_rate_4xx, debug_backlog
- Admin truth source required: none
- External required: payment_approvals, payment_failures, gumdrop_balances, cost_risk

## Top Hydration Failures

- Payment approvals: provider_gated; next=Attach redacted external evidence for server purchase verification facts; do not use browser reproduction as backend proof.
- Payment failures: provider_gated; next=Attach redacted external evidence for payment failure telemetry; do not use browser reproduction as backend proof.
- GumDrop balances: protected_payment_required; next=Attach redacted external evidence for wallet source ledger plus protected payment/provider proof; do not use browser reproduction as backend proof.
- Error rate/4xx: runtime_evidence_required; next=Attach bounded route/debug runtime evidence for admin debug summary; do not use browser reproduction as backend proof.
- Cost risk: external_required; next=Attach redacted external evidence for cost guard summaries plus external billing review; do not use browser reproduction as backend proof.
- Debug backlog: runtime_evidence_required; next=Attach bounded route/debug runtime evidence for debug backlog summary; do not use browser reproduction as backend proof.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=10; collecting=0; sourceReady=3; notObservedButExpected=22; sourceMissing=0; materializerMissing=0; bridgeMissing=0; runtimeEvidenceRequired=2; adminTruthSourceRequired=0; providerGated=2; externalRequired=4; broken=0

## Validation Failures

- none

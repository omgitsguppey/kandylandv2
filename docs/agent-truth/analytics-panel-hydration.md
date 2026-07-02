# Analytics Panel Hydration

Generated: 2026-07-02T15:09:07.296Z
Current head: 25e5a1c71fad2d2f974c4de44c5079a4a7cce1de

## Summary

- Total panels: 41
- Hydrated: 0
- Collecting: 0
- Source-ready waiting for activity: 9
- Not observed but expected: 25
- Stale: 0
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 2
- Admin truth source required: 1
- Provider gated: 2
- External required: 4
- Permission blocked: 0
- Broken: 0

## Contract

- Missing panel data is collecting, source-missing, materializer-missing, bridge-missing, external-required, permission-blocked, or broken. It is not zero.
- A panel may display zero only when a bounded source loaded and proved zero.
- Hydrated panel evidence can reduce source-evidence scope; stale, collecting, source-only, runtime-required, admin-truth-required, or external-required panels cannot clear provider/runtime/billing source lanes.
- The report uses local source and generated artifacts only. It performs no production reads or provider calls.

## Live Evidence

- Contributes live evidence: none
- Collecting with source: traffic_overview, active_users, new_users_signups, returning_users, guest_to_user_handoff, creator_count, creator_profile_views, creator_follows, drop_opens, unlocks, unwraps, watch_time, completion_rate, wallet_opens, package_selections, checkout_starts, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, chat_blocks_errors, notification_prompts, notification_tokens, notification_intents, auth_attempts_failures, session_restores, media_uploads_access_blocks, search_queries, search_zero_results_clicks, support_account_actions, journey_funnel, realtime_health
- Blocked: none
- Runtime evidence required: error_rate_4xx, debug_backlog
- Admin truth source required: drops_live
- External required: payment_approvals, payment_failures, gumdrop_balances, cost_risk

## Top Hydration Failures

- Drops live: admin_truth_source_required; next=Produce a redacted admin source activity sample for creator drop manager telemetry and canonical creator drop route facts.
- Payment approvals: provider_gated; next=Produce redacted source activity or external evidence for server purchase verification facts.
- Payment failures: provider_gated; next=Produce redacted source activity or external evidence for payment failure telemetry.
- GumDrop balances: protected_payment_required; next=Produce redacted source activity or external evidence for wallet source ledger plus protected payment/provider evidence.
- Error rate/4xx: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for admin debug summary.
- Cost risk: external_required; next=Produce redacted source activity or external evidence for cost guard summaries plus external billing review.
- Debug backlog: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for debug backlog summary.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=0; collecting=0; sourceReady=9; notObservedButExpected=25; sourceMissing=0; materializerMissing=0; bridgeMissing=0; runtimeEvidenceRequired=2; adminTruthSourceRequired=1; providerGated=2; externalRequired=4; broken=0

## Validation Failures

- none

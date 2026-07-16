# Analytics Panel Hydration

Generated: 2026-07-16T04:28:11.433Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214

## Summary

- Total panels: 41
- Hydrated: 0
- Collecting: 0
- Source-ready waiting for activity: 0
- Not observed but expected: 0
- Stale: 0
- Source missing: 0
- Materializer missing: 0
- Bridge missing: 0
- Runtime evidence required: 37
- Admin truth source required: 0
- Provider gated: 2
- Protected payment required: 1
- External required: 1
- Permission blocked: 0
- Hidden by role: 0
- Broken: 0

## Contract

- Missing panel data is collecting, source-missing, materializer-missing, bridge-missing, external-required, permission-blocked, or broken. It is not zero.
- A panel may display zero only when a bounded source loaded and proved zero.
- Hydrated panel evidence can reduce source-evidence scope; stale, collecting, source-only, runtime-required, admin-truth-required, or external-required panels cannot clear provider/runtime/billing source lanes.
- The report uses local source and generated artifacts only. It performs no production reads or provider calls.

## Live Evidence

- Contributes live evidence: none
- Collecting with source: none
- Blocked: none
- Runtime evidence required: traffic_overview, active_users, new_users_signups, returning_users, guest_to_user_handoff, creator_count, creator_profile_views, creator_follows, drops_live, drop_opens, unlocks, unwraps, watch_time, completion_rate, wallet_opens, package_selections, checkout_starts, reward_gd_grants, task_starts, task_completions, task_rewards, chat_opens, chat_messages, chat_blocks_errors, notification_prompts, notification_tokens, notification_intents, auth_attempts_failures, session_restores, media_uploads_access_blocks, search_queries, search_zero_results_clicks, support_account_actions, error_rate_4xx, journey_funnel, realtime_health, debug_backlog
- Admin truth source required: none
- External required: payment_approvals, payment_failures, gumdrop_balances, cost_risk

## Top Hydration Failures

- Traffic overview: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_event_facts.
- Active users: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time.
- New users/signups: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for first-party auth runtime telemetry event envelopes; no raw password, email, or Firebase token fields.
- Returning users: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time.
- Guest-to-user handoff: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time.
- Creator count: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for settings surfaces and settings route telemetry.
- Creator profile views: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_event_facts and creator relationship funnel telemetry.
- Creator follows: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for creator relationship facts and relationship route telemetry.
- Drops live: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for creator drop manager telemetry and canonical creator drop route facts.
- Drop opens: runtime_evidence_required; next=Produce bounded route/debug runtime evidence for analytics_event_facts.

## Debug Lane

- Analytics panel hydration: total=41; hydrated=0; collecting=0; sourceReady=0; notObservedButExpected=0; sourceMissing=0; materializerMissing=0; bridgeMissing=0; runtimeEvidenceRequired=37; adminTruthSourceRequired=0; providerGated=2; protectedPaymentRequired=1; externalRequired=1; permissionBlocked=0; hiddenByRole=0; broken=0

## Validation Failures

- none

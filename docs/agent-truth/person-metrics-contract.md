# Person Metrics Contract

Generated: 2026-06-16T16:52:25.602Z
Status: pass
Current head: 5dc1121d0e42e739914ac5ca006a7f2b6f63e6a3

## Contract

- Per-person metrics are display/materialization contracts only; they do not read production data or mutate legacy records.
- Each metric defines global, guest, signed-in, and linked-person aggregation with confidence and consent eligibility.
- Linked guest-to-user activity uses one person key so guest and user histories do not double count.
- Minimal analytics permits bounded product metrics only. Full behavioral consent is required for runtime watch-session behavior metrics.
- Legacy unknown evidence remains weak/unknown and cannot become exact current person truth.
- Checkout starts and successful payment approvals are separate metrics. Provider payloads are stripped before person metric materialization.
- Unwraps require server unlock/entitlement source truth; analytics events are projection only.

## Metrics

- sessions: analytics_sessions with active/idle/hidden split; page-open duration alone is not active session time; consent=minimal_product; confidence=weak; materializer=person_metrics.sessions; owner=analytics
- visits: analytics_event_facts; consent=minimal_product; confidence=weak; materializer=person_metrics.visits; owner=analytics
- active_days: daily person rollup; consent=minimal_product; confidence=weak; materializer=person_metrics.active_days; owner=analytics
- page_views: analytics_event_facts; consent=minimal_product; confidence=weak; materializer=person_metrics.page_views; owner=analytics
- creator_profile_views: analytics_event_facts and creator relationship funnel telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.creator_profile_views; owner=creator
- search_discovery_actions: redacted search/discovery telemetry with query length/hash/category only; consent=minimal_product; confidence=weak; materializer=person_metrics.search_discovery_actions; owner=analytics
- drop_opens: analytics_event_facts; consent=minimal_product; confidence=linked; materializer=person_metrics.drop_opens; owner=analytics
- drop_unlocks: server unlock entitlement facts; payload reveal is tracked separately as unwrap; consent=necessary_product; confidence=linked; materializer=person_metrics.drop_unlocks; owner=analytics
- unwraps: server unlock entitlement facts with payload reveal or consumed drop facts after entitlement access; consent=necessary_product; confidence=linked; materializer=person_metrics.unwraps; owner=analytics
- wallet_opens: wallet UI telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.wallet_opens; owner=wallet
- wallet_closes: wallet UI telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.wallet_closes; owner=wallet
- package_selections: wallet UI telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.package_selections; owner=wallet
- checkout_starts: checkout intent telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.checkout_starts; owner=commerce
- payment_approvals: server purchase verification facts; consent=necessary_product; confidence=linked; materializer=person_metrics.payment_approvals; owner=commerce
- payment_cancels: checkout cancellation telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.payment_cancels; owner=commerce
- payment_failures: payment failure telemetry; consent=necessary_product; confidence=linked; materializer=person_metrics.payment_failures; owner=commerce
- fan_pass_views: creator subscription telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.fan_pass_views; owner=creator
- fan_pass_purchases: creator subscription transaction facts; consent=necessary_product; confidence=linked; materializer=person_metrics.fan_pass_purchases; owner=creator
- broadcasts_viewed: broadcast telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.broadcasts_viewed; owner=creator
- broadcasts_clicked: broadcast and notification action telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.broadcasts_clicked; owner=notifications
- follows: creator relationship facts and relationship route telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.follows; owner=creator
- chat_actions: chat telemetry event facts, private media access decisions, and guarded creator message thread records; raw transcript content and private asset URLs are drilldown-only; consent=minimal_product; confidence=weak; materializer=person_metrics.chat_actions; owner=support
- daily_task_views: daily task lifecycle telemetry; surface/card views are not task duration; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_views; owner=retention
- daily_task_guidance_interactions: task guidance UI telemetry; guidance completion is supporting evidence and does not grant rewards by itself; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_guidance_interactions; owner=retention
- daily_task_starts: daily task lifecycle telemetry emitted only after active user start/attempt; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_starts; owner=retention
- daily_task_completions: canonical task completion events; client completion telemetry is supporting only; consent=necessary_product; confidence=weak; materializer=person_metrics.daily_task_completions; owner=retention
- daily_task_failures: daily task lifecycle failure telemetry with explicit failure reason; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_failures; owner=retention
- daily_task_rewards_granted: server reward truth and reward receipt events; rewardSource remains reward_gd_only; consent=necessary_product; confidence=weak; materializer=person_metrics.daily_task_rewards_granted; owner=retention
- daily_task_average_duration: active task duration only; passive page-open time is unavailable, not zero; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_average_duration; owner=retention
- daily_task_abandonments: daily task lifecycle abandon classification with explicit threshold; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_abandonments; owner=retention
- daily_task_reset_locked_views: daily task lifecycle telemetry for locked/reset views; consent=minimal_product; confidence=weak; materializer=person_metrics.daily_task_reset_locked_views; owner=retention
- notification_interactions: notification runtime and inbox telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.notification_interactions; owner=notifications
- runtime_watch_sessions: runtime media/drop watch sessions only; page duration is not a current-person metric; consent=behavioral; confidence=linked; materializer=person_metrics.runtime_watch_sessions; owner=viewer-runtime
- settings_actions: settings surfaces and settings route telemetry; consent=minimal_product; confidence=weak; materializer=person_metrics.settings_actions; owner=settings
- support_account_actions: support routes, support inbox telemetry, and account safety telemetry; consent=minimal_product; confidence=weak; materializer=person_metrics.support_account_actions; owner=support
- creator_drop_manager_actions: creator drop manager telemetry and canonical creator drop route facts; consent=minimal_product; confidence=weak; materializer=person_metrics.creator_drop_manager_actions; owner=creator
- auth_runtime_events: first-party auth runtime telemetry event envelopes; no raw password, email, or Firebase token fields; consent=necessary_product; confidence=weak; materializer=person_metrics.auth_runtime_events; owner=auth

## Checks

- pass: contractValidationPasses
- pass: allRequiredMetricIdsPresent
- pass: everyMetricHasGlobalAndUserLevels
- pass: everyMetricHasConsentConfidenceLegacyAndDebug
- pass: checkoutStartSeparateFromApproval
- pass: paymentApprovalUsesServerTruth
- pass: unwrapMetricHasServerSource
- pass: walletOpenClosePresent
- pass: linkedGuestUserDoesNotDoubleCount
- pass: minimalAnalyticsBlocksBehavioralWatch
- pass: legacyUnknownNeverExactPerson
- pass: providerPayloadsStripped
- pass: engineHasNoProductionReadOrMutation
- pass: packageScriptPresent
- pass: unitTestCoversPaymentAndConsent
- pass: chatNavPaymentGumdropRuntimeUntouched
- pass: sourceUsesIdentityAndEnvelopeContracts

## Changed Files

- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- docs/agent-truth/event-translation-bridge.md

## Validation Failures

- none

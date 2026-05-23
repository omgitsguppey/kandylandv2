# Person Metrics Contract

Generated: 2026-05-23T05:11:03.104Z
Status: pass
Current head: fa929bd2cbbf640bd1f2f17cd15940306ffdd3e3

## Contract

- Per-person metrics are display/materialization contracts only; they do not read production data or mutate legacy records.
- Each metric defines global, guest, signed-in, and linked-person aggregation with confidence and consent eligibility.
- Linked guest-to-user activity uses one person key so guest and user histories do not double count.
- Minimal analytics permits bounded product metrics only. Full behavioral consent is required for runtime watch-session behavior metrics.
- Legacy unknown evidence remains weak/unknown and cannot become exact current person truth.
- Checkout starts and successful payment approvals are separate metrics. Provider payloads are stripped before person metric materialization.
- Unwraps require server unlock/entitlement source truth; analytics events are projection only.

## Metrics

- sessions: analytics_sessions; consent=minimal_product; confidence=weak; materializer=person_metrics.sessions; owner=analytics
- visits: analytics_event_facts; consent=minimal_product; confidence=weak; materializer=person_metrics.visits; owner=analytics
- active_days: daily person rollup; consent=minimal_product; confidence=weak; materializer=person_metrics.active_days; owner=analytics
- page_views: analytics_event_facts; consent=minimal_product; confidence=weak; materializer=person_metrics.page_views; owner=analytics
- creator_profile_views: analytics_event_facts; consent=minimal_product; confidence=linked; materializer=person_metrics.creator_profile_views; owner=creator
- drop_opens: analytics_event_facts; consent=minimal_product; confidence=linked; materializer=person_metrics.drop_opens; owner=analytics
- unwraps: server unlock entitlement facts; analytics events are projection only; consent=necessary_product; confidence=linked; materializer=person_metrics.unwraps; owner=analytics
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
- follows: creator relationship facts; consent=minimal_product; confidence=linked; materializer=person_metrics.follows; owner=creator
- notification_interactions: notification runtime and inbox telemetry; consent=minimal_product; confidence=linked; materializer=person_metrics.notification_interactions; owner=notifications
- runtime_watch_sessions: runtime media watch sessions only; page duration is not a current-person metric; consent=behavioral; confidence=linked; materializer=person_metrics.runtime_watch_sessions; owner=viewer-runtime
- settings_actions: settings surfaces and settings route telemetry; consent=minimal_product; confidence=weak; materializer=person_metrics.settings_actions; owner=settings
- support_account_actions: support routes, support inbox telemetry, and account safety telemetry; consent=minimal_product; confidence=weak; materializer=person_metrics.support_account_actions; owner=support

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

- CHANGELOG.md
- agent/state/person-metrics-contract.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/person-metrics-contract.md
- docs/agent-truth/person-metrics-hydration.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/score-public-beta-readiness.ts
- scripts/agent/validate-person-metrics-hydration.ts
- scripts/agent/validate-public-beta-score.ts
- src/app/api/admin/debug/route.ts
- src/lib/analytics/person-metrics-contract.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-debug/summary.ts
- tests/unit/debug-tracking-simplification.spec.ts
- tests/unit/person-metrics-contract.spec.ts
- tests/unit/person-metrics-hydration.spec.ts

## Validation Failures

- none

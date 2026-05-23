# Person Metrics Contract

Generated: 2026-05-23T06:57:43.051Z
Status: pass
Current head: a817e6e36f47ff3ecc71cd643737f18dc70558a3

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
- creator_drop_manager_actions: creator drop manager telemetry and canonical creator drop route facts; consent=minimal_product; confidence=weak; materializer=person_metrics.creator_drop_manager_actions; owner=creator

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
- agent/state/activity-verification-engine.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/event-envelope-normalization.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/final-behavioral-privacy-telemetry-lock.generated.json
- agent/state/final-testing-tracking-telemetry-lock.generated.json
- agent/state/identity-handoff-spine.generated.json
- agent/state/march-first-event-recovery.generated.json
- agent/state/new-additions-score-coverage.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-contract.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/telemetry-trigger-test-matrix.generated.json
- agent/state/user-management-refactor.generated.json
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/event-envelope-normalization.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/final-behavioral-privacy-telemetry-lock.md
- docs/agent-truth/final-testing-tracking-telemetry-lock.md
- docs/agent-truth/identity-handoff-spine.md
- docs/agent-truth/march-first-event-recovery.md
- docs/agent-truth/new-additions-score-coverage.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-contract.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/telemetry-trigger-test-matrix.md
- docs/agent-truth/user-management-refactor.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-event-translation-bridge.ts
- scripts/agent/validate-final-testing-tracking-telemetry-lock.ts
- scripts/agent/validate-new-additions-score-coverage.ts
- src/lib/admin/user-management-contract.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/testing/telemetry-trigger-test-matrix.ts
- tests/unit/final-testing-tracking-telemetry-lock.spec.ts

## Validation Failures

- none

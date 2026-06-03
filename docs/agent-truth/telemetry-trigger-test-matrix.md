# Telemetry Trigger Test Matrix

Generated: 2026-06-03T04:30:48.009Z
Status: fail
Current head: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Contract

- Important triggers must have deterministic source-only tests from action/event producer through event envelope, feature activity, person metric hydration, debug lane, and score input.
- These tests do not read production, mutate live or legacy data, fake runtime/provider proof, or clear formal provider/runtime/admin gates.
- Future real activity can remain collecting, but deterministic source paths must not say waiting-on-activity when the bridge can be tested locally.

## Debug Lane

- Total triggers: 24
- Covered triggers: 24
- Missing trigger tests: 0
- UI-only tests: 0
- Waiting-on-activity deterministic gaps: 0

## Family Coverage

- wallet_modal_open: covered=true; missing=none
- wallet_modal_close: covered=true; missing=none
- wallet_package_select: covered=true; missing=none
- wallet_checkout_start: covered=true; missing=none
- wallet_payment_approval: covered=true; missing=none
- wallet_payment_cancel: covered=true; missing=none
- wallet_payment_fail: covered=true; missing=none
- drop_open: covered=true; missing=none
- drop_unwrap: covered=true; missing=none
- creator_profile_view: covered=true; missing=none
- signup_login_identity_handoff: covered=true; missing=none
- settings_toggle: covered=true; missing=none
- settings_action: covered=true; missing=none
- consent_cookie_choice: covered=true; missing=none
- notification_prompt: covered=true; missing=none
- support_action: covered=true; missing=none
- account_delete_action: covered=true; missing=none
- data_export_action: covered=true; missing=none
- creator_settings_update: covered=true; missing=none
- creator_drop_manager_action: covered=true; missing=none
- broadcasts: covered=true; missing=none
- fan_pass: covered=true; missing=none
- runtime_watch: covered=true; missing=none
- session_bounce: covered=true; missing=none

## Trigger Rows

- wallet_open: wallet modal -> wallet_opened -> wallet_opens -> Testing coverage -> runtimeHealth; status=covered
- wallet_close: wallet modal -> wallet_closed_incomplete -> wallet_closes -> Testing coverage -> evidenceCompleteness; status=covered
- wallet_package_select: wallet package card -> purchase_package_selected -> package_selections -> Testing coverage -> runtimeHealth; status=covered
- wallet_checkout_start: wallet checkout button -> begin_checkout -> checkout_starts -> Testing coverage -> runtimeHealth; status=covered
- wallet_payment_approval: server purchase verification route -> server_purchase_verified -> payment_approvals -> Testing coverage -> runtimeHealth; status=covered
- wallet_payment_cancel: wallet modal close/cancel -> wallet_closed_incomplete -> payment_cancels -> Testing coverage -> evidenceCompleteness; status=covered
- wallet_payment_fail: wallet payment failure handler -> gumdrops_purchase_failed -> payment_failures -> Testing coverage -> runtimeHealth; status=covered
- drop_open: drop card or locked preview -> drop_preview_opened -> drop_opens -> Testing coverage -> sourceHealth; status=covered
- drop_unwrap: server unlock route -> drop_unwrapped -> unwraps -> Testing coverage -> runtimeHealth; status=covered
- creator_profile_view: creator profile page -> creator_profile_viewed -> creator_profile_views -> Testing coverage -> sourceHealth; status=covered
- identity_handoff_login: auth modal/session handoff -> auth_session_established -> sessions -> Testing coverage -> runtimeHealth; status=covered
- settings_toggle: settings toggle -> setting_toggle_changed -> settings_actions -> Testing coverage -> evidenceCompleteness; status=covered
- settings_action: settings action -> setting_action_clicked -> settings_actions -> Testing coverage -> evidenceCompleteness; status=covered
- consent_cookie_choice: cookie banner/privacy settings -> cookie_consent_updated -> settings_actions -> Testing coverage -> regressionRisk; status=covered
- notification_prompt: notification prompt -> notification_prompt_viewed -> notification_interactions -> Testing coverage -> runtimeHealth; status=covered
- support_ticket: support form -> support_ticket_created -> support_account_actions -> Testing coverage -> evidenceCompleteness; status=covered
- account_delete: account delete flow -> account_delete_clicked -> support_account_actions -> Testing coverage -> regressionRisk; status=covered
- data_export: account data export -> data_export_requested -> support_account_actions -> Testing coverage -> evidenceCompleteness; status=covered
- creator_settings_update: creator settings route -> creator_settings_updated -> settings_actions -> Testing coverage -> sourceHealth; status=covered
- creator_drop_manager_action: creator drop manager -> creator_drop_submitted -> creator_drop_manager_actions -> Testing coverage -> sourceHealth; status=covered
- broadcast_view: creator broadcast detail -> creator_broadcast_detail_viewed -> broadcasts_viewed -> Testing coverage -> evidenceCompleteness; status=covered
- fan_pass_view: Fan Pass panel -> creator_fan_pass_viewed -> fan_pass_views -> Testing coverage -> runtimeHealth; status=covered
- runtime_watch_session: viewer runtime -> drop_watch_progress -> runtime_watch_sessions -> Testing coverage -> runtimeHealth; status=covered
- session_bounce_closeout: DeepTracker -> session_closed -> sessions -> Testing coverage -> evidenceCompleteness; status=covered

## Score Impact

- sourceHealth: before=74; after=74; At least one trigger lacks deterministic coverage through envelope, feature activity, person metric, debug, or score input.
- runtimeHealth: before=74; after=74; At least one trigger lacks deterministic coverage through envelope, feature activity, person metric, debug, or score input.
- evidenceCompleteness: before=74; after=74; At least one trigger lacks deterministic coverage through envelope, feature activity, person metric, debug, or score input.
- freshness: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- costRisk: before=74; after=74; At least one trigger lacks deterministic coverage through envelope, feature activity, person metric, debug, or score input.
- regressionRisk: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.

## Old Test Logic Classification

- none

## Dirty Files

- agent/state/activity-verification-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/algorithmic-evidence-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-gap-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-lane-prep.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-freshness-language.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-realtime-cost-control.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-admin-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cloud-sql-gemini-cost-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-owner-review-source-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-dashboard-error-cost-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-status-metrics.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-experience-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-monetization-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-settings-control-plane.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-score-impact-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/existing-algorithm-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-cost-audit-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-pr-stale-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-telemetry-closure-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-marquee-truncated-titles.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-discovery-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-loading-hydration-stability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-ui-final-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/operator-revenue-smoke.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-final-integration-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-wiring-integrity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/post-economy-creator-flow-qa.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/regression-risk-high-blast-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-smoke-substitute-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-watch-time-v2.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-cost-readiness.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-refresh-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-connection-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-backed-runtime-confidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-truth-authority-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: current_generated_artifact_to_commit
- agent/state/user-creator-ui-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-facing-feature-connection-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-truth-source-sample.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-cost-runtime-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-panel-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-evidence-gap-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-evidence-lane-prep.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-freshness-language.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-functionality-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-gating-moderation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-realtime-cost-control.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-telemetry-admin-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cloud-sql-gemini-cost-guards.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-owner-review-source-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-exit-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-owner-review-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-status-metrics.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-monetization-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-settings-control-plane.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-score-impact-triage.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/evidence-capture-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/existing-algorithm-refinement.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/feature-registration-gate.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-cost-audit-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-parity-telemetry-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-pr-stale-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-telemetry-closure-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-marquee-truncated-titles.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-discovery-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/mobile-loading-hydration-stability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/mobile-ui-final-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/operator-revenue-smoke.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-final-integration-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-wiring-integrity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/post-economy-creator-flow-qa.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/regression-risk-high-blast-refresh.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-smoke-substitute-matrix.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-watch-time-v2.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-cost-readiness.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-reconciliation-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-refresh-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/settings-connection-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-backed-runtime-confidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-truth-authority-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/targeted-behavior-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-admin-debug-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-trigger-test-matrix.md: documentation_artifact_expected
- docs/agent-truth/user-management-refactor.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-hydration-consolidation.ts: unsafe_unknown
- scripts/agent/validate-analytics-panel-hydration.ts: unsafe_unknown
- scripts/agent/validate-creator-dashboard-error-cost-inventory.ts: unsafe_unknown
- scripts/agent/validate-creator-monetization-readiness-lock.ts: unsafe_unknown
- scripts/agent/validate-final-parity-telemetry-lock.ts: unsafe_unknown
- scripts/agent/validate-media-discovery-score-lock.ts: unsafe_unknown
- scripts/agent/validate-post-economy-creator-flow-qa.ts: unsafe_unknown
- scripts/agent/validate-public-beta-score.ts: validator_artifact_expected
- scripts/agent/validate-regression-risk-high-blast-refresh.ts: unsafe_unknown
- scripts/agent/validate-score-80-reconciliation-lock.ts: unsafe_unknown
- scripts/agent/validate-score-80-refresh-pass.ts: unsafe_unknown
- scripts/agent/validate-user-facing-feature-connection-audit.ts: unsafe_unknown
- src/lib/agent-score/algorithmic-evidence-policy.ts: unsafe_unknown
- src/lib/agent-score/core.ts: unsafe_unknown
- src/lib/agent-score/evidence-quality.ts: unsafe_unknown
- src/lib/agent-score/formal-evidence-bridge.ts: unsafe_unknown
- src/lib/agent-score/regression-risk-refresh-plan.ts: unsafe_unknown
- tests/unit/creator-dashboard-error-cost-inventory.spec.ts: unsafe_unknown
- tests/unit/creator-experiences-panel.spec.tsx: unsafe_unknown
- tests/unit/post-economy-creator-flow-qa.spec.ts: unsafe_unknown
- tests/unit/public-beta-score.spec.ts: unsafe_unknown
- tests/unit/purchase-modal.spec.tsx: unsafe_unknown

## Validation Failures

- wallet_open envelope event mismatch.
- wallet_open materializer lane mismatch.
- wallet_open person metric is not mapped.
- wallet_open hydration did not count wallet_opens.
- wallet_package_select envelope event mismatch.
- wallet_package_select materializer lane mismatch.
- wallet_package_select person metric is not mapped.
- wallet_package_select hydration did not count package_selections.
- wallet_checkout_start envelope event mismatch.
- wallet_checkout_start materializer lane mismatch.
- wallet_checkout_start person metric is not mapped.
- wallet_checkout_start hydration did not count checkout_starts.
- wallet_payment_approval hydration did not count payment_approvals.
- wallet_payment_fail envelope event mismatch.
- wallet_payment_fail materializer lane mismatch.
- wallet_payment_fail person metric is not mapped.
- wallet_payment_fail hydration did not count payment_failures.
- creator_profile_view envelope event mismatch.
- creator_profile_view materializer lane mismatch.
- creator_profile_view person metric is not mapped.
- creator_profile_view hydration did not count creator_profile_views.
- notification_prompt envelope event mismatch.
- notification_prompt materializer lane mismatch.
- notification_prompt person metric is not mapped.
- notification_prompt hydration did not count notification_interactions.
- support_ticket envelope event mismatch.
- support_ticket materializer lane mismatch.
- support_ticket person metric is not mapped.
- support_ticket hydration did not count support_account_actions.
- dirty files unclassified.
- wallet_open does not prove UI/action to event/metric/debug/score path.
- wallet_package_select does not prove UI/action to event/metric/debug/score path.
- wallet_checkout_start does not prove UI/action to event/metric/debug/score path.
- wallet_payment_approval does not prove UI/action to event/metric/debug/score path.
- wallet_payment_fail does not prove UI/action to event/metric/debug/score path.
- creator_profile_view does not prove UI/action to event/metric/debug/score path.
- notification_prompt does not prove UI/action to event/metric/debug/score path.
- support_ticket does not prove UI/action to event/metric/debug/score path.

# Telemetry Trigger Test Matrix

Generated: 2026-05-24T05:47:18.903Z
Status: pass
Current head: b0850954013ef36f732dec9ad90f64d5bcbfd65b

## Contract

- Important triggers must have deterministic source-only tests from action/event producer through event envelope, feature activity, person metric hydration, debug lane, and score input.
- These tests do not read production, mutate live or legacy data, fake runtime/provider proof, or clear formal provider/runtime/admin gates.
- Future real activity can remain collecting, but deterministic source paths must not say waiting-on-activity when the bridge can be tested locally.

## Debug Lane

- Total triggers: 23
- Covered triggers: 23
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
- notification_prompt: notification prompt -> notification_prompt_banner_viewed -> notification_interactions -> Testing coverage -> runtimeHealth; status=covered
- support_ticket: support form -> support_ticket_created -> support_account_actions -> Testing coverage -> evidenceCompleteness; status=covered
- account_delete: account delete flow -> account_delete_clicked -> support_account_actions -> Testing coverage -> regressionRisk; status=covered
- data_export: account data export -> data_export_requested -> support_account_actions -> Testing coverage -> evidenceCompleteness; status=covered
- creator_settings_update: creator settings route -> creator_settings_updated -> settings_actions -> Testing coverage -> sourceHealth; status=covered
- creator_drop_manager_action: creator drop manager -> creator_drop_submitted -> creator_drop_manager_actions -> Testing coverage -> sourceHealth; status=covered
- broadcast_view: creator broadcast detail -> creator_broadcast_detail_viewed -> broadcasts_viewed -> Testing coverage -> evidenceCompleteness; status=covered
- fan_pass_view: Fan Pass panel -> creator_fan_pass_viewed -> fan_pass_views -> Testing coverage -> runtimeHealth; status=covered
- runtime_watch_session: viewer runtime -> watch_session_progress -> runtime_watch_sessions -> Testing coverage -> runtimeHealth; status=covered

## Score Impact

- sourceHealth: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- runtimeHealth: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- evidenceCompleteness: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- freshness: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- costRisk: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.
- regressionRisk: before=80; after=84; Important telemetry triggers have deterministic source-only tests through envelope, feature activity, person metric, debug evidence, and score input.

## Old Test Logic Classification

- none

## Dirty Files

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-owner-review-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-contract.ts: real_source_change_needs_review
- src/lib/analytics/event-liveness-engine.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/server/admin-debug/summary.ts: real_source_change_needs_review
- tests/unit/event-liveness-audit.spec.ts: test_artifact_expected

## Validation Failures

- none

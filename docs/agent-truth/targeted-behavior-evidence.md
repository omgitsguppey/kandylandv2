# Targeted Behavior Evidence

Status: `passed`
Artifact: `agent/state/targeted-behavior-evidence.generated.json`
Validator: `npm run check:targeted-behavior-evidence`

## Scope

This artifact records source-backed targeted behavior validator results from the latest code version. It is not deployed route, provider-backed site activity, or admin source activity sample evidence.

## Summary

- Source commit: `6efbc0591b9d2ce26bbf40ec36494e0644b4ab7a`
- Latest code version: `6efbc0591b9d2ce26bbf40ec36494e0644b4ab7a`
- Passed: true
- Evidence impact: `source_behavior_only`
- Does not clear: `provider_smoke`, `runtime_smoke`, `admin_truth_sample`

## Validator Results

| Lane | Status | Command | Artifact | Surfaces | Blocker |
| --- | --- | --- | --- | --- | --- |
| final-parity-telemetry-lock | pass | npm run check:final-parity-telemetry-lock | agent/state/final-parity-telemetry-lock.generated.json | parity, telemetry, surface_state, role_permission | Current |
| media-discovery-score-lock | pass | npm run check:media-discovery-score-lock | agent/state/media-discovery-score-lock.generated.json | media_upload, private_media_access, creator_discovery, search_discovery | Current |
| creator-monetization-readiness-lock | pass | npm run check:creator-monetization-readiness-lock | agent/state/creator-monetization-readiness-lock.generated.json | creator_monetization, fan_pass, entitlements, chat_pricing, admin_debug | Current |
| auth-readiness-lock | pass | npm run check:auth-readiness-lock | agent/state/auth-readiness-lock.generated.json | auth, session, account_access | Current |
| notification-pwa-score-lock | pass | npm run check:notification-pwa-score-lock | agent/state/notification-pwa-score-lock.generated.json | notifications, pwa, service_worker | Current |
| daily-task-debug-score-lock | pass | npm run check:daily-task-debug-score-lock | agent/state/daily-task-debug-score-lock.generated.json | daily_tasks, task_rewards, debug | Current |
| chat-functionality-score-lock | pass | npm run check:chat-functionality-score-lock | agent/state/chat-functionality-score-lock.generated.json | chat, chat_gating, chat_realtime | Current |
| final-testing-tracking-telemetry-lock | pass | npm run check:final-testing-tracking-telemetry-lock | agent/state/final-testing-tracking-telemetry-lock.generated.json | testing, tracking, telemetry | Current |
| feature-registration-gate | pass | npm run check:feature-registration-gate | agent/state/feature-registration-gate.generated.json | feature_registration, routes, telemetry | Current |
| activity-verification-engine | pass | npm run check:activity-verification-engine | agent/state/activity-verification-engine.generated.json | activity_verification, behavioral_intelligence, telemetry | Current |
| event-translation-bridge | pass | npm run check:event-translation-bridge | agent/state/event-translation-bridge.generated.json | event_translation, telemetry, feature_activity | Current |
| person-metrics-hydration | pass | npm run check:person-metrics-hydration | agent/state/person-metrics-hydration.generated.json | person_metrics, telemetry, analytics | Current |
| surface-state-parity | pass | npm run check:surface-state-parity | agent/state/surface-state-parity.generated.json | surface_state, loading, empty, error, permission | Current |
| role-permission-parity | pass | npm run check:role-permission-parity | agent/state/role-permission-parity.generated.json | role_permission, user, creator, admin, guest | Current |

## Surfaces Covered

- account_access
- activity_verification
- admin
- admin_debug
- analytics
- auth
- behavioral_intelligence
- chat
- chat_gating
- chat_pricing
- chat_realtime
- creator
- creator_discovery
- creator_monetization
- daily_tasks
- debug
- empty
- entitlements
- error
- event_translation
- fan_pass
- feature_activity
- feature_registration
- guest
- loading
- media_upload
- notifications
- parity
- permission
- person_metrics
- private_media_access
- pwa
- role_permission
- routes
- search_discovery
- service_worker
- session
- surface_state
- task_rewards
- telemetry
- testing
- tracking
- user

## Not Covered

- provider-backed site activity evidence
- deployed route evidence
- admin source activity sample evidence
- real-device evidence

## Readiness Impact

Targeted behavior evidence can improve source behavior confidence when fresh and passing. It cannot replace provider-backed site activity, deployed route, real-device, or admin source activity sample evidence.

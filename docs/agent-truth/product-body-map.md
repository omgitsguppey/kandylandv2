# Product Body Map
Generated: 2026-06-21T22:17:17.641Z
Current head: cb3d46f01be801f6845e2b6357c547cc44601419
Status: pass
## Scope
This source-only pass maps product features, surfaces, routes, telemetry events, materializers, metrics, journey steps, debug lanes, score gates, validators, and generated artifacts into canonical product body systems. It does not change payment runtime, GumDrop math, navigation, deployed runtime, provider state, or production data.
## Summary
- body systems covered: 16/16
- total limbs: 1070
- features mapped: 21
- surfaces mapped: 17
- telemetry events mapped: 770
- metrics mapped: 65
- routes mapped: 110
- materializers mapped: 18
## Debug Lane
- default view: disconnected_only
- connected: 1068
- disconnected: 1
- orphaned: 1
- duplicated: 0
- stale: 0
- in flight: 0
- unsafe unknown: 0
## Body Systems
- identity_auth: primary=24, secondary=0, score=sourceHealth, evidenceCompleteness, regressionRisk, runtimeHealth, freshness
- onboarding_signup: primary=27, secondary=13, score=sourceHealth, evidenceCompleteness, runtimeHealth
- wallet_commerce: primary=40, secondary=0, score=runtimeHealth, evidenceCompleteness, costRisk
- gumdrop_economy: primary=0, secondary=236, score=runtimeHealth, evidenceCompleteness, costRisk, sourceHealth
- drops_unwrap_watch: primary=139, secondary=75, score=sourceHealth, runtimeHealth, evidenceCompleteness
- creator_profile_discovery: primary=67, secondary=28, score=sourceHealth, evidenceCompleteness, runtimeHealth
- creator_monetization: primary=105, secondary=61, score=sourceHealth, evidenceCompleteness, runtimeHealth, costRisk, freshness
- fan_pass_entitlements: primary=24, secondary=40, score=sourceHealth, evidenceCompleteness, runtimeHealth
- chat_messaging: primary=8, secondary=0, score=runtimeHealth, evidenceCompleteness, costRisk, freshness
- daily_tasks_rewards: primary=64, secondary=0, score=evidenceCompleteness, runtimeHealth, freshness
- notifications_pwa: primary=68, secondary=0, score=runtimeHealth, evidenceCompleteness, freshness
- account_settings_support: primary=64, secondary=31, score=sourceHealth, evidenceCompleteness, regressionRisk, runtimeHealth
- media_storage_access: primary=1, secondary=0, score=evidenceCompleteness, freshness
- admin_debug_ops: primary=176, secondary=326, score=sourceHealth, runtimeHealth, evidenceCompleteness, freshness, regressionRisk, costRisk
- telemetry_behavioral_intelligence: primary=250, secondary=492, score=sourceHealth, evidenceCompleteness, runtimeHealth, freshness, costRisk, regressionRisk
- cost_runtime_infrastructure: primary=13, secondary=219, score=runtimeHealth, evidenceCompleteness, costRisk, sourceHealth, freshness, regressionRisk
## Disconnected Limbs
- metric:global:runtime_watch_time: orphaned; Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.
- metric:global:external_ga4_evidence: deprecated; Keep external evidence archive-only unless an explicit guarded refresh artifact is produced.
## Dirty Files
- scripts/agent/validate-product-body-map.ts: validator_artifact_expected
- tests/unit/product-body-map.spec.ts: test_artifact_expected
## Open PR Classification
- none
## Validation Failures
- none
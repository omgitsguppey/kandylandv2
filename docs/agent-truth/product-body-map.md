# Product Body Map
Generated: 2026-05-26T08:10:42.692Z
Current head: a74f489c81e605f1c9a280f28726d352fcb54dee
Status: pass
## Scope
This source-only pass maps product features, surfaces, routes, telemetry events, materializers, metrics, journey steps, debug lanes, score gates, validators, and generated artifacts into canonical product body systems. It does not change payment runtime, GumDrop math, navigation, deployed runtime, provider state, or production data.
## Summary
- body systems covered: 16/16
- total limbs: 1047
- features mapped: 21
- surfaces mapped: 17
- telemetry events mapped: 748
- metrics mapped: 64
- routes mapped: 110
- materializers mapped: 18
## Debug Lane
- default view: disconnected_only
- connected: 1045
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
- gumdrop_economy: primary=0, secondary=232, score=runtimeHealth, evidenceCompleteness, costRisk, sourceHealth
- drops_unwrap_watch: primary=134, secondary=62, score=sourceHealth, runtimeHealth, evidenceCompleteness
- creator_profile_discovery: primary=67, secondary=26, score=sourceHealth, evidenceCompleteness, runtimeHealth
- creator_monetization: primary=90, secondary=61, score=sourceHealth, evidenceCompleteness, runtimeHealth, costRisk, freshness
- fan_pass_entitlements: primary=24, secondary=40, score=sourceHealth, evidenceCompleteness, runtimeHealth
- chat_messaging: primary=8, secondary=0, score=runtimeHealth, evidenceCompleteness, costRisk, freshness
- daily_tasks_rewards: primary=65, secondary=0, score=evidenceCompleteness, runtimeHealth, freshness
- notifications_pwa: primary=69, secondary=0, score=runtimeHealth, evidenceCompleteness, freshness
- account_settings_support: primary=63, secondary=31, score=sourceHealth, evidenceCompleteness, regressionRisk, runtimeHealth
- media_storage_access: primary=1, secondary=0, score=evidenceCompleteness, freshness
- admin_debug_ops: primary=175, secondary=322, score=sourceHealth, runtimeHealth, evidenceCompleteness, freshness, regressionRisk, costRisk
- telemetry_behavioral_intelligence: primary=247, secondary=487, score=sourceHealth, evidenceCompleteness, runtimeHealth, freshness, costRisk, regressionRisk
- cost_runtime_infrastructure: primary=13, secondary=218, score=runtimeHealth, evidenceCompleteness, costRisk, sourceHealth, freshness, regressionRisk
## Disconnected Limbs
- metric:global:runtime_watch_time: orphaned; Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.
- metric:global:external_ga4_evidence: deprecated; Keep external evidence archive-only unless an explicit guarded refresh artifact is produced.
## Dirty Files
- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/body-system-wiring-repair.generated.json: current_generated_artifact_to_commit
- agent/state/central-normalizer-spine.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-product-integrity-lock.generated.json: current_generated_artifact_to_commit
- agent/state/interpretive-brain-debug-triage.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/product-body-map.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/sql-database-parity-cost-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/surface-parity-doctrine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/surface-telemetry-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-journey-behavioral-intelligence.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/body-system-wiring-repair.md: documentation_artifact_expected
- docs/agent-truth/central-normalizer-spine.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-backlog-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-product-integrity-lock.md: documentation_artifact_expected
- docs/agent-truth/interpretive-brain-debug-triage.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/product-body-map.md: documentation_artifact_expected
- docs/agent-truth/sql-database-parity-cost-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-parity-doctrine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-telemetry-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-journey-behavioral-intelligence.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-final-product-integrity-lock.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/product-integrity/body-system-wiring-repair.ts: real_source_change_needs_review
- src/lib/product-integrity/central-normalizer.ts: real_source_change_needs_review
- src/lib/product-integrity/final-product-integrity-lock.ts: real_source_change_needs_review
- src/lib/product-integrity/interpretive-brain.ts: real_source_change_needs_review
- src/lib/product-integrity/product-body-map.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/final-product-integrity-lock.spec.ts: test_artifact_expected
## Open PR Classification
- #302 🧭 Improve onboarding friction visibility and technical rescue signals: onboarding_telemetry_external_review_required
- #301 📚 Reduce doctrine drift and banned-pattern reintroduction: doctrine_governance_external_review_required
- #300 🧱 Reduce monolith file risk and clarify responsibility boundaries: architecture_refactor_external_review_required
- #299 chore(deps): bump the functions-npm-minor-patch group in /functions with 5 updates: dependency_update_external_review_required
- #298 chore(deps): bump npm-check-updates from 19.6.6 to 22.2.1: dependency_update_external_review_required
- #297 chore(deps): bump knip from 5.88.1 to 6.14.2: dependency_update_external_review_required
- #296 chore(deps): bump syncpack from 14.3.0 to 15.3.1: dependency_update_external_review_required
- #295 chore(deps): bump puppeteer from 24.40.0 to 25.0.4: dependency_update_external_review_required
- #294 chore(deps): bump the npm-minor-patch group across 1 directory with 48 updates: dependency_update_external_review_required
- #293 🛡️ Sentinel: [High] Fix insecure Math.random() usage for ID generation: security_patch_external_review_required
- #292 ⚡ Bolt: Replace array `.find()` with Map lookup in debug route: performance_patch_external_review_required
- #291 🎨 Palette: Add accessible loading states to Creator Experiences Panel buttons: accessibility_patch_external_review_required
## Validation Failures
- none
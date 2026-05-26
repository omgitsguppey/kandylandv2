# Product Body Map
Generated: 2026-05-26T07:28:19.215Z
Current head: 3ece9b84fb13ce2e933e632d4f56588479e5bab2
Status: pass
## Scope
This source-only pass maps product features, surfaces, routes, telemetry events, materializers, metrics, journey steps, debug lanes, score gates, validators, and generated artifacts into canonical product body systems. It does not change payment runtime, GumDrop math, navigation, deployed runtime, provider state, or production data.
## Summary
- body systems covered: 16/16
- total limbs: 1044
- features mapped: 21
- surfaces mapped: 17
- telemetry events mapped: 748
- metrics mapped: 64
- routes mapped: 110
- materializers mapped: 18
## Debug Lane
- default view: disconnected_only
- connected: 1042
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
- admin_debug_ops: primary=172, secondary=321, score=sourceHealth, runtimeHealth, evidenceCompleteness, freshness, regressionRisk, costRisk
- telemetry_behavioral_intelligence: primary=247, secondary=485, score=sourceHealth, evidenceCompleteness, runtimeHealth, freshness, costRisk, regressionRisk
- cost_runtime_infrastructure: primary=13, secondary=217, score=runtimeHealth, evidenceCompleteness, costRisk, sourceHealth, freshness, regressionRisk
## Disconnected Limbs
- metric:global:runtime_watch_time: orphaned; Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.
- metric:global:external_ga4_evidence: deprecated; Keep external evidence archive-only unless an explicit guarded refresh artifact is produced.
## Dirty Files
- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/central-normalizer-spine.generated.json: current_generated_artifact_to_commit
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/interpretive-brain-debug-triage.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/central-normalizer-spine.md: documentation_artifact_expected
- docs/agent-truth/debug-backlog-engine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-parity-telemetry-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/interpretive-brain-debug-triage.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-interpretive-brain-debug-triage.ts: validator_artifact_expected
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/product-integrity/central-normalizer.ts: real_source_change_needs_review
- src/lib/product-integrity/interpretive-brain-contract.ts: real_source_change_needs_review
- src/lib/product-integrity/interpretive-brain.ts: real_source_change_needs_review
- src/lib/product-integrity/product-body-map.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/interpretive-brain-debug-triage.spec.ts: test_artifact_expected
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
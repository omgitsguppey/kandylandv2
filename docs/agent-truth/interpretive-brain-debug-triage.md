# Interpretive Brain Debug Triage

Generated: 2026-05-26T08:11:50.045Z
Current head: a74f489c81e605f1c9a280f28726d352fcb54dee
Status: pass

## Scope

This source-only pass adds the Product brain triage layer above normalized signals. It interprets product health, journey meaning, root cause, score impact, cost risk, formal gates, stale artifacts, and exact next actions. It does not mutate production data, call providers, clear formal gates, alter payment runtime, change GumDrop math, or touch navigation.

## Product Brain Summary

- default view: product_brain_summary
- raw lanes default open: false
- top actions: 10
- findings: 11
- duplicate findings collapsed: 1
- critical findings hidden: 0
- formal gates: 4
- cost risks: 1
- stale artifacts: 1

## Top Actions

- p1 drops_unwrap_watch source_ready: Attach external billing review artifact if needed; keep source cost guards visible separately.
- p1 admin_debug_ops admin_truth_sample_missing: Attach redacted production admin truth sample evidence before clearing this gate.
- p1 drops_unwrap_watch formal_evidence_missing: Attach a redacted first-party admin truth sample before clearing the formal admin truth gate.
- p1 drops_unwrap_watch formal_evidence_missing: Attach formal deployed runtime/provider smoke evidence before clearing the beta gate.
- p1 drops_unwrap_watch runtime_sample_missing: Run and attach deployed runtime smoke evidence outside source-only validation.
- p2 admin_debug_ops stale_evidence: Run npm run score:beta and npm run check:beta-score when source changes settle.
- p3 drops_unwrap_watch source_ready: Keep score impact mapped to a body system and exact next action before beta gates are interpreted.
- p3 drops_unwrap_watch source_ready: Keep score impact mapped to a body system and exact next action before beta gates are interpreted.
- info drops_unwrap_watch cost_guard_ready: Hot path writes only essential normalized summaries and raw event facts.
- info drops_unwrap_watch source_ready: Keep journey meaning derived from normalized facts instead of raw debug noise.

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

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/body-system-wiring-repair.generated.json: current_generated_artifact_to_commit
- agent/state/central-normalizer-spine.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/final-product-integrity-lock.generated.json: current_generated_artifact_to_commit
- agent/state/interpretive-brain-debug-triage.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
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
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/final-product-integrity-lock.md: documentation_artifact_expected
- docs/agent-truth/interpretive-brain-debug-triage.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- docs/agent-truth/product-body-map.md: documentation_artifact_expected
- docs/agent-truth/sql-database-parity-cost-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-parity-doctrine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/surface-telemetry-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-journey-behavioral-intelligence.md: stale_generated_artifact_to_regenerate
- package.json: validator_artifact_expected
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

## Validation Failures

- none

# Interpretive Brain Debug Triage

Generated: 2026-05-26T07:29:17.457Z
Current head: 3ece9b84fb13ce2e933e632d4f56588479e5bab2
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
- agent/state/interpretive-brain-debug-triage.generated.json: current_generated_artifact_to_commit
- agent/state/product-body-map.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/interpretive-brain-debug-triage.md: documentation_artifact_expected
- docs/agent-truth/product-body-map.md: documentation_artifact_expected
- package.json: validator_artifact_expected
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

## Validation Failures

- none

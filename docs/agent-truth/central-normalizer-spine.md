# Central Normalizer Spine

Generated: 2026-05-26T08:11:40.601Z
Current head: a74f489c81e605f1c9a280f28726d352fcb54dee
Status: pass

## Scope

This source-only pass adds a central normalizer adapter spine for product signals. It routes signals into the existing event envelope, normalized event fact, person/global metrics, journey, debug, beta score, export, and cost paths. It does not mutate production data, call providers, alter payment runtime, change GumDrop math, or touch navigation.

## Coverage

- signal kinds: 14
- output channels: canonicalEventEnvelope, normalizedEventFact, globalMetricFact, userMetricFact, journeyEvent, debugSignal, scoreSignal, exportFact, costSignal
- sample status: normalized
- sample body system: drops_unwrap_watch
- adapters connected: event-envelope-builder, behavioral-event-fact-normalizer, person-metrics-hydration, user-journey-builder, sql-database-parity-engine, debug-backlog-builder

## Debug Lane

- default view: issues_only
- signals received: 1
- normalized: 1
- failed: 0
- missing body system: 0
- missing identity: 0
- legacy aliases: 1
- unsafe unknown: 0

## Legacy Direct Pathways

- event-envelope-builder: central_normalizer_adapter; Keep direct envelope callers migrating through the central normalizer adapter when product limbs add new signals.
- behavioral-event-fact-normalizer: central_normalizer_adapter; Keep source event fact behavior stable; do not fork fact math inside product limbs.
- person-metrics-hydration: central_normalizer_adapter; Keep metric hydration behind the central normalizer metric adapter.
- user-journey-builder: central_normalizer_adapter; Keep journey generation attached to normalized event facts.
- sql-database-parity-engine: central_normalizer_adapter; Keep SQL/export parity derived from normalized facts only.
- debug-backlog-builder: central_normalizer_adapter; Keep admin debug summaries issue-first and drilldown-based.
- legacy-event-recovery: legacy_alias_still_required; Keep legacy recovery bucketed as legacy alias until source truth upgrades exist.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/body-system-wiring-repair.generated.json: current_generated_artifact_to_commit
- agent/state/central-normalizer-spine.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-backlog-engine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
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
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
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

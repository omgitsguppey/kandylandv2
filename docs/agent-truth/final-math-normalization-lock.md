# Final Math Normalization Lock

Generated: 2026-05-27T05:21:28.560Z
Current head: eb93068b
Status: fail

## Score

- Before: {"sourceHealth":91.7,"runtimeHealth":84.2,"evidenceCompleteness":69.6,"freshness":67.5,"costRisk":42,"regressionRisk":86,"overallHealthScore":76.61}
- After: {"sourceHealth":91.7,"runtimeHealth":84.2,"evidenceCompleteness":69.6,"freshness":67.5,"costRisk":42,"regressionRisk":86,"overallHealthScore":76.61}
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, freshness, costRisk, regressionRisk

## Formulas Finalized

- betaScore: finalized
- confidence: finalized
- legacyRecovery: finalized
- globalUserCounting: finalized
- watchTime: finalized
- sessionBounce: finalized
- gumdropLedger: finalized
- creatorRevenue: finalized
- costExport: finalized
- metricDisplay: finalized

## Accuracy Improvements

- betaScore: The final lock ties the score to explicit weights, dimensions, caps, and blocker classes instead of stale generated snapshots.
- confidence: Every metric can now degrade precision using the same confidence scale before it reaches user, creator, or admin display.
- legacyRecovery: Recovered history is mapped into candidates without mutating production or inflating exact user truth.
- globalUserCounting: Counts now explain global, guest, signed-in, linked-person, creator-role, admin projection, and system-event behavior.
- watchTime: Watch metrics now represent actual active content exposure rather than generic page-open time.
- sessionBounce: Unknown closeout stays unknown and conversions prevent false bounce classification.
- gumdropLedger: Spend eligibility and wallet display can distinguish paid-source value from reward or legacy unknown value.
- creatorRevenue: Creator metrics no longer mix confirmed, inferred, pending, reversed, and unknown legacy revenue.
- costExport: Cost risk improves only from source guards or real billing artifacts while preserving canonical metric facts.
- metricDisplay: The display layer now preserves source truth, freshness, confidence, and missing-data semantics instead of flattening everything into numbers.

## Legacy Recovery Summary

- Dry run only: true
- Start date: 2026-03-01
- Candidates canonicalized: 1
- Archive only: 1
- Manual review: 1
- Exact promotions blocked: true
- Duplicate risk: {"low":0,"medium":1,"high":3}

## Remaining Unknowns

- Unknown legacy data stays archive-only unless deterministic identity, event, route, and timestamp evidence exists.
- Runtime/provider/admin formal evidence remains outside source math normalization.
- Existing UI consumers should adopt metric display accuracy incrementally before visual redesign.

## Formal Gates

- Runtime/provider smoke remains formal evidence and is not cleared by source math locks.
- Admin production sample evidence remains a formal evidence lane.
- Visual/operator final review remains outside Codex source-only math proof.

## Cost Reviews

- External billing review remains separate from source cost guards.
- Cloud Run/App Hosting, Cloud SQL/Data Connect, Gemini/Cloud Assist/Vertex, and route 4xx cost lanes retain external review requirements where no billing artifact exists.

## Next Exact Steps

- Adopt metric display accuracy in remaining user, creator, and admin metric consumers before redesigning those surfaces.
- Use dry-run legacy canonicalization output for operator review; do not write recovered records without an explicit migration plan.
- Attach runtime/provider/admin formal evidence before clearing beta exit gates.
- Attach external billing proof before upgrading source-guarded cost lanes to full credit.

## Dirty Files

- AGENTS.md: unsafe_unknown
- REPO_MEMORY_LEDGER.md: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/index/known-pitfalls.json: unsafe_unknown
- agent/state/generated-artifact-size-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/qa-harness-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-gut-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-fixture-memory-writeback.generated.json: stale_generated_artifact_to_regenerate
- agent/state/test-quality-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/validator-ownership-map.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/generated-artifact-size-policy.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/qa-harness-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-gut-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-fixture-memory-writeback.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/test-quality-guards.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/validator-ownership-map.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- scripts/agent/validate-generated-artifact-size-policy.ts: unsafe_unknown
- scripts/agent/validate-qa-harness-consolidation.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-gut-consolidation.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-inventory.ts: unsafe_unknown
- scripts/agent/validate-test-fixture-memory-writeback.ts: unsafe_unknown
- scripts/agent/validate-test-quality-guards.ts: unsafe_unknown
- scripts/agent/validate-validator-ownership-map.ts: unsafe_unknown
- src/lib/test-hardening/generated-artifact-size-policy.ts: unsafe_unknown
- src/lib/test-hardening/qa-harness-map.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-gut-consolidation.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-inventory.ts: unsafe_unknown
- src/lib/test-hardening/test-fixture-memory-writeback.ts: unsafe_unknown
- src/lib/test-hardening/test-hardening-shared.ts: unsafe_unknown
- src/lib/test-hardening/test-quality-guards.ts: unsafe_unknown
- src/lib/test-hardening/validator-ownership-map.ts: unsafe_unknown
- src/lib/testing/canonical-test-factories.ts: unsafe_unknown
- src/lib/testing/mock-evidence-classifier.ts: unsafe_unknown
- tests/unit/generated-artifact-size-policy.spec.ts: unsafe_unknown
- tests/unit/qa-harness-consolidation.spec.ts: unsafe_unknown
- tests/unit/test-fixture-inventory.spec.ts: unsafe_unknown
- tests/unit/test-fixture-memory-writeback.spec.ts: unsafe_unknown
- tests/unit/test-quality-guards.spec.ts: unsafe_unknown
- tests/unit/validator-ownership-map.spec.ts: unsafe_unknown

## Open PRs

- none

## Validation Failures

- AGENTS.md is unclassified for final math normalization lock.
- REPO_MEMORY_LEDGER.md is unclassified for final math normalization lock.
- agent/index/known-pitfalls.json is unclassified for final math normalization lock.
- scripts/agent/validate-generated-artifact-size-policy.ts is unclassified for final math normalization lock.
- scripts/agent/validate-qa-harness-consolidation.ts is unclassified for final math normalization lock.
- scripts/agent/validate-test-fixture-gut-consolidation.ts is unclassified for final math normalization lock.
- scripts/agent/validate-test-fixture-inventory.ts is unclassified for final math normalization lock.
- scripts/agent/validate-test-fixture-memory-writeback.ts is unclassified for final math normalization lock.
- scripts/agent/validate-test-quality-guards.ts is unclassified for final math normalization lock.
- scripts/agent/validate-validator-ownership-map.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/generated-artifact-size-policy.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/qa-harness-map.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/test-fixture-gut-consolidation.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/test-fixture-inventory.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/test-fixture-memory-writeback.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/test-hardening-shared.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/test-quality-guards.ts is unclassified for final math normalization lock.
- src/lib/test-hardening/validator-ownership-map.ts is unclassified for final math normalization lock.
- src/lib/testing/canonical-test-factories.ts is unclassified for final math normalization lock.
- src/lib/testing/mock-evidence-classifier.ts is unclassified for final math normalization lock.
- tests/unit/generated-artifact-size-policy.spec.ts is unclassified for final math normalization lock.
- tests/unit/qa-harness-consolidation.spec.ts is unclassified for final math normalization lock.
- tests/unit/test-fixture-inventory.spec.ts is unclassified for final math normalization lock.
- tests/unit/test-fixture-memory-writeback.spec.ts is unclassified for final math normalization lock.
- tests/unit/test-quality-guards.spec.ts is unclassified for final math normalization lock.
- tests/unit/validator-ownership-map.spec.ts is unclassified for final math normalization lock.

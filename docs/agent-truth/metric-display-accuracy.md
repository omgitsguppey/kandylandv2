# Metric Display Accuracy

Generated: 2026-05-26T11:44:23.312Z
Current head: 05c14d0d
Status: pass

## Contract

- Show `0` only when a bounded source proves zero.
- Show collecting copy when the source path exists but the activity window has not produced enough data.
- Show not connected when the source, producer, or materializer is missing.
- Show estimated copy for inferred or weak confidence without leaking technical jargon to users or creators.
- Show freshness labels for creator/admin dashboard metrics older than one hour.
- Keep wallet balances source-aware across paid GD, bonus GD, and reward GD buckets.

## Creator Dashboard Sources

- Fans: Creator fans use the followers/fans canonical count, not unrelated subscribers.
- Drops: Creator drops use creator-owned or assigned-to-creator drops, not all drops.
- Views/clicks/unwraps: Creator views, clicks, and unwraps use canonical event facts with confidence.
- Revenue: Creator revenue displays exact, linked, inferred, pending, reversed, and unknown legacy buckets separately.

## Debug Lane

- Label: Metric display accuracy
- Misleading zero risk: 0
- Stale display risk: 0
- Weak confidence exact-display risk: 0
- Source disconnected count: 1

## Score

- Before: {"sourceHealth":100,"runtimeHealth":84.2,"evidenceCompleteness":84.6,"freshness":91.88,"costRisk":42,"regressionRisk":86,"overallHealthScore":85.34}
- After: {"sourceHealth":100,"runtimeHealth":84.2,"evidenceCompleteness":84.6,"freshness":91.88,"costRisk":42,"regressionRisk":86,"overallHealthScore":85.34}
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, freshness, costRisk, regressionRisk

## Remaining Gaps

- Existing user, creator, and admin surfaces still need incremental adoption of the canonical display formatter where direct number formatting remains.

## Next Exact Steps

- Route each dashboard metric consumer through formatMetricValue before changing visual design.
- Keep payment runtime, GumDrop ledger math, and production data untouched while adopting display labels.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/metric-display-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/metric-display-accuracy.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-metric-display-accuracy.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/math/metric-display-accuracy.ts: current_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/metric-display-accuracy.spec.ts: test_artifact_expected

## Open PRs

- #302: onboarding_telemetry_external_review_required
- #301: doctrine_governance_external_review_required
- #300: architecture_refactor_external_review_required
- #299: dependency_update_external_review_required
- #298: dependency_update_external_review_required
- #297: dependency_update_external_review_required
- #296: dependency_update_external_review_required
- #295: dependency_update_external_review_required
- #294: dependency_update_external_review_required
- #293: security_patch_external_review_required
- #292: performance_patch_external_review_required
- #291: accessibility_patch_external_review_required

## Validation Failures

- none

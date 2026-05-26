# Creator Revenue Entitlement Math

Generated: 2026-05-26T11:09:37.109Z
Current head: 968491f7
Status: pass

## Contract

- Entitlement is access truth, not payment truth.
- Revenue confidence is exact only for provider/payment artifacts.
- Internal ledgers linked to successful payment are linked confidence.
- Operator-confirmed revenue is inferred confidence and cannot display as exact.
- Legacy transactions without provider/source truth remain weak or unknown.
- Fan Pass active access requires creator enablement, active entitlement, a valid access window or explicit lifetime entitlement, and no cancelled/refunded/expired state.
- Paid chat bypass uses Fan Pass resolver output or creator reply bypass.
- Creator dashboard revenue separates gross confirmed, inferred internal, pending, refunded/reversed, and unknown legacy buckets.

## Status

- Revenue confidence: pass
- Fan Pass access: pass
- Paid chat bypass: pass
- Creator dashboard metrics: pass
- Debug visibility: pass
- Payment runtime: unchanged
- Payout math: unchanged
- GumDrop math: unchanged

## Debug Lane

- Label: Creator revenue math
- Exact revenue count: 2
- Linked revenue count: 2
- Inferred revenue count: 1
- Weak revenue count: 1
- Unknown revenue count: 1
- Active entitlement mismatches: 1
- Fan Pass bypass mismatches: 1
- Unknown legacy revenue: 2

## Score

- Before: 85.34
- After: 85.34
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, costRisk, regressionRisk

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/creator-revenue-entitlement-math.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/creator-revenue-entitlement-math.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-creator-monetization-settings-truth.ts: validator_artifact_expected
- scripts/agent/validate-creator-revenue-entitlement-ledger.ts: validator_artifact_expected
- scripts/agent/validate-creator-revenue-entitlement-math.ts: validator_artifact_expected
- scripts/agent/validate-fan-pass-lifecycle.ts: validator_artifact_expected
- src/lib/math/creator-revenue-entitlement-math.ts: current_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/creator-revenue-entitlement-math.spec.ts: test_artifact_expected

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

## Remaining Gaps

- Runtime creator dashboard consumers can adopt this math without changing payment or payout writers.

## Next Exact Steps

- Keep weak/unknown legacy revenue out of exact dashboard totals and keep paid chat bypass routed through Fan Pass resolver output.

## Validation Failures

- none

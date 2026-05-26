# Creator Revenue Entitlement Ledger

Generated: 2026-05-26T02:16:21.090Z
Status: pass
Current head: 1a4a7ff7

## Contract

- Creator entitlements are read-only projections over server transaction, unlock, subscription, and accrual facts.
- Payment runtime, payout math, and GumDrop math are not changed by this ledger.
- Paid creator features require paid-source GumDrops; reward-only source is surfaced as a mismatch.
- Revenue is marked with confidence and is never fabricated when cents are unavailable.

## Status

- Entitlement contract: pass
- Resolver: pass
- Source-of-funds truth: pass
- Creator metrics mapping: pass
- Debug visibility: pass
- Payment runtime: unchanged
- Payout math: unchanged
- GumDrop math: unchanged

## Metrics Mapped

- creator-level entitlements granted
- fan pass active users
- paid chat messages
- drop unlocks
- revenue confidence
- access denied/mismatch count

## Debug Lane

- Label: Creator entitlement ledger
- Granted: 4
- Active: 3
- Expired: 1
- Mismatch: 1
- Unknown legacy: 1
- Source-of-funds problems: 1

## Score

- Before: 77.83
- After: 77.83
- Dimensions: sourceHealth, runtimeHealth, evidenceCompleteness, costRisk, regressionRisk

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/creator-revenue-entitlement-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/creator-revenue-entitlement-ledger.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-creator-revenue-entitlement-ledger.ts: validator_artifact_expected
- scripts/agent/validate-fan-pass-lifecycle.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/creator-monetization/creator-entitlement-contract.ts: current_source_change
- src/lib/creator-monetization/creator-entitlement-resolver.ts: current_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/creator-revenue-entitlement-ledger.spec.ts: test_artifact_expected

## Remaining Gaps

- Runtime materializers can now consume this contract without changing payment or GumDrop writers.

## Next Exact Steps

- Keep payment, payout, and GumDrop math changes out of entitlement-ledger passes.

## Validation Failures

- none

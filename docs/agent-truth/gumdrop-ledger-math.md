# GumDrop Ledger Math

Generated: 2026-05-26T10:52:46.013Z
Current head: c68093cf8453ae0218d2035c2b653a388aaa536f
Status: pass

## Contract

- `paid_gd` is purchased base GumDrops only.
- `paid_bonus_gd` is paid bundle bonus value; it is paid-source eligible but not reward GD.
- `reward_gd` is non-purchase reward value; `task_reward_gd` is the task subtype.
- `admin_grant_gd` is explicit and never defaults to paid.
- Refunds reverse the original source bucket.
- Legacy unknown source cannot fund paid-only creator experiences.
- Displayed wallet total must match the source-bucket ledger total.

## Debug Lane

- Label: GumDrop ledger math
- Balance parity: matched
- Source unknown: 1
- Paid-only spend violations: 0
- Refund reversals: 1
- Display mismatch: 1

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/gumdrop-ledger-math.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/gumdrop-ledger-math.md: current_generated_artifact_to_commit
- docs/agent-truth/payment-wallet-unlock-entitlement.md: release_artifact_expected
- docs/doctrine/surfaces/wallet.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-creator-revenue-entitlement-ledger.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reward-ledger.ts: validator_artifact_expected
- scripts/agent/validate-gumdrop-ledger-math.ts: validator_artifact_expected
- scripts/agent/validate-wallet-density.ts: validator_artifact_expected
- src/components/PurchaseModal.tsx: real_source_change_needs_review
- src/lib/math/canonical-math-ledger.ts: real_source_change_needs_review
- src/lib/math/gumdrop-ledger-math.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/canonical-math-ledger.spec.ts: test_artifact_expected
- tests/unit/gumdrop-ledger-math.spec.ts: test_artifact_expected
- tests/unit/purchase-modal-density.spec.tsx: test_artifact_expected

## Validation Failures

- none

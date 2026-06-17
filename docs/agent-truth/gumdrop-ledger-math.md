# GumDrop Ledger Math

Generated: 2026-06-17T19:32:07.617Z
Current head: 60f4c304abbda91c42f1bb1923771134338a2a81
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

- Count: 26
- Drilldown truncated: false
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/admin-surface-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/gumdrop-ledger-math.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/admin-surface-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-panel-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-exit-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/gumdrop-ledger-math.md: current_generated_artifact_to_commit
- docs/doctrine/surfaces/wallet.md: release_artifact_expected
- scripts/agent/validate-gumdrop-ledger-math.ts: validator_artifact_expected
- scripts/agent/validate-gumdrop-source-of-funds-truth.ts: validator_artifact_expected
- src/app/api/creator/bookings/route.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/app/api/creator/requests/route.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/app/api/creator/subscriptions/route.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/app/api/cron/process-creator-subscriptions/route.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/lib/gumdrop-ledger.ts: source_of_funds_guard_expected
- src/lib/problem-state-copy.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/lib/server/chat.ts: unrelated_dirty_outside_gumdrop_ledger_math
- src/lib/server/creator-experiences.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/creator-bookings-route.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/creator-bookings-transaction-route.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/creator-requests-route.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/creator-subscriptions-route.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/gumdrop-ledger.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math
- tests/unit/server-chat-send.spec.ts: unrelated_dirty_outside_gumdrop_ledger_math

## Validation Failures

- none

# Daily Task Debug Score Lock

Generated: 2026-07-16T04:25:22.940Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
Source commit: 621afada2aea0ef269a02c7ac68d4424bfce5214
Status: pass
Source status: pass

## Lock Status

- Reset truth: pass
- Lifecycle telemetry: pass
- Duration tracking: active_duration_only
- Reward ledger: pass
- Guidance routes: pass
- Task failure debug: present
- Task person metrics: present
- Task score coverage: present
- Reward GD source truth: reward_gd_only
- Unknown legacy task count: 0
- Duplicate reward risk count: 0
- Active task route mismatch count: 0
- Active task missing completion signal count: 0

## Debug Lanes

- Daily tasks/reset: present (daily-task-reset-truth)
- Daily task lifecycle: present (daily-task-lifecycle-telemetry)
- Daily task reward ledger: present (daily-task-reward-ledger)
- Task guidance health: present (daily-task-guidance-route-audit)

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 83.6 | 83.6 | target_met | No daily-task score action needed for this dimension. |
| runtimeHealth | 50.22 | 50.22 | below_target | Attach formal runtime/provider/admin evidence without promoting source validators to runtime proof. |
| evidenceCompleteness | 45 | 45 | below_target | Complete formal beta evidence gates and keep daily task generated reports fresh. |
| freshness | 59.38 | 59.38 | below_target | Refresh stale score-impacting artifacts with targeted validators. |
| costRisk | 92.5 | 92.5 | target_met | No daily-task score action needed for this dimension. |
| regressionRisk | 94 | 94 | target_met | No daily-task score action needed for this dimension. |
| overallHealthScore | 63.18 | 63.18 | below_target | Raise below-target component dimensions before treating overall health as solved. |

## Remaining Gaps

- runtimeHealth below 80: Attach formal runtime/provider/admin evidence without promoting source validators to runtime proof.
- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Next Exact Steps

- runtimeHealth below 80: Attach formal runtime/provider/admin evidence without promoting source validators to runtime proof.
- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Old Task Logic Classification

- unknown_legacy reset handling: still_required - Legacy reset anchors remain explicitly unavailable instead of claimable truth.
- passive page time duration: stale_removed - Task lifecycle report requires active start/attempt duration and rejects passive page time.
- unfiltered task guidance rendering: superseded - Guidance route audit filters unsupported active tasks before rendering/claiming.

## Dirty Files

- agent/state/daily-task-guidance-route-audit.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reset-truth.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reward-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/daily-task-guidance-route-audit.md: documentation_artifact_expected
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reset-truth.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reward-ledger.md: documentation_artifact_expected

## Validation Failures

- none

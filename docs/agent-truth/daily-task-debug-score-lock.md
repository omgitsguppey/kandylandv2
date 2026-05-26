# Daily Task Debug Score Lock

Generated: 2026-05-26T04:49:26.835Z
Current head: a81cdb0b

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
| sourceHealth | 91.7 | 100 | target_met | No daily-task score action needed for this dimension. |
| runtimeHealth | 66.25 | 84.2 | target_met | No daily-task score action needed for this dimension. |
| evidenceCompleteness | 37.75 | 84.6 | target_met | No daily-task score action needed for this dimension. |
| freshness | 62.86 | 91.88 | target_met | No daily-task score action needed for this dimension. |
| costRisk | 42 | 80.5 | target_met | No daily-task score action needed for this dimension. |
| regressionRisk | 42 | 86 | target_met | No daily-task score action needed for this dimension. |
| overallHealthScore | 61.55 | 89.19 | target_met | No daily-task score action needed for this dimension. |

## Remaining Gaps

- none

## Next Exact Steps

- Keep daily task validators in the targeted signoff lane; collect formal runtime/provider evidence separately.

## Old Task Logic Classification

- unknown_legacy reset handling: still_required - Legacy reset anchors remain explicitly unavailable instead of claimable truth.
- passive page time duration: stale_removed - Task lifecycle report requires active start/attempt duration and rejects passive page time.
- unfiltered task guidance rendering: superseded - Guidance route audit filters unsupported active tasks before rendering/claiming.

## Dirty Files

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/auth-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/cost-risk-exit-pass.generated.json: current_generated_artifact_to_commit
- agent/state/creator-monetization-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/final-parity-telemetry-lock.generated.json: current_generated_artifact_to_commit
- agent/state/freshness-window-repair.generated.json: current_generated_artifact_to_commit
- agent/state/launch-blocker-evidence-closure.generated.json: current_generated_artifact_to_commit
- agent/state/media-discovery-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/notification-pwa-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/targeted-behavior-evidence-repair.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/auth-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/cost-risk-exit-pass.md: documentation_artifact_expected
- docs/agent-truth/creator-monetization-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/final-parity-telemetry-lock.md: documentation_artifact_expected
- docs/agent-truth/freshness-window-repair.md: documentation_artifact_expected
- docs/agent-truth/launch-blocker-evidence-closure.md: documentation_artifact_expected
- docs/agent-truth/media-discovery-score-lock.md: documentation_artifact_expected
- docs/agent-truth/notification-pwa-score-lock.md: documentation_artifact_expected
- docs/agent-truth/targeted-behavior-evidence-repair.md: documentation_artifact_expected

## Validation Failures

- none

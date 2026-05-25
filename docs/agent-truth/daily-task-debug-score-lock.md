# Daily Task Debug Score Lock

Generated: 2026-05-25T06:15:15.250Z
Current head: ccf36528

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
| sourceHealth | 91.7 | 91.7 | target_met | No daily-task score action needed for this dimension. |
| runtimeHealth | 66.25 | 84.2 | target_met | No daily-task score action needed for this dimension. |
| evidenceCompleteness | 37.75 | 69.6 | below_target | Complete formal beta evidence gates and keep daily task generated reports fresh. |
| freshness | 62.86 | 75.63 | below_target | Refresh stale score-impacting artifacts with targeted validators. |
| costRisk | 42 | 42 | below_target | Resolve owner-review cost lanes without touching payment or GumDrop paid math. |
| regressionRisk | 42 | 86 | target_met | No daily-task score action needed for this dimension. |
| overallHealthScore | 61.55 | 77.83 | below_target | Raise below-target component dimensions before treating overall health as solved. |

## Remaining Gaps

- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- costRisk below 80: Resolve owner-review cost lanes without touching payment or GumDrop paid math.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Next Exact Steps

- evidenceCompleteness below 80: Complete formal beta evidence gates and keep daily task generated reports fresh.
- freshness below 80: Refresh stale score-impacting artifacts with targeted validators.
- costRisk below 80: Resolve owner-review cost lanes without touching payment or GumDrop paid math.
- overallHealthScore below 80: Raise below-target component dimensions before treating overall health as solved.

## Old Task Logic Classification

- unknown_legacy reset handling: still_required - Legacy reset anchors remain explicitly unavailable instead of claimable truth.
- passive page time duration: stale_removed - Task lifecycle report requires active start/attempt duration and rejects passive page time.
- unfiltered task guidance rendering: superseded - Guidance route audit filters unsupported active tasks before rendering/claiming.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/daily-task-debug-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-guidance-route-audit.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-lifecycle-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/daily-task-reward-ledger.generated.json: current_generated_artifact_to_commit
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-event-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-history-recovery.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-telemetry-contract.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-ui-instrumentation.generated.json: current_generated_artifact_to_commit
- agent/state/task-onboarding-parity-semantics.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/daily-task-debug-score-lock.md: documentation_artifact_expected
- docs/agent-truth/daily-task-guidance-route-audit.md: documentation_artifact_expected
- docs/agent-truth/daily-task-lifecycle-telemetry.md: documentation_artifact_expected
- docs/agent-truth/daily-task-reward-ledger.md: documentation_artifact_expected
- docs/agent-truth/debug-cockpit-batch31-task-guidance-parity.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-event-normalization.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-history-recovery.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-telemetry-contract.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-ui-instrumentation.md: documentation_artifact_expected
- docs/agent-truth/task-onboarding-parity-semantics.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/task-guidance-batch31-shared.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-guidance-route-audit.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reward-ledger.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch31-task-guidance-parity.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-event-normalization.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-history-recovery.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-telemetry-contract.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-ui-instrumentation.ts: validator_artifact_expected
- scripts/agent/validate-task-onboarding-parity-semantics.ts: validator_artifact_expected
- src/components/Dashboard/DailyTasksModule.tsx: real_source_change_needs_review
- src/components/Dashboard/TaskGuidanceBanner.tsx: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/task-onboarding-parity-semantics.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts: real_source_change_needs_review
- src/lib/privacy/consent-tracking-policy.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-tasks.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/lib/task-guidance.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-history-recovery.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-telemetry-contract.ts: real_source_change_needs_review
- tests/unit/debug-cockpit-batch31-task-guidance-parity.spec.ts: test_artifact_expected
- tests/unit/task-guidance-event-normalization.spec.ts: test_artifact_expected
- tests/unit/task-guidance-history-recovery.spec.ts: test_artifact_expected
- tests/unit/task-guidance-telemetry-contract.spec.ts: test_artifact_expected
- tests/unit/task-guidance-ui-instrumentation.spec.ts: test_artifact_expected
- tests/unit/task-onboarding-parity-semantics.spec.ts: test_artifact_expected

## Validation Failures

- none

# Auth Persistence Stability

Generated: 2026-05-24T09:07:24.018Z
Current HEAD: a998782f

## Status

- Persistence: established
- Transition classifier: mapped
- Navigation session delete policy: reasoned_only
- Profile snapshot retry: transient_retry_keeps_user
- Logout reasons: mapped
- Security logout handling: preserved
- Explicit logout: clears_session
- Debug lane: Auth persistence

## Telemetry

- auth_persistence_established
- auth_session_restored
- auth_state_changed
- auth_unexpected_session_drop
- auth_logout_started
- auth_logout_completed
- auth_navigation_session_deleted
- auth_profile_snapshot_reconnect
- auth_profile_snapshot_failed

## Dirty File Classification

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/auth-persistence-stability.generated.json: current_generated_artifact_to_commit
- agent/state/auth-provider-conflict-resolution.generated.json: current_generated_artifact_to_commit
- agent/state/auth-runtime-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/auth-persistence-stability.md: release_artifact_expected
- docs/agent-truth/auth-provider-conflict-resolution.md: release_artifact_expected
- docs/agent-truth/auth-runtime-telemetry.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: release_artifact_expected
- docs/agent-truth/feature-registration-gate.md: release_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: release_artifact_expected
- package.json: real_source_change_needs_review
- scripts/agent/validate-auth-persistence-stability.ts: validator_artifact_expected
- scripts/agent/validate-auth-provider-conflict-resolution.ts: validator_artifact_expected
- scripts/agent/validate-auth-runtime-telemetry.ts: validator_artifact_expected
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/components/Auth/AuthModal.tsx: real_source_change_needs_review
- src/context/AuthContext.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/auth/auth-telemetry-contract.ts: real_source_change_needs_review
- src/lib/behavioral/normalize-event-fact.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- tests/unit/auth-runtime-telemetry.spec.ts: test_artifact_expected
- tests/unit/user-management-refactor.spec.ts: test_artifact_expected

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 92.5 | 92.5 | target_met | No auth persistence-specific score action required. |
| runtimeHealth | 84.2 | 84.2 | target_met | No auth persistence-specific score action required. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Remaining below-target score is governed by formal evidence/cost gates; auth persistence source evidence is now mapped. |
| freshness | 83.75 | 83.75 | target_met | No auth persistence-specific score action required. |
| costRisk | 42 | 42 | below_target | Remaining below-target score is governed by formal evidence/cost gates; auth persistence source evidence is now mapped. |
| regressionRisk | 86 | 86 | target_met | No auth persistence-specific score action required. |
| overallHealthScore | 79.25 | 79.25 | below_target | Remaining below-target score is governed by formal evidence/cost gates; auth persistence source evidence is now mapped. |

## Old Logic Classification

- browserLocalPersistence: still_required - Firebase browser local persistence is the source-backed restore mechanism.
- navigation-session DELETE inside onAuthStateChanged: stale_removed - Navigation session deletion is now reasoned through shouldDeleteNavigationSession/deleteNavigationSession.
- auth profile snapshot auto-healing: still_required - Profile listener reconnects remain active and now emit retry/failure telemetry.

## Remaining Gaps

- None for source-level auth persistence stabilization.

## Release Note

- Improved auth persistence and unexpected logout tracking.
- Separated security logouts from transient session failures.
- Added debug visibility for auth session stability.

## Next Exact Steps

- Run a local browser restore/logout smoke when browser QA is explicitly authorized.
- Attach deployed runtime evidence before clearing any formal beta runtime gate.


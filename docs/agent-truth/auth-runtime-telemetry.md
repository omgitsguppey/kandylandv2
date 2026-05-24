# Auth Runtime Telemetry

Generated: 2026-05-24T09:24:25.334Z
Current HEAD: 309d6b03

## Status

- Feature registration: mapped
- Event envelope: mapped
- Person metrics: mapped
- Debug lane: Auth runtime
- Privacy: metadata_stripped_and_email_hash_only

## Event Families

- auth_surface_viewed
- auth_google_started
- auth_google_completed
- auth_google_failed
- auth_email_login_started
- auth_email_login_completed
- auth_email_login_failed
- auth_email_signup_started
- auth_email_signup_completed
- auth_email_signup_failed
- auth_provider_conflict_detected
- auth_password_reset_requested
- auth_password_reset_failed
- auth_navigation_session_started
- auth_navigation_session_completed
- auth_navigation_session_failed
- auth_session_restored
- auth_unexpected_session_drop
- auth_logout_started
- auth_logout_completed
- auth_profile_bootstrap_started
- auth_profile_bootstrap_completed
- auth_profile_bootstrap_failed

## Admin Debug Lane

- Signup attempts: 0
- Login attempts: 0
- Provider conflicts: 0
- Unexpected logouts: 0
- Navigation session failures: 0
- Profile bootstrap failures: 0
- Raw details collapsed by default: true

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 92.5 | 92.5 | target_met | No auth runtime-specific score action required. |
| runtimeHealth | 84.2 | 84.2 | target_met | No auth runtime-specific score action required. |
| evidenceCompleteness | 69.6 | 69.6 | below_target | Remaining below-target score is governed by formal evidence or cost gates; auth runtime telemetry is source-wired. |
| freshness | 83.75 | 83.75 | target_met | No auth runtime-specific score action required. |
| costRisk | 42 | 42 | below_target | Remaining below-target score is governed by formal evidence or cost gates; auth runtime telemetry is source-wired. |
| regressionRisk | 86 | 86 | target_met | No auth runtime-specific score action required. |
| overallHealthScore | 79.25 | 79.25 | below_target | Remaining below-target score is governed by formal evidence or cost gates; auth runtime telemetry is source-wired. |

## Dirty File Classification

- CHANGELOG.md: release_artifact_expected
- agent/state/auth-persistence-stability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/auth-provider-conflict-resolution.generated.json: stale_generated_artifact_to_regenerate
- agent/state/auth-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/auth-runtime-telemetry.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/email-password-auth-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/auth-persistence-stability.md: documentation_artifact_expected
- docs/agent-truth/auth-provider-conflict-resolution.md: documentation_artifact_expected
- docs/agent-truth/auth-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/auth-runtime-telemetry.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/email-password-auth-refactor.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-auth-persistence-stability.ts: validator_artifact_expected
- scripts/agent/validate-auth-provider-conflict-resolution.ts: validator_artifact_expected
- scripts/agent/validate-auth-readiness-lock.ts: validator_artifact_expected
- scripts/agent/validate-auth-runtime-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-email-password-auth-refactor.ts: validator_artifact_expected
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/auth-readiness-lock.spec.ts: test_artifact_expected

## Stale Auth Telemetry Logic

- auth_sign_in_attempted/auth_sign_in_success/auth_sign_in_failed: current_alias_compatibility - Legacy admin outcome events remain for compatibility while auth_email_login_* is the runtime family.
- auth_sign_up_attempted/auth_sign_up_success/auth_sign_up_failed: current_alias_compatibility - Legacy signup events remain for admin outcome history while auth_email_signup_* is the runtime family.
- auth_profile_snapshot_failed: still_required - Persistence lane still consumes profile snapshot failures; auth_profile_bootstrap_failed feeds runtime telemetry.

## Release Note

- Connected auth signup, login, provider conflicts, and session stability to telemetry.
- Added admin debug visibility for auth runtime health.
- Protected auth telemetry from raw PII or token exposure.

## Next Exact Steps

- Attach deployed runtime auth smoke evidence before clearing formal runtime gates.
- Keep admin auth runtime summaries redacted and drilldown-only for raw details.


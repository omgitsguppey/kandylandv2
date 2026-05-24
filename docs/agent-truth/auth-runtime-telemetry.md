# Auth Runtime Telemetry

Generated: 2026-05-24T09:11:29.148Z
Current HEAD: ede8db7f

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

- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate

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


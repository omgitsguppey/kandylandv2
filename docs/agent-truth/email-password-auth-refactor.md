# Email Password Auth Refactor

Generated: 2026-05-24T08:26:31.930Z
Current HEAD: 085ad0be

## Status

- Contract: mapped
- Signup flow: mapped
- Login flow: mapped
- Registration outcome classification: mapped
- Rollback: safe
- Navigation session ordering: after_registration_truth
- Welcome bonus source: reward_gd_only
- Manual registration state: cleared_in_finally
- Google auth path: untouched_required_path_present

## Common Error Mapping

- auth/email-already-in-use: email_already_in_use -> use_email_password
- auth/use-google-sign-in: google_account_email_password_attempt -> continue_with_google
- auth/invalid-email: invalid_email -> retry
- auth/wrong-password: wrong_password -> reset_password
- auth/invalid-credential: invalid_credentials -> reset_password
- auth/username-already-in-use: username_conflict -> retry
- auth/missing-password: missing_password -> retry
- auth/weak-password: weak_password -> retry
- auth/navigation-session-failed: navigation_session_failed -> retry

## Dirty File Classification

- CHANGELOG.md: release_artifact_expected
- agent/state/auth-provider-conflict-resolution.generated.json: current_generated_artifact_to_commit
- agent/state/email-password-auth-refactor.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/auth-provider-conflict-resolution.md: release_artifact_expected
- docs/agent-truth/email-password-auth-refactor.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-auth-provider-conflict-resolution.ts: validator_artifact_expected
- scripts/agent/validate-email-password-auth-refactor.ts: validator_artifact_expected
- src/context/AuthContext.tsx: real_source_change_needs_review
- src/lib/auth-errors.ts: real_source_change_needs_review
- src/lib/auth/email-password-auth-contract.ts: real_source_change_needs_review
- src/lib/auth/email-password-auth-flow.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/auth-errors.spec.ts: test_artifact_expected
- tests/unit/email-password-auth-refactor.spec.ts: test_artifact_expected

## Score Dimensions

- sourceHealth: 92.5 -> 92.5 (target_met)
- runtimeHealth: 84.2 -> 84.2 (target_met)
- evidenceCompleteness: 69.6 -> 69.6 (below_target)
- freshness: 83.75 -> 83.75 (target_met)
- costRisk: 42 -> 42 (below_target)
- regressionRisk: 86 -> 86 (target_met)
- overallHealthScore: 79.25 -> 79.25 (below_target)

## Remaining Gaps

- None for source-level email/password auth refactor.

## Next Exact Steps

- Run an authenticated local manual signup/login smoke when browser QA is explicitly authorized.
- Keep Firebase provider conflict handling separate from automatic provider linking until a safe linking flow exists.


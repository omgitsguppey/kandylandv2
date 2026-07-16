# Email Password Auth Refactor

Generated: 2026-07-16T04:23:50.284Z
Current HEAD: 621afada2aea0ef269a02c7ac68d4424bfce5214

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


## Score Dimensions

- sourceHealth: 83.6 -> 83.6 (target_met)
- runtimeHealth: 50.22 -> 50.22 (below_target)
- evidenceCompleteness: 45 -> 45 (below_target)
- freshness: 59.38 -> 59.38 (below_target)
- costRisk: 92.5 -> 92.5 (target_met)
- regressionRisk: 94 -> 94 (target_met)
- overallHealthScore: 63.18 -> 63.18 (below_target)

## Remaining Gaps

- None for source-level email/password auth refactor.

## Next Exact Steps

- Run an authenticated local manual signup/login smoke when browser QA is explicitly authorized.
- Keep Firebase provider conflict handling separate from automatic provider linking until a safe linking flow exists.


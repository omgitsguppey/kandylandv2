# Auth Provider Conflict Resolution

Generated: 2026-07-16T04:23:51.886Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214

This source-only lock maps common Firebase auth provider conflicts to safe user guidance, telemetry, and debug evidence. It does not auto-link providers, expose raw passwords, expose raw email addresses in telemetry, mutate accounts outside the existing signup rollback flow, or run production reads.

## Status

- Google-created email/password attempt: mapped
- Email/password-created Google attempt: mapped
- Email already in use: mapped
- Wrong password / invalid credential guidance: mapped
- Raw Firebase error leak: false
- Telemetry: mapped
- Auth persistence: browser_local_persistence_enabled

## Conflict Map

| Firebase code | Attempted method | Conflict kind | Resolution |
| --- | --- | --- | --- |
| auth/use-google-sign-in | email_password | google_account_email_password_attempt | continue_with_google |
| auth/account-exists-with-different-credential | google | email_account_google_attempt | reset_password |
| auth/email-already-in-use | email_password | email_already_in_use | use_email_password |
| auth/wrong-password | email_password | wrong_password | reset_password |
| auth/invalid-credential | email_password | invalid_credentials | reset_password |
| auth/missing-password | email_password | missing_password | retry |

## Score

- sourceHealth: 83.6 -> 83.6; target_met; next=No auth-provider-conflict action needed for this dimension.
- runtimeHealth: 50.22 -> 50.22; below_target; next=Keep the owning beta score lane visible until formal blockers are resolved.
- evidenceCompleteness: 45 -> 45; below_target; next=Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- freshness: 59.38 -> 59.38; below_target; next=Keep the owning beta score lane visible until formal blockers are resolved.
- costRisk: 92.5 -> 92.5; target_met; next=No auth-provider-conflict action needed for this dimension.
- regressionRisk: 94 -> 94; target_met; next=No auth-provider-conflict action needed for this dimension.
- overallHealthScore: 63.18 -> 63.18; below_target; next=Keep the owning beta score lane visible until formal blockers are resolved.

## Remaining Gaps

- runtimeHealth: Keep the owning beta score lane visible until formal blockers are resolved.
- evidenceCompleteness: Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- freshness: Keep the owning beta score lane visible until formal blockers are resolved.
- overallHealthScore: Keep the owning beta score lane visible until formal blockers are resolved.

## Next Exact Steps

- runtimeHealth: Keep the owning beta score lane visible until formal blockers are resolved.
- evidenceCompleteness: Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- freshness: Keep the owning beta score lane visible until formal blockers are resolved.
- overallHealthScore: Keep the owning beta score lane visible until formal blockers are resolved.

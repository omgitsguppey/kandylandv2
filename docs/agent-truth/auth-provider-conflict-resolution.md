# Auth Provider Conflict Resolution

Generated: 2026-05-24T08:26:33.944Z
Current head: 085ad0be

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

- sourceHealth: 92.5 -> 92.5; target_met; next=No auth-provider-conflict action needed for this dimension.
- runtimeHealth: 84.2 -> 84.2; target_met; next=No auth-provider-conflict action needed for this dimension.
- evidenceCompleteness: 69.6 -> 69.6; below_target; next=Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- freshness: 83.75 -> 83.75; target_met; next=No auth-provider-conflict action needed for this dimension.
- costRisk: 42 -> 42; below_target; next=Complete external cost owner review; auth conflict source changes do not claim billing proof.
- regressionRisk: 86 -> 86; target_met; next=No auth-provider-conflict action needed for this dimension.
- overallHealthScore: 79.25 -> 79.25; below_target; next=Keep the owning beta score lane visible until formal blockers are resolved.

## Remaining Gaps

- evidenceCompleteness: Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- costRisk: Complete external cost owner review; auth conflict source changes do not claim billing proof.
- overallHealthScore: Keep the owning beta score lane visible until formal blockers are resolved.

## Next Exact Steps

- evidenceCompleteness: Attach formal provider/runtime/admin evidence; keep source-only auth conflict evidence separate.
- costRisk: Complete external cost owner review; auth conflict source changes do not claim billing proof.
- overallHealthScore: Keep the owning beta score lane visible until formal blockers are resolved.

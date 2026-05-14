# Admin Analytics Auth Outcomes

Authority: Current supporting doctrine for the Admin Analytics Auth Outcomes panel.

Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

Auth Outcomes canonical source is the first-party auth_attempt_* chain.

Exact auth attempt tracking requires:

- `auth_attempt_started` with `authAttemptId`, method or provider, and start timestamp.
- `auth_attempt_succeeded` with the same `authAttemptId`, method or provider, finish timestamp, and duration.
- `auth_attempt_failed` with the same `authAttemptId`, method or provider, safe failure code, finish timestamp, and duration.
- `auth_attempt_unfinished` when a started attempt does not get a terminal outcome before timeout or window close.

Email/password combines email_sign_in and email_sign_up. Google uses google_sign_in.

Legacy auth_*_attempted/success/failed counts are partial fallback only. They can describe event volume by method, but they are not exact attempt chains because they do not prove distinct attempt identity, terminal outcome pairing, or finish timing.

Missing auth sample is no-sample or unavailable, not error. The primary mobile UI should show one compact status and one manual action line instead of Attempts, Successes, Failures, Success Rate, Avg Finish, empty Method Split, and empty Lifecycle panels full of unavailable values.

Failure reasons come from safe failure-code fields only: `failureCode`, `failure_code`, `errorCode`, `error_code`, `reasonCode`, or `reason_code`. If a failed attempt has no safe failure code, primary UI says "Failure reason not captured." It must not show `failure_code_unavailable` as an operator-facing error.

Manual workaround: perform an email/password success, an intentional email/password failure, and a Google login attempt if available, then refresh the selected range.

Future exact math:

1. Attempts = count distinct `authAttemptId` per method group.
2. Successes = count terminal success outcomes.
3. Failures = count terminal failure outcomes.
4. Unfinished = started attempts without terminal outcome before timeout/window close.
5. Success rate = successes / attempts.
6. Top failure code = mode of safe failureCode over failed attempts.

Do not log raw password or email values in auth telemetry.

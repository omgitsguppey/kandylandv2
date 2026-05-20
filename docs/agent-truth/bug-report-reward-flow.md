# Bug Report Reward Flow

Generated: 2026-05-20T05:34:00.649Z

Current head: `44556013b9dba08ec65eee7ed0e9549762f1ca8b`

## Status

Phase 2 creates the one-tap bug report reward contract and route. It does not wire every product surface yet and does not expose raw debug details to normal users.

## Reward Contract

- Eligible translated platform/action bugs can grant 10 reward GumDrops.
- Bug report rewards credit reward balance only, never purchased balance.
- Auth is required before any reward is considered.
- Duplicate reports for the same user, error, surface, route, and previous route are blocked for 21600000 ms.
- Daily rewards are capped at 3 per user.

## Route

- Route: `POST /api/bug-reports`
- Stores sanitized records in `bug_reports`.
- Uses safe internal redirects only.
- Returns human success/failure payloads without raw stack, Firebase, PayPal, Zod, token, or provider details.

## Next Fix Order

1. Wire translated platform errors on selected user/creator surfaces to useSubmitBugReport.
2. Expose raw bug report diagnostics only in Debug/admin evidence surfaces.
3. Add operator review tooling for bug_reports after admin scope is explicitly approved.

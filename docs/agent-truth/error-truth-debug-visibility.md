# Error Truth Debug Visibility

Generated: 2026-05-17T20:26:19.044Z

Current HEAD: df4c879a6edd33286f7ee44e48d4eb4a31c014bc

## Summary

- Phase 4 status: pass
- Debug route: `GET /api/admin/debug/bug-reports`
- Admin read-only: true
- Max read limit: 50
- Redaction enabled: true
- Reward mutation allowed: false
- Balance mutation allowed: false
- Raw secrets visible: false

## Route Truth

The bug report debug route is admin-gated and read-only. It reads the latest bounded `bug_reports` sample, summarizes it for Debug, and does not mutate bug reports, rewards, user balances, or transactions.

## Debug Surface

`DebugBugReportSummary` shows total reports, rewarded reports, duplicates, cap-reached reports, top error keys, top surfaces, and latest reports with user-facing copy plus operator messages. It is mounted in the Admin Debug Advanced tab.

## Redaction

Debug visibility keeps structured truth visible but strips sensitive keys including token, secret, password, authorization, cookie, PayPal, capture, clientSecret, and stack. Normal user/creator UI remains on translated HumanErrorNotice copy and does not render operator-only details.

## Next

- Run `npm run check:error-handling-final-readiness`.
- Attach real screenshot, provider, runtime, and admin truth evidence before beta exit review.

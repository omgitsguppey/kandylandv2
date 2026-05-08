# Server loading speed

Server speed hardening requires cheap rejection before expensive reads:

- Method/content/auth/rate checks run before Firestore/Admin SDK access where avoidable.
- Route lanes stay bounded and avoid unbounded scans.
- 4xx/probe/legacy paths use cheap typed responses.
- Analytics ingest keeps cap/dedupe guardrails.

Command: `npm run check:server-loading-speed`

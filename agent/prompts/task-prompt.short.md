# SHORT Task Context

Task: add or modify a telemetry event safely
Mode: runtime
Scope: moderate
Why scope: Touches several files or shared helper surfaces with non-trivial adjacency.

Likely touched files:
- src/lib/telemetry.ts
- functions/src/analytics-event-facts.ts
- functions/src/analytics-security-events.ts
- functions/src/analytics-task-events.ts
- src/lib/telemetry-catalog.ts
- src/lib/server/admin-analytics-historical-validation.ts

Canonical helpers to reuse:
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/chat-realtime.ts
- src/lib/creator-onboarding.ts

Relevant pitfalls:
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback

Required verification:
- npm run check:analytics-semantics
- npm run check:telemetry
- npm run test:contracts
- npm run check:ui:audits
- npm --prefix functions run check

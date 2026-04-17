# SHORT Task Context

Task: add or modify a telemetry event safely
Mode: runtime
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

Likely touched files:
- src/lib/telemetry.ts
- functions/src/analytics-event-facts.ts
- functions/src/analytics-security-events.ts
- functions/src/analytics-task-events.ts
- src/lib/platform-config.ts
- src/lib/telemetry-catalog.ts

Canonical helpers to reuse:
- src/lib/creator-onboarding.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/chat-realtime.ts

Relevant pitfalls:
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback

Required verification:
- npm run check:architecture
- npm run check:inventory
- npm run check:continuity
- git status --short
- npm run trace:adjacent -- <path>

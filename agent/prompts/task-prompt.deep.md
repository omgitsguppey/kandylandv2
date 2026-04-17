# DEEP Task Context

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
- src/components/Dashboard/CreatorWorkspacePanel.tsx
- src/lib/server/admin-analytics-historical-validation.ts
- src/lib/client-error-reporting.ts
- src/lib/creator-experiences.ts
- src/lib/creator-onboarding.ts
- src/components/Analytics/PageViewEvent.tsx

Canonical helpers to reuse:
- src/lib/creator-onboarding.ts
- src/lib/telemetry-catalog.ts
- src/lib/telemetry.ts
- src/lib/chat-realtime.ts
- src/lib/server/auth.ts
- src/lib/server/creator-onboarding.ts
- src/lib/server/request-guard.ts
- src/lib/server/route-diagnostics.ts

Relevant pitfalls:
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- sidecar_truth_confusion

Required verification:
- npm run check:architecture
- npm run check:inventory
- npm run check:continuity
- git status --short
- npm run trace:adjacent -- <path>

Optional verification:
- npm run check:telemetry
- npm run test:ui:storybook
- npm run test:contracts
- npm run test:contracts:watch
- npm run test:rules:firestore
- npm run test:rules:storage
- npm run storybook
- npm run build-storybook

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/telemetry.ts
- src/lib/platform-config.ts
- src/lib/telemetry-catalog.ts
- src/lib/server/admin-analytics-historical-validation.ts
- src/lib/client-error-reporting.ts
- src/lib/creator-experiences.ts
- src/lib/creator-onboarding.ts

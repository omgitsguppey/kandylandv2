# DEEP Task Context

## Goal
harden deterministic behavioral ranking data without touching PayPal or the economy ledger

Mode: runtime
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

## Likely Entrypoints
- src/lib/server/behavioral-intelligence.ts
- src/app/api/drops/recommendations/route.ts
- src/lib/admin-analytics-truth.ts
- src/lib/server/admin-analytics-capture-health.ts
- src/lib/server/admin-analytics-historical-validation.ts
- src/app/api/admin/analytics/historical/route.ts
- src/app/api/admin/analytics/realtime/route.ts
- src/lib/telemetry.ts
- src/components/Analytics/PageViewEvent.tsx
- src/lib/server/analytics.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- REPO_MEMORY_LEDGER.md
- EVERY_FILE_FUNCTION_CHECKLIST.md
- .agent/workflows/auto-tasks.md

## Canonical Helpers To Reuse
- src/lib/telemetry.ts
- src/lib/telemetry-catalog.ts
- src/lib/server/auth.ts
- src/lib/server/request-guard.ts
- src/lib/ai-drop-covers.ts
- src/lib/chat-realtime.ts
- src/lib/creator-onboarding.ts
- src/lib/gumdrop-economics.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- sidecar_truth_confusion
- route_runtime_stale_vs_unseen_confusion
- legacy_queue_adapter_usage

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- src/lib/server/behavioral-intelligence.ts
- npm run agent:test -- src/app/api/drops/recommendations/route.ts
- npm run agent:test -- src/lib/admin-analytics-truth.ts
- npm run agent:test -- src/lib/server/admin-analytics-capture-health.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics
- npm run check:agent-context

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

## Compatibility Verification Fields
- required: npm run check:agent-context
- required: npm run check:continuity
- required: npm run trace:adjacent -- <path>
- required: npm run test:contracts
- required: npm run check:ui:audits
- required: npm run check:telemetry
- required: npm run check:analytics-semantics
- required: npm run check:architecture
- required: npm run check:inventory
- optional: npm run check:analytics-semantics

Do not read unless needed:

Do not touch without broad signoff:
- src/lib/server/behavioral-intelligence.ts
- src/lib/admin-analytics-truth.ts
- src/lib/server/admin-analytics-capture-health.ts
- src/lib/server/admin-analytics-historical-validation.ts
- src/lib/telemetry.ts
- src/lib/server/analytics.ts
- scripts/check-analytics-continuity.ts

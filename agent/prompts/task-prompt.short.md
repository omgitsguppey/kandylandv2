# SHORT Task Context

## Goal
cut over analytics and behavioral materializers so they consume canonical runtime facts and metric facts only

Mode: server
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

## Likely Entrypoints
- functions/src/analytics-truth-cli.ts
- functions/src/behavioral-intelligence-runtime.ts
- src/lib/server/admin-analytics-materializers.ts
- scripts/rebuild-analytics-truth.ts
- scripts/rebuild-behavioral-intelligence.ts

## Canonical Helpers To Reuse
- src/lib/telemetry.ts
- src/lib/server/auth.ts
- src/lib/route-runtime-health.ts
- src/lib/server/admin-panel-system-logs.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- stale_lockfile_drift
- diagnostics_serialization_crash
- request_json_parse_falls_into_500
- consumed_response_stream_fallback

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- functions/src/analytics-truth-cli.ts
- npm run agent:test -- functions/src/behavioral-intelligence-runtime.ts
- npm run agent:test -- src/lib/server/admin-analytics-materializers.ts
- npm run agent:test -- scripts/rebuild-analytics-truth.ts
- npm run check:ui:coverage
- npm run check:ui:runtime
- npm run check:telemetry
- npm run check:analytics-semantics
- npm --prefix functions run check
- npm run check:agent-context

## Signoff Verification
- npm run check:ui:audits
- npm run check:analytics:continuity
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

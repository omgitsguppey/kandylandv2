# SHORT Task Context

## Goal
validate repo intelligence fabric outputs

Mode: audit
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

## Likely Entrypoints
- scripts/agent/build-agent-indexes.ts
- scripts/agent/build-task-context.ts
- src/lib/agent-audit/affected-surface-router.ts
- src/lib/agent-audit/audit-cache.ts
- src/lib/agent-audit/audit-runtime-contract.ts

## Canonical Helpers To Reuse
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts
- src/lib/server/paypal.ts

## Acceptance Criteria
- Reuse the canonical helpers before introducing new ownership paths.
- Keep edits bounded to the likely entrypoints unless adjacency proves otherwise.
- Report any blocked or unverified lane explicitly instead of implying success.

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
- generated_artifact_cleanup_miss
- sidecar_truth_confusion

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal

## Fast Verification
- npm run typecheck
- npm run agent:test -- scripts/agent/build-agent-indexes.ts
- npm run agent:test -- scripts/agent/build-task-context.ts
- npm run agent:test -- src/lib/agent-audit/affected-surface-router.ts
- npm run agent:test -- src/lib/agent-audit/audit-cache.ts
- npm run check:agent-context

## Signoff Verification
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

# STANDARD Task Context

## Goal
validate repo intelligence fabric outputs

Mode: audit
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

## Likely Entrypoints
- scripts/agent/build-agent-indexes.ts
- scripts/agent/build-task-context.ts
- scripts/agent/run-evals.ts
- scripts/agent/build-ui-surface-coverage.ts
- scripts/agent/check-agent-context.ts
- scripts/agent/classify-repo-files.ts
- scripts/agent/extract-canonical-helpers.ts
- scripts/agent/extract-governance.ts
- scripts/agent/extract-runtime-observability.ts
- scripts/agent/extract-workflow.ts

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
- generated_artifact_cleanup_miss
- sidecar_truth_confusion
- legacy_queue_adapter_usage
- queue_activation_missing_notification_outcome
- creator_booking_timezone_drift

## Forbidden Surfaces
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Fast Verification
- npm run typecheck
- npm run agent:test -- scripts/agent/build-agent-indexes.ts
- npm run agent:test -- scripts/agent/build-task-context.ts
- npm run agent:test -- scripts/agent/run-evals.ts
- npm run agent:test -- scripts/agent/build-ui-surface-coverage.ts
- npm run check:agent-context

## Signoff Verification
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

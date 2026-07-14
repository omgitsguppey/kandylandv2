# STANDARD Task Context

## Goal
validate repo intelligence fabric outputs

Mode: audit
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

## Acceptance Criteria
- Reuse canonical helpers before introducing new ownership paths.
- Keep edits bounded to allowed files unless adjacency proves another file must move with them.
- Preserve product/runtime behavior unless the task explicitly asks for a source fix.
- Report any blocked or unverified lane explicitly instead of implying success.

## Allowed Files
- scripts/agent/build-agent-indexes.ts
- src/lib/agent-governance/generated-reports/generated-report-contract.ts
- scripts/agent/shared.ts
- scripts/agent/sync-sql.ts
- scripts/agent/verification-selector.ts
- scripts/agent/build-task-context.ts
- scripts/agent/build-ui-surface-coverage.ts
- scripts/agent/check-agent-context.ts
- scripts/agent/classify-repo-files.ts
- scripts/agent/collect-signal-source-graph.ts
- scripts/agent/extract-canonical-helpers.ts
- scripts/agent/extract-governance.ts
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts

## Forbidden Files
- src/lib/gumdrop-ledger.ts
- src/lib/gumdrop-economics.ts
- src/lib/server/paypal.ts
- src/app/api/paypal
- functions/src/analytics-transactions.ts

## Doctrine / Context Pack
- scripts/agent/build-agent-indexes.ts
- src/lib/agent-governance/generated-reports/generated-report-contract.ts
- scripts/agent/shared.ts
- scripts/agent/sync-sql.ts
- scripts/agent/verification-selector.ts
- scripts/agent/build-task-context.ts
- scripts/agent/build-ui-surface-coverage.ts
- scripts/agent/check-agent-context.ts
- scripts/agent/classify-repo-files.ts
- scripts/agent/collect-signal-source-graph.ts
- FULL_SCALE_CODEBASE_AUDIT.md
- REPO_MEMORY_LEDGER.md
- EVERY_FILE_FUNCTION_CHECKLIST.md
- .Jules/**

## Likely Entrypoints
- scripts/agent/build-agent-indexes.ts
- src/lib/agent-governance/generated-reports/generated-report-contract.ts
- scripts/agent/shared.ts
- scripts/agent/sync-sql.ts
- scripts/agent/verification-selector.ts
- scripts/agent/build-task-context.ts
- scripts/agent/build-ui-surface-coverage.ts
- scripts/agent/check-agent-context.ts
- scripts/agent/classify-repo-files.ts
- scripts/agent/collect-signal-source-graph.ts

## Canonical Helpers To Reuse
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts
- src/lib/server/paypal.ts

## Relevant Pitfalls
- diagnostics_serialization_crash
- consumed_response_stream_fallback
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
- npm run agent:test -- src/lib/agent-governance/generated-reports/generated-report-contract.ts
- npm run agent:test -- scripts/agent/shared.ts
- npm run agent:test -- scripts/agent/sync-sql.ts
- npm run check:agent-context

## Signoff Verification
- npm run check:inventory
- npm run check:architecture
- npm run check:agent-intelligence
- npm run eval:agent-context
- npm run check:continuity

## Likely Duplicate Logic Searches
- rg -n "duplicate|legacy|deprecated|orphan|moved" <touched-domain>
- rg -n "paypal|purchase|wallet|gumdrop|unlock|entitlement|sourceOfFunds" src tests scripts/agent

## Release Note Impact
- review_required

## Rollback Note
- Rollback by reverting the narrow patch; do not alter balances, provider callbacks, entitlements, or source-of-funds records outside the selected slice.

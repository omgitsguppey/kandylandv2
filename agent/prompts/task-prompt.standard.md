# STANDARD Task Context

Task: validate repo intelligence fabric outputs
Mode: audit
Scope: broad
Why scope: Touches repo-tooling, governance, or multiple broad-signoff surfaces.

Likely touched files:
- scripts/agent/build-agent-indexes.ts
- scripts/agent/build-task-context.ts
- scripts/agent/build-ui-surface-coverage.ts
- scripts/agent/check-agent-context.ts
- scripts/agent/extract-runtime-observability.ts
- scripts/agent/run-evals.ts
- scripts/agent/sync-sql.ts
- scripts/agent/classify-repo-files.ts
- scripts/agent/extract-canonical-helpers.ts
- scripts/agent/extract-governance.ts

Canonical helpers to reuse:
- src/lib/gumdrop-economics.ts
- src/lib/gumdrop-ledger.ts
- src/lib/server/paypal.ts

Relevant pitfalls:
- diagnostics_serialization_crash
- generated_artifact_cleanup_miss
- sidecar_truth_confusion
- legacy_queue_adapter_usage
- queue_activation_missing_notification_outcome
- creator_booking_timezone_drift

Required verification:
- npm run check:agent-context
- npm run check:continuity
- npm run trace:adjacent -- <path>
- npm run check:architecture
- npm run check:inventory

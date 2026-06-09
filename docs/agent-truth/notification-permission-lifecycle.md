# Notification Permission Lifecycle

Generated: 2026-06-09T01:08:18.932Z
Current HEAD: 00b18bf22

## Status

- Permission state tracked: true
- Auto prompt on page load blocked: true
- Cooldown policy present: true
- Retry policy present: true
- Aria busy preserved: true
- Canonical envelope mapped: true
- Telemetry catalog mapped: true
- Feature registration mapped: true
- Person metrics mapped: true
- Debug lane present: true

## Lifecycle Events

- notification_prompt_eligible
- notification_prompt_viewed
- notification_prompt_dismissed
- notification_permission_requested
- notification_permission_granted
- notification_permission_denied
- notification_permission_failed
- notification_prompt_snoozed
- notification_prompt_blocked

## Debug Lane

- Label: Notification permission
- Telemetry: mapped
- Raw details collapsed: true

## Score Impact

- sourceHealth: 91.7 -> 91.7 (Notification prompt lifecycle has explicit source contract, telemetry events, and validator coverage.)
- runtimeHealth: 72.8 -> 72.8 (Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.)
- evidenceCompleteness: 43.4 -> 43.4 (Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.)
- freshness: 59.38 -> 59.38 (Notification lifecycle report is regenerated from current source.)
- costRisk: 42 -> 42 (Prompt state is local and event-only; no production reads or provider calls are added.)
- regressionRisk: 94 -> 94 (Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.)
- overallHealthScore: 68.67 -> 68.67 (Moves notification readiness evidence without clearing formal runtime/provider gates.)

## Dirty Files

- .agent/workflows/auto-tasks.md: unsafe_unknown
- .agent/workflows/pre-commit.md: unsafe_unknown
- .env.example: unsafe_unknown
- .gitignore: unsafe_unknown
- agent/context/doctrine.cards.jsonl: unsafe_unknown
- agent/context/doctrine.index.json: unsafe_unknown
- agent/context/file-size-budget.json: unsafe_unknown
- agent/context/legacy-registry.json: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/task-pack.generated.json: unsafe_unknown
- agent/context/validator-map.json: unsafe_unknown
- agent/index/blast-radius.json: unsafe_unknown
- agent/index/canonical-helpers.json: unsafe_unknown
- agent/index/dependency-graph.summary.json: unsafe_unknown
- agent/index/governance-truth.json: unsafe_unknown
- agent/index/known-pitfalls.json: unsafe_unknown
- agent/index/package-manager-truth.json: unsafe_unknown
- agent/index/recent-passes.json: unsafe_unknown
- agent/index/repo-inventory.json: unsafe_unknown
- agent/index/retrieval-index.json: unsafe_unknown
- agent/README.md: unsafe_unknown
- scripts/agent/validate-notification-permission-lifecycle.ts: validator_artifact_expected
- scripts/agent/validate-notification-return-loop.ts: validator_artifact_expected
- scripts/agent/validate-push-token-registration.ts: validator_artifact_expected
- tests/unit/notification-permission-lifecycle.spec.ts: test_artifact_expected

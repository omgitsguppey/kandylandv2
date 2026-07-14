# Notification Permission Lifecycle

Generated: 2026-07-14T06:24:27.565Z
Current HEAD: dc4dad82c

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

- sourceHealth: 95.5 -> 95.5 (Notification prompt lifecycle has explicit source contract, telemetry events, and validator coverage.)
- runtimeHealth: 70.22 -> 70.22 (Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.)
- evidenceCompleteness: 80 -> 80 (Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.)
- freshness: 92.5 -> 92.5 (Notification lifecycle report is regenerated from current source.)
- costRisk: 92.5 -> 92.5 (Prompt state is local and event-only; no production reads or provider calls are added.)
- regressionRisk: 94 -> 94 (Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.)
- overallHealthScore: 83.38 -> 83.38 (Moves notification readiness evidence without clearing formal runtime/provider gates.)

## Dirty Files

- .env.example: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/index/ui-surface-coverage.json: unsafe_unknown
- agent/state/4xx-cost-guardrails.generated.json: stale_generated_artifact_to_regenerate
- agent/state/account-settings-delete-flow.generated.json: stale_generated_artifact_to_regenerate
- agent/state/account-settings-mobile-padding.generated.json: stale_generated_artifact_to_regenerate
- agent/state/admin-truth-replacement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-ingest-firestore-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/backend-route-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/backend-service-ownership.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-composer-modal-lift.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-presence-typing.generated.json: stale_generated_artifact_to_regenerate
- agent/state/codebase-hardening.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-env-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-infra-gut-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/config-infra-memory-writeback.generated.json: stale_generated_artifact_to_regenerate
- agent/state/consent-tracking-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/content-protection-score.generated.json: stale_generated_artifact_to_regenerate
- FULL_SCALE_CODEBASE_AUDIT.md: unsafe_unknown
- README.md: unsafe_unknown
- REPO_MEMORY_LEDGER.md: unsafe_unknown
- src/app/api/notifications/push-token/route.ts: real_source_change_needs_review
- src/app/api/notifications/route.ts: unsafe_unknown
- tests/unit/notifications-route.spec.ts: unsafe_unknown

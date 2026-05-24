# Notification Permission Lifecycle

Generated: 2026-05-24T06:22:13.086Z
Current HEAD: 8b129dfd

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

- sourceHealth: 92.5 -> 92.5 (Notification prompt lifecycle has explicit source contract, telemetry events, and validator coverage.)
- runtimeHealth: 84.2 -> 84.2 (Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.)
- evidenceCompleteness: 69.6 -> 69.6 (Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.)
- freshness: 83.75 -> 83.75 (Notification lifecycle report is regenerated from current source.)
- costRisk: 42 -> 42 (Prompt state is local and event-only; no production reads or provider calls are added.)
- regressionRisk: 86 -> 86 (Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.)
- overallHealthScore: 79.25 -> 79.25 (Moves notification readiness evidence without clearing formal runtime/provider gates.)

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-permission-lifecycle.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: release_artifact_expected
- docs/agent-truth/feature-registration-gate.md: release_artifact_expected
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-notification-permission-lifecycle.ts: validator_artifact_expected
- scripts/agent/validate-person-metrics-hydration.ts: validator_artifact_expected
- src/components/Dashboard/NotificationPromptBanner.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/notifications/notification-permission-contract.ts: real_source_change_needs_review
- src/lib/notifications/notification-prompt-telemetry.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- tests/unit/notification-permission-lifecycle.spec.ts: test_artifact_expected

# Notification Permission Lifecycle

Generated: 2026-05-30T05:25:44.757Z
Current HEAD: f08ba9f

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
- runtimeHealth: 84.2 -> 84.2 (Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.)
- evidenceCompleteness: 69.6 -> 69.6 (Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.)
- freshness: 67.5 -> 67.5 (Notification lifecycle report is regenerated from current source.)
- costRisk: 42 -> 42 (Prompt state is local and event-only; no production reads or provider calls are added.)
- regressionRisk: 86 -> 86 (Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.)
- overallHealthScore: 76.61 -> 76.61 (Moves notification readiness evidence without clearing formal runtime/provider gates.)

## Dirty Files

- agent/state/creator-surface-routing.generated.json: stale_generated_artifact_to_regenerate

# Notification Permission Lifecycle

Generated: 2026-07-16T04:26:06.414Z
Current HEAD: 621afada2aea0ef269a02c7ac68d4424bfce5214

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

- sourceHealth: 83.6 -> 83.6 (Notification prompt lifecycle has explicit source contract, telemetry events, and validator coverage.)
- runtimeHealth: 50.22 -> 50.22 (Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.)
- evidenceCompleteness: 45 -> 45 (Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.)
- freshness: 59.38 -> 59.38 (Notification lifecycle report is regenerated from current source.)
- costRisk: 92.5 -> 92.5 (Prompt state is local and event-only; no production reads or provider calls are added.)
- regressionRisk: 94 -> 94 (Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.)
- overallHealthScore: 63.18 -> 63.18 (Moves notification readiness evidence without clearing formal runtime/provider gates.)

## Dirty Files

- none

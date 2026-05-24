# Debug Tracking Simplification

Generated: 2026-05-24T15:32:45.221Z
Status: pass
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9

## Contract

- Admin Debug starts with one tracking summary panel before tab drilldowns.
- The summary has one lane per tracking system: identity, consent, event envelope, behavior math, feature telemetry coverage, legacy recovery, wallet funnel, runtime/debug evidence, cost/4xx, and open P1/P2 backlog.
- Each lane has a source owner, source of truth, status, severity, score impact, and drilldown target.
- Raw tables and dumps remain available behind drilldowns but do not render before the summary.
- The compact `/api/admin/debug` response includes the tracking summary by default. Full raw detail still requires explicit drilldown.
- User, creator, chat, and navigation surfaces are protected from this admin-only pass.

## Checks

- pass: summaryContractExists
- pass: requiredLanesPresent
- pass: oneTrackingSystemPerLane
- pass: everyLaneHasOwnerAndSource
- pass: rawDetailsCollapsedByDefault
- pass: panelRendersBeforeTabDrilldowns
- pass: compactRouteIncludesSummaryByDefault
- pass: fullRouteIncludesSummary
- pass: p1P2BacklogSurfaced
- pass: defaultPanelAvoidsRawDumps
- pass: duplicateMonitorGroupsModeled
- pass: unitTestCoversSummary
- pass: packageScriptPresent
- pass: userCreatorChatNavUntouched

## Changed Files

- CHANGELOG.md
- agent/context/optimized-task-context.generated.json
- agent/state/behavior-math-status-cleanup.generated.json
- agent/state/consent-tracking-mode-cleanup.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-signal-grouping.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/event-liveness-audit.generated.json
- agent/state/event-liveness-source-repair.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/feature-telemetry-coverage-cleanup.generated.json
- agent/state/legacy-recovery-status-cleanup.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/runtime-debug-signal-cleanup.generated.json
- agent/state/tracking-summary-lane-cleanup.generated.json
- docs/agent-truth/behavior-math-status-cleanup.md
- docs/agent-truth/consent-tracking-mode-cleanup.md
- docs/agent-truth/debug-signal-grouping.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/event-liveness-audit.md
- docs/agent-truth/event-liveness-source-repair.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/feature-telemetry-coverage-cleanup.md
- docs/agent-truth/legacy-recovery-status-cleanup.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/runtime-debug-signal-cleanup.md
- docs/agent-truth/tracking-summary-lane-cleanup.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/tracking-summary-lane-cleanup-shared.ts
- scripts/agent/validate-behavior-math-status-cleanup.ts
- scripts/agent/validate-consent-tracking-mode-cleanup.ts
- scripts/agent/validate-debug-signal-grouping.ts
- scripts/agent/validate-event-liveness-audit.ts
- scripts/agent/validate-event-liveness-source-repair.ts
- scripts/agent/validate-feature-telemetry-coverage-cleanup.ts
- scripts/agent/validate-legacy-recovery-status-cleanup.ts
- scripts/agent/validate-runtime-debug-signal-cleanup.ts
- scripts/agent/validate-tracking-summary-lane-cleanup.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/privacy/consent-tracking-policy.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/behavior-math-status-cleanup.spec.ts
- tests/unit/consent-tracking-mode-cleanup.spec.ts
- tests/unit/event-liveness-source-repair.spec.ts
- tests/unit/feature-telemetry-coverage-cleanup.spec.ts
- tests/unit/legacy-recovery-status-cleanup.spec.ts
- tests/unit/runtime-debug-signal-cleanup.spec.ts
- tests/unit/tracking-summary-lane-cleanup.spec.ts

## Validation Failures

- none

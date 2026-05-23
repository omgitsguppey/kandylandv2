# Debug Tracking Simplification

Generated: 2026-05-23T19:59:03.407Z
Status: pass
Current head: 1eeb1b65ff5a54ae0549e6be3550413c566289db

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
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-signal-actionability.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/future-activity-signal-reclassification.generated.json
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-signal-actionability.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/future-activity-signal-reclassification.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-debug-backlog-engine.ts
- scripts/agent/validate-debug-signal-actionability.ts
- scripts/agent/validate-future-activity-signal-reclassification.ts
- src/lib/debug/debug-backlog-builder.ts
- src/lib/debug/debug-backlog-contract.ts
- src/lib/debug/debug-signal-actionability.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/debug-backlog-engine.spec.ts
- tests/unit/debug-signal-actionability.spec.ts

## Validation Failures

- none

# Debug Tracking Simplification

Generated: 2026-05-22T23:00:46.689Z
Status: pass
Current head: f0134b5b286ea158c9f9beaf0f118e7581f0a54d

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
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-tracking-simplification.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-debug-tracking-simplification.ts
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx
- src/app/admin/debug/page.tsx
- src/app/api/admin/debug/route.ts
- src/lib/debug/debug-backlog-builder.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-debug/summary.ts
- tests/unit/debug-tracking-simplification.spec.ts

## Validation Failures

- none

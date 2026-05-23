# Debug Tracking Simplification

Generated: 2026-05-23T02:29:34.116Z
Status: pass
Current head: 002ddfd5d2b36ce35f61306aa47f7dab41f101ab

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

- agent/context/validator-authority.json
- agent/context/validator-map.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/settings-connection-parity.generated.json
- agent/state/settings-debug-validator-authority.generated.json
- agent/state/stale-client-preferences-cleanup.generated.json
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/settings-connection-parity.md
- docs/agent-truth/settings-debug-validator-authority.md
- docs/agent-truth/stale-client-preferences-cleanup.md
- package.json
- scripts/agent/validate-settings-connection-parity.ts
- scripts/agent/validate-settings-debug-validator-authority.ts
- scripts/agent/validate-stale-client-preferences-cleanup.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/debug/settings-debug-validator-authority.ts
- src/lib/settings/client-preferences-contract.ts
- src/lib/settings/settings-surface-contract.ts
- tests/unit/debug-tracking-simplification.spec.ts
- tests/unit/settings-connection-parity.spec.ts
- tests/unit/settings-debug-validator-authority.spec.ts
- tests/unit/stale-client-preferences-cleanup.spec.ts

## Validation Failures

- none

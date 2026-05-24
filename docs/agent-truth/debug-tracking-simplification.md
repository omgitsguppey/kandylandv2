# Debug Tracking Simplification

Generated: 2026-05-24T16:27:58.251Z
Status: pass
Current head: 3198b27d8499d675aa8e3ee98fe4e3368f2c77e0

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
- agent/state/admin-summary-lane-status-classifier.generated.json
- agent/state/auth-lane-status-cleanup.generated.json
- agent/state/auth-readiness-lock.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/daily-task-debug-score-lock.generated.json
- agent/state/daily-task-lane-status-cleanup.generated.json
- agent/state/debug-cockpit-batch4-cleanup.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/notification-lane-status-cleanup.generated.json
- agent/state/notification-pwa-score-lock.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/settings-debug-validator-authority.generated.json
- agent/state/settings-health-status-cleanup.generated.json
- agent/state/telemetry-trigger-test-matrix.generated.json
- agent/state/testing-coverage-status-cleanup.generated.json
- agent/state/user-management-refactor.generated.json
- agent/state/user-management-status-truth.generated.json
- docs/agent-truth/admin-summary-lane-status-classifier.md
- docs/agent-truth/auth-lane-status-cleanup.md
- docs/agent-truth/auth-readiness-lock.md
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/daily-task-debug-score-lock.md
- docs/agent-truth/daily-task-lane-status-cleanup.md
- docs/agent-truth/debug-cockpit-batch4-cleanup.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/notification-lane-status-cleanup.md
- docs/agent-truth/notification-pwa-score-lock.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/settings-debug-validator-authority.md
- docs/agent-truth/settings-health-status-cleanup.md
- docs/agent-truth/telemetry-trigger-test-matrix.md
- docs/agent-truth/testing-coverage-status-cleanup.md
- docs/agent-truth/user-management-refactor.md
- docs/agent-truth/user-management-status-truth.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/admin-status-lane-cleanup-shared.ts
- scripts/agent/validate-admin-summary-lane-status-classifier.ts
- scripts/agent/validate-auth-lane-status-cleanup.ts
- scripts/agent/validate-auth-readiness-lock.ts
- scripts/agent/validate-daily-task-debug-score-lock.ts
- scripts/agent/validate-daily-task-lane-status-cleanup.ts
- scripts/agent/validate-debug-cockpit-batch4-cleanup.ts
- scripts/agent/validate-notification-lane-status-cleanup.ts
- scripts/agent/validate-notification-pwa-score-lock.ts
- scripts/agent/validate-settings-health-status-cleanup.ts
- scripts/agent/validate-testing-coverage-status-cleanup.ts
- scripts/agent/validate-user-management-status-truth.ts
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx
- src/lib/admin/user-management-contract.ts
- src/lib/debug/admin-summary-lane-status-classifier.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/testing/telemetry-trigger-test-matrix.ts
- tests/unit/admin-summary-lane-status-classifier.spec.ts
- tests/unit/auth-lane-status-cleanup.spec.ts
- tests/unit/daily-task-lane-status-cleanup.spec.ts
- tests/unit/debug-cockpit-batch4-cleanup.spec.ts
- tests/unit/notification-lane-status-cleanup.spec.ts
- tests/unit/settings-health-status-cleanup.spec.ts
- tests/unit/testing-coverage-status-cleanup.spec.ts
- tests/unit/user-management-status-truth.spec.ts

## Validation Failures

- none

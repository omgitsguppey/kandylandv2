# Debug Tracking Simplification

Generated: 2026-05-24T16:01:56.683Z
Status: pass
Current head: 883bdc0e91e5494f3b6b3e6449d5ea722b898077

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
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-cockpit-batch3-cleanup.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/drop-watch-time-accuracy.generated.json
- agent/state/empty-live-lane-status-cleanup.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/identity-handoff-spine.generated.json
- agent/state/identity-handoff-status-cleanup.generated.json
- agent/state/notification-pwa-score-lock.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/pwa-service-worker-safety.generated.json
- agent/state/pwa-service-worker-status-cleanup.generated.json
- agent/state/session-bounce-calculation.generated.json
- agent/state/sql-database-parity-cost-lock.generated.json
- agent/state/tracking-lane-freshness-display-cleanup.generated.json
- agent/state/user-journey-behavioral-intelligence.generated.json
- agent/state/wallet-funnel-sample-cleanup.generated.json
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-cockpit-batch3-cleanup.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/drop-watch-time-accuracy.md
- docs/agent-truth/empty-live-lane-status-cleanup.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/identity-handoff-spine.md
- docs/agent-truth/identity-handoff-status-cleanup.md
- docs/agent-truth/notification-pwa-score-lock.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/pwa-service-worker-safety.md
- docs/agent-truth/pwa-service-worker-status-cleanup.md
- docs/agent-truth/session-bounce-calculation.md
- docs/agent-truth/sql-database-parity-cost-lock.md
- docs/agent-truth/tracking-lane-freshness-display-cleanup.md
- docs/agent-truth/user-journey-behavioral-intelligence.md
- docs/agent-truth/wallet-funnel-sample-cleanup.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts
- scripts/agent/validate-debug-cockpit-batch3-cleanup.ts
- scripts/agent/validate-drop-watch-time-accuracy.ts
- scripts/agent/validate-empty-live-lane-status-cleanup.ts
- scripts/agent/validate-identity-handoff-status-cleanup.ts
- scripts/agent/validate-notification-pwa-score-lock.ts
- scripts/agent/validate-pwa-service-worker-safety.ts
- scripts/agent/validate-pwa-service-worker-status-cleanup.ts
- scripts/agent/validate-session-bounce-calculation.ts
- scripts/agent/validate-sql-database-parity-cost-lock.ts
- scripts/agent/validate-tracking-lane-freshness-display-cleanup.ts
- scripts/agent/validate-user-journey-behavioral-intelligence.ts
- scripts/agent/validate-wallet-funnel-sample-cleanup.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/debug/empty-live-lane-classifier.ts
- src/lib/pwa/pwa-service-worker-contract.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/debug-cockpit-batch3-cleanup.spec.ts
- tests/unit/empty-live-lane-status-cleanup.spec.ts
- tests/unit/identity-handoff-status-cleanup.spec.ts
- tests/unit/pwa-service-worker-status-cleanup.spec.ts
- tests/unit/tracking-lane-freshness-display-cleanup.spec.ts
- tests/unit/wallet-funnel-sample-cleanup.spec.ts

## Validation Failures

- none

# Debug Tracking Simplification

Generated: 2026-05-24T17:10:06.096Z
Status: pass
Current head: a62f0177ba3e5bc7e86d8b5ec2c643258797c09a

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
- agent/state/ai-assistant-fallback-cleanup.generated.json
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-cockpit-batch6-cleanup.generated.json
- agent/state/debug-panel-output-triage.generated.json
- agent/state/debug-runtime-evidence.generated.json
- agent/state/open-actions-route-runtime-cleanup.generated.json
- agent/state/ops-canonical-state-cleanup.generated.json
- agent/state/route-diagnostics-error-map.generated.json
- agent/state/route-health-reconciliation.generated.json
- agent/state/task-user-creator-intake-status-cleanup.generated.json
- agent/state/telemetry-admin-debug-truth.generated.json
- docs/agent-truth/ai-assistant-fallback-cleanup.md
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-cockpit-batch6-cleanup.md
- docs/agent-truth/debug-runtime-evidence.md
- docs/agent-truth/open-actions-route-runtime-cleanup.md
- docs/agent-truth/ops-canonical-state-cleanup.md
- docs/agent-truth/route-diagnostics-error-map.md
- docs/agent-truth/route-health-reconciliation.md
- docs/agent-truth/task-user-creator-intake-status-cleanup.md
- docs/agent-truth/telemetry-admin-debug-truth.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/ops-health-cleanup-shared.ts
- scripts/agent/validate-admin-debug-control-tower.ts
- scripts/agent/validate-ai-assistant-fallback-cleanup.ts
- scripts/agent/validate-debug-cockpit-batch6-cleanup.ts
- scripts/agent/validate-open-actions-route-runtime-cleanup.ts
- scripts/agent/validate-ops-canonical-state-cleanup.ts
- scripts/agent/validate-route-health-reconciliation.ts
- scripts/agent/validate-task-user-creator-intake-status-cleanup.ts
- src/app/admin/debug/page.tsx
- src/lib/admin-debug-summary-cards.ts
- src/lib/debug/ai-assistant-runtime-status.ts
- src/lib/debug/ops-health-canonical-state.ts
- src/lib/debug/route-health-reconciler.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/ai-assistant-fallback-cleanup.spec.ts
- tests/unit/debug-cockpit-batch6-cleanup.spec.ts
- tests/unit/open-actions-route-runtime-cleanup.spec.ts
- tests/unit/ops-canonical-state-cleanup.spec.ts
- tests/unit/route-health-reconciliation.spec.ts
- tests/unit/task-user-creator-intake-status-cleanup.spec.ts

## Validation Failures

- none

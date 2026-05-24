# Debug Tracking Simplification

Generated: 2026-05-24T16:46:10.674Z
Status: pass
Current head: d02b8b2da859d47d880182fe2169db1ad6a40ad6

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
- agent/state/chat-functionality-score-lock.generated.json
- agent/state/chat-gating-moderation.generated.json
- agent/state/chat-gating-status-cleanup.generated.json
- agent/state/chat-telemetry-admin-truth.generated.json
- agent/state/chat-telemetry-status-cleanup.generated.json
- agent/state/config-runtime-sample-status-classifier.generated.json
- agent/state/cost-4xx-status-cleanup.generated.json
- agent/state/cost-risk-owner-review-closure.generated.json
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-cockpit-batch5-cleanup.generated.json
- agent/state/event-liveness-audit.generated.json
- agent/state/final-signal-zero-lock.generated.json
- agent/state/future-activity-catalog-status-cleanup.generated.json
- agent/state/open-backlog-status-cleanup.generated.json
- docs/agent-truth/chat-functionality-score-lock.md
- docs/agent-truth/chat-gating-moderation.md
- docs/agent-truth/chat-gating-status-cleanup.md
- docs/agent-truth/chat-telemetry-admin-truth.md
- docs/agent-truth/chat-telemetry-status-cleanup.md
- docs/agent-truth/config-runtime-sample-status-classifier.md
- docs/agent-truth/cost-4xx-status-cleanup.md
- docs/agent-truth/cost-risk-owner-review-closure.md
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-cockpit-batch5-cleanup.md
- docs/agent-truth/event-liveness-audit.md
- docs/agent-truth/final-signal-zero-lock.md
- docs/agent-truth/future-activity-catalog-status-cleanup.md
- docs/agent-truth/open-backlog-status-cleanup.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/chat-cost-status-cleanup-shared.ts
- scripts/agent/validate-chat-functionality-score-lock.ts
- scripts/agent/validate-chat-gating-moderation.ts
- scripts/agent/validate-chat-gating-status-cleanup.ts
- scripts/agent/validate-chat-telemetry-admin-truth.ts
- scripts/agent/validate-chat-telemetry-status-cleanup.ts
- scripts/agent/validate-config-runtime-sample-status-classifier.ts
- scripts/agent/validate-cost-4xx-status-cleanup.ts
- scripts/agent/validate-debug-cockpit-batch5-cleanup.ts
- scripts/agent/validate-event-liveness-audit.ts
- scripts/agent/validate-final-signal-zero-lock.ts
- scripts/agent/validate-future-activity-catalog-status-cleanup.ts
- scripts/agent/validate-open-backlog-status-cleanup.ts
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx
- src/lib/debug/config-runtime-sample-status-classifier.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/chat-gating-status-cleanup.spec.ts
- tests/unit/chat-telemetry-status-cleanup.spec.ts
- tests/unit/config-runtime-sample-status-classifier.spec.ts
- tests/unit/cost-4xx-status-cleanup.spec.ts
- tests/unit/debug-cockpit-batch5-cleanup.spec.ts
- tests/unit/future-activity-catalog-status-cleanup.spec.ts
- tests/unit/open-backlog-status-cleanup.spec.ts

## Validation Failures

- none

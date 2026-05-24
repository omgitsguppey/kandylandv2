# Debug Tracking Simplification

Generated: 2026-05-24T02:09:57.449Z
Status: pass
Current head: 7a7ad97d75695ba776d2fe2b5f2e82dfdfd8e482

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
- agent/state/chat-functionality-score-lock.generated.json
- agent/state/chat-gating-moderation.generated.json
- agent/state/chat-presence-typing.generated.json
- agent/state/chat-realtime-cost-control.generated.json
- agent/state/chat-telemetry-admin-truth.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/chat-functionality-score-lock.md
- docs/agent-truth/chat-gating-moderation.md
- docs/agent-truth/chat-presence-typing.md
- docs/agent-truth/chat-realtime-cost-control.md
- docs/agent-truth/chat-telemetry-admin-truth.md
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/feature-registration-gate.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-hydration.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-chat-functionality-score-lock.ts
- scripts/agent/validate-chat-gating-moderation.ts
- scripts/agent/validate-chat-presence-typing.ts
- scripts/agent/validate-chat-realtime-cost-control.ts
- scripts/agent/validate-chat-telemetry-admin-truth.ts
- scripts/agent/validate-debug-tracking-simplification.ts
- scripts/agent/validate-event-translation-bridge.ts
- scripts/agent/validate-feature-registration-gate.ts
- src/app/api/admin/debug/route.ts
- src/components/Chat/ChatExperience.tsx
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-contract.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/behavioral/normalize-event-fact.ts
- src/lib/chat/chat-telemetry-contract.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-debug/summary.ts
- src/lib/server/chat.ts
- src/lib/telemetry-catalog.ts
- tests/unit/chat-functionality-score-lock.spec.ts
- tests/unit/chat-telemetry-admin-truth.spec.ts
- tests/unit/user-management-refactor.spec.ts

## Validation Failures

- none

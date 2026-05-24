# Debug Tracking Simplification

Generated: 2026-05-24T09:25:22.135Z
Status: pass
Current head: 309d6b03a6e4aa5d47233d04cfb404991b75a8a8

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
- agent/state/auth-persistence-stability.generated.json
- agent/state/auth-provider-conflict-resolution.generated.json
- agent/state/auth-readiness-lock.generated.json
- agent/state/auth-runtime-telemetry.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/email-password-auth-refactor.generated.json
- agent/state/event-envelope-normalization.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/identity-handoff-spine.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/auth-persistence-stability.md
- docs/agent-truth/auth-provider-conflict-resolution.md
- docs/agent-truth/auth-readiness-lock.md
- docs/agent-truth/auth-runtime-telemetry.md
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/email-password-auth-refactor.md
- docs/agent-truth/event-envelope-normalization.md
- docs/agent-truth/identity-handoff-spine.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-hydration.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-auth-persistence-stability.ts
- scripts/agent/validate-auth-provider-conflict-resolution.ts
- scripts/agent/validate-auth-readiness-lock.ts
- scripts/agent/validate-auth-runtime-telemetry.ts
- scripts/agent/validate-email-password-auth-refactor.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/auth-readiness-lock.spec.ts

## Validation Failures

- none

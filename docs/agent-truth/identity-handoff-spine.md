# Identity Handoff Spine

Generated: 2026-05-24T16:01:31.982Z
Status: pass
Current head: 883bdc0e91e5494f3b6b3e6449d5ea722b898077

## Contract

- Every client-tracked event receives an identity envelope with `actorKind`, `identityState`, `identityConfidence`, `consentMode`, and `sessionId`.
- Guest events include a guest id when consent allows persistence, otherwise they include an unavailable reason.
- Signup, login, session restore, and consent-upgrade links use deterministic link candidates.
- Linked guest history is attributed once to the resolved user and suppresses the duplicate guest count key.
- Admin projection and legacy unknown events cannot enter user behavior metrics.
- Minimal or declined consent does not enable person-level behavioral analytics.

## Checks

- pass: canonicalContractExists
- pass: requiredActorKindsPresent
- pass: requiredIdentityStatesPresent
- pass: requiredConfidenceAndReasonsPresent
- pass: engineExportsRequiredFunctions
- pass: deterministicLinkCandidate
- pass: minimalConsentBlocksLinkage
- pass: envelopeCarriesRequiredIdentityFields
- pass: guestEnvelopeHasUnavailableReason
- pass: doubleCountGuardPreventsGuestUserDupes
- pass: adminProjectionExcluded
- pass: legacyUnknownNeverExact
- pass: telemetryUsesCanonicalEnvelope
- pass: telemetrySafetyKeepsIdentityFields
- pass: guestTrackerUsesCanonicalEnvelope
- pass: anonymousIngestRequiresIdentityEnvelope
- pass: identifiedIngestBuildsCanonicalEnvelope
- pass: debugLaneConsolidated
- pass: testCoversSpine
- pass: packageScriptPresent
- pass: protectedSurfacesUntouched

## Changed Files

- CHANGELOG.md
- agent/context/optimized-task-context.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/drop-watch-time-accuracy.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/identity-handoff-spine.generated.json
- agent/state/notification-pwa-score-lock.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/pwa-service-worker-safety.generated.json
- agent/state/session-bounce-calculation.generated.json
- agent/state/sql-database-parity-cost-lock.generated.json
- agent/state/user-journey-behavioral-intelligence.generated.json
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/drop-watch-time-accuracy.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/identity-handoff-spine.md
- docs/agent-truth/notification-pwa-score-lock.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/pwa-service-worker-safety.md
- docs/agent-truth/session-bounce-calculation.md
- docs/agent-truth/sql-database-parity-cost-lock.md
- docs/agent-truth/user-journey-behavioral-intelligence.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-drop-watch-time-accuracy.ts
- scripts/agent/validate-notification-pwa-score-lock.ts
- scripts/agent/validate-pwa-service-worker-safety.ts
- scripts/agent/validate-session-bounce-calculation.ts
- scripts/agent/validate-sql-database-parity-cost-lock.ts
- scripts/agent/validate-user-journey-behavioral-intelligence.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/pwa/pwa-service-worker-contract.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts

## Validation Failures

- none

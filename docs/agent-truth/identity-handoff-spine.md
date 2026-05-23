# Identity Handoff Spine

Generated: 2026-05-23T06:57:30.815Z
Status: pass
Current head: a817e6e36f47ff3ecc71cd643737f18dc70558a3

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
- agent/state/activity-verification-engine.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/event-envelope-normalization.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/final-behavioral-privacy-telemetry-lock.generated.json
- agent/state/identity-handoff-spine.generated.json
- agent/state/march-first-event-recovery.generated.json
- agent/state/new-additions-score-coverage.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-contract.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/telemetry-trigger-test-matrix.generated.json
- agent/state/user-management-refactor.generated.json
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-backlog-engine.md
- docs/agent-truth/debug-tracking-simplification.md
- docs/agent-truth/event-envelope-normalization.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/final-behavioral-privacy-telemetry-lock.md
- docs/agent-truth/identity-handoff-spine.md
- docs/agent-truth/march-first-event-recovery.md
- docs/agent-truth/new-additions-score-coverage.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-contract.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/telemetry-trigger-test-matrix.md
- docs/agent-truth/user-management-refactor.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-event-translation-bridge.ts
- scripts/agent/validate-new-additions-score-coverage.ts
- src/lib/admin/user-management-contract.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/testing/telemetry-trigger-test-matrix.ts

## Validation Failures

- none

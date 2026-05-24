# Identity Handoff Spine

Generated: 2026-05-24T09:25:08.292Z
Status: pass
Current head: 309d6b03a6e4aa5d47233d04cfb404991b75a8a8

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
- agent/state/auth-persistence-stability.generated.json
- agent/state/auth-provider-conflict-resolution.generated.json
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
- scripts/agent/validate-auth-runtime-telemetry.ts
- scripts/agent/validate-email-password-auth-refactor.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts

## Validation Failures

- none

# Identity Handoff Spine

Generated: 2026-05-22T20:35:08.447Z
Status: pass
Current head: 48e96ae3bca16d624a145c72406a633940050652

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
- agent/state/identity-handoff-refinement.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/identity-handoff-refinement.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-identity-handoff-refinement.ts
- src/app/api/admin/debug/route.ts
- src/app/api/analytics/ingest-identified/route.ts
- src/app/api/analytics/ingest/route.ts
- src/components/Analytics/DeepTracker.tsx
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/telemetry-safety.ts
- src/lib/telemetry.ts

## Validation Failures

- none

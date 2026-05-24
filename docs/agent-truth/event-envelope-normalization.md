# Event Envelope Normalization

Generated: 2026-05-24T09:25:08.292Z
Status: pass
Current head: 309d6b03a6e4aa5d47233d04cfb404991b75a8a8

## Contract

- Every tracked event resolves through `buildEventEnvelope` before it enters the normal analytics path.
- The canonical envelope includes identity state, consent mode, session id, feature id, surface, source, materializer lane, debug visibility, score impact, privacy class, and sanitized metadata.
- Guest, signed-in, creator, wallet, drop, behavioral, and admin events use the same envelope shape.
- Unregistered or legacy events are quarantined and cannot enter normal analytics silently.
- Forbidden metadata such as emails, phones, tokens, prompts, messages, media URLs, provider payloads, and raw payment ids is stripped before persistence.
- Admin/debug exposes one Event envelope health lane with raw dumps collapsed by default.

## Checks

- pass: canonicalContractExists
- pass: requiredFieldsPublished
- pass: builderExportsRequiredFunctions
- pass: registeredEnvelopeIsNormalAndValid
- pass: envelopeHasIdentityAndConsent
- pass: guestUserIdsRequireIdentityState
- pass: forbiddenMetadataStripped
- pass: unregisteredEventsQuarantined
- pass: legacyNormalizationNotExact
- pass: telemetryClientUsesEnvelopeBuilder
- pass: telemetrySafetyAllowsEnvelopeFields
- pass: anonymousIngestUsesEnvelopeBuilder
- pass: identifiedIngestUsesEnvelopeBuilder
- pass: debugPanelHasSingleEnvelopeLane
- pass: unitTestCoversEnvelope
- pass: packageScriptPresent
- pass: chatNavPaymentGumdropRuntimeUntouched

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

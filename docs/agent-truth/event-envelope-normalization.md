# Event Envelope Normalization

Generated: 2026-05-23T06:57:33.332Z
Status: pass
Current head: a817e6e36f47ff3ecc71cd643737f18dc70558a3

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
- agent/state/activity-verification-engine.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-backlog-engine.generated.json
- agent/state/debug-tracking-simplification.generated.json
- agent/state/event-envelope-normalization.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/feature-registration-gate.generated.json
- agent/state/final-behavioral-privacy-telemetry-lock.generated.json
- agent/state/final-testing-tracking-telemetry-lock.generated.json
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
- docs/agent-truth/final-testing-tracking-telemetry-lock.md
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
- scripts/agent/validate-final-testing-tracking-telemetry-lock.ts
- scripts/agent/validate-new-additions-score-coverage.ts
- src/lib/admin/user-management-contract.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/testing/telemetry-trigger-test-matrix.ts
- tests/unit/final-testing-tracking-telemetry-lock.spec.ts

## Validation Failures

- none

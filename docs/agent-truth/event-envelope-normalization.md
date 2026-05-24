# Event Envelope Normalization

Generated: 2026-05-24T09:44:10.195Z
Status: pass
Current head: 991e1848a9adf87ce6a97f95eb7e5f8bcfbfb49f

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
- agent/state/event-envelope-normalization.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/global-user-dedupe-normalization.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/event-envelope-normalization.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/global-user-dedupe-normalization.md
- docs/agent-truth/person-metrics-hydration.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-global-user-dedupe-normalization.ts
- src/lib/analytics-action-taxonomy.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/global-user-dedupe-contract.ts
- src/lib/analytics/global-user-dedupe-engine.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/behavioral/event-fact-contract.ts
- src/lib/behavioral/normalize-event-fact.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- tests/unit/global-user-dedupe-normalization.spec.ts

## Validation Failures

- none

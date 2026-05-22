# Event Envelope Normalization

Generated: 2026-05-22T22:02:53.826Z
Status: pass
Current head: 1f2ff35dd2163235d3ad41d9d10d15a807de9122

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
- agent/state/event-envelope-normalization.generated.json
- agent/state/public-beta-score.generated.json
- docs/agent-truth/event-envelope-normalization.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/validate-event-envelope-normalization.ts
- src/app/api/admin/debug/route.ts
- src/app/api/analytics/ingest-identified/route.ts
- src/app/api/analytics/ingest/route.ts
- src/lib/analytics/event-envelope-builder.ts
- src/lib/analytics/event-envelope-contract.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-debug/event-envelope-summary.ts
- src/lib/telemetry-safety.ts
- src/lib/telemetry.ts
- tests/unit/event-envelope-normalization.spec.ts

## Validation Failures

- none

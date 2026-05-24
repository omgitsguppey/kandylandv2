# Event Envelope Normalization

Generated: 2026-05-24T05:47:13.144Z
Status: pass
Current head: b0850954013ef36f732dec9ad90f64d5bcbfd65b

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

- agent/context/optimized-task-context.generated.json
- agent/state/cost-risk-owner-review-closure.generated.json
- agent/state/event-liveness-audit.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/formal-evidence-bridge.generated.json
- docs/agent-truth/cost-risk-owner-review-closure.md
- docs/agent-truth/event-liveness-audit.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/formal-evidence-bridge.md
- scripts/agent/validate-event-liveness-audit.ts
- src/app/api/admin/debug/route.ts
- src/lib/analytics/event-liveness-contract.ts
- src/lib/analytics/event-liveness-engine.ts
- src/lib/debug/debug-panel-tracking-summary.ts
- src/lib/server/admin-debug/summary.ts
- tests/unit/event-liveness-audit.spec.ts

## Validation Failures

- none

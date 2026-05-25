# Event Envelope Normalization

Generated: 2026-05-25T05:51:26.866Z
Status: pass
Current head: 9dc79a00f40df751841c8d8f10d98de636336397

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
- agent/context/optimized-task-context.generated.json
- agent/state/advanced-telemetry-parity-ui-cleanup.generated.json
- agent/state/current-beta-exit-status.generated.json
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json
- agent/state/debug-panel-output-triage.generated.json
- agent/state/debug-runtime-evidence.generated.json
- agent/state/event-envelope-normalization.generated.json
- agent/state/event-liveness-audit.generated.json
- agent/state/event-translation-bridge.generated.json
- agent/state/ingest-identified-parity-blocker.generated.json
- agent/state/overnight-beta-readiness-lock.generated.json
- agent/state/person-metrics-hydration.generated.json
- agent/state/public-beta-score.generated.json
- agent/state/refresh-diagnostics-failure-clusters.generated.json
- agent/state/telemetry-admin-debug-truth.generated.json
- agent/state/telemetry-parity-pass-gate.generated.json
- agent/state/telemetry-parity-score.generated.json
- docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md
- docs/agent-truth/current-beta-exit-status.md
- docs/agent-truth/debug-cockpit-batch30-telemetry-parity.md
- docs/agent-truth/debug-runtime-evidence.md
- docs/agent-truth/event-envelope-normalization.md
- docs/agent-truth/event-liveness-audit.md
- docs/agent-truth/event-translation-bridge.md
- docs/agent-truth/ingest-identified-parity-blocker.md
- docs/agent-truth/overnight-beta-readiness-lock.md
- docs/agent-truth/person-metrics-hydration.md
- docs/agent-truth/refresh-diagnostics-failure-clusters.md
- docs/agent-truth/telemetry-admin-debug-truth.md
- docs/agent-truth/telemetry-parity-pass-gate.md
- package.json
- public/kandydrops-release-notes.json
- scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts
- scripts/agent/validate-admin-debug-control-tower.ts
- scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts
- scripts/agent/validate-debug-cockpit-batch30-telemetry-parity.ts
- scripts/agent/validate-event-liveness-audit.ts
- scripts/agent/validate-ingest-identified-parity-blocker.ts
- scripts/agent/validate-refresh-diagnostics-failure-clusters.ts
- scripts/agent/validate-telemetry-parity-pass-gate.ts
- src/app/admin/debug/components/DebugAdvancedDataValidation.tsx
- src/app/api/admin/analytics/historical/route.ts
- src/lib/analytics/advanced-telemetry-parity-ui.ts
- src/lib/analytics/event-translation-bridge.ts
- src/lib/analytics/ingest-identified-parity-blocker.ts
- src/lib/analytics/person-metrics-hydration.ts
- src/lib/analytics/refresh-diagnostics-failure-clusters.ts
- src/lib/analytics/telemetry-parity-pass-gate.ts
- src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts
- src/lib/release-notes/public-release-notes.ts
- src/lib/release-notes/release-version-contract.ts
- src/lib/server/admin-analytics-historical-validation.ts
- src/types/admin-analytics.ts
- tests/unit/admin-data-validation.spec.ts
- tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts
- tests/unit/debug-cockpit-batch30-telemetry-parity.spec.ts
- tests/unit/ingest-identified-parity-blocker.spec.ts
- tests/unit/refresh-diagnostics-failure-clusters.spec.ts
- tests/unit/telemetry-parity-pass-gate.spec.ts

## Validation Failures

- none

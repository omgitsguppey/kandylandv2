# Push Token Registration

Generated: 2026-07-16T04:26:08.764Z
Current head: 621afada2aea0ef269a02c7ac68d4424bfce5214
Status: pass

## Contract

- Push token registration is authenticated and scoped to the caller.
- Raw FCM tokens stay out of logs, debug lanes, telemetry envelopes, and route responses.
- Raw tokens are kept only in the private user token array required by existing FCM fan-out compatibility; metadata uses fingerprints/redaction.
- Device binding is idempotent by user, device id, and token fingerprint.
- This validator does not send real push notifications or call provider services.

## Debug Lane

- Registered users: 1
- Registered devices: 1
- Failed registrations: 0
- Unsupported browsers: 0
- Stale tokens: 0
- Raw token exposure count: 0
- Telemetry: mapped

## Score Impact

- sourceHealth: before=83.6; after=83.6; Push token registration now has a source contract, caller-scoped route, telemetry events, and validator coverage.
- runtimeHealth: before=50.22; after=50.22; Provider push delivery remains separate; this phase validates source-safe registration and device binding only.
- evidenceCompleteness: before=45; after=45; Registration, refresh, revocation, failure, and device-scope signals feed debug evidence without raw token exposure.
- freshness: before=59.38; after=59.38; Push token report is regenerated from current source.
- costRisk: before=92.5; after=92.5; No provider calls or push sends are performed by the validator or tests.
- regressionRisk: before=94; after=94; Unit and source validator checks cover auth scope, no arbitrary user binding, redaction, debug lane, and protected surface boundaries.
- overallHealthScore: before=63.18; after=63.18; Improves notification readiness evidence without clearing formal runtime/provider gates.

## Dirty Files

- agent/state/notification-permission-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-targeting-intent.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected
- docs/agent-truth/notification-targeting-intent.md: release_artifact_expected

## Validation Failures

- none

# Push Token Registration

Generated: 2026-05-24T06:42:24.574Z
Current head: 627ff05d
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

- sourceHealth: before=92.5; after=92.5; Push token registration now has a source contract, caller-scoped route, telemetry events, and validator coverage.
- runtimeHealth: before=84.2; after=84.2; Provider push delivery remains separate; this phase validates source-safe registration and device binding only.
- evidenceCompleteness: before=69.6; after=69.6; Registration, refresh, revocation, failure, and device-scope signals feed debug evidence without raw token exposure.
- freshness: before=83.75; after=83.75; Push token report is regenerated from current source.
- costRisk: before=42; after=42; No provider calls or push sends are performed by the validator or tests.
- regressionRisk: before=86; after=86; Unit and source validator checks cover auth scope, no arbitrary user binding, redaction, debug lane, and protected surface boundaries.
- overallHealthScore: before=79.25; after=79.25; Improves notification readiness evidence without clearing formal runtime/provider gates.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-permission-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/push-token-registration.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/feature-registration-gate.md: release_artifact_expected
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected
- docs/agent-truth/push-token-registration.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-notification-permission-lifecycle.ts: validator_artifact_expected
- scripts/agent/validate-push-token-registration.ts: validator_artifact_expected
- scripts/agent/validate-pwa-service-worker.ts: validator_artifact_expected
- src/app/api/notifications/push-token/route.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/browser-notification-enrollment.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/notifications/push-token-contract.ts: real_source_change_needs_review
- src/lib/notifications/push-token-telemetry.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/telemetry-catalog.ts: real_source_change_needs_review
- tests/unit/push-token-registration.spec.ts: test_artifact_expected

## Validation Failures

- none

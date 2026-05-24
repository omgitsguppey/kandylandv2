# Push Token Registration

Generated: 2026-05-24T07:35:34.480Z
Current head: 8feac347
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
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-permission-lifecycle.generated.json: stale_generated_artifact_to_regenerate
- agent/state/notification-pwa-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/notification-targeting-intent.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/push-token-registration.generated.json: current_generated_artifact_to_commit
- agent/state/pwa-service-worker-safety.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-tracking-simplification.md: release_artifact_expected
- docs/agent-truth/event-translation-bridge.md: release_artifact_expected
- docs/agent-truth/notification-permission-lifecycle.md: release_artifact_expected
- docs/agent-truth/notification-pwa-score-lock.md: release_artifact_expected
- docs/agent-truth/notification-targeting-intent.md: release_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: release_artifact_expected
- docs/agent-truth/push-token-registration.md: release_artifact_expected
- docs/agent-truth/pwa-service-worker-safety.md: release_artifact_expected
- docs/agent-truth/telemetry-trigger-test-matrix.md: release_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-notification-permission-lifecycle.ts: validator_artifact_expected
- scripts/agent/validate-notification-pwa-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-push-token-registration.ts: validator_artifact_expected
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/testing/telemetry-trigger-test-matrix.ts: real_source_change_needs_review
- tests/unit/notification-pwa-score-lock.spec.ts: test_artifact_expected

## Validation Failures

- none

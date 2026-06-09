# Push Token Registration

Generated: 2026-06-09T01:08:17.876Z
Current head: 00b18bf22
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

- sourceHealth: before=91.7; after=91.7; Push token registration now has a source contract, caller-scoped route, telemetry events, and validator coverage.
- runtimeHealth: before=72.8; after=72.8; Provider push delivery remains separate; this phase validates source-safe registration and device binding only.
- evidenceCompleteness: before=43.4; after=43.4; Registration, refresh, revocation, failure, and device-scope signals feed debug evidence without raw token exposure.
- freshness: before=59.38; after=59.38; Push token report is regenerated from current source.
- costRisk: before=42; after=42; No provider calls or push sends are performed by the validator or tests.
- regressionRisk: before=94; after=94; Unit and source validator checks cover auth scope, no arbitrary user binding, redaction, debug lane, and protected surface boundaries.
- overallHealthScore: before=68.67; after=68.67; Improves notification readiness evidence without clearing formal runtime/provider gates.

## Dirty Files

- .agent/workflows/auto-tasks.md: unsafe_unknown
- .agent/workflows/pre-commit.md: unsafe_unknown
- .env.example: unsafe_unknown
- .gitignore: unsafe_unknown
- agent/context/doctrine.cards.jsonl: unsafe_unknown
- agent/context/doctrine.index.json: unsafe_unknown
- agent/context/file-size-budget.json: unsafe_unknown
- agent/context/legacy-registry.json: unsafe_unknown
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/context/task-pack.generated.json: unsafe_unknown
- agent/context/validator-map.json: unsafe_unknown
- agent/index/blast-radius.json: unsafe_unknown
- agent/index/canonical-helpers.json: unsafe_unknown
- agent/index/dependency-graph.summary.json: unsafe_unknown
- agent/index/governance-truth.json: unsafe_unknown
- agent/index/known-pitfalls.json: unsafe_unknown
- agent/index/package-manager-truth.json: unsafe_unknown
- agent/index/recent-passes.json: unsafe_unknown
- agent/index/repo-inventory.json: unsafe_unknown
- agent/README.md: unsafe_unknown
- scripts/agent/validate-notification-permission-lifecycle.ts: validator_artifact_expected
- scripts/agent/validate-notification-return-loop.ts: validator_artifact_expected
- scripts/agent/validate-push-token-registration.ts: validator_artifact_expected
- tests/unit/fcm-utils.spec.ts: test_artifact_expected
- tests/unit/notification-permission-lifecycle.spec.ts: test_artifact_expected

## Validation Failures

- none

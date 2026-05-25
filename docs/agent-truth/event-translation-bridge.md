# Event Translation Bridge

Generated: 2026-05-25T06:16:53.508Z
Status: pass
Current head: ccf36528805f2d72bc84b1b1aeb1e9b6358a6970

## Contract

- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.
- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.
- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.

## Debug Lane

- Producers registered: 522
- Producers connected: 522
- Event envelopes translated: 522
- Materializers mapped: 522
- Person metrics mapped: 185
- Gaps: 0

## Score Impact

- sourceHealth: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.
- runtimeHealth: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.
- evidenceCompleteness: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.
- freshness: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.
- costRisk: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.
- regressionRisk: before=80; after=84; Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.

## Waiting-On-Activity Classification

- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.
- future_real_activity_pending; scoreDrag=false; missingProducer=none; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch31-task-guidance-parity.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-event-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-history-recovery.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-telemetry-contract.generated.json: current_generated_artifact_to_commit
- agent/state/task-guidance-ui-instrumentation.generated.json: current_generated_artifact_to_commit
- agent/state/task-onboarding-parity-semantics.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch31-task-guidance-parity.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-event-normalization.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-history-recovery.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-telemetry-contract.md: documentation_artifact_expected
- docs/agent-truth/task-guidance-ui-instrumentation.md: documentation_artifact_expected
- docs/agent-truth/task-onboarding-parity-semantics.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/task-guidance-batch31-shared.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-guidance-route-audit.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-reward-ledger.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch31-task-guidance-parity.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-event-normalization.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-history-recovery.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-telemetry-contract.ts: validator_artifact_expected
- scripts/agent/validate-task-guidance-ui-instrumentation.ts: validator_artifact_expected
- scripts/agent/validate-task-onboarding-parity-semantics.ts: validator_artifact_expected
- src/components/Dashboard/DailyTasksModule.tsx: real_source_change_needs_review
- src/components/Dashboard/TaskGuidanceBanner.tsx: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-contract.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/task-onboarding-parity-semantics.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts: real_source_change_needs_review
- src/lib/privacy/consent-tracking-policy.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-tasks.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/lib/task-guidance.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-history-recovery.ts: real_source_change_needs_review
- src/lib/tasks/task-guidance-telemetry-contract.ts: real_source_change_needs_review
- tests/unit/debug-cockpit-batch31-task-guidance-parity.spec.ts: test_artifact_expected
- tests/unit/task-guidance-event-normalization.spec.ts: test_artifact_expected
- tests/unit/task-guidance-history-recovery.spec.ts: test_artifact_expected
- tests/unit/task-guidance-telemetry-contract.spec.ts: test_artifact_expected
- tests/unit/task-guidance-ui-instrumentation.spec.ts: test_artifact_expected
- tests/unit/task-onboarding-parity-semantics.spec.ts: test_artifact_expected

## Validation Failures

- none

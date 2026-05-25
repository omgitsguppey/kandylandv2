# Event Translation Bridge

Generated: 2026-05-25T08:23:16.841Z
Status: pass
Current head: e53968ae1b6975aa492461625f7fd76133493226

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
- agent/state/behavior-math-verification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-normalization-internals.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavior-task-telemetry-ui-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/behavioral-intelligence-snapshot-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch35-behavior-stack.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/experiment-rollout-registry-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-window-zero-shell-classifier.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-catalog-runtime-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/task-guidance-telemetry-contract.generated.json: current_generated_artifact_to_commit
- agent/state/task-telemetry-mapping-reconstruction.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-truth-recovery-formulas.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavior-normalization-internals.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavior-task-telemetry-ui-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavioral-intelligence-snapshot-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch35-behavior-stack.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/experiment-rollout-registry-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-window-zero-shell-classifier.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-catalog-runtime-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/task-guidance-telemetry-contract.md: documentation_artifact_expected
- docs/agent-truth/task-telemetry-mapping-reconstruction.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-truth-recovery-formulas.md: stale_generated_artifact_to_regenerate
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-behavior-normalization-internals.ts: validator_artifact_expected
- scripts/agent/validate-behavior-task-telemetry-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-behavioral-intelligence-snapshot-truth.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-debug-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-daily-task-lifecycle-telemetry.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch35-behavior-stack.ts: validator_artifact_expected
- scripts/agent/validate-experiment-rollout-registry-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-source-window-zero-shell-classifier.ts: validator_artifact_expected
- scripts/agent/validate-task-catalog-runtime-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-task-telemetry-mapping-reconstruction.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-truth-recovery-formulas.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedBehavior.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedDrift.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedExperiments.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTelemetry.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugAdvancedTruth.tsx: real_source_change_needs_review
- src/app/admin/debug/components/DebugPrimitives.tsx: real_source_change_needs_review
- src/app/api/admin/debug/route.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-truth-recovery-formulas.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-truth-recovery-status.ts: real_source_change_needs_review
- src/lib/behavioral/behavior-normalization-internals-contract.ts: real_source_change_needs_review
- src/lib/behavioral/behavior-normalization-internals-engine.ts: real_source_change_needs_review
- src/lib/behavioral/behavioral-intelligence-snapshot-contract.ts: real_source_change_needs_review
- src/lib/behavioral/behavioral-intelligence-snapshot-status.ts: real_source_change_needs_review
- src/lib/debug/source-window-zero-shell-classifier.ts: real_source_change_needs_review
- src/lib/experiments/experiment-rollout-registry-contract.ts: real_source_change_needs_review
- src/lib/experiments/experiment-rollout-registry-status.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/tasks/task-catalog-coverage-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-catalog-coverage-engine.ts: real_source_change_needs_review
- src/lib/tasks/task-runtime-sample-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-telemetry-mapping-contract.ts: real_source_change_needs_review
- src/lib/tasks/task-telemetry-mapping-engine.ts: real_source_change_needs_review
- tests/unit/behavior-normalization-internals.spec.ts: test_artifact_expected
- tests/unit/behavior-task-telemetry-ui-cleanup.spec.ts: test_artifact_expected
- tests/unit/behavioral-intelligence-snapshot-truth.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch35-behavior-stack.spec.ts: test_artifact_expected
- tests/unit/experiment-rollout-registry-reconstruction.spec.ts: test_artifact_expected
- tests/unit/source-window-zero-shell-classifier.spec.ts: test_artifact_expected
- tests/unit/task-catalog-runtime-reconstruction.spec.ts: test_artifact_expected
- tests/unit/task-telemetry-mapping-reconstruction.spec.ts: test_artifact_expected
- tests/unit/telemetry-truth-recovery-formulas.spec.ts: test_artifact_expected

## Validation Failures

- none

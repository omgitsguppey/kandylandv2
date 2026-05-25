# Event Translation Bridge

Generated: 2026-05-25T07:10:33.707Z
Status: pass
Current head: 8f5b66d4c5465ac057ea542614a5b8d01c5d3c43

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

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json: current_generated_artifact_to_commit
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/server-unlock-telemetry-emission.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-rollup-reconciliation.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-journey-normalization.generated.json: current_generated_artifact_to_commit
- agent/state/unlock-watch-validation-semantics.generated.json: current_generated_artifact_to_commit
- agent/state/viewer-start-telemetry-repair.generated.json: current_generated_artifact_to_commit
- agent/state/watch-capture-quality-threshold.generated.json: current_generated_artifact_to_commit
- agent/state/watch-session-fact-link-repair.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/debug-cockpit-batch33-unlock-watch-parity.md: documentation_artifact_expected
- docs/agent-truth/drop-watch-time-accuracy.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/server-unlock-telemetry-emission.md: documentation_artifact_expected
- docs/agent-truth/unlock-rollup-reconciliation.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-journey-normalization.md: documentation_artifact_expected
- docs/agent-truth/unlock-watch-validation-semantics.md: documentation_artifact_expected
- docs/agent-truth/viewer-start-telemetry-repair.md: documentation_artifact_expected
- docs/agent-truth/watch-capture-quality-threshold.md: documentation_artifact_expected
- docs/agent-truth/watch-session-fact-link-repair.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- scripts/agent/validate-debug-cockpit-batch33-unlock-watch-parity.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- scripts/agent/validate-person-metrics-hydration.ts: validator_artifact_expected
- scripts/agent/validate-server-unlock-telemetry-emission.ts: validator_artifact_expected
- scripts/agent/validate-unlock-rollup-reconciliation.ts: validator_artifact_expected
- scripts/agent/validate-unlock-telemetry-truth.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-journey-normalization.ts: validator_artifact_expected
- scripts/agent/validate-unlock-watch-validation-semantics.ts: validator_artifact_expected
- scripts/agent/validate-viewer-start-telemetry-repair.ts: validator_artifact_expected
- scripts/agent/validate-watch-capture-quality-threshold.ts: validator_artifact_expected
- scripts/agent/validate-watch-session-fact-link-repair.ts: validator_artifact_expected
- src/app/api/admin/analytics/historical/route.ts: real_source_change_needs_review
- src/app/api/drops/unlock/route.ts: real_source_change_needs_review
- src/app/api/viewer/watch-session/route.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/viewer-start-telemetry-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-capture-quality-contract.ts: real_source_change_needs_review
- src/lib/analytics/watch-session-fact-linker.ts: real_source_change_needs_review
- src/lib/behavioral/unlock-watch-journey-normalization.ts: real_source_change_needs_review
- src/lib/commerce/unlock-rollup-reconciliation.ts: real_source_change_needs_review
- src/lib/commerce/unlock-watch-parity-contract.ts: real_source_change_needs_review
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- tests/unit/debug-cockpit-batch33-unlock-watch-parity.spec.ts: test_artifact_expected
- tests/unit/server-unlock-telemetry-emission.spec.ts: test_artifact_expected
- tests/unit/unlock-rollup-reconciliation.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-journey-normalization.spec.ts: test_artifact_expected
- tests/unit/unlock-watch-validation-semantics.spec.ts: test_artifact_expected
- tests/unit/viewer-start-telemetry-repair.spec.ts: test_artifact_expected
- tests/unit/watch-capture-quality-threshold.spec.ts: test_artifact_expected
- tests/unit/watch-session-fact-link-repair.spec.ts: test_artifact_expected

## Validation Failures

- none

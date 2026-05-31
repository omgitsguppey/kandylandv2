# Event Translation Bridge

Generated: 2026-05-31T22:46:57.226Z
Status: pass
Current head: 49da560fffb17b22df49df8ac8256f28e4870178

## Contract

- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.
- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.
- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.

## Debug Lane

- Producers registered: 762
- Producers connected: 762
- Event envelopes translated: 762
- Materializers mapped: 762
- Person metrics mapped: 208
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

- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/live-evidence-gate-replacement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-panel-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/evidence-capture-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/live-evidence-gate-replacement.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-current-beta-exit-status.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-event-translation-bridge.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/release-readiness/live-evidence-gate-contract.ts: real_source_change_needs_review
- src/lib/release-readiness/live-evidence-resolver.ts: real_source_change_needs_review
- tests/unit/current-beta-exit-status.spec.ts: test_artifact_expected
- tests/unit/live-evidence-gate-replacement.spec.ts: test_artifact_expected

## Validation Failures

- none

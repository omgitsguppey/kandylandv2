# Event Translation Bridge

Generated: 2026-06-16T16:48:12.009Z
Status: pass
Current head: c3b47c32ecd3c5a57d0f5e0b6f47c6ce6706d53c

## Contract

- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.
- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.
- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.

## Debug Lane

- Producers registered: 768
- Producers connected: 768
- Event envelopes translated: 768
- Materializers mapped: 768
- Person metrics mapped: 249
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

- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-contract.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-contract.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: documentation_artifact_expected

## Validation Failures

- none

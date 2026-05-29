# Event Translation Bridge

Generated: 2026-05-29T11:40:19.787Z
Status: pass
Current head: 74c04caadffa3080b2f979f7649026b17aafdbdf

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

- agent/index/known-pitfalls.json: real_source_change_needs_review
- agent/state/analytic-algorithm-truth-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/guest-user-handoff-repair.generated.json: current_generated_artifact_to_commit
- agent/state/identity-chain-contract.generated.json: current_generated_artifact_to_commit
- agent/state/identity-classified-mismatch-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-4xx-policy.generated.json: current_generated_artifact_to_commit
- agent/state/identity-handoff-analytics-truth.generated.json: current_generated_artifact_to_commit
- agent/state/identity-mismatch-closure.generated.json: current_generated_artifact_to_commit
- agent/state/identity-tracking-memory-writeback.generated.json: current_generated_artifact_to_commit
- agent/state/individual-user-metric-truth.generated.json: current_generated_artifact_to_commit
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/release-notes-integrity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-tracking-live-evidence.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/analytic-algorithm-truth-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/guest-user-handoff-repair.md: documentation_artifact_expected
- docs/agent-truth/identity-chain-contract.md: documentation_artifact_expected
- docs/agent-truth/identity-classified-mismatch-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-4xx-policy.md: documentation_artifact_expected
- docs/agent-truth/identity-handoff-analytics-truth.md: documentation_artifact_expected
- docs/agent-truth/identity-mismatch-closure.md: documentation_artifact_expected
- docs/agent-truth/identity-tracking-memory-writeback.md: documentation_artifact_expected
- docs/agent-truth/individual-user-metric-truth.md: documentation_artifact_expected
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/release-notes-integrity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-tracking-live-evidence.md: documentation_artifact_expected

## Validation Failures

- none

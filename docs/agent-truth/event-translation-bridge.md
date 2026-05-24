# Event Translation Bridge

Generated: 2026-05-24T16:01:46.878Z
Status: pass
Current head: 883bdc0e91e5494f3b6b3e6449d5ea722b898077

## Contract

- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.
- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.
- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.

## Debug Lane

- Producers registered: 522
- Producers connected: 522
- Event envelopes translated: 522
- Materializers mapped: 522
- Person metrics mapped: 178
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
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch3-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/drop-watch-time-accuracy.generated.json: current_generated_artifact_to_commit
- agent/state/empty-live-lane-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/identity-handoff-spine.generated.json: stale_generated_artifact_to_regenerate
- agent/state/identity-handoff-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/notification-pwa-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/pwa-service-worker-safety.generated.json: stale_generated_artifact_to_regenerate
- agent/state/pwa-service-worker-status-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/session-bounce-calculation.generated.json: current_generated_artifact_to_commit
- agent/state/sql-database-parity-cost-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/tracking-lane-freshness-display-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/user-journey-behavioral-intelligence.generated.json: current_generated_artifact_to_commit
- agent/state/wallet-funnel-sample-cleanup.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch3-cleanup.md: documentation_artifact_expected
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/drop-watch-time-accuracy.md: documentation_artifact_expected
- docs/agent-truth/empty-live-lane-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/identity-handoff-spine.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/identity-handoff-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/notification-pwa-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/pwa-service-worker-safety.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/pwa-service-worker-status-cleanup.md: documentation_artifact_expected
- docs/agent-truth/session-bounce-calculation.md: documentation_artifact_expected
- docs/agent-truth/sql-database-parity-cost-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/tracking-lane-freshness-display-cleanup.md: documentation_artifact_expected
- docs/agent-truth/user-journey-behavioral-intelligence.md: documentation_artifact_expected
- docs/agent-truth/wallet-funnel-sample-cleanup.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch3-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-drop-watch-time-accuracy.ts: validator_artifact_expected
- scripts/agent/validate-empty-live-lane-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-identity-handoff-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-notification-pwa-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-pwa-service-worker-safety.ts: validator_artifact_expected
- scripts/agent/validate-pwa-service-worker-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-session-bounce-calculation.ts: validator_artifact_expected
- scripts/agent/validate-sql-database-parity-cost-lock.ts: validator_artifact_expected
- scripts/agent/validate-tracking-lane-freshness-display-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-user-journey-behavioral-intelligence.ts: validator_artifact_expected
- scripts/agent/validate-wallet-funnel-sample-cleanup.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/debug/debug-panel-tracking-summary.ts: real_source_change_needs_review
- src/lib/debug/empty-live-lane-classifier.ts: real_source_change_needs_review
- src/lib/pwa/pwa-service-worker-contract.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/debug-cockpit-batch3-cleanup.spec.ts: test_artifact_expected
- tests/unit/empty-live-lane-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/identity-handoff-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/pwa-service-worker-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/tracking-lane-freshness-display-cleanup.spec.ts: test_artifact_expected
- tests/unit/wallet-funnel-sample-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

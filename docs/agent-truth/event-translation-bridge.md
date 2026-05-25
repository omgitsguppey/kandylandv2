# Event Translation Bridge

Generated: 2026-05-25T05:51:18.891Z
Status: pass
Current head: 9dc79a00f40df751841c8d8f10d98de636336397

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
- agent/state/advanced-telemetry-parity-ui-cleanup.generated.json: current_generated_artifact_to_commit
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch18-route-hotspots.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-cockpit-batch30-telemetry-parity.generated.json: current_generated_artifact_to_commit
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/ingest-identified-parity-blocker.generated.json: current_generated_artifact_to_commit
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/refresh-diagnostics-failure-clusters.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-parity-pass-gate.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-parity-score.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/advanced-telemetry-parity-ui-cleanup.md: documentation_artifact_expected
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-cockpit-batch30-telemetry-parity.md: documentation_artifact_expected
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/ingest-identified-parity-blocker.md: documentation_artifact_expected
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/refresh-diagnostics-failure-clusters.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-parity-pass-gate.md: documentation_artifact_expected
- package.json: real_source_change_needs_review
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts: validator_artifact_expected
- scripts/agent/validate-admin-debug-control-tower.ts: validator_artifact_expected
- scripts/agent/validate-advanced-telemetry-parity-ui-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-cockpit-batch30-telemetry-parity.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-ingest-identified-parity-blocker.ts: validator_artifact_expected
- scripts/agent/validate-refresh-diagnostics-failure-clusters.ts: validator_artifact_expected
- scripts/agent/validate-telemetry-parity-pass-gate.ts: validator_artifact_expected
- src/app/admin/debug/components/DebugAdvancedDataValidation.tsx: real_source_change_needs_review
- src/app/api/admin/analytics/historical/route.ts: real_source_change_needs_review
- src/lib/analytics/advanced-telemetry-parity-ui.ts: real_source_change_needs_review
- src/lib/analytics/event-translation-bridge.ts: real_source_change_needs_review
- src/lib/analytics/ingest-identified-parity-blocker.ts: real_source_change_needs_review
- src/lib/analytics/person-metrics-hydration.ts: real_source_change_needs_review
- src/lib/analytics/refresh-diagnostics-failure-clusters.ts: real_source_change_needs_review
- src/lib/analytics/telemetry-parity-pass-gate.ts: real_source_change_needs_review
- src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts: real_source_change_needs_review
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- src/lib/server/admin-analytics-historical-validation.ts: real_source_change_needs_review
- src/types/admin-analytics.ts: real_source_change_needs_review
- tests/unit/admin-data-validation.spec.ts: test_artifact_expected
- tests/unit/advanced-telemetry-parity-ui-cleanup.spec.ts: test_artifact_expected
- tests/unit/debug-cockpit-batch30-telemetry-parity.spec.ts: test_artifact_expected
- tests/unit/ingest-identified-parity-blocker.spec.ts: test_artifact_expected
- tests/unit/refresh-diagnostics-failure-clusters.spec.ts: test_artifact_expected
- tests/unit/telemetry-parity-pass-gate.spec.ts: test_artifact_expected

## Validation Failures

- none

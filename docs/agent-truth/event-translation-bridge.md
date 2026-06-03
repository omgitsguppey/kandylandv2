# Event Translation Bridge

Generated: 2026-06-03T04:30:12.226Z
Status: fail
Current head: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Contract

- Raw tracked events must translate into canonical event envelopes before feature activity, behavior signals, person metrics, debug evidence, or score inputs consume them.
- Registered producers that have envelope, materializer, debug, person-metric classification, and score mapping are not treated as score drag just because future real activity has not arrived yet.
- Missing producers name the exact event or surface that must emit activity. The bridge does not fake activity, read production data, mutate legacy data, or clear formal provider/runtime/admin gates.

## Debug Lane

- Producers registered: 768
- Producers connected: 768
- Event envelopes translated: 768
- Materializers mapped: 768
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

- agent/state/activity-verification-engine.generated.json: current_generated_artifact_to_commit
- agent/state/admin-truth-source-sample.generated.json: stale_generated_artifact_to_regenerate
- agent/state/algorithmic-evidence-policy.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-cost-runtime-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-hydration-consolidation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/analytics-panel-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-gap-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-evidence-lane-prep.generated.json: stale_generated_artifact_to_regenerate
- agent/state/beta-freshness-language.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-realtime-cost-control.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-admin-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cloud-sql-gemini-cost-guards.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-owner-review-source-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-exit-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-dashboard-error-cost-inventory.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-drop-status-metrics.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-experience-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/creator-monetization-readiness-lock.generated.json: current_generated_artifact_to_commit
- agent/state/creator-settings-control-plane.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-panel-output-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-score-impact-triage.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: current_generated_artifact_to_commit
- agent/state/evidence-capture-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/existing-algorithm-refinement.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: current_generated_artifact_to_commit
- agent/state/final-cost-audit-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-parity-telemetry-lock.generated.json: current_generated_artifact_to_commit
- agent/state/final-pr-stale-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/final-telemetry-closure-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/global-marquee-truncated-titles.generated.json: stale_generated_artifact_to_regenerate
- agent/state/media-discovery-score-lock.generated.json: current_generated_artifact_to_commit
- agent/state/mobile-loading-hydration-stability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/mobile-ui-final-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/operator-revenue-smoke.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-beta-readiness-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-final-integration-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/overnight-wiring-integrity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/post-economy-creator-flow-qa.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: stale_generated_artifact_to_regenerate
- agent/state/regression-risk-high-blast-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-smoke-substitute-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/runtime-watch-time-v2.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-cost-readiness.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-reconciliation-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/score-80-refresh-pass.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-connection-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-backed-runtime-confidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/source-truth-authority-map.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence.generated.json: current_generated_artifact_to_commit
- agent/state/telemetry-admin-debug-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-creator-ui-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-facing-feature-connection-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/admin-truth-source-sample.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-cost-runtime-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-hydration-consolidation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/analytics-panel-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-evidence-gap-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-evidence-lane-prep.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/beta-freshness-language.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-functionality-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-gating-moderation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-realtime-cost-control.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-telemetry-admin-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cloud-sql-gemini-cost-guards.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-owner-review-source-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-exit-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-owner-review-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-dashboard-error-cost-inventory.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-drop-status-metrics.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/creator-monetization-readiness-lock.md: documentation_artifact_expected
- docs/agent-truth/creator-settings-control-plane.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/current-beta-exit-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-score-impact-triage.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: documentation_artifact_expected
- docs/agent-truth/evidence-capture-status.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/existing-algorithm-refinement.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/feature-registration-gate.md: documentation_artifact_expected
- docs/agent-truth/final-cost-audit-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-parity-telemetry-lock.md: documentation_artifact_expected
- docs/agent-truth/final-pr-stale-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/final-telemetry-closure-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/global-marquee-truncated-titles.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/media-discovery-score-lock.md: documentation_artifact_expected
- docs/agent-truth/mobile-loading-hydration-stability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/mobile-ui-final-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/operator-revenue-smoke.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-beta-readiness-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-final-integration-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/overnight-wiring-integrity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/post-economy-creator-flow-qa.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/regression-risk-high-blast-refresh.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-smoke-substitute-matrix.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-watch-time-v2.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-cost-readiness.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-reconciliation-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/score-80-refresh-pass.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/settings-connection-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-backed-runtime-confidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/source-truth-authority-map.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/targeted-behavior-evidence.md: documentation_artifact_expected
- docs/agent-truth/telemetry-admin-debug-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-trigger-test-matrix.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-management-refactor.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/score-public-beta-readiness.ts: real_source_change_needs_review
- scripts/agent/validate-analytics-hydration-consolidation.ts: unsafe_unknown
- scripts/agent/validate-analytics-panel-hydration.ts: validator_artifact_expected
- scripts/agent/validate-creator-dashboard-error-cost-inventory.ts: unsafe_unknown
- scripts/agent/validate-creator-monetization-readiness-lock.ts: validator_artifact_expected
- scripts/agent/validate-final-parity-telemetry-lock.ts: validator_artifact_expected
- scripts/agent/validate-media-discovery-score-lock.ts: validator_artifact_expected
- scripts/agent/validate-post-economy-creator-flow-qa.ts: unsafe_unknown
- scripts/agent/validate-public-beta-score.ts: validator_artifact_expected
- scripts/agent/validate-regression-risk-high-blast-refresh.ts: unsafe_unknown
- scripts/agent/validate-score-80-reconciliation-lock.ts: unsafe_unknown
- scripts/agent/validate-score-80-refresh-pass.ts: unsafe_unknown
- scripts/agent/validate-user-facing-feature-connection-audit.ts: unsafe_unknown
- src/lib/agent-score/algorithmic-evidence-policy.ts: unsafe_unknown
- src/lib/agent-score/core.ts: unsafe_unknown
- src/lib/agent-score/evidence-quality.ts: unsafe_unknown
- src/lib/agent-score/formal-evidence-bridge.ts: unsafe_unknown
- src/lib/agent-score/regression-risk-refresh-plan.ts: unsafe_unknown
- tests/unit/creator-dashboard-error-cost-inventory.spec.ts: unsafe_unknown
- tests/unit/creator-experiences-panel.spec.tsx: unsafe_unknown
- tests/unit/post-economy-creator-flow-qa.spec.ts: unsafe_unknown
- tests/unit/public-beta-score.spec.ts: unsafe_unknown
- tests/unit/purchase-modal.spec.tsx: unsafe_unknown

## Validation Failures

- dirty files are unclassified.

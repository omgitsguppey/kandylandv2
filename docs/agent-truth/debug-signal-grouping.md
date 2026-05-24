# Debug Signal Grouping

Generated: 2026-05-24T15:32:42.936Z
Status: pass
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9

## Contract

- Default debug output uses grouped root-cause signals, not raw duplicate rows.
- Quiet future activity is one collapsed catalog group and is hidden from default warnings.
- Formal gates stay evidence gates and unique critical issues remain individual.
- This pass does not fake activity, fake evidence, read production data, deploy, or clear formal gates.

## Grouping Summary

- Raw signals: 459
- Grouped signals: 17
- Raw P1/P2 signals: 43
- P1/P2 groups: 16
- Duplicate signals collapsed: 442
- Quiet future activity raw/grouped: 416/1
- Actionable future activity signals: 0

## Score Dimensions

- sourceHealth: 92.5 -> 92.5; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 84.2 -> 84.2; target=80; status=target_met; next=No score-80 action required for this dimension.
- evidenceCompleteness: 69.6 -> 69.6; target=80; status=below_target; next=Attach or refresh formal provider, runtime, admin-truth, and stale report evidence without faking activity.
- freshness: 83.75 -> 83.75; target=80; status=target_met; next=No score-80 action required for this dimension.
- costRisk: 80.5 -> 42; target=80; status=below_target; next=No score-80 action required for this dimension.
- regressionRisk: 86 -> 86; target=80; status=target_met; next=No score-80 action required for this dimension.
- overallHealthScore: 83.1 -> 79.25; target=80; status=below_target; next=No score-80 action required for this dimension.

## Default Debug Groups

- beta-score-beta-score-beta-score-beta-score-evidencecompleteness-evidencecompleteness-beta-score-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=69.6; next=Work the score dimension owner lane and refresh score-80 path lock.
- evidence-evidence-evidence-evidence-freshness-freshness-evidence-score-impacting: count=18; hidden=false; actionability=score_impacting; rootCause=evidence; impact=16.33; next=Attach formal evidence before clearing this beta gate.
- debug-panel-debug-panel-debug-panel-debug-panel-freshness-freshness-admin-debug-score-impacting: count=9; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=4; next=Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.
- beta-score-beta-score-beta-score-beta-score-freshness-freshness-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=7.07; next=Work the score dimension owner lane and refresh score-80 path lock.
- cost-cost-cost-cost-costrisk-costrisk-cost-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=cost; impact=4; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-regressionrisk-regressionrisk-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=1; next=Work the score dimension owner lane and refresh score-80 path lock.
- debug-panel-debug-panel-debug-panel-debug-panel-evidencecompleteness-evidencecompleteness-admin-debug-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=1; next=Keep missing state visible until an owning generator is identified.
- beta-score-beta-score-beta-score-beta-score-sourcehealth-sourcehealth-beta-score-evidence-required: count=1; hidden=false; actionability=evidence_required; rootCause=beta_score; impact=0; next=Work the score dimension owner lane and refresh score-80 path lock.
- formal-gate-attach-formal-deployed-runtime-provider-smoke-evidence-before-clearing-this-beta-gate-provider-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=84.2; next=Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- formal-gate-attach-formal-deployed-runtime-provider-smoke-evidence-before-clearing-this-beta-gate-runtime-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=84.2; next=Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- formal-gate-attach-a-redacted-first-party-admin-truth-sample-before-clearing-the-formal-admin-truth-evidence-gate-admin-: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=69.6; next=Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- formal-gate-attach-deployed-runtime-smoke-evidence-before-treating-runtime-health-as-proven-runtime-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=16.33; next=Attach deployed runtime smoke evidence before treating runtime health as proven.
- formal-gate-attach-a-fresh-first-party-admin-truth-sample-before-upgrading-this-gate-admin-debug: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=4; next=Attach a fresh first-party admin truth sample before upgrading this gate.
- formal-gate-attach-or-generate-formal-provider-smoke-evidence-do-not-convert-operator-reported-paypal-into-a-pass-admin-: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=4; next=Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.
- formal-gate-run-formal-deployed-runtime-smoke-before-marking-runtime-provider-smoke-complete-admin-debug: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=4; next=Run formal deployed runtime smoke before marking runtime/provider smoke complete.
- formal-gate-keep-this-cost-lane-in-owner-review-until-external-billing-provider-evidence-is-attached-cost: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=2; next=Keep this cost lane in owner review until external billing/provider evidence is attached.
- quiet-future-activity-future-activity-catalog: count=416; hidden=true; actionability=quiet_future_activity; rootCause=future_activity_placeholder; impact=0; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.

## Old Logic Classification

- src/lib/debug/debug-signal-grouping.ts: still_required
- src/lib/debug/debug-signal-actionability.ts: still_required
- src/lib/debug/debug-backlog-builder.ts: still_required
- src/lib/debug/debug-backlog-contract.ts: still_required
- src/lib/debug/debug-panel-tracking-summary.ts: still_required
- src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx: quiet_catalog_only
- scripts/agent/validate-debug-signal-grouping.ts: still_required
- scripts/agent/validate-debug-signal-actionability.ts: still_required
- scripts/agent/validate-debug-backlog-engine.ts: still_required
- tests/unit/debug-signal-grouping.spec.ts: still_required
- tests/unit/debug-signal-actionability.spec.ts: still_required

## Dirty Files

- CHANGELOG.md: release_artifact_expected
- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/behavior-math-status-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/consent-tracking-mode-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/current-beta-exit-status.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: current_generated_artifact_to_commit
- agent/state/debug-tracking-simplification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-liveness-source-repair.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-telemetry-coverage-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/legacy-recovery-status-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/runtime-debug-signal-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/tracking-summary-lane-cleanup.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/behavior-math-status-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/consent-tracking-mode-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- docs/agent-truth/debug-tracking-simplification.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-liveness-source-repair.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/feature-telemetry-coverage-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/legacy-recovery-status-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/runtime-debug-signal-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/tracking-summary-lane-cleanup.md: stale_generated_artifact_to_regenerate
- package.json: validator_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/tracking-summary-lane-cleanup-shared.ts: validator_artifact_expected
- scripts/agent/validate-behavior-math-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-consent-tracking-mode-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-debug-signal-grouping.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- scripts/agent/validate-event-liveness-source-repair.ts: validator_artifact_expected
- scripts/agent/validate-feature-telemetry-coverage-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-legacy-recovery-status-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-runtime-debug-signal-cleanup.ts: validator_artifact_expected
- scripts/agent/validate-tracking-summary-lane-cleanup.ts: validator_artifact_expected
- src/lib/analytics/event-translation-bridge.ts: debug_grouping_source_change
- src/lib/analytics/person-metrics-hydration.ts: debug_grouping_source_change
- src/lib/debug/debug-panel-tracking-summary.ts: debug_panel_source_change
- src/lib/privacy/consent-tracking-policy.ts: debug_grouping_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/behavior-math-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/consent-tracking-mode-cleanup.spec.ts: test_artifact_expected
- tests/unit/event-liveness-source-repair.spec.ts: test_artifact_expected
- tests/unit/feature-telemetry-coverage-cleanup.spec.ts: test_artifact_expected
- tests/unit/legacy-recovery-status-cleanup.spec.ts: test_artifact_expected
- tests/unit/runtime-debug-signal-cleanup.spec.ts: test_artifact_expected
- tests/unit/tracking-summary-lane-cleanup.spec.ts: test_artifact_expected

## Validation Failures

- none

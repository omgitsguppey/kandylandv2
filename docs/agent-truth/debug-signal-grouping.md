# Debug Signal Grouping

Generated: 2026-05-24T05:47:51.707Z
Status: pass
Current head: b0850954013ef36f732dec9ad90f64d5bcbfd65b

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
- costRisk: 80.5 -> 80.5; target=80; status=target_met; next=No score-80 action required for this dimension.
- regressionRisk: 86 -> 86; target=80; status=target_met; next=No score-80 action required for this dimension.
- overallHealthScore: 83.1 -> 83.1; target=80; status=target_met; next=No score-80 action required for this dimension.

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

- agent/context/optimized-task-context.generated.json: unrelated_agent_context_file_to_ignore
- agent/state/chat-functionality-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-gating-moderation.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-realtime-cost-control.generated.json: stale_generated_artifact_to_regenerate
- agent/state/chat-telemetry-admin-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/cost-risk-owner-review-closure.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-debug-score-lock.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-guidance-route-audit.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-lifecycle-telemetry.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reset-truth.generated.json: stale_generated_artifact_to_regenerate
- agent/state/daily-task-reward-ledger.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-envelope-normalization.generated.json: stale_generated_artifact_to_regenerate
- agent/state/event-liveness-audit.generated.json: current_generated_artifact_to_commit
- agent/state/event-translation-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/feature-registration-gate.generated.json: stale_generated_artifact_to_regenerate
- agent/state/formal-evidence-bridge.generated.json: stale_generated_artifact_to_regenerate
- agent/state/person-metrics-hydration.generated.json: stale_generated_artifact_to_regenerate
- agent/state/settings-connection-parity.generated.json: stale_generated_artifact_to_regenerate
- agent/state/telemetry-trigger-test-matrix.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-management-refactor.generated.json: stale_generated_artifact_to_regenerate
- agent/state/user-profile-api-contract.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-functionality-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-gating-moderation.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-realtime-cost-control.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/chat-telemetry-admin-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/cost-risk-owner-review-closure.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-debug-score-lock.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-guidance-route-audit.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-lifecycle-telemetry.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reset-truth.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/daily-task-reward-ledger.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-envelope-normalization.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/event-liveness-audit.md: documentation_artifact_expected
- docs/agent-truth/event-translation-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/formal-evidence-bridge.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/person-metrics-hydration.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/settings-connection-parity.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/telemetry-trigger-test-matrix.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-management-refactor.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/user-profile-api-contract.md: stale_generated_artifact_to_regenerate
- scripts/agent/validate-event-liveness-audit.ts: validator_artifact_expected
- src/app/api/admin/debug/route.ts: debug_panel_source_change
- src/lib/analytics/event-liveness-contract.ts: debug_grouping_source_change
- src/lib/analytics/event-liveness-engine.ts: debug_grouping_source_change
- src/lib/debug/debug-panel-tracking-summary.ts: debug_panel_source_change
- src/lib/server/admin-debug/summary.ts: debug_panel_source_change
- tests/unit/event-liveness-audit.spec.ts: test_artifact_expected

## Validation Failures

- none

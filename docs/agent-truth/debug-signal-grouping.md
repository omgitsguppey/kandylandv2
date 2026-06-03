# Debug Signal Grouping

Generated: 2026-06-03T04:57:54.953Z
Status: pass
Current head: 225f9e53f18b60edc7399c1ea258c0b9bacfae84

## Contract

- Default debug output uses grouped root-cause signals, not raw duplicate rows.
- Quiet future activity is one collapsed catalog group and is hidden from default warnings.
- Formal gates stay evidence gates and unique critical issues remain individual.
- This pass does not fake activity, fake evidence, read production data, deploy, or clear formal gates.

## Grouping Summary

- Raw signals: 446
- Grouped signals: 17
- Raw P1/P2 signals: 30
- P1/P2 groups: 16
- Duplicate signals collapsed: 429
- Quiet future activity raw/grouped: 416/1
- Actionable future activity signals: 0

## Score Dimensions

- sourceHealth: 100 -> 100; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 91.4 -> 91.4; target=80; status=target_met; next=No score-80 action required for this dimension.
- evidenceCompleteness: 91.4 -> 91.4; target=80; status=target_met; next=No score-80 action required for this dimension.
- freshness: 91.88 -> 91.88; target=80; status=target_met; next=No score-80 action required for this dimension.
- costRisk: 92.5 -> 92.5; target=80; status=target_met; next=No score-80 action required for this dimension.
- regressionRisk: 94 -> 94; target=80; status=target_met; next=No score-80 action required for this dimension.
- overallHealthScore: 93.99 -> 93.99; target=80; status=target_met; next=No score-80 action required for this dimension.

## Default Debug Groups

- evidence-evidence-evidence-evidence-freshness-freshness-evidence-score-impacting: count=6; hidden=false; actionability=score_impacting; rootCause=evidence; impact=16.33; next=Attach formal evidence before clearing this beta gate.
- beta-score-beta-score-beta-score-beta-score-evidencecompleteness-evidencecompleteness-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=12; next=Work the score dimension owner lane and refresh score-80 path lock.
- debug-panel-debug-panel-debug-panel-debug-panel-evidencecompleteness-evidencecompleteness-admin-debug-score-impacting: count=5; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=4; next=Use the canonical beta score and cap reasons as the primary Phase 1 queue.
- debug-panel-debug-panel-debug-panel-debug-panel-freshness-freshness-admin-debug-score-impacting: count=6; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=4; next=Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.
- beta-score-beta-score-beta-score-beta-score-freshness-freshness-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=7.07; next=Work the score dimension owner lane and refresh score-80 path lock.
- cost-cost-cost-cost-costrisk-costrisk-cost-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=cost; impact=4; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-regressionrisk-regressionrisk-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=1; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-sourcehealth-sourcehealth-beta-score-evidence-required: count=1; hidden=false; actionability=evidence_required; rootCause=beta_score; impact=0; next=Work the score dimension owner lane and refresh score-80 path lock.
- formal-gate-attach-a-redacted-first-party-admin-truth-sample-before-clearing-the-formal-admin-truth-evidence-gate-admin-: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=91.4; next=Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- formal-gate-attach-formal-deployed-runtime-provider-smoke-evidence-before-clearing-this-beta-gate-provider-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=91.4; next=Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- formal-gate-attach-formal-deployed-runtime-provider-smoke-evidence-before-clearing-this-beta-gate-runtime-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=91.4; next=Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
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

- Total: 166
- Unsafe unknown: 0
- Protected runtime changes: 0

### Classification Counts

- current_generated_artifact_to_commit: 3
- debug_grouping_source_change: 5
- documentation_artifact_expected: 2
- stale_generated_artifact_to_regenerate: 136
- test_artifact_expected: 5
- validator_artifact_expected: 15

### Dirty File Samples

- agent/state/activity-verification-engine.generated.json: stale_generated_artifact_to_regenerate
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

## Validation Failures

- none

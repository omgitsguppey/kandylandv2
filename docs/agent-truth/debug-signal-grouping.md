# Debug Signal Grouping

Generated: 2026-06-21T19:16:51.924Z
Status: pass
Current head: cbf48ed3419f240b49c9a2a17772476af2efd36c

## Contract

- Default debug output uses grouped root-cause signals, not raw duplicate rows.
- Quiet future activity is one collapsed catalog group and is hidden from default warnings.
- Schema formal_gate groups stay typed evidence gates and unique critical issues remain individual.
- This pass does not fake activity, fake evidence, read production data, deploy, or clear provider-backed site activity, deployed route, or admin source activity sample gates.

## Grouping Summary

- Raw signals: 50
- Grouped signals: 13
- Raw P1/P2 signals: 25
- P1/P2 groups: 12
- Duplicate signals collapsed: 37
- Quiet future activity raw/grouped: 25/1
- Actionable future activity signals: 0

## Score Dimensions

- sourceHealth: 97.2 -> 97.2; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 91.11 -> 91.11; target=80; status=target_met; next=No score-80 action required for this dimension.
- evidenceCompleteness: 95.2 -> 95.2; target=80; status=target_met; next=No score-80 action required for this dimension.
- freshness: 91.88 -> 91.88; target=80; status=target_met; next=No score-80 action required for this dimension.
- costRisk: 42 -> 42; target=80; status=below_target; next=Complete the remaining owner-reviewed cost readiness lanes; keep the final lock source-only with no production reads.
- regressionRisk: 94 -> 94; target=80; status=target_met; next=No score-80 action required for this dimension.
- overallHealthScore: 89.31 -> 89.31; target=80; status=target_met; next=No score-80 action required for this dimension.

## Default Debug Groups

- debug-panel-debug-panel-debug-panel-debug-panel-freshness-freshness-admin-debug-score-impacting: count=9; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=4; next=Attach redacted provider-backed site activity evidence; do not convert operator-reported PayPal context into a pass.
- evidence-evidence-evidence-evidence-freshness-freshness-evidence-score-impacting: count=3; hidden=false; actionability=score_impacting; rootCause=evidence; impact=2; next=Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock
- beta-score-beta-score-beta-score-beta-score-evidencecompleteness-evidencecompleteness-beta-score-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=95.2; next=Keep targeted behavior checks as source-only evidence; keep provider-backed site activity, runtime/deployed route evidence, and admin source activity sample gates separate.
- cost-cost-cost-cost-costrisk-costrisk-cost-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=cost; impact=5.22; next=Work the score dimension owner lane and refresh score-80 path lock.
- debug-panel-debug-panel-debug-panel-debug-panel-evidencecompleteness-evidencecompleteness-admin-debug-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=1; next=Keep missing state visible until an owning generator is identified.
- beta-score-beta-score-beta-score-beta-score-freshness-freshness-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=0.97; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-sourcehealth-sourcehealth-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=0.62; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-regressionrisk-regressionrisk-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=0.6; next=Work the score dimension owner lane and refresh score-80 path lock.
- formal-gate-attach-redacted-provider-backed-site-activity-evidence-and-deployed-route-evidence-before-clearing-this-beta: count=2; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=91.11; next=Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- formal-gate-attach-deployed-route-evidence-before-treating-runtime-health-as-current-runtime-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=4.07; next=Attach deployed route evidence before treating runtime health as current.
- formal-gate-keep-this-cost-lane-in-owner-review-until-external-billing-provider-evidence-is-attached-cost: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=2; next=Keep this cost lane in owner review until external billing/provider evidence is attached.
- formal-gate-attach-a-redacted-admin-source-activity-sample-before-clearing-the-admin-source-sample-gate-admin-debug: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=1.76; next=Attach a redacted admin source activity sample before clearing the admin source sample gate.
- quiet-future-activity-future-activity-catalog: count=25; hidden=true; actionability=quiet_future_activity; rootCause=future_activity_placeholder; impact=0; next=Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.

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

- Total: 18
- Unsafe unknown: 0
- Protected runtime changes: 0

### Classification Counts

- current_generated_artifact_to_commit: 2
- documentation_artifact_expected: 1
- stale_generated_artifact_to_regenerate: 15

### Dirty File Samples

- agent/state/behavior-math-verification.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-index.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-evidence-precacher-refresh.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-recovery-playbooks.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-runtime-evidence.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-actionability.generated.json: stale_generated_artifact_to_regenerate
- agent/state/debug-signal-grouping.generated.json: current_generated_artifact_to_commit
- agent/state/precatch-runtime-issues.generated.json: stale_generated_artifact_to_regenerate
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- agent/state/sitewide-image-optimization-cleanup.generated.json: stale_generated_artifact_to_regenerate
- agent/state/targeted-behavior-evidence.generated.json: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-evidence-precacher-refresh.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-recovery-playbooks.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-runtime-evidence.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-actionability.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- docs/agent-truth/sitewide-image-optimization-cleanup.md: stale_generated_artifact_to_regenerate
- docs/agent-truth/targeted-behavior-evidence.md: stale_generated_artifact_to_regenerate

## Validation Failures

- none

# Debug Signal Grouping

Generated: 2026-05-23T20:22:53.765Z
Status: pass
Current head: 669519046fe7caeefb8641ec6d4b7281a960cea8

## Contract

- Default debug output uses grouped root-cause signals, not raw duplicate rows.
- Quiet future activity is one collapsed catalog group and is hidden from default warnings.
- Formal gates stay evidence gates and unique critical issues remain individual.
- This pass does not fake activity, fake evidence, read production data, deploy, or clear formal gates.

## Grouping Summary

- Raw signals: 458
- Grouped signals: 16
- Raw P1/P2 signals: 42
- P1/P2 groups: 15
- Duplicate signals collapsed: 442
- Quiet future activity raw/grouped: 416/1
- Actionable future activity signals: 0

## Score Dimensions

- sourceHealth: 91.7 -> 91.7; target=80; status=target_met; next=No score-80 action required for this dimension.
- runtimeHealth: 67.75 -> 67.5; target=80; status=below_target; next=Capture formal runtime/provider smoke evidence; local source validators must not be promoted to runtime proof.
- evidenceCompleteness: 39.25 -> 39; target=80; status=below_target; next=Attach or refresh formal provider, runtime, admin-truth, and stale report evidence without faking activity.
- freshness: 62.86 -> 62.86; target=80; status=below_target; next=Refresh stale generated reports listed in the public beta score refresh plan, then rerun score:beta and check:beta-score.
- costRisk: 42 -> 42; target=80; status=below_target; next=Complete the remaining owner-reviewed cost readiness lanes; keep the final lock source-only with no production reads.
- regressionRisk: 42 -> 42; target=80; status=below_target; next=Resolve stale/formal regression evidence gates with targeted validators before treating the release as score-80 locked.
- overallHealthScore: 62.15 -> 62.05; target=80; status=below_target; next=Complete every below-target dimension next action, then rerun score:beta and check:beta-score.

## Default Debug Groups

- beta-score-beta-score-beta-score-beta-score-evidencecompleteness-evidencecompleteness-beta-score-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=39.25; next=Work the score dimension owner lane and refresh score-80 path lock.
- evidence-evidence-evidence-evidence-freshness-freshness-evidence-score-impacting: count=18; hidden=false; actionability=score_impacting; rootCause=evidence; impact=16.33; next=Attach formal evidence before clearing this beta gate.
- debug-panel-debug-panel-debug-panel-debug-panel-freshness-freshness-admin-debug-score-impacting: count=9; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=4; next=Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.
- beta-score-beta-score-beta-score-beta-score-freshness-freshness-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=7.07; next=Work the score dimension owner lane and refresh score-80 path lock.
- cost-cost-cost-cost-costrisk-costrisk-cost-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=cost; impact=4; next=Work the score dimension owner lane and refresh score-80 path lock.
- beta-score-beta-score-beta-score-beta-score-regressionrisk-regressionrisk-beta-score-score-impacting: count=1; hidden=false; actionability=score_impacting; rootCause=beta_score; impact=1; next=Work the score dimension owner lane and refresh score-80 path lock.
- debug-panel-debug-panel-debug-panel-debug-panel-evidencecompleteness-evidencecompleteness-admin-debug-score-impacting: count=2; hidden=false; actionability=score_impacting; rootCause=debug_panel; impact=1; next=Keep missing state visible until an owning generator is identified.
- beta-score-beta-score-beta-score-beta-score-sourcehealth-sourcehealth-beta-score-evidence-required: count=1; hidden=false; actionability=evidence_required; rootCause=beta_score; impact=0; next=Work the score dimension owner lane and refresh score-80 path lock.
- formal-gate-attach-formal-deployed-runtime-provider-smoke-evidence-before-clearing-this-beta-gate-provider-evidence: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=67.75; next=Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- formal-gate-attach-a-redacted-first-party-admin-truth-sample-before-clearing-the-formal-admin-truth-evidence-gate-admin-: count=1; hidden=false; actionability=formal_gate; rootCause=blocked_formal_evidence; impact=39.25; next=Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
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
- agent/state/debug-signal-grouping.generated.json: current_generated_artifact_to_commit
- agent/state/public-beta-score.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/debug-signal-grouping.md: documentation_artifact_expected
- package.json: validator_artifact_expected
- public/kandydrops-release-notes.json: release_artifact_expected
- scripts/agent/validate-debug-signal-grouping.ts: validator_artifact_expected
- src/lib/debug/debug-backlog-builder.ts: debug_backlog_source_change
- src/lib/debug/debug-backlog-contract.ts: debug_backlog_source_change
- src/lib/debug/debug-panel-tracking-summary.ts: debug_panel_source_change
- src/lib/debug/debug-signal-grouping.ts: debug_grouping_source_change
- src/lib/release-notes/public-release-notes.ts: release_artifact_expected
- src/lib/release-notes/release-version-contract.ts: release_artifact_expected
- tests/unit/debug-signal-grouping.spec.ts: test_artifact_expected

## Validation Failures

- none

# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-06-21T18:46:50.467Z
Current HEAD: 96f65d3c093572d8d48861aa00f3935d824f71aa
Score: 41.92 -> 84
Readiness: Source evidence required

## Summary

- Total backlog items: 31
- Open P0/P1 items: 7
- Evidence refreshable: 15
- Source-fixable: 9
- Source truth states: source_fixable=8, source_refresh_required=15, runtime_proof_required=3, provider_or_external_proof_required=1, admin_truth_source_required=2, stale_evidence_archive=1, not_actionable=1
- Stale retired: 1
- Default-visible actionability signals: 31
- Hidden-by-default actionability signals: 0
- Quiet future activity: 0
- Duplicate signals collapsed: 0

## P0/P1 Queue

- P1 beta-cap-source-evidence-required-provider-backed-site-activity-deployed-route-evidence-1: Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- P1 admin-truth-formal-sample-required: Attach a redacted admin source activity sample before clearing the admin source sample gate.
- P1 formal-evidence-provider-backed-site-activity-deployed-route-evidence: Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- P1 debug-panel-provider-smoke: Attach redacted provider-backed site activity evidence; do not convert operator-reported PayPal context into a pass.
- P1 debug-panel-public-beta-score: Use the canonical beta score and cap reasons as the primary Phase 1 queue.
- P1 debug-panel-score-cap-reasons: Work the visible cap reasons in order instead of hiding them in Debug.
- P1 stale-artifact-agent-state-overnight-final-integration-lock-generated-json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Stale Retired

- debug-panel-analytics-rewire: Debug panel item is stale without an owner refresh command.

## Strict Gates

- The engine does not clear beta exit readiness.
- Formal provider smoke remains blocked without formal artifact.
- Deployed runtime smoke remains blocked without deployed runtime proof.
- Admin truth sample remains blocked until a redacted first-party sample is attached.

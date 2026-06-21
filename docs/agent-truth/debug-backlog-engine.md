# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-06-21T03:52:57.646Z
Current HEAD: ffc19e6c5cad6b5fedd1eae6543a8af066cc770c
Score: 41.92 -> 84
Readiness: Source evidence required

## Summary

- Total backlog items: 36
- Open P0/P1 items: 8
- Evidence refreshable: 20
- Source-fixable: 8
- Source truth states: source_fixable=7, source_refresh_required=20, runtime_proof_required=3, provider_or_external_proof_required=1, admin_truth_source_required=3, stale_evidence_archive=1, not_actionable=1
- Stale retired: 1
- Default-visible actionability signals: 36
- Hidden-by-default actionability signals: 0
- Quiet future activity: 0
- Duplicate signals collapsed: 0

## P0/P1 Queue

- P1 beta-cap-source-evidence-required-admin-truth-sample-evidence-2: Attach a redacted admin source activity sample before clearing the admin source sample gate.
- P1 beta-cap-source-evidence-required-runtime-provider-smoke-1: Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- P1 formal-evidence-admin-truth-sample-evidence: Attach a redacted admin source activity sample before clearing the admin source sample gate.
- P1 score-drag-evidencecompletenessscore: Work the score dimension owner lane and refresh score-80 path lock.
- P1 formal-evidence-runtime-provider-smoke: Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- P1 admin-truth-formal-sample-required: Attach a redacted admin source sample before clearing the admin source sample gate.
- P1 debug-panel-provider-smoke: Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.
- P1 stale-artifact-agent-state-overnight-final-integration-lock-generated-json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Stale Retired

- debug-panel-analytics-rewire: Debug panel item is stale without an owner refresh command.

## Strict Gates

- The engine does not clear beta exit readiness.
- Formal provider smoke remains blocked without formal artifact.
- Deployed runtime smoke remains blocked without deployed runtime proof.
- Admin truth sample remains blocked until a redacted first-party sample is attached.

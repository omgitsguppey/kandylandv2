# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-06-16T20:24:37.601Z
Current HEAD: 174dbc316b5e1bd6786221daf48f44e83d2bc898
Score: 41.92 -> 69.89
Readiness: Stale evidence

## Summary

- Total backlog items: 45
- Open P0/P1 items: 9
- Evidence refreshable: 31
- Source-fixable: 8
- Source truth states: source_fixable=7, source_refresh_required=31, runtime_proof_required=3, provider_or_external_proof_required=1, admin_truth_source_required=2, stale_evidence_archive=1
- Stale retired: 1
- Default-visible actionability signals: 45
- Hidden-by-default actionability signals: 0
- Quiet future activity: 0
- Duplicate signals collapsed: 0

## P0/P1 Queue

- P1 beta-cap-stale-evidence-runtime-provider-smoke-1: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 beta-cap-unknown-evidence-targeted-behavior-tests-0: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 beta-cap-stale-evidence-admin-truth-sample-evidence-2: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 score-drag-runtimehealthscore: Attach deployed runtime smoke evidence before treating runtime health as proven.
- P1 stale-artifact-runtime-provider-smoke: Attach formal evidence before clearing this beta gate.
- P1 score-drag-evidencecompletenessscore: Work the score dimension owner lane and refresh score-80 path lock.
- P1 admin-truth-formal-sample-required: Attach a redacted production admin truth sample before clearing the formal admin truth gate.
- P1 debug-panel-provider-smoke: Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.
- P1 stale-artifact-agent-state-overnight-final-integration-lock-generated-json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Stale Retired

- debug-panel-analytics-rewire: Debug panel item is stale without an owner refresh command.

## Strict Gates

- The engine does not clear beta exit readiness.
- Formal provider smoke remains blocked without formal artifact.
- Deployed runtime smoke remains blocked without deployed runtime proof.
- Admin truth sample remains blocked until a redacted first-party sample is attached.

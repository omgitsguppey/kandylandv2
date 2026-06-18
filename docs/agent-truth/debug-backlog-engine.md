# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-06-18T22:35:53.876Z
Current HEAD: 28d80de7a4c1fdcb7a3a4569fed4d0c44acebd0e
Score: 41.92 -> 77.4
Readiness: External proof required

## Summary

- Total backlog items: 49
- Open P0/P1 items: 11
- Evidence refreshable: 32
- Source-fixable: 8
- Source truth states: source_fixable=7, source_refresh_required=32, runtime_proof_required=4, provider_or_external_proof_required=1, admin_truth_source_required=3, manual_visual_required=1, stale_evidence_archive=1
- Stale retired: 1
- Default-visible actionability signals: 49
- Hidden-by-default actionability signals: 0
- Quiet future activity: 0
- Duplicate signals collapsed: 0

## P0/P1 Queue

- P1 beta-cap-external-proof-required-runtime-provider-smoke-0: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 beta-cap-external-proof-required-admin-truth-sample-evidence-1: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 formal-evidence-debug-runtime-evidence: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 formal-evidence-runtime-provider-smoke: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 score-drag-runtimehealthscore: Attach deployed runtime smoke evidence before treating runtime health as proven.
- P1 formal-evidence-admin-truth-sample-evidence: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 formal-evidence-visual-manual-smoke: Attach targeted manual or screenshot evidence before clearing visual proof.
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

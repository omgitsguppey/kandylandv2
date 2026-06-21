# AI Critic P1 Triage

Status: source-backed score triage for AI critic request-change cleanup. Typed evidence gates and operator-context lanes remain separate and are not cleared by this pass.

- Score: 89.31 -> 89.31
- Critic status: blocked -> blocked
- P1 fixed/deferred: 1/7
- P2 deferred: 25

## Fixed This Pass

- route-diagnostic-admin-truth-samples: Route diagnostics now only ingest route/API/HTTP diagnostic items from the debug panel.

## Top P1 Queue

- 1. beta-cap-source-evidence-required-provider-backed-site-activity-deployed-route-evidence-1: 91.11 (blocked_formal_evidence) - Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- 2. admin-truth-formal-sample-required: 4.5 (blocked_formal_evidence) - Attach a redacted admin source activity sample before clearing the admin source sample gate.
- 3. formal-evidence-provider-backed-site-activity-deployed-route-evidence: 4.07 (blocked_formal_evidence) - Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.
- 4. debug-panel-provider-smoke: 4 (blocked_formal_evidence) - Attach redacted provider-backed site activity evidence; do not convert operator-reported PayPal context into a pass.
- 5. debug-panel-public-beta-score: 4 (needs_refresh) - Use the canonical beta score and cap reasons as the primary Phase 1 queue.
- 6. debug-panel-score-cap-reasons: 4 (needs_refresh) - Work the visible cap reasons in order instead of hiding them in Debug.
- 7. stale-artifact-agent-state-overnight-final-integration-lock-generated-json: 2 (needs_refresh) - Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Typed Evidence Gates

- Provider-backed site activity + deployed route evidence: Source evidence required


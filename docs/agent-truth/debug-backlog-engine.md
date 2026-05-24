# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-05-24T23:32:07.304Z
Current HEAD: 7b0a0da430881d9f9c9443de922b6d483f9c8fff
Score: 41.92 -> 79
Readiness: Stale evidence

## Summary

- Total backlog items: 51
- Open P0/P1 items: 17
- Evidence refreshable: 36
- Source-fixable: 9
- Manual required: 5
- Stale retired: 1
- Default-visible actionability signals: 51
- Hidden-by-default actionability signals: 0
- Quiet future activity: 0
- Duplicate signals collapsed: 0

## P0/P1 Queue

- P1 beta-cap-ready-with-smoke-required-debug-runtime-evidence-3: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 beta-cap-runtime-unverified-runtime-provider-smoke-0: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 beta-cap-ready-with-smoke-required-admin-truth-sample-evidence-1: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 score-drag-runtimehealthscore: Attach deployed runtime smoke evidence before treating runtime health as proven.
- P1 stale-artifact-runtime-provider-smoke: Attach formal evidence before clearing this beta gate.
- P1 score-drag-evidencecompletenessscore: Work the score dimension owner lane and refresh score-80 path lock.
- P1 admin-truth-formal-sample-required: Attach a redacted production admin truth sample before clearing the formal admin truth gate.
- P1 debug-panel-admin-truth-samples: Attach a fresh first-party admin truth sample before upgrading this gate.
- P1 debug-panel-final-launch-readiness: Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.
- P1 debug-panel-launch-pr-triage: Run npm run check:launch-pr-triage when this stale warning must be refreshed.
- P1 debug-panel-launch-readiness: Run npm run check:launch-readiness-final when this stale warning must be refreshed.
- P1 debug-panel-provider-smoke: Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.
- P1 debug-panel-public-beta-score: Use the canonical beta score and cap reasons as the primary Phase 1 queue.
- P1 debug-panel-runtime-evidence: Run formal deployed runtime smoke before marking runtime/provider smoke complete.
- P1 debug-panel-score-cap-reasons: Work the visible cap reasons in order instead of hiding them in Debug.
- P1 route-diagnostic-runtime-evidence: Inspect the route diagnostic owner and fix the route source or keep the warning open.
- P1 stale-artifact-agent-state-overnight-final-integration-lock-generated-json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Stale Retired

- debug-panel-analytics-rewire: Debug panel item is stale without an owner refresh command.

## Strict Gates

- The engine does not clear beta exit readiness.
- Formal provider smoke remains blocked without formal artifact.
- Deployed runtime smoke remains blocked without deployed runtime proof.
- Admin truth sample remains blocked until a redacted first-party sample is attached.

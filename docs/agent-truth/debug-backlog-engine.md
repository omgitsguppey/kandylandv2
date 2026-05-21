# Debug Backlog Engine

Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.

Generated: 2026-05-21T05:23:49.777Z
Current HEAD: f97634cf0ccd718b0b77966d08f77258ae01044a
Score: 41.92 -> 65.8
Readiness: Visual QA required

## Summary

- Total backlog items: 89
- Open P0/P1 items: 20
- Evidence refreshable: 49
- Source-fixable: 20
- Manual required: 5
- Stale retired: 15

## P0/P1 Queue

- P1 beta-cap-ready-with-smoke-required-admin-truth-sample-evidence-2: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- P1 beta-cap-visual-qa-required-visual-manual-smoke-0: Attach targeted manual or screenshot evidence before clearing visual/manual smoke.
- P1 beta-cap-runtime-unverified-runtime-provider-smoke-1: Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- P1 score-drag-runtimehealthscore: Attach deployed runtime smoke evidence before treating runtime health as proven.
- P1 stale-artifact-debug-runtime-evidence: Attach formal evidence before clearing this beta gate.
- P1 stale-artifact-runtime-provider-smoke: Attach formal evidence before clearing this beta gate.
- P1 score-drag-evidencecompletenessscore: Work the score dimension owner lane and refresh score-80 path lock.
- P1 stale-artifact-admin-truth-sample-evidence: Attach formal evidence before clearing this beta gate.
- P1 stale-artifact-visual-manual-smoke: Attach formal evidence before clearing this beta gate.
- P1 admin-truth-formal-sample-required: Attach a redacted production admin truth sample before clearing the formal admin truth gate.
- P1 debug-panel-admin-truth-samples: Attach a fresh first-party admin truth sample before upgrading this gate.
- P1 debug-panel-final-launch-readiness: Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.
- P1 debug-panel-launch-pr-triage: Run npm run check:launch-pr-triage when this stale warning must be refreshed.
- P1 debug-panel-launch-readiness: Run npm run check:launch-readiness-final when this stale warning must be refreshed.
- P1 debug-panel-provider-smoke: Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.
- P1 debug-panel-public-beta-score: Use the canonical beta score and cap reasons as the primary Phase 1 queue.
- P1 debug-panel-runtime-evidence: Run formal deployed runtime smoke before marking runtime/provider smoke complete.
- P1 debug-panel-score-cap-reasons: Work the visible cap reasons in order instead of hiding them in Debug.
- P1 route-diagnostic-admin-truth-samples: Inspect the route diagnostic owner and fix the route source or keep the warning open.
- P1 stale-artifact-agent-state-overnight-final-integration-lock-generated-json: Overnight final integration lock was generated from an older code version. Refresh this report from the latest code version. Run: npm run check:overnight-final-integration-lock

## Stale Retired

- debug-panel-analytics-rewire: Debug panel item is stale without an owner refresh command.
- debug-panel-recovery-evidence: Debug panel item is stale without an owner refresh command.
- debug-panel-report-cloud-cost: Debug panel item is stale without an owner refresh command.
- debug-panel-report-codebase-hardening: Debug panel item is stale without an owner refresh command.
- debug-panel-report-creator-lane: Debug panel item is stale without an owner refresh command.
- debug-panel-report-creator-lane-legacy: Debug panel item is stale without an owner refresh command.
- debug-panel-report-device-layout: Debug panel item is stale without an owner refresh command.
- debug-panel-report-device-ui: Debug panel item is stale without an owner refresh command.
- debug-panel-report-google-cost: Debug panel item is stale without an owner refresh command.
- debug-panel-report-hydration: Debug panel item is stale without an owner refresh command.
- debug-panel-report-orphaned-logic: Debug panel item is stale without an owner refresh command.
- debug-panel-report-precatch-runtime: Debug panel item is stale without an owner refresh command.
- debug-panel-report-speed-security: Debug panel item is stale without an owner refresh command.
- debug-panel-report-sql-mirror: Debug panel item is stale without an owner refresh command.
- debug-panel-report-telemetry-parity: Debug panel item is stale without an owner refresh command.

## Strict Gates

- The engine does not clear beta exit readiness.
- Formal provider smoke remains blocked without formal artifact.
- Deployed runtime smoke remains blocked without deployed runtime proof.
- Admin truth sample remains blocked until a redacted first-party sample is attached.

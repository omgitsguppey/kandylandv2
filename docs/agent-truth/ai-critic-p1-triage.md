# AI Critic P1 Triage

Status: source-backed score triage for AI critic request-change cleanup. Formal/manual evidence gates remain separate and are not cleared by this pass.

- Score: 77.76 -> 77.76
- Critic status: pass -> pass
- P1 fixed/deferred: 1/20
- P2 deferred: 61

## Fixed This Pass

- route-diagnostic-admin-truth-samples: Route diagnostics now only ingest route/API/HTTP diagnostic items from the debug panel.

## Top P1 Queue

- 1. beta-cap-runtime-unverified-runtime-provider-smoke-1: 75.5 (blocked_formal_evidence) - Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- 2. beta-cap-visual-qa-required-ui-visual-manual-smoke-0: 75.5 (blocked_formal_evidence) - Attach formal deployed runtime/provider smoke evidence before clearing this beta gate.
- 3. beta-cap-ready-with-smoke-required-admin-truth-sample-evidence-2: 63.75 (blocked_formal_evidence) - Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.
- 4. score-drag-runtimehealthscore: 16.33 (blocked_formal_evidence) - Attach deployed runtime smoke evidence before treating runtime health as proven.
- 5. stale-artifact-debug-runtime-evidence: 16.33 (blocked_formal_evidence) - Attach formal evidence before clearing this beta gate.
- 6. stale-artifact-runtime-provider-smoke: 16.33 (blocked_formal_evidence) - Attach formal evidence before clearing this beta gate.
- 7. score-drag-evidencecompletenessscore: 12 (needs_refresh) - Work the score dimension owner lane and refresh score-80 path lock.
- 8. stale-artifact-admin-truth-sample-evidence: 12 (blocked_formal_evidence) - Attach formal evidence before clearing this beta gate.
- 9. stale-artifact-visual-manual-smoke: 12 (blocked_formal_evidence) - Attach formal evidence before clearing this beta gate.
- 10. admin-truth-formal-sample-required: 4.5 (blocked_formal_evidence) - Attach a redacted production admin truth sample before clearing the formal admin truth gate.
- 11. debug-panel-admin-truth-samples: 4 (blocked_formal_evidence) - Attach a fresh first-party admin truth sample before upgrading this gate.
- 12. debug-panel-final-launch-readiness: 4 (needs_refresh) - Run npm run check:final-launch-readiness-report when this stale warning must be refreshed.

## Formal Evidence Gates

- UI visual/manual smoke: Visual QA required
- Runtime/provider smoke: Runtime unverified
- Admin truth/sample evidence: Ready with smoke required


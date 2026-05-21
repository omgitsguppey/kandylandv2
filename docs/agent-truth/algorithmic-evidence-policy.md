# Algorithmic Evidence Policy

Status: algorithmic_evidence_policy_ready

Manual screenshot evidence is scoped to UI visual/layout confirmation. It must not block non-UI telemetry, admin, cost, refresh, or source-runtime confidence.

## Coverage

- runtime_source_gate: partial; score=100; source=`agent/state/debug-runtime-evidence.generated.json,agent/state/source-backed-runtime-confidence.generated.json,agent/state/real-usage-confidence.generated.json,agent/state/real-usage-confidence-calibration.generated.json`; source-backed runtime confidence improves runtime health but does not clear deployed runtime smoke
- telemetry_gate: partial; score=92; source=`agent/state/behavior-math-verification.generated.json,agent/state/real-usage-confidence.generated.json,agent/state/real-usage-confidence-calibration.generated.json`; telemetry and behavior math can satisfy non-UI confidence without becoming visual proof
- admin_truth_gate: partial; score=55; source=`agent/state/admin-truth-source-sample.generated.json`; admin source sample earns partial confidence but does not clear formal admin runtime sample
- provider_gate: partial; score=40; source=`agent/state/operator-revenue-smoke.generated.json`; operator-confirmed revenue smoke is partial product confidence only
- cost_gate: partial; score=45; source=`agent/state/score-80-cost-readiness.generated.json`; source cost readiness can improve cost confidence; external billing review remains separate
- refresh_gate: partial; score=75; source=`agent/state/self-healing-refresh-queue.generated.json`; current refresh queue can satisfy source freshness ordering without creating runtime proof

## Formal Gates

- UI visual gate cleared: false
- Deployed runtime smoke cleared: false
- Formal provider gate cleared: false
- Formal admin runtime sample cleared: false

## Remaining Evidence

- UI visual/manual smoke requires screenshot or operator visual evidence when UI changed.
- Deployed runtime smoke requires a formal runtime artifact.
- Provider smoke requires a formal provider artifact.
- Admin truth sample requires a formal runtime/sample artifact.


# Algorithmic Evidence Policy

Status: algorithmic_evidence_policy_ready

Deterministic UI surface coverage is source-owned. Screenshots are optional follow-up evidence only after a source-reported UI issue and must not block non-UI telemetry, admin, cost, refresh, or source-runtime confidence.

## Coverage

- runtime_source_gate: formal; score=100; source=`agent/state/debug-runtime-evidence.generated.json,agent/state/runtime-smoke-substitute-matrix.generated.json,agent/state/source-backed-runtime-confidence.generated.json,agent/state/real-usage-confidence.generated.json,agent/state/real-usage-confidence-calibration.generated.json`; current deployed route source evidence is attached
- telemetry_gate: partial; score=72; source=`agent/state/behavior-math-verification.generated.json,agent/state/real-usage-confidence.generated.json,agent/state/real-usage-confidence-calibration.generated.json`; telemetry and behavior math can satisfy non-UI confidence while UI and runtime lanes keep their own source evidence
- admin_truth_gate: partial; score=55; source=`agent/state/admin-truth-source-sample.generated.json`; admin source sample earns partial confidence; clearing needs a matching source activity sample
- provider_gate: partial; score=40; source=`agent/state/operator-revenue-smoke.generated.json`; operator-confirmed revenue smoke is partial product confidence only
- cost_gate: partial; score=45; source=`agent/state/score-80-cost-readiness.generated.json`; source cost readiness can improve cost confidence; external billing review remains separate
- refresh_gate: partial; score=75; source=`agent/state/self-healing-refresh-queue.generated.json`; current refresh queue can satisfy source freshness ordering without creating deployed runtime truth

## Evidence Boundaries

- UI surface coverage clears only the UI source gate: false
- Deployed route evidence cleared: true
- Provider-backed site activity cleared: false
- Admin source activity sample cleared: false

## Remaining Evidence

- Provider lane requires provider-backed site activity evidence.
- Admin lane requires a redacted source activity sample.


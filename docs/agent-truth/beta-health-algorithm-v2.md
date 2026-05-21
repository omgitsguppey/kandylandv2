# Beta Health Algorithm V2

Artifact: `agent/state/beta-health-algorithm-v2.generated.json`
Validator: `npm run check:beta-health-algorithm-v2`

Beta readiness is not a binary pass/fail checklist. The public beta score uses a weighted health model that gives partial credit for source-ready and partial evidence while keeping formal launch gates intact.

## Canonical Model

- `sourceHealthScore`: deterministic source scanner and targeted validator health.
- `runtimeHealthScore`: deployed runtime/provider/admin confidence plus source-backed runtime, telemetry, and debug confidence. UI screenshot evidence is not counted as runtime health.
- `evidenceCompletenessScore`: completeness of required non-UI beta-exit artifacts. UI visual/manual evidence remains a launch blocker, but it no longer suppresses telemetry, admin, cost, refresh, or source-runtime confidence.
- `freshnessScore`: generated report age, source commit, and current HEAD freshness.
- `costRiskScore`: Cloud Run, SQL/Data Connect, Gemini/Cloud Assist, BigQuery, and 4xx cost-readiness risk.
- `regressionRiskScore`: stale reports, HEAD mismatches, PR freshness, and high-blast changes after evidence.
- `launchGateStatus`: launch gate state that remains separate from the numeric health score.

Source-ready lanes can earn source credit and non-UI algorithmic confidence, but cannot clear runtime, provider, visual/manual, or admin truth requirements alone. Runtime/provider/admin truth artifacts can raise formal runtime and evidence confidence only when they are formal and fresh. UI visual/manual evidence is scoped to layout-sensitive visual confirmation. Missing evidence reduces confidence and blocks launch, but it does not erase unrelated source work.

## Evidence Quality

Evidence quality is resolved as:

- `formal_passed`: fresh formal artifact, high confidence.
- `formal_partial`: partial formal artifact, medium confidence.
- `source_ready`: source validators or source doctrine are ready, but runtime proof remains separate.
- `operator_reported`: human report without attached formal artifact, low confidence and not launch proof.
- `stale`: evidence exists but decays by freshness age or HEAD mismatch.
- `missing`, `unavailable`, `failed`: no launch credit; required lanes block launch.
- `owner_review`: neither pass nor fail; it carries cost/risk weight until owner evidence exists.

Critical source blockers still auto-fail. Formal beta exit requires manual screenshot evidence, provider smoke evidence, deployed runtime evidence, admin truth samples, no critical blockers, and current evidence freshness.

## Removed Conflicts

- Scanner-clean does not mean launch-ready.
- Missing evidence no longer erases unrelated source health.
- Source-ready does not mean runtime-proven.
- Cost owner-review is not a pass.
- Manual smoke is a UI visual evidence lane, not the gate for non-UI telemetry, admin, cost, refresh, or source-runtime confidence.
- Operator-confirmed revenue smoke is partial provider confidence only; formal provider smoke still requires a formal artifact.
- Source-backed runtime confidence can raise runtime health, but deployed runtime smoke remains a formal gate.

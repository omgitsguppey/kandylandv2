# Current Head Release Reconciliation

Artifact: `agent/state/current-head-release-reconciliation.generated.json`
Validator: `npm run check:current-head-release-reconciliation`

## Summary

- Generated: `2026-07-14T10:38:51.888Z`
- Current head: `dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa`
- Status: `pass`

## Report

```json
{
  "reportKey": "current-head-release-reconciliation",
  "generatedAtUtc": "2026-07-14T10:38:51.888Z",
  "currentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "publicBetaScoreCurrentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "currentBetaExitStatusCurrentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "scoreBefore": 83.38,
  "scoreAfter": 83.38,
  "scoreDimensions": {
    "sourceHealth": 95.5,
    "runtimeHealth": 70.22,
    "evidenceCompleteness": 80,
    "freshness": 92.5,
    "costRisk": 92.5,
    "regressionRisk": 94,
    "overallHealthScore": 83.38
  },
  "artifacts": [
    {
      "artifactPath": "agent/state/public-beta-score.generated.json",
      "reportKey": "",
      "currentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
      "generatedAtUtc": "2026-07-14T10:29:58.780Z",
      "status": "current",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/public-beta-score.generated.json was generated for the current code version."
    },
    {
      "artifactPath": "agent/state/current-beta-exit-status.generated.json",
      "reportKey": "current-beta-exit-status",
      "currentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
      "generatedAtUtc": "2026-07-14T10:17:24.403Z",
      "status": "current",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/current-beta-exit-status.generated.json was generated for the current code version."
    },
    {
      "artifactPath": "agent/state/formal-evidence-bridge.generated.json",
      "reportKey": "formal-evidence-bridge",
      "currentHead": "84820ddc673f44a8094c37b382e7d0af5f3fb3ad",
      "generatedAtUtc": "2026-07-03T08:12:04.070Z",
      "status": "current_by_impact",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/formal-evidence-bridge.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/final-product-integrity-lock.generated.json",
      "reportKey": "final-product-integrity-lock",
      "currentHead": "a74f489c81e605f1c9a280f28726d352fcb54dee",
      "generatedAtUtc": "2026-05-26T08:18:03.231Z",
      "status": "head_mismatch",
      "affectsReadiness": false,
      "nextExactAction": "Refresh agent/state/final-product-integrity-lock.generated.json with its owning check before it can affect readiness."
    },
    {
      "artifactPath": "agent/state/final-math-normalization-lock.generated.json",
      "reportKey": "final-math-normalization-lock",
      "currentHead": "dc4dad82c",
      "generatedAtUtc": "2026-07-14T06:34:49.281Z",
      "status": "current_by_impact",
      "affectsReadiness": false,
      "nextExactAction": "agent/state/final-math-normalization-lock.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/mega-legacy-pipeline-hardening.generated.json",
      "reportKey": "mega-legacy-pipeline-hardening",
      "currentHead": "3190fc8fc4da226c996cc8589d6ec4ed2977700c",
      "generatedAtUtc": "2026-07-03T07:11:01.901Z",
      "status": "current_by_impact",
      "affectsReadiness": false,
      "nextExactAction": "agent/state/mega-legacy-pipeline-hardening.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/self-revealing-codebase.generated.json",
      "reportKey": "self-revealing-codebase",
      "generatedAtUtc": "2026-07-03T07:11:01.901Z",
      "status": "head_mismatch",
      "affectsReadiness": false,
      "nextExactAction": "Refresh agent/state/self-revealing-codebase.generated.json with its owning check before it can affect readiness."
    },
    {
      "artifactPath": "agent/state/codebase-organization-hardening.generated.json",
      "reportKey": "codebase-organization-hardening",
      "generatedAtUtc": "2026-07-03T07:11:50.593Z",
      "status": "head_mismatch",
      "affectsReadiness": false,
      "nextExactAction": "Refresh agent/state/codebase-organization-hardening.generated.json with its owning check before it can affect readiness."
    },
    {
      "artifactPath": "agent/state/codex-execution-guardrails.generated.json",
      "reportKey": "codex-execution-guardrails",
      "generatedAtUtc": "2026-07-03T07:11:01.901Z",
      "status": "head_mismatch",
      "affectsReadiness": false,
      "nextExactAction": "Refresh agent/state/codex-execution-guardrails.generated.json with its owning check before it can affect readiness."
    },
    {
      "artifactPath": "agent/state/runtime-smoke-substitute-matrix.generated.json",
      "reportKey": "runtime-smoke-substitute-matrix",
      "currentHead": "eab156ec8670f1e777d277b1c18485031290f2dd",
      "generatedAtUtc": "2026-07-05T01:10:28.883Z",
      "status": "current_by_impact",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/runtime-smoke-substitute-matrix.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/source-backed-runtime-confidence.generated.json",
      "reportKey": "source-backed-runtime-confidence",
      "currentHead": "eab156ec8670f1e777d277b1c18485031290f2dd",
      "generatedAtUtc": "2026-07-05T01:11:35.461Z",
      "status": "current_by_impact",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/source-backed-runtime-confidence.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/admin-truth-source-sample.generated.json",
      "reportKey": "admin-truth-source-sample",
      "currentHead": "aa03645b4bbfaebfb9008adc219369204b8abcef",
      "generatedAtUtc": "2026-07-05T01:41:29.862Z",
      "status": "current_by_impact",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/admin-truth-source-sample.generated.json is older than HEAD but no owned source inputs changed."
    },
    {
      "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
      "reportKey": "debug-runtime-evidence",
      "currentHead": "cbf48ed3419f240b49c9a2a17772476af2efd36c",
      "generatedAtUtc": "2026-06-21T19:16:51.544Z",
      "status": "current_by_impact",
      "affectsReadiness": true,
      "nextExactAction": "agent/state/debug-runtime-evidence.generated.json is older than HEAD but no owned source inputs changed."
    }
  ],
  "staleArtifactsRemaining": [],
  "validationFailures": [],
  "status": "pass",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": true,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "nextExactSteps": [
    "Use the owning release-readiness validator, then attach source/site-activity/deployed-route/admin-source evidence separately."
  ],
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider-backed site activity.",
    "Does not prove current admin source activity samples.",
    "Does not prove external billing or GitHub PR state unless an opt-in fresh evidence artifact says so."
  ]
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider-backed site activity, billing, admin source activity, or optional visual reproduction unless the report explicitly includes a matching typed evidence artifact for that category.

## Validation

- Pass.

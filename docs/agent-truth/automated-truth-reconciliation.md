# Automated Truth Reconciliation

Artifact: `agent/state/automated-truth-reconciliation.generated.json`
Validator: `npm run check:automated-truth-reconciliation`

## Summary

- Generated: `2026-06-01T04:55:55.091Z`
- Current head: `c525024240902c3f2ca716c01015c3cb6b25997b`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "automated-truth-reconciliation",
  "generatedAtUtc": "2026-06-01T04:55:55.091Z",
  "currentHead": "c525024240902c3f2ca716c01015c3cb6b25997b",
  "reportFormat": "compact_summary_full_detail_derivable",
  "betaScore": 78.03,
  "betaScoreProofStatus": "proven_current",
  "manualQaRecommended": false,
  "releaseCriticalGapCount": 0,
  "halfImplementedLaneCount": 0,
  "unprovenClaimCount": 50,
  "validatorAuthorityGapCount": 0,
  "costRiskGapCount": 3,
  "openPrCount": 0,
  "securityPrCount": 0,
  "unclassifiedDirtyFiles": [],
  "formalEvidenceStillMissing": [
    "runtime/provider smoke",
    "admin truth/sample evidence",
    "manual production smoke",
    "external billing review"
  ],
  "releaseCriticalGaps": [],
  "validationFailures": []
}
```

## Validation

- Pass.

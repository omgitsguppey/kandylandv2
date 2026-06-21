# Automated Truth Reconciliation

Artifact: `agent/state/automated-truth-reconciliation.generated.json`
Validator: `npm run check:automated-truth-reconciliation`

## Summary

- Generated: `2026-06-21T04:14:06.921Z`
- Current head: `456b9eb57f7ca4ebbb33d7baaa1b23fd24dd4b34`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, payment runtime, or GumDrop math changes. Provider-backed site activity, deployed route evidence, and redacted admin source samples remain unproven unless explicitly attached as typed evidence artifacts.

## Report

```json
{
  "reportKey": "automated-truth-reconciliation",
  "generatedAtUtc": "2026-06-21T04:14:06.921Z",
  "currentHead": "456b9eb57f7ca4ebbb33d7baaa1b23fd24dd4b34",
  "reportFormat": "compact_summary_full_detail_derivable",
  "betaScore": 86.83,
  "betaScoreProofStatus": "proven_current",
  "manualQaRecommended": false,
  "releaseCriticalGapCount": 1,
  "halfImplementedLaneCount": 0,
  "unprovenClaimCount": 50,
  "validatorAuthorityGapCount": 0,
  "costRiskGapCount": 3,
  "openPrCount": 14,
  "securityPrCount": 3,
  "unclassifiedDirtyFiles": [],
  "formalEvidenceStillMissing": [
    "provider-backed site activity evidence",
    "deployed route evidence",
    "redacted admin source sample",
    "external billing review"
  ],
  "releaseCriticalGaps": [
    "security-prs-handled-or-blocked"
  ],
  "validationFailures": []
}
```

## Validation

- Pass.

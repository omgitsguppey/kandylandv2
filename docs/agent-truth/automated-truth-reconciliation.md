# Automated Truth Reconciliation

Artifact: `agent/state/automated-truth-reconciliation.generated.json`
Validator: `npm run check:automated-truth-reconciliation`

## Summary

- Generated: `2026-06-19T02:02:14.240Z`
- Current head: `20de2ac21a0bf5b003eab4838cf42b1c49820e9d`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "automated-truth-reconciliation",
  "generatedAtUtc": "2026-06-19T02:02:14.240Z",
  "currentHead": "20de2ac21a0bf5b003eab4838cf42b1c49820e9d",
  "reportFormat": "compact_summary_full_detail_derivable",
  "betaScore": 77.2,
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
    "runtime/provider smoke",
    "admin truth/sample evidence",
    "manual production smoke",
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

# Cost Lie Detector

Artifact: `agent/state/cost-lie-detector.generated.json`
Validator: `npm run check:cost-lie-detector`

## Summary

- Generated: `2026-05-26T22:55:48.942Z`
- Current head: `ab170d4c0157ad2529b1e5c606d5ca65db1b3346`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "cost-lie-detector",
  "generatedAtUtc": "2026-05-26T22:55:48.942Z",
  "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
  "costRiskScore": 42,
  "costRiskStatus": "below80_external_review_required",
  "sourceGuardIsBillingProof": false,
  "externalBillingReviewRequired": true,
  "accuracyPreserved": true,
  "lanes": [
    {
      "laneId": "cloud-run-app-hosting",
      "status": "external_review_required",
      "blocksCostRisk": true,
      "exactNextAction": "Operator reviews provider billing; source guards are not billing proof."
    },
    {
      "laneId": "cloud-sql-data-connect",
      "status": "manual_approval_required",
      "blocksCostRisk": true,
      "exactNextAction": "Keep mirror sync manual/cost-approved only."
    },
    {
      "laneId": "gemini-cloud-assist-vertex",
      "status": "external_review_required",
      "blocksCostRisk": true,
      "exactNextAction": "Attach external billing review before improving costRisk."
    },
    {
      "laneId": "bigquery-export",
      "status": "source_guarded",
      "blocksCostRisk": false,
      "exactNextAction": "Keep export batch/watermark based; no per-event export."
    },
    {
      "laneId": "firestore-admin-debug-analytics",
      "status": "source_guarded",
      "blocksCostRisk": false,
      "exactNextAction": "Keep summary-first admin/debug reads and bounded refresh windows."
    },
    {
      "laneId": "diagnostics-retry-realtime",
      "status": "source_guarded",
      "blocksCostRisk": false,
      "exactNextAction": "Keep duplicate/error diagnostics rolled up and permanent 4xx non-retryable."
    }
  ],
  "validationFailures": []
}
```

## Validation

- Pass.

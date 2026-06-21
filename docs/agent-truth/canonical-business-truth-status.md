# Canonical Business Truth Status

Generated Batch 8 cleanup evidence. Business truth remains separate from ops-health and generic recovery playbooks stay collapsed unless they match active issues.

```json
{
  "generatedAtUtc": "2026-06-21T19:36:15.911Z",
  "reportKey": "canonical-business-truth-status",
  "currentHead": "187d6964a50ddf5a4077b19e88471c7e23414b75",
  "status": "low_confidence_review",
  "sourceFreshness": "stale",
  "confidenceScore": 74,
  "freshnessCause": "stale source inputs",
  "freshnessExplanation": "Snapshot stale: source inputs stale even though the report was generated recently.",
  "opsHealthInherited": false,
  "refreshCommand": "npm run check:admin-truth-source-sample",
  "revenueSourceClass": "operator_confirmed_provider_formal_missing",
  "purchaseSourceClass": "operator_confirmed_provider_formal_missing",
  "watchSourceClass": "valid_watch_time",
  "watchMetricCanUsePageTime": false,
  "nextExactSteps": [
    "Confidence 74%: review required; refresh the bounded admin source activity sample."
  ]
}
```

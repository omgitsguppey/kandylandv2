# User management status truth

Generated: 2026-06-11T19:02:41.626Z
Head: 95398c33ecd9c5c618b38434934de0a6f859ee7c

## Status

Validation failures: none

## Summary

```json
{
  "reportKey": "user-management-status-truth",
  "scoreBefore": {
    "sourceHealth": 91.7,
    "runtimeHealth": 72.8,
    "evidenceCompleteness": 43.4,
    "freshness": 59.38,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 68.67
  },
  "scoreAfter": {
    "sourceHealth": 91.7,
    "runtimeHealth": 72.8,
    "evidenceCompleteness": 43.4,
    "freshness": 59.38,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 68.67
  },
  "scoreDimensions": {
    "sourceHealth": 91.7,
    "runtimeHealth": 72.8,
    "evidenceCompleteness": 43.4,
    "freshness": 59.38,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 68.67
  },
  "currentHead": "95398c33ecd9c5c618b38434934de0a6f859ee7c",
  "generatedAtUtc": "2026-06-11T19:02:41.626Z",
  "statusBefore": "live_stale",
  "statusAfter": "source_ready_no_sample_loaded",
  "summaries": 0,
  "lowConfidenceMetrics": 0,
  "sourceWindowPresent": false,
  "rawTablesDefaultOpen": false,
  "summaryFirstRoutePolicy": true,
  "missingHydrationExplanations": [
    "No bounded user summary sample is loaded; lowConfidence=0 is not activity proof."
  ],
  "validationFailures": [],
  "status": "source_ready_no_sample_loaded",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": true,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "nextExactSteps": [
    "Run User management status truth validator after touching this admin status lane."
  ],
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider availability.",
    "Does not prove current admin truth samples."
  ]
}
```

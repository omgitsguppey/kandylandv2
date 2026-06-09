# Route health reconciliation

Generated: 2026-06-09T00:37:04.044Z
Head: e633434db51813661460de08f286dcce84be4eca

## Summary

```json
{
  "reportKey": "route-health-reconciliation",
  "generatedAtUtc": "2026-06-09T00:37:04.044Z",
  "currentHead": "e633434db51813661460de08f286dcce84be4eca",
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
  "routeChecksStatus": "0 active failures",
  "routeHealthStatusBefore": "DEGRADED: 44 ok / 65 action / 2 fail",
  "routeHealthStatusAfter": "route_listener_delayed_with_last_verified_sample",
  "delayedListener": "admin_debug_route_health",
  "expectedEvidenceArtifact": "route_runtime_health Firestore listener rows via Admin Debug runtime sample",
  "delayedClassification": "manual_runtime_proof_required",
  "evidenceBasis": "source_only_reconciliation_of_archived_debug_cockpit_batch6_sample",
  "sourceBugFound": false,
  "sourceOnlyCanClear": false,
  "runtimeProofRequired": true,
  "delayedIsHealthy": false,
  "trackedRoutes": 173,
  "observedRoutes": 109,
  "unseenRoutes": 64,
  "activeFailureCount": 0,
  "staleFailureCount": 2,
  "warningCount": 8,
  "staleActionCount": 65,
  "currentActionCount": 0,
  "routeListenerStatus": "failed",
  "canTrustLastVerified": true,
  "lastVerifiedAgeMs": 1800000,
  "status": "route_listener_delayed_with_last_verified_sample",
  "unseenRoutesClassified": {
    "unseen_expected": 0,
    "unseen_inactive": 0,
    "unseen_source_missing": 0,
    "stale_unseen": 64
  },
  "currentSlowCount": 0,
  "staleSlowCount": 6,
  "currentServerErrorCount": 0,
  "staleServerErrorCount": 7,
  "currentClientErrorCount": 0,
  "staleClientErrorCount": 4,
  "missingFailureTimestampActionable": true,
  "nextAction": "Repair the route listener, then refresh route runtime evidence.",
  "validationFailures": []
}
```

## Validation

- None.

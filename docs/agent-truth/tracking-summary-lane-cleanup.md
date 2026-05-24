# Tracking Summary Lane Cleanup

Generated: 2026-05-24T15:35:36.040Z
Current head: 4214aa6fca1f18201e8f09ed9197f38316b035c9
Status: source_ready

## Summary

```json
{
  "reportKey": "tracking-summary-lane-cleanup",
  "generatedAtUtc": "2026-05-24T15:35:36.040Z",
  "currentHead": "4214aa6fca1f18201e8f09ed9197f38316b035c9",
  "lanesBefore": 34,
  "lanesAfter": 34,
  "p1Before": 2,
  "p1After": 1,
  "p2Before": 5,
  "p2After": 2,
  "duplicateCount": 0,
  "rawDetailsDefaultOpen": false,
  "featureCoverageStatus": "source_ready",
  "runtimeDebugFailedBefore": 3,
  "runtimeDebugFailedAfter": 3,
  "runtimeDebugWarningsBefore": 145,
  "runtimeDebugWarningGroupsAfter": 5,
  "consentTrackingStatus": "source_ready",
  "eventLivenessExpectedLive": 27,
  "eventLivenessRecent": 0,
  "eventLivenessSourceMissingBefore": 27,
  "eventLivenessSourceMissingAfter": "source_missing_actionable",
  "behaviorMathStatus": "live_healthy",
  "legacyRecoveryStatus": "healthy_source_ready",
  "scoreBefore": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "scoreAfter": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 79.25
  },
  "remainingGaps": [
    "27 expected-live event liveness source(s) still need bounded lastSeen summaries.",
    "Formal provider/runtime/admin evidence gates remain separate from source-fix queues."
  ],
  "nextExactSteps": [
    "Connect bounded lastSeen summary sources for expected-live events.",
    "Refresh runtime/debug stale artifacts only when score-impacting.",
    "Keep raw tracking details collapsed behind drilldown."
  ],
  "laneStatuses": {
    "featureTelemetryCoverage": "live",
    "runtimeDebugEvidence": "failed",
    "consentTrackingMode": "live",
    "eventLiveness": "degraded",
    "behaviorMath": "live",
    "legacyRecovery": "live"
  },
  "validationFailures": []
}
```

## Validation Failures

- none

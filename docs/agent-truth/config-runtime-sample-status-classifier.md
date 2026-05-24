# Config runtime sample status classifier

Generated: 2026-05-24T16:49:44.974Z
Head: d02b8b2da859d47d880182fe2169db1ad6a40ad6

## Status

Validation failures: none

## Summary

```json
{
  "reportKey": "config-runtime-sample-status-classifier",
  "scoreBefore": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "scoreAfter": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "scoreDimensions": {
    "sourceHealth": 92.5,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 69.6,
    "freshness": 83.75,
    "costRisk": 80.5,
    "regressionRisk": 86,
    "overallHealthScore": 83.1
  },
  "currentHead": "d02b8b2da859d47d880182fe2169db1ad6a40ad6",
  "generatedAtUtc": "2026-05-24T16:49:44.974Z",
  "statusVocabulary": [
    "config_healthy_current",
    "source_ready_collecting",
    "source_ready_no_sample_loaded",
    "runtime_sample_healthy_current",
    "runtime_sample_proven_zero",
    "runtime_sample_missing",
    "source_missing_actionable",
    "stale_artifact_refresh_required",
    "external_review_required",
    "formal_gate_required",
    "degraded",
    "unknown"
  ],
  "decisions": [
    {
      "laneId": "config",
      "status": "config_healthy_current",
      "displayState": "healthy",
      "artifactFreshness": "unknown",
      "reason": "Configuration/source contract truth is current and healthy.",
      "nextAction": "No config status action required.",
      "runtimeLiveAllowed": false
    },
    {
      "laneId": "runtime_zero",
      "status": "source_ready_collecting",
      "displayState": "collecting",
      "artifactFreshness": "unknown",
      "reason": "Source contracts are healthy, but no bounded runtime activity sample is loaded.",
      "nextAction": "Load a bounded runtime source window before displaying this sample as live.",
      "runtimeLiveAllowed": false
    },
    {
      "laneId": "runtime_proven_zero",
      "status": "runtime_sample_proven_zero",
      "displayState": "healthy",
      "artifactFreshness": "unknown",
      "reason": "A current source window proves zero runtime activity.",
      "nextAction": "No runtime sample action required.",
      "runtimeLiveAllowed": true
    },
    {
      "laneId": "stale",
      "status": "stale_artifact_refresh_required",
      "displayState": "stale",
      "artifactFreshness": "stale",
      "reason": "Artifact freshness is stale; this is not source or runtime proof.",
      "nextAction": "npm run check:owner",
      "runtimeLiveAllowed": false
    }
  ],
  "validationFailures": []
}
```

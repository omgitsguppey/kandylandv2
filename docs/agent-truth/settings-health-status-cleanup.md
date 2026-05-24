# Settings health status cleanup

Generated: 2026-05-24T16:27:27.889Z
Head: 3198b27d8499d675aa8e3ee98fe4e3368f2c77e0

## Status

Validation failures: none

## Summary

```json
{
  "reportKey": "settings-health-status-cleanup",
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
  "currentHead": "3198b27d8499d675aa8e3ee98fe4e3368f2c77e0",
  "generatedAtUtc": "2026-05-24T16:27:27.889Z",
  "statusBefore": "live_stale",
  "statusAfter": "healthy_current",
  "components": [
    "Account/Creator parity",
    "route aliases",
    "stale client preferences",
    "support/policy links",
    "profile API",
    "delete flow"
  ],
  "artifactFreshnessStatus": "current",
  "refreshCommand": "npm run check:settings-debug-validator-authority",
  "duplicatedRawValidatorsDefaultOpen": false,
  "validationFailures": []
}
```

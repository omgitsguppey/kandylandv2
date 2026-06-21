# Admin summary lane status classifier

Generated: 2026-06-21T19:36:09.615Z
Head: 187d6964a50ddf5a4077b19e88471c7e23414b75

## Status

Validation failures: none

## Summary

```json
{
  "reportKey": "admin-summary-lane-status-classifier",
  "scoreBefore": {
    "sourceHealth": 97.2,
    "runtimeHealth": 91.11,
    "evidenceCompleteness": 95.2,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 89.31
  },
  "scoreAfter": {
    "sourceHealth": 97.2,
    "runtimeHealth": 91.11,
    "evidenceCompleteness": 95.2,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 89.31
  },
  "scoreDimensions": {
    "sourceHealth": 97.2,
    "runtimeHealth": 91.11,
    "evidenceCompleteness": 95.2,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 89.31
  },
  "currentHead": "187d6964a50ddf5a4077b19e88471c7e23414b75",
  "generatedAtUtc": "2026-06-21T19:36:09.615Z",
  "statusVocabulary": [
    "healthy_current",
    "healthy_proven_zero",
    "source_ready_collecting",
    "source_ready_no_sample_loaded",
    "sample_source_missing",
    "source_missing_actionable",
    "degraded",
    "stale_artifact_refresh_required",
    "external_review_required",
    "formal_gate_required",
    "unknown"
  ],
  "decisions": [
    {
      "laneId": "no_sample",
      "status": "source_ready_no_sample_loaded",
      "displayState": "collecting",
      "reason": "The source contract is present, but no bounded sample is loaded.",
      "nextAction": "Load or attach the lane source sample.",
      "liveDisplayAllowed": false
    },
    {
      "laneId": "collecting",
      "status": "source_ready_collecting",
      "displayState": "collecting",
      "reason": "Telemetry/source contracts are mapped, but no bounded runtime sample is loaded.",
      "nextAction": "Load a bounded source summary before displaying this lane as live.",
      "liveDisplayAllowed": false
    },
    {
      "laneId": "stale",
      "status": "stale_artifact_refresh_required",
      "displayState": "stale",
      "reason": "Artifact freshness is stale; source health is not being downgraded.",
      "nextAction": "npm run check:lane-owner",
      "liveDisplayAllowed": false
    },
    {
      "laneId": "source_missing",
      "status": "source_missing_actionable",
      "displayState": "degraded",
      "reason": "Required source contract or source summary is missing.",
      "nextAction": "Wire the lane to its source contract or summary artifact.",
      "liveDisplayAllowed": false
    },
    {
      "laneId": "typed_evidence_gate",
      "status": "formal_gate_required",
      "displayState": "blocked",
      "reason": "A typed evidence gate is required and cannot be replaced by source status.",
      "nextAction": "Attach the lane's required typed evidence artifact before clearing this gate.",
      "liveDisplayAllowed": false
    }
  ],
  "validationFailures": [],
  "status": "pass",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": true,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "nextExactSteps": [
    "Run Admin summary lane status classifier validator after touching this admin status lane."
  ],
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider availability.",
    "Does not prove current admin truth samples."
  ]
}
```

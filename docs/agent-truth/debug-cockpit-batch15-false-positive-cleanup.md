# Debug Cockpit Batch 15 False Positive Cleanup

Generated: 2026-05-24T20:15:31.100Z

```json
{
  "generatedAtUtc": "2026-05-24T20:15:31.100Z",
  "currentHead": "6959286c146525ea4679f724865f865dccb0b627",
  "diagnosticsLaneStatusBefore": "LIVE",
  "diagnosticsLaneStatusAfter": "source_ready_no_sample_loaded",
  "diagnosticsSampleLoaded": false,
  "diagnosticsProvenZero": false,
  "downstreamWriterStatusBefore": "LIVE",
  "downstreamWriterStatusAfter": "source_ready_no_sample_loaded",
  "downstreamWriterSampleLoaded": false,
  "panelStatusBefore": "LIVE",
  "panelStatusAfter": "source_ready_no_sample_loaded",
  "panelLogsLoaded": false,
  "panelLogsProvenZero": false,
  "falsePositiveLiveBefore": 3,
  "falsePositiveLiveAfter": 0,
  "noSampleLanes": [
    "diagnostics",
    "downstream_writers",
    "panel_logs"
  ],
  "healthyProvenZeroLanes": [],
  "sampleUnavailableLanes": [
    "diagnostics",
    "downstream_writers",
    "panel_logs"
  ],
  "sourceMissingActionableLanes": [],
  "scoreBefore": 79.25,
  "scoreAfter": 79.25,
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
    "Diagnostics and panel logs remain no-sample until a current source window proves zero or rows load."
  ],
  "nextExactSteps": [
    "Load a current diagnostics sample before claiming diagnostics healthy live.",
    "Load persisted panel logs or attach a panel-log source window proving zero."
  ],
  "dirtyFilesClassified": true,
  "openPrsClassified": true
}
```

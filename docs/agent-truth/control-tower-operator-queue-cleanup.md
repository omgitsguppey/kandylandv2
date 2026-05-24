# Control Tower Operator Queue Cleanup

Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.

```json
{
  "currentHead": "5c126a7df36e39be20ab55b40ce5d14c04779fb5",
  "scoreImpactQueueBefore": [
    "runtime_provider_smoke",
    "debug_runtime_evidence",
    "agent/state/score-80-path-lock.generated.json",
    "cost-owner-review"
  ],
  "scoreImpactQueueAfter": [],
  "formalEvidenceItems": [
    "runtime_provider_smoke",
    "debug_runtime_evidence"
  ],
  "retiredReports": [
    "agent/state/score-80-path-lock.generated.json"
  ],
  "telemetryParityStatusAfter": "clean_current",
  "adminTruthStatusAfter": "source_ready_formal_sample_required",
  "costLaneQueueStatus": "collapsed_score_impact_zero",
  "aiCriticStatusBefore": "request_changes",
  "aiCriticStatusAfter": "no_source_changes_requested",
  "recoveryPlaybooksVisibleBefore": 1,
  "recoveryPlaybooksVisibleAfter": 0
}
```

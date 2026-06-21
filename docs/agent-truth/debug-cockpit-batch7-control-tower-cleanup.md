# Debug Cockpit Batch7 Control Tower Cleanup

Generated Control Tower cleanup evidence. Typed evidence gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-06-21T19:42:57.264Z",
  "reportKey": "debug-cockpit-batch7-control-tower-cleanup",
  "currentHead": "a1efe12aa1c08a98310f32d2dd997d73b689c1a7",
  "canonicalScoreBefore": {
    "score": 79,
    "status": "stale evidence",
    "source": "stale control tower display"
  },
  "canonicalScoreAfter": {
    "score": 84,
    "status": "Source evidence required",
    "source": "agent/state/public-beta-score.generated.json"
  },
  "evidenceScoreBefore": 65.7,
  "evidenceScoreAfter": 67.04,
  "requiredReportsBefore": 6,
  "requiredReportsAfter": 11,
  "staleReportsBefore": 11,
  "staleReportsAfter": 7,
  "refreshedReports": [],
  "retiredReports": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "formalGatesRemaining": [
    "runtime_provider_smoke",
    "deployed_runtime_smoke",
    "admin_truth_sample_artifact"
  ],
  "operatorConfirmedSignals": [
    "GumDrop payment operator-confirmed; provider-backed source evidence remains separate."
  ],
  "adminTruthStatusBefore": "unknown",
  "adminTruthStatusAfter": "source_ready_formal_sample_required",
  "telemetryParityStatusBefore": "clean_but_stale_display",
  "telemetryParityStatusAfter": "clean_current",
  "costLaneQueueStatus": "collapsed_score_impact_zero",
  "aiCriticStatusBefore": "request_changes",
  "aiCriticStatusAfter": "no_source_changes_requested",
  "recoveryPlaybooksVisibleBefore": 1,
  "recoveryPlaybooksVisibleAfter": 0,
  "scoreImpactQueueBefore": [
    "runtime_provider_smoke",
    "debug_runtime_evidence",
    "agent/state/score-80-path-lock.generated.json",
    "cost-owner-review"
  ],
  "scoreImpactQueueAfter": [],
  "actionableSourceIssues": [],
  "formalEvidenceItems": [
    "runtime_provider_smoke",
    "debug_runtime_evidence"
  ],
  "externalReviewItems": [
    "cost-owner-review"
  ],
  "collapsedInfoItems": [
    "score-impact-zero-cost",
    "formal-playbooks",
    "superseded-score-80-path-lock"
  ],
  "scoreDimensions": {
    "sourceHealth": 97.2,
    "runtimeHealth": 91.11,
    "evidenceCompleteness": 95.2,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 89.31
  },
  "dirtyFileClassifications": [
    {
      "path": "agent/state/launch-blocker-evidence-closure.generated.json",
      "classification": "unsafe_unknown"
    },
    {
      "path": "docs/agent-truth/launch-blocker-evidence-closure.md",
      "classification": "unsafe_unknown"
    }
  ],
  "remainingGaps": [
    "Provider-backed site activity evidence remains required.",
    "Deployed route activity evidence remains required.",
    "Redacted admin source activity sample remains required."
  ],
  "nextExactSteps": [
    "Produce provider-backed site activity evidence before clearing provider-backed lanes.",
    "Produce deployed route activity evidence before clearing runtime lanes.",
    "Produce a redacted admin source activity sample before clearing the typed admin evidence gate."
  ]
}
```

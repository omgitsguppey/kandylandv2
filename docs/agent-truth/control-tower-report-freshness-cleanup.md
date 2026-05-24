# Control Tower Report Freshness Cleanup

Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-05-24T17:35:21.055Z",
  "reportKey": "control-tower-report-freshness-cleanup",
  "currentHead": "5c126a7df36e39be20ab55b40ce5d14c04779fb5",
  "requiredReports": 11,
  "staleReports": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "missingReports": [],
  "staleButFormalGateOnly": [
    "agent/state/admin-truth-sample-evidence.generated.json"
  ],
  "staleAndRefreshable": [
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "refreshedCurrent": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/evidence-capture-status.generated.json",
    "agent/state/formal-evidence-bridge.generated.json"
  ],
  "supersededRetired": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "sourceBugArtifacts": [
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json"
  ],
  "reportAverageDisplay": "Report evidence summary includes current/stale split: 6 current, 5 stale, 0 missing.",
  "staleReportsBefore": 6,
  "staleReportsAfter": 4,
  "requiredReportsBefore": 6,
  "requiredReportsAfter": 11
}
```

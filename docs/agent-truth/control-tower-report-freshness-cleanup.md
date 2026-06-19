# Control Tower Report Freshness Cleanup

Generated Control Tower cleanup evidence. Formal gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-06-19T05:23:47.922Z",
  "reportKey": "control-tower-report-freshness-cleanup",
  "currentHead": "2f9486ad65b037994ac7c6da4e9ddeb2cca63f95",
  "requiredReports": 11,
  "staleReports": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/evidence-capture-status.generated.json",
    "agent/state/formal-evidence-bridge.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "missingReports": [],
  "staleButFormalGateOnly": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/evidence-capture-status.generated.json",
    "agent/state/formal-evidence-bridge.generated.json"
  ],
  "staleAndRefreshable": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "refreshedCurrent": [],
  "supersededRetired": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "sourceBugArtifacts": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json"
  ],
  "reportAverageDisplay": "Report evidence summary includes current/stale split: 0 current, 11 stale, 0 missing.",
  "staleReportsBefore": 11,
  "staleReportsAfter": 7,
  "requiredReportsBefore": 6,
  "requiredReportsAfter": 11
}
```

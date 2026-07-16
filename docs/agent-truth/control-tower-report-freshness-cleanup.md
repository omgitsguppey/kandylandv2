# Control Tower Report Freshness Cleanup

Generated Control Tower cleanup evidence. Typed evidence gates remain visible but are not source-code bugs.

```json
{
  "generatedAtUtc": "2026-07-16T04:29:59.163Z",
  "reportKey": "control-tower-report-freshness-cleanup",
  "currentHead": "621afada2aea0ef269a02c7ac68d4424bfce5214",
  "requiredReports": 11,
  "staleReports": [
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
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/telemetry-parity-score.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "refreshedCurrent": [
    "agent/state/public-beta-score.generated.json"
  ],
  "supersededRetired": [
    "agent/state/admin-truth-sample-evidence.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-runtime-evidence.generated.json",
    "agent/state/score-80-path-lock.generated.json"
  ],
  "sourceBugArtifacts": [
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/final-launch-readiness-report.generated.json",
    "agent/state/debug-cockpit-batch6-cleanup.generated.json",
    "agent/state/debug-operator-cockpit.generated.json"
  ],
  "reportAverageDisplay": "Report evidence summary includes current/stale split: 1 current, 10 stale, 0 missing.",
  "staleReportsBefore": 10,
  "staleReportsAfter": 6,
  "requiredReportsBefore": 6,
  "requiredReportsAfter": 11
}
```

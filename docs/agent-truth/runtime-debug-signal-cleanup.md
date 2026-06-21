# Runtime Debug Signal Cleanup

Generated: 2026-06-21T19:51:36.809Z
Current head: 2949679a0c42f8a2eb2e61cc7ec3c8c271944b1a
Status: source_ready

## Summary

```json
{
  "reportKey": "runtime-debug-signal-cleanup",
  "generatedAtUtc": "2026-06-21T19:51:36.809Z",
  "currentHead": "2949679a0c42f8a2eb2e61cc7ec3c8c271944b1a",
  "rawFailedCountBefore": 3,
  "failedGroupCount": 1,
  "warningGroupCount": 5,
  "rawWarningCount": 145,
  "rawWarningsDefaultVisible": false,
  "failedSignals": [
    {
      "signalId": "deployed_runtime_smoke",
      "classification": "formal_evidence_required",
      "source": "agent/state/runtime-smoke-evidence.generated.json",
      "nextAction": "Attach deployed route evidence; keep this outside source-fix classification."
    }
  ],
  "warningGroups": [
    {
      "groupId": "stale_debug_artifacts",
      "count": 42,
      "classification": "stale_refresh_or_retire",
      "nextAction": "Refresh only score-impacting stale artifacts."
    },
    {
      "groupId": "formal_runtime_backlog",
      "count": 37,
      "classification": "formal_gate_required",
      "nextAction": "Keep provider-backed site activity and deployed route evidence visible but out of source-fix queue."
    },
    {
      "groupId": "source_ready_no_activity",
      "count": 31,
      "classification": "collapsed_drilldown",
      "nextAction": "Keep source-ready no-activity rows collapsed unless expected-live source is missing."
    },
    {
      "groupId": "route_runtime_samples",
      "count": 22,
      "classification": "summary_first_runtime_health",
      "nextAction": "Show route runtime health by failed/warning group, not raw row."
    },
    {
      "groupId": "legacy_generated_snapshots",
      "count": 13,
      "classification": "obsolete_or_historical_snapshot",
      "nextAction": "Retire obsolete snapshots from active cockpit queues."
    }
  ],
  "topRootCauses": [
    "stale_debug_artifacts",
    "formal_runtime_backlog",
    "source_ready_no_activity",
    "route_runtime_samples",
    "legacy_generated_snapshots"
  ],
  "nextAction": "Fix source-fixable failed groups, refresh stale artifacts, and keep typed evidence gates classified separately.",
  "validationFailures": []
}
```

## Validation Failures

- none

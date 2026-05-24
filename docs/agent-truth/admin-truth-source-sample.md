# Admin Truth Source Sample

Generated: 2026-05-24T18:03:42.778Z

Latest code version: 6d038e7f7d9b7cef83d276f39bd968df83bb988d

## Summary

- Status: `source_ready_admin_truth_sample`
- Admin truth source ready: true
- Production sample attached: false
- Formal runtime sample attached: false
- Formal admin truth sample passed: false
- Launch gate impact: `partial_source_admin_truth_only`
- Telemetry health lane status: `partial`
- Degraded/unavailable lanes: 6
- Critical admin truth issues: 0

This is source wiring evidence only. It does not replace a redacted production admin truth sample.

## Degraded Or Unavailable Lanes

- ingest: runtime_unproven. Next: Open the route runtime drilldown or wait for runtime samples before treating ingest as proven.
- user_events: runtime_unproven. Next: Refresh admin analytics snapshots before reading user-event health.
- watch_time: runtime_unproven. Next: Attach or verify deployed runtime watch-session evidence before treating watch time as proven.
- materializers: runtime_unproven. Next: Use snapshot metadata before raw collections.
- bigquery_export: config_missing. Next: Configure export only in an owner-approved cloud pipeline pass.
- admin_snapshots: unavailable. Next: Run the admin analytics refresh lane before treating this as current.
